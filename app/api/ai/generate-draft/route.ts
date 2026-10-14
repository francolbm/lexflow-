import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateWithClaude } from '@/lib/ai/claude'
import { extractSupportFilesText } from '@/lib/ai/extract-text'

const SYSTEM_PROMPT = `Você é um assistente jurídico especializado em produzir minutas para advogados brasileiros.
Gere um documento jurídico completo, formal e tecnicamente correto com base no briefing fornecido.
O texto será revisado por um advogado antes de qualquer entrega ao cliente — produza o melhor rascunho possível,
mas não inclua avisos sobre ser uma IA nem disclaimers dentro do próprio documento.`


/**
 * Formata o mapa estruturado do Leitor de Processo como um bloco de texto
 * legível para injetar no prompt. Só inclui seções que têm conteúdo.
 */
function formatProcessMapForPrompt(map: any): string {
  if (!map || typeof map !== 'object') return ''
  const lines: string[] = []

  const id = map.identificacao
  if (id && (id.numero || id.tribunal || id.classe || id.valorCausa)) {
    lines.push('## Identificação do processo')
    if (id.numero) lines.push(`- Número: ${id.numero}`)
    if (id.tribunal) lines.push(`- Tribunal: ${id.tribunal}`)
    if (id.vara) lines.push(`- Vara: ${id.vara}`)
    if (id.classe) lines.push(`- Classe: ${id.classe}`)
    if (id.valorCausa) lines.push(`- Valor da causa: ${id.valorCausa}`)
    if (map.faseAtual) lines.push(`- Fase atual: ${map.faseAtual}`)
    lines.push('')
  }

  if (Array.isArray(map.partes) && map.partes.length) {
    lines.push('## Partes')
    for (const p of map.partes) {
      const adv = Array.isArray(p.advogados) && p.advogados.length ? ` (adv: ${p.advogados.join('; ')})` : ''
      const doc = p.cpfCnpj ? ` [${p.cpfCnpj}]` : ''
      lines.push(`- ${p.tipo}: ${p.nome}${doc}${adv}`)
    }
    lines.push('')
  }

  if (Array.isArray(map.linhaDoTempo) && map.linhaDoTempo.length) {
    lines.push('## Linha do tempo')
    for (const e of map.linhaDoTempo) {
      const data = e.data ? `${e.data} — ` : ''
      const pg = e.paginaRef ? ` (p. ${e.paginaRef})` : ''
      lines.push(`- ${data}${e.tipo}: ${e.resumo}${pg}`)
    }
    lines.push('')
  }

  if (Array.isArray(map.decisoes) && map.decisoes.length) {
    lines.push('## Decisões')
    for (const d of map.decisoes) {
      const data = d.data ? `${d.data} — ` : ''
      const orgao = d.orgao ? `${d.orgao}: ` : ''
      lines.push(`- ${data}${orgao}${d.tipo}: ${d.resumo}`)
      if (d.dispositivo) lines.push(`  Dispositivo: ${d.dispositivo}`)
    }
    lines.push('')
  }

  if (Array.isArray(map.valores) && map.valores.length) {
    lines.push('## Valores')
    for (const v of map.valores) lines.push(`- ${v.descricao}: ${v.valor}`)
    lines.push('')
  }

  if (Array.isArray(map.teses) && map.teses.length) {
    lines.push('## Teses das partes')
    for (const t of map.teses) lines.push(`- (${t.parte}) ${t.tese}`)
    lines.push('')
  }

  if (Array.isArray(map.precedentes) && map.precedentes.length) {
    lines.push('## Precedentes citados')
    for (const p of map.precedentes) lines.push(`- ${p.referencia}: ${p.resumo}`)
    lines.push('')
  }

  if (Array.isArray(map.proximosAtos) && map.proximosAtos.length) {
    lines.push('## Próximos atos previstos')
    for (const a of map.proximosAtos) lines.push(`- ${a}`)
    lines.push('')
  }

  return lines.join('\n').trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const demandId = body.demandId

    if (!demandId) {
      return NextResponse.json({ error: 'demandId é obrigatório' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'operador' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const serviceClient = createServiceClient()

    const { data: demand, error: demandError } = await serviceClient
      .from('demands')
      .select('*')
      .eq('id', demandId)
      .single()

    if (demandError || !demand) {
      return NextResponse.json({ error: 'Demanda não encontrada' }, { status: 404 })
    }

    const { data: demandFiles } = await serviceClient
      .from('demand_files')
      .select('original_name, storage_path, bucket_name, mime_type')
      .eq('demand_id', demandId)

    // Extrai o conteúdo real dos anexos (PDF/DOCX/texto) e injeta no prompt,
    // em vez de listar apenas os nomes dos arquivos.
    const supportFilesContent = await extractSupportFilesText(serviceClient, demandFiles || [])

    const userPrompt = `Tipo de documento: ${demand.demand_type}
Área do direito: ${demand.area_of_law}
Título: ${demand.title}

Objetivo:
${demand.objective || 'Não informado'}

Fatos e contexto:
${demand.facts || 'Não informado'}

Notas estratégicas do advogado:
${demand.strategic_notes || 'Nenhuma'}

Conteúdo dos arquivos de apoio anexados pelo cliente:
${supportFilesContent}

Gere a minuta completa para este documento.`

    // Se o Leitor de Processo já rodou pra essa demanda, injeta o mapa
    // estruturado no prompt — a minuta sai muito mais aderente ao caso real.
    const { data: reading } = await serviceClient
      .from('process_readings')
      .select('map_json')
      .eq('demand_id', demandId)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const processMapBlock = reading?.map_json
      ? `\n\nMAPA ESTRUTURADO DO PROCESSO (extraído por IA da cópia integral — use como fonte primária de fatos, números e datas):\n${formatProcessMapForPrompt(reading.map_json)}\n`
      : ''

    const generatedText = await generateWithClaude(SYSTEM_PROMPT, userPrompt + processMapBlock)

    const { count } = await serviceClient
      .from('deliveries')
      .select('id', { count: 'exact' })
      .eq('demand_id', demandId)

    const versionNo = (count || 0) + 1

    const { data: delivery, error: deliveryError } = await serviceClient
      .from('deliveries')
      .insert({
        demand_id: demandId,
        organization_id: demand.organization_id,
        version_no: versionNo,
        delivered_by: user.id,
        notes: 'Rascunho gerado por IA — aguardando revisão do operador',
        visible_to_client: false,
        generated_by_ai: true,
      })
      .select()
      .single()

    if (deliveryError || !delivery) {
      return NextResponse.json(
        { error: 'Erro ao registrar entrega: ' + (deliveryError?.message || 'erro desconhecido') },
        { status: 500 }
      )
    }

    const filePath = `${demand.organization_id}/deliveries/${demandId}/${versionNo}-rascunho-ia.txt`
    const { error: uploadError } = await serviceClient.storage
      .from('delivery-files')
      .upload(filePath, generatedText, { contentType: 'text/plain' })

    if (!uploadError) {
      await serviceClient.from('delivery_files').insert({
        delivery_id: delivery.id,
        organization_id: demand.organization_id,
        uploaded_by: user.id,
        bucket_name: 'delivery-files',
        storage_path: filePath,
        original_name: `rascunho-ia-v${versionNo}.txt`,
        mime_type: 'text/plain',
      })
    }

    await serviceClient.from('audit_logs').insert({
      organization_id: demand.organization_id,
      user_id: user.id,
      action: 'ai_generate_draft',
      entity: 'deliveries',
      entity_id: delivery.id,
      new_data: { demand_id: demandId, version_no: versionNo, model: 'claude-sonnet-5', used_process_map: !!reading?.map_json },
    })

    return NextResponse.json({
      success: true,
      deliveryId: delivery.id,
      versionNo,
      text: generatedText,
    })
  } catch (error: any) {
    console.error('generate-draft error:', error)
    return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateWithClaude } from '@/lib/ai/claude'

const SYSTEM_PROMPT = `Você é um assistente jurídico especializado em revisar minutas para advogados brasileiros.
Você receberá uma minuta existente e um pedido de ajuste feito pelo advogado responsável.
Aplique os ajustes solicitados e devolva o documento completo já revisado, mantendo a estrutura
e a formalidade jurídica do texto original. Não inclua comentários sobre as alterações feitas,
apenas o texto final do documento.`

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

    if (!demand.adjustment_notes) {
      return NextResponse.json({ error: 'Esta demanda não possui notas de ajuste' }, { status: 400 })
    }

    const { data: lastDelivery, error: lastDeliveryError } = await serviceClient
      .from('deliveries')
      .select('*, delivery_files(*)')
      .eq('demand_id', demandId)
      .order('version_no', { ascending: false })
      .limit(1)
      .single()

    if (lastDeliveryError || !lastDelivery || !lastDelivery.delivery_files?.length) {
      return NextResponse.json({ error: 'Nenhuma versão anterior encontrada para ajustar' }, { status: 404 })
    }

    const lastFile = lastDelivery.delivery_files[0]
    const { data: fileBlob, error: downloadError } = await serviceClient.storage
      .from(lastFile.bucket_name)
      .download(lastFile.storage_path)

    if (downloadError || !fileBlob) {
      return NextResponse.json({ error: 'Erro ao baixar versão anterior: ' + downloadError?.message }, { status: 500 })
    }

    const previousText = await fileBlob.text()

    const userPrompt = `Minuta atual (versão ${lastDelivery.version_no}):

${previousText}

---

Ajuste solicitado pelo advogado:
${demand.adjustment_notes}

Devolva o documento completo com o ajuste aplicado.`

    const generatedText = await generateWithClaude(SYSTEM_PROMPT, userPrompt)

    const versionNo = lastDelivery.version_no + 1

    const { data: delivery, error: deliveryError } = await serviceClient
      .from('deliveries')
      .insert({
        demand_id: demandId,
        organization_id: demand.organization_id,
        version_no: versionNo,
        delivered_by: user.id,
        notes: 'Ajuste aplicado por IA — aguardando revisão do operador',
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
      action: 'ai_apply_adjustment',
      entity: 'deliveries',
      entity_id: delivery.id,
      previous_data: { previous_version: lastDelivery.version_no },
      new_data: { demand_id: demandId, version_no: versionNo, model: 'claude-sonnet-5' },
    })

    return NextResponse.json({
      success: true,
      deliveryId: delivery.id,
      versionNo,
      text: generatedText,
    })
  } catch (error: any) {
    console.error('apply-adjustment error:', error)
    return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 })
  }
}

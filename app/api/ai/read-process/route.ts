import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateWithClaude } from '@/lib/ai/claude'
import { extractProcessFiles, type ProcessSourceRef, type ProcessBlock } from '@/lib/ai/extract-process'
import { z } from 'zod'

/**
 * POST /api/ai/read-process  { demandId, filePaths?: string[] }
 *
 * Lê a cópia integral do processo anexada à demanda e devolve um mapa
 * estruturado (partes, linha do tempo, decisões, valores, teses, precedentes).
 * Grava em `process_readings` e reaproveita via cache (hash SHA-256 das fontes).
 */

export const runtime = 'nodejs'
export const maxDuration = 300 // até 5min para processos grandes (Vercel Pro)

// ---------------------------------------------------------------------------
// Schema Zod do mapa. A IA devolve nesse formato; validamos antes de gravar.
// ---------------------------------------------------------------------------

const IdentificacaoSchema = z.object({
  numero: z.string().nullable(),
  tribunal: z.string().nullable(),
  vara: z.string().nullable(),
  classe: z.string().nullable(),
  valorCausa: z.string().nullable(),
})

const ParteSchema = z.object({
  nome: z.string(),
  tipo: z.enum(['autor', 'reu', 'terceiro', 'ministerio_publico', 'outro']),
  cpfCnpj: z.string().nullable(),
  advogados: z.array(z.string()).default([]),
})

const EventoSchema = z.object({
  data: z.string().nullable(),
  tipo: z.enum([
    'peticao_inicial', 'contestacao', 'replica', 'peticao',
    'despacho', 'decisao_interlocutoria', 'sentenca', 'acordao',
    'audiencia', 'recurso', 'outro',
  ]),
  resumo: z.string(),
  paginaRef: z.number().int().nullable(),
})

const DecisaoSchema = z.object({
  data: z.string().nullable(),
  orgao: z.string().nullable(),
  tipo: z.enum(['sentenca', 'acordao', 'decisao_interlocutoria', 'despacho', 'liminar', 'outro']),
  resumo: z.string(),
  dispositivo: z.string().nullable(),
  paginaRef: z.number().int().nullable(),
})

const ValorSchema = z.object({ descricao: z.string(), valor: z.string() })
const TeseSchema = z.object({
  parte: z.enum(['requerente', 'requerido', 'tribunal', 'ministerio_publico']),
  tese: z.string(),
})
const PrecedenteSchema = z.object({ referencia: z.string(), resumo: z.string() })

const ProcessMapSchema = z.object({
  identificacao: IdentificacaoSchema,
  partes: z.array(ParteSchema).default([]),
  linhaDoTempo: z.array(EventoSchema).default([]),
  decisoes: z.array(DecisaoSchema).default([]),
  valores: z.array(ValorSchema).default([]),
  teses: z.array(TeseSchema).default([]),
  precedentes: z.array(PrecedenteSchema).default([]),
  faseAtual: z.string().nullable(),
  proximosAtos: z.array(z.string()).default([]),
})

export type ProcessMap = z.infer<typeof ProcessMapSchema>

// ---------------------------------------------------------------------------
// System prompt: parser estruturado, conservador, sem interpretar juridicamente.
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Você é um analista jurídico brasileiro especializado em extrair informações estruturadas de cópias integrais de processos judiciais (PJe, e-Proc, e-SAJ).

Sua tarefa: ler o trecho de processo fornecido e devolver um MAPA em JSON no schema abaixo. Não interprete juridicamente, não sugira estratégia, não invente. Apenas extraia o que está escrito.

REGRAS:
1. Se um campo não estiver presente no trecho, use null (escalar) ou [] (lista). NUNCA invente.
2. Datas no formato ISO (YYYY-MM-DD). Se só houver mês/ano, use o dia 01.
3. Valores monetários no formato brasileiro completo: "R$ 12.345,67".
4. paginaRef: número da página do trecho onde a informação aparece (marcadores "[Página N · arquivo]"). Se atravessar páginas, use a primeira.
5. Advogados: apenas nome + OAB se aparecer. Não descreva.
6. Cada evento da linhaDoTempo deve ser um ato processual concreto.
7. Se identificar o mesmo dado em formatos diferentes (ex: número CNJ com/sem pontuação), padronize para o mais completo.

SCHEMA (JSON):
{
  "identificacao": { "numero": string|null, "tribunal": string|null, "vara": string|null, "classe": string|null, "valorCausa": string|null },
  "partes": [ { "nome": string, "tipo": "autor"|"reu"|"terceiro"|"ministerio_publico"|"outro", "cpfCnpj": string|null, "advogados": string[] } ],
  "linhaDoTempo": [ { "data": string|null, "tipo": "peticao_inicial"|"contestacao"|"replica"|"peticao"|"despacho"|"decisao_interlocutoria"|"sentenca"|"acordao"|"audiencia"|"recurso"|"outro", "resumo": string, "paginaRef": number|null } ],
  "decisoes": [ { "data": string|null, "orgao": string|null, "tipo": "sentenca"|"acordao"|"decisao_interlocutoria"|"despacho"|"liminar"|"outro", "resumo": string, "dispositivo": string|null, "paginaRef": number|null } ],
  "valores": [ { "descricao": string, "valor": string } ],
  "teses": [ { "parte": "requerente"|"requerido"|"tribunal"|"ministerio_publico", "tese": string } ],
  "precedentes": [ { "referencia": string, "resumo": string } ],
  "faseAtual": string|null,
  "proximosAtos": string[]
}

Responda APENAS com o JSON válido, sem markdown, sem cerca de código, sem comentários.`

// ---------------------------------------------------------------------------
// Merge de sub-mapas: quando o processo cai em vários blocos, cada um vira um
// ProcessMap. Consolidamos preservando união de listas e primeiro não-nulo dos
// escalares.
// ---------------------------------------------------------------------------

function mergeMaps(maps: ProcessMap[]): ProcessMap {
  if (maps.length === 0) {
    return {
      identificacao: { numero: null, tribunal: null, vara: null, classe: null, valorCausa: null },
      partes: [], linhaDoTempo: [], decisoes: [], valores: [], teses: [], precedentes: [],
      faseAtual: null, proximosAtos: [],
    }
  }
  if (maps.length === 1) return maps[0]

  const pickFirst = <T,>(getter: (m: ProcessMap) => T | null): T | null => {
    for (const m of maps) {
      const v = getter(m)
      if (v !== null && v !== undefined && v !== '') return v
    }
    return null
  }

  const dedup = <T,>(items: T[], key: (t: T) => string): T[] => {
    const seen = new Set<string>()
    const out: T[] = []
    for (const it of items) {
      const k = key(it)
      if (!seen.has(k)) { seen.add(k); out.push(it) }
    }
    return out
  }

  return {
    identificacao: {
      numero: pickFirst((m) => m.identificacao.numero),
      tribunal: pickFirst((m) => m.identificacao.tribunal),
      vara: pickFirst((m) => m.identificacao.vara),
      classe: pickFirst((m) => m.identificacao.classe),
      valorCausa: pickFirst((m) => m.identificacao.valorCausa),
    },
    partes: dedup(maps.flatMap((m) => m.partes), (p) => `${p.tipo}:${p.nome.toLowerCase().trim()}`),
    linhaDoTempo: maps.flatMap((m) => m.linhaDoTempo)
      .sort((a, b) => (a.data || '').localeCompare(b.data || '')),
    decisoes: dedup(maps.flatMap((m) => m.decisoes),
      (d) => `${d.data || ''}:${d.resumo.slice(0, 60).toLowerCase()}`),
    valores: dedup(maps.flatMap((m) => m.valores),
      (v) => `${v.descricao.toLowerCase()}:${v.valor}`),
    teses: dedup(maps.flatMap((m) => m.teses),
      (t) => `${t.parte}:${t.tese.slice(0, 80).toLowerCase()}`),
    precedentes: dedup(maps.flatMap((m) => m.precedentes),
      (p) => p.referencia.toLowerCase().trim()),
    faseAtual: pickFirst((m) => m.faseAtual),
    proximosAtos: Array.from(new Set(maps.flatMap((m) => m.proximosAtos))),
  }
}

// ---------------------------------------------------------------------------
// Chamada à IA para um único bloco.
// ---------------------------------------------------------------------------

async function readBlockWithClaude(block: ProcessBlock): Promise<ProcessMap> {
  const userPrompt = `TRECHO DO PROCESSO (páginas ${block.pageStart}–${block.pageEnd} · ${block.sourceName}):\n\n${block.text}\n\nDevolva o JSON do mapa estruturado seguindo o schema exato.`

  const raw = await generateWithClaude(SYSTEM_PROMPT, userPrompt)

  // Sanitiza fences se vierem apesar da instrução.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`bloco ${block.index}: IA devolveu JSON inválido`)
  }
  return ProcessMapSchema.parse(parsed)
}

// ---------------------------------------------------------------------------
// Estimativa de custo: `generateWithClaude` não devolve tokens_usage, então
// aproximamos por chars/4 (regra prática do Claude tokenizer).
//   Sonnet 4.5: US$ 3/M input · US$ 15/M output · USD→BRL ≈ 5,5
// Devolve centavos de R$.
// ---------------------------------------------------------------------------

function estimateCostCents(inputChars: number, outputChars: number): {
  tokensIn: number; tokensOut: number; cents: number
} {
  const tokensIn = Math.round(inputChars / 4)
  const tokensOut = Math.round(outputChars / 4)
  const cents = Math.round((tokensIn * 3 * 550 + tokensOut * 15 * 550) / 1_000_000)
  return { tokensIn, tokensOut, cents }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

interface ReqBody {
  demandId: string
  filePaths?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReqBody
    if (!body?.demandId) {
      return NextResponse.json({ error: 'demandId é obrigatório' }, { status: 400 })
    }

    // Auth (mesmo padrão de generate-draft)
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

    const service = createServiceClient()

    // Demanda + arquivos
    const { data: demand, error: dErr } = await service
      .from('demands')
      .select('id, organization_id')
      .eq('id', body.demandId)
      .single()
    if (dErr || !demand) {
      return NextResponse.json({ error: 'Demanda não encontrada' }, { status: 404 })
    }

    let filesQuery = service
      .from('demand_files')
      .select('original_name, storage_path, bucket_name, mime_type')
      .eq('demand_id', body.demandId)
    if (body.filePaths && body.filePaths.length > 0) {
      filesQuery = filesQuery.in('storage_path', body.filePaths)
    }
    const { data: fileRows, error: fErr } = await filesQuery
    if (fErr) {
      return NextResponse.json({ error: 'Erro ao listar arquivos' }, { status: 500 })
    }
    const files: ProcessSourceRef[] = (fileRows || []).map((f) => ({
      original_name: f.original_name,
      storage_path: f.storage_path,
      bucket_name: f.bucket_name,
      mime_type: f.mime_type,
    }))
    if (files.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo anexado à demanda' }, { status: 400 })
    }

    // Extração + hash
    const extraction = await extractProcessFiles(service, files)
    if (extraction.blocks.length === 0) {
      return NextResponse.json(
        { error: 'Não foi possível extrair texto dos arquivos', details: extraction.errors },
        { status: 422 }
      )
    }

    // Cache
    const { data: cached } = await service
      .from('process_readings')
      .select('id, map_json, status, total_pages, total_chars, model, tokens_input, tokens_output, cost_cents, created_at')
      .eq('organization_id', demand.organization_id)
      .eq('source_hash', extraction.sourceHash)
      .eq('status', 'ready')
      .maybeSingle()
    if (cached) {
      return NextResponse.json({
        success: true,
        cached: true,
        reading_id: cached.id,
        map: cached.map_json,
        total_pages: cached.total_pages,
        total_chars: cached.total_chars,
        cost_cents: cached.cost_cents,
      })
    }

    // Cria linha em `processing`
    const sourceFilePaths = files.map((f) => f.storage_path)
    const { data: inserted, error: insertErr } = await service
      .from('process_readings')
      .insert({
        organization_id: demand.organization_id,
        demand_id: body.demandId,
        source_file_paths: sourceFilePaths,
        source_hash: extraction.sourceHash,
        total_pages: extraction.totalPages,
        total_chars: extraction.totalChars,
        status: 'processing',
        created_by: user.id,
      })
      .select('id')
      .single()

    let readingId = inserted?.id
    if (insertErr) {
      // Provável violação de unique (org, hash) — outra requisição paralela
      const { data: existing } = await service
        .from('process_readings')
        .select('id, status, map_json')
        .eq('organization_id', demand.organization_id)
        .eq('source_hash', extraction.sourceHash)
        .maybeSingle()
      if (!existing) {
        return NextResponse.json(
          { error: 'Erro ao registrar leitura', details: insertErr.message },
          { status: 500 }
        )
      }
      if (existing.status === 'ready') {
        return NextResponse.json({
          success: true, cached: true, reading_id: existing.id, map: existing.map_json,
        })
      }
      readingId = existing.id
    }

    if (!readingId) {
      return NextResponse.json({ error: 'Falha ao criar registro de leitura' }, { status: 500 })
    }

    // Processa cada bloco sequencialmente
    try {
      const subMaps: ProcessMap[] = []
      let totalInputChars = 0
      let totalOutputChars = 0
      for (const block of extraction.blocks) {
        totalInputChars += SYSTEM_PROMPT.length + block.text.length + 200
        const map = await readBlockWithClaude(block)
        const serialized = JSON.stringify(map)
        totalOutputChars += serialized.length
        subMaps.push(map)
      }

      const merged = mergeMaps(subMaps)
      const { tokensIn, tokensOut, cents } = estimateCostCents(totalInputChars, totalOutputChars)

      await service
        .from('process_readings')
        .update({
          map_json: merged,
          status: 'ready',
          model: 'claude-sonnet-5',
          tokens_input: tokensIn,
          tokens_output: tokensOut,
          cost_cents: cents,
        })
        .eq('id', readingId)

      // Auditoria (mesmo shape do generate-draft: entity + new_data)
      await service.from('audit_logs').insert({
        organization_id: demand.organization_id,
        user_id: user.id,
        action: 'ai_read_process',
        entity: 'process_readings',
        entity_id: readingId,
        new_data: {
          demand_id: body.demandId,
          total_pages: extraction.totalPages,
          blocks: extraction.blocks.length,
          cost_cents: cents,
        },
      })

      return NextResponse.json({
        success: true,
        cached: false,
        reading_id: readingId,
        map: merged,
        total_pages: extraction.totalPages,
        total_chars: extraction.totalChars,
        blocks: extraction.blocks.length,
        tokens_input: tokensIn,
        tokens_output: tokensOut,
        cost_cents: cents,
        extraction_errors: extraction.errors,
      })
    } catch (e: any) {
      await service
        .from('process_readings')
        .update({ status: 'failed', error: e?.message || 'erro desconhecido' })
        .eq('id', readingId)
      return NextResponse.json(
        { error: 'Falha ao ler processo', details: e?.message },
        { status: 500 }
      )
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Erro inesperado', details: e?.message || String(e) },
      { status: 500 }
    )
  }
}

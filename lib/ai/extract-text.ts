import type { SupabaseClient } from '@supabase/supabase-js'

// Orçamento total de caracteres extraídos dos anexos para não estourar o
// limite de tokens do prompt. ~40k chars ≈ 10k tokens, sobra espaço para a
// resposta (max_tokens 4096) e o restante do briefing.
const TOTAL_CHAR_BUDGET = 40000
// Limite por arquivo individual, para um único anexo gigante não engolir tudo.
const PER_FILE_CHAR_LIMIT = 15000

export interface SupportFileRef {
  original_name: string | null
  storage_path: string
  bucket_name: string
  mime_type: string | null
}

interface ExtractedFile {
  name: string
  text: string
  truncated: boolean
  error?: string
}

function isPdf(name: string, mime: string | null): boolean {
  return mime === 'application/pdf' || /\.pdf$/i.test(name)
}

function isDocx(name: string, mime: string | null): boolean {
  return (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    /\.docx$/i.test(name)
  )
}

function isPlainText(name: string, mime: string | null): boolean {
  return (
    (mime?.startsWith('text/') ?? false) ||
    /\.(txt|md|csv)$/i.test(name)
  )
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // Import dinâmico do módulo interno (não do index.js), que evita o harness de
  // debug que o pdf-parse executa ao importar o pacote pela raiz. Só carrega a
  // lib quando há de fato um PDF para processar.
  const mod: any = await import('pdf-parse/lib/pdf-parse.js')
  const pdfParse = mod.default || mod
  const data = await pdfParse(buffer)
  return data.text as string
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ buffer })
  return value
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Baixa cada anexo de apoio do Storage e extrai o texto (PDF, DOCX ou texto
 * puro). Formatos não suportados entram no resultado apenas com o nome, para
 * que a IA saiba que existem. É resiliente: falha em um arquivo não derruba os
 * demais nem a geração da minuta.
 */
export async function extractSupportFilesText(
  serviceClient: SupabaseClient,
  files: SupportFileRef[]
): Promise<string> {
  if (!files || files.length === 0) {
    return 'Nenhum arquivo de apoio anexado.'
  }

  const results: ExtractedFile[] = []
  let budgetLeft = TOTAL_CHAR_BUDGET

  for (const file of files) {
    const name = file.original_name || file.storage_path.split('/').pop() || 'arquivo'

    if (budgetLeft <= 0) {
      results.push({ name, text: '', truncated: true, error: 'orçamento de contexto esgotado' })
      continue
    }

    const supported = isPdf(name, file.mime_type) || isDocx(name, file.mime_type) || isPlainText(name, file.mime_type)
    if (!supported) {
      results.push({ name, text: '', truncated: false, error: 'formato não suportado para extração' })
      continue
    }

    try {
      const { data: blob, error } = await serviceClient.storage
        .from(file.bucket_name)
        .download(file.storage_path)

      if (error || !blob) {
        results.push({ name, text: '', truncated: false, error: 'falha ao baixar do storage' })
        continue
      }

      const buffer = Buffer.from(await blob.arrayBuffer())

      let raw = ''
      if (isPdf(name, file.mime_type)) {
        raw = await extractPdf(buffer)
      } else if (isDocx(name, file.mime_type)) {
        raw = await extractDocx(buffer)
      } else {
        raw = buffer.toString('utf-8')
      }

      raw = normalize(raw)

      const perFileCap = Math.min(PER_FILE_CHAR_LIMIT, budgetLeft)
      let truncated = false
      if (raw.length > perFileCap) {
        raw = raw.slice(0, perFileCap)
        truncated = true
      }
      budgetLeft -= raw.length

      results.push({ name, text: raw, truncated })
    } catch (e: any) {
      results.push({ name, text: '', truncated: false, error: `erro ao extrair texto: ${e?.message || 'desconhecido'}` })
    }
  }

  return results
    .map((r) => {
      const header = `### Arquivo: ${r.name}`
      if (r.error && !r.text) {
        return `${header}\n[${r.error}]`
      }
      const suffix = r.truncated ? '\n[... conteúdo truncado por limite de contexto ...]' : ''
      return `${header}\n${r.text}${suffix}`
    })
    .join('\n\n')
}

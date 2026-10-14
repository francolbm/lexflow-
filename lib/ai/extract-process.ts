import type { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

/**
 * Extrator do Leitor de Processo.
 *
 * Diferente de `extract-text.ts` (que resume 40k chars para caber num único
 * prompt de minuta), este módulo lê a cópia INTEGRAL do processo — pode ter
 * centenas de páginas — e devolve **blocos** com metadados de página, prontos
 * para serem consumidos por uma pipeline map-reduce (cada bloco vira um
 * sub-mapa; um passo de merge consolida). Também calcula um hash das fontes,
 * usado como chave de cache em `process_readings`.
 *
 * MVP: suporta apenas PDF. DOCX e texto puro podem ser adicionados depois.
 */

/** Referência a um arquivo no Supabase Storage. */
export interface ProcessSourceRef {
  original_name: string | null
  storage_path: string
  bucket_name: string
  mime_type: string | null
}

/** Um pedaço do processo com metadados de origem, pronto para IA. */
export interface ProcessBlock {
  index: number          // 0-based, ordem do bloco na sequência
  sourceName: string     // nome do arquivo (ou "múltiplos arquivos" se atravessa)
  pageStart: number      // 1-indexed, primeira página incluída
  pageEnd: number        // 1-indexed, última página incluída
  text: string           // conteúdo já com marcadores de página
  chars: number          // tamanho em caracteres
}

export interface ProcessExtractionResult {
  totalPages: number
  totalChars: number
  sourceHash: string     // sha256 hex do texto cru concatenado; chave de cache
  blocks: ProcessBlock[]
  errors: { file: string; reason: string }[]
}

// Blocos alvo de ~50k chars ≈ ~12k tokens de entrada — cabe folgado num
// prompt do Claude Sonnet com system + schema, deixando espaço pra saída JSON.
const TARGET_BLOCK_CHARS = 50000
// Overlap entre blocos para não cortar uma decisão ou trecho relevante ao meio.
const OVERLAP_CHARS = 2000
// Freio de segurança: recusa PDFs absurdamente grandes até termos RAG.
const MAX_PAGES_PER_FILE = 1500
const MAX_TOTAL_CHARS = 2_000_000

function isPdf(name: string, mime: string | null): boolean {
  return mime === 'application/pdf' || /\.pdf$/i.test(name)
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Extrai o PDF página a página usando o hook `pagerender` do pdf-parse.
 * Reproduz a montagem de texto padrão da lib, mas captura por página em vez
 * de devolver tudo num string só.
 */
async function extractPdfWithPages(buffer: Buffer): Promise<{ pages: string[] }> {
  // Import dinâmico do módulo interno para evitar o harness de debug que o
  // pdf-parse dispara ao importar pela raiz. Padrão já usado em extract-text.ts.
  const mod: any = await import('pdf-parse/lib/pdf-parse.js')
  const pdfParse = mod.default || mod

  const pages: string[] = []

  const pagerender = async (pageData: any): Promise<string> => {
    const textContent = await pageData.getTextContent({
      normalizeWhitespace: true,
      disableCombineTextItems: false,
    })
    let lastY: number | null = null
    let out = ''
    for (const item of textContent.items) {
      const y = item.transform?.[5] ?? null
      if (lastY === y || lastY === null) {
        out += item.str
      } else {
        out += '\n' + item.str
      }
      lastY = y
    }
    pages.push(out)
    return out
  }

  await pdfParse(buffer, { pagerender, max: MAX_PAGES_PER_FILE })
  return { pages }
}

/**
 * Junta as páginas de todos os arquivos numa sequência de blocos ~50k chars,
 * respeitando fronteiras de página. Cada bloco carrega faixa (pageStart–pageEnd)
 * e o nome da(s) fonte(s), pra a IA saber de onde tirou cada trecho.
 */
function buildBlocks(sources: { name: string; pages: string[] }[]): ProcessBlock[] {
  interface FlatPage {
    sourceIndex: number
    sourceName: string
    page: number    // 1-indexed dentro do próprio arquivo
    text: string
  }

  const flat: FlatPage[] = []
  sources.forEach((src, sIdx) => {
    src.pages.forEach((pageText, pIdx) => {
      flat.push({ sourceIndex: sIdx, sourceName: src.name, page: pIdx + 1, text: pageText })
    })
  })

  const blocks: ProcessBlock[] = []
  let current: ProcessBlock | null = null

  const startBlock = (fp: FlatPage, seed: string): ProcessBlock => ({
    index: blocks.length,
    sourceName: fp.sourceName,
    pageStart: fp.page,
    pageEnd: fp.page,
    text: seed,
    chars: seed.length,
  })

  for (const fp of flat) {
    const marker = `\n\n[Página ${fp.page} · ${fp.sourceName}]\n`
    const chunk = marker + fp.text

    if (!current) {
      current = startBlock(fp, chunk)
      continue
    }

    const wouldExceed = current.chars + chunk.length > TARGET_BLOCK_CHARS
    const halfFull = current.chars > TARGET_BLOCK_CHARS / 2

    if (wouldExceed && halfFull) {
      // Fecha o bloco atual e começa outro, semeando com o final do anterior
      // (overlap) para não perder contexto de fronteira.
      blocks.push(current)
      const overlap = current.text.slice(-OVERLAP_CHARS)
      current = startBlock(fp, overlap + chunk)
    } else {
      current.text += chunk
      current.chars += chunk.length
      current.pageEnd = fp.page
      if (fp.sourceName !== current.sourceName) {
        current.sourceName = 'múltiplos arquivos'
      }
    }
  }

  if (current) blocks.push(current)
  return blocks
}

/**
 * Baixa cada arquivo do Storage, extrai o texto página a página e devolve
 * blocos com metadados. É resiliente: falha num arquivo não derruba os demais.
 */
export async function extractProcessFiles(
  serviceClient: SupabaseClient,
  files: ProcessSourceRef[]
): Promise<ProcessExtractionResult> {
  const sources: { name: string; pages: string[] }[] = []
  const errors: { file: string; reason: string }[] = []
  const rawParts: string[] = []

  for (const file of files) {
    const name = file.original_name || file.storage_path.split('/').pop() || 'arquivo'

    if (!isPdf(name, file.mime_type)) {
      errors.push({ file: name, reason: 'MVP do Leitor de Processo aceita apenas PDF' })
      continue
    }

    try {
      const { data: blob, error } = await serviceClient.storage
        .from(file.bucket_name)
        .download(file.storage_path)
      if (error || !blob) {
        errors.push({ file: name, reason: 'falha ao baixar do storage' })
        continue
      }

      const buffer = Buffer.from(await blob.arrayBuffer())
      const { pages } = await extractPdfWithPages(buffer)
      const normalizedPages = pages.map(normalize)

      sources.push({ name, pages: normalizedPages })
      rawParts.push(normalizedPages.join('\n'))
    } catch (e: any) {
      errors.push({ file: name, reason: `erro na extração: ${e?.message || 'desconhecido'}` })
    }
  }

  const totalPages = sources.reduce((n, s) => n + s.pages.length, 0)
  const totalChars = sources.reduce((n, s) => n + s.pages.reduce((m, p) => m + p.length, 0), 0)

  if (totalChars > MAX_TOTAL_CHARS) {
    errors.push({
      file: '(todos)',
      reason: `total de ${totalChars} chars excede o limite de ${MAX_TOTAL_CHARS} do MVP — implementar RAG antes`,
    })
  }

  const sourceHash = createHash('sha256').update(rawParts.join('\n---\n')).digest('hex')
  const blocks = buildBlocks(sources)

  return { totalPages, totalChars, sourceHash, blocks, errors }
}

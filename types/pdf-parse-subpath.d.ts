// O @types/pdf-parse tipa apenas o entry principal ('pdf-parse'). Importamos o
// subpath interno ('pdf-parse/lib/pdf-parse.js') de propósito, para evitar o
// harness de debug que o index.js do pdf-parse executa ao ser importado pela
// raiz no ambiente do Next. Esta declaração fornece o tipo desse subpath.
declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseResult {
    numpages: number
    numrender: number
    info: unknown
    metadata: unknown
    version: string
    text: string
  }
  function pdfParse(
    dataBuffer: Buffer | Uint8Array,
    options?: Record<string, unknown>
  ): Promise<PdfParseResult>
  export default pdfParse
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-5'

// ─────────────────────────────────────────────────────────────
// MODO SIMULADO (para testes sem custo de IA).
// Ligue com  AI_MOCK=1  no .env.local. Quando ligado, NÃO chama a
// API da Anthropic: devolve uma minuta de exemplo, permitindo testar
// todo o fluxo (entrega, storage, auditoria, aprovação) de graça.
// Para usar a IA real, remova a linha AI_MOCK do .env.local (ou =0).
// ─────────────────────────────────────────────────────────────
function draftSimulado(userPrompt: string): string {
  const pega = (rotulo: string): string => {
    const m = userPrompt.match(new RegExp(rotulo + ':\\s*(.+)'))
    return m ? m[1].trim() : '(nao informado)'
  }
  const tipo = pega('Tipo de documento')
  const area = pega('Area do direito')
  const titulo = pega('Titulo')
  return [
    '=== DOCUMENTO SIMULADO (modo de teste AI_MOCK) ===',
    'Este texto foi gerado SEM chamar a IA, apenas para validar o fluxo.',
    'Para usar a IA real, remova AI_MOCK do .env.local.',
    '',
    'MINUTA - ' + tipo + ' (' + area + ')',
    'Referencia: ' + titulo,
    '',
    'I - DAS PARTES',
    'As partes qualificadas conforme o briefing fornecido pelo escritorio.',
    '',
    'II - DO OBJETO',
    'Documento juridico elaborado a partir do objetivo e dos fatos informados,',
    'em conformidade com a area do direito indicada.',
    '',
    'III - DAS CLAUSULAS',
    'Clausula 1a. [Conteudo simulado para teste de ponta a ponta.]',
    'Clausula 2a. [Na versao real, a IA redigira o texto completo aqui.]',
    '',
    'IV - DO FECHAMENTO',
    'Documento sujeito a revisao do operador e a aprovacao do advogado responsavel.',
    '',
    '[Fim do documento simulado]',
  ].join('\n')
}

export const MAX_OUTPUT_TOKENS = 6000

export const TRUNCATION_NOTICE =
  '\n\n[⚠️ TEXTO TRUNCADO - documento gerado excedeu limite de tokens. ' +
  'Operador deve solicitar continuação ou refazer com briefing mais objetivo.]'

export interface ClaudeResult { text: string; truncated: boolean }

/** Mantida para quem só quer o texto (ex.: read-process, que faz parse de JSON e não pode receber o aviso). */
export async function generateWithClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  return (await generateWithClaudeDetailed(systemPrompt, userPrompt)).text
}

/** Igual a generateWithClaude, mas informa se a IA parou por limite de tokens (stop_reason = max_tokens). */
export async function generateWithClaudeDetailed(systemPrompt: string, userPrompt: string): Promise<ClaudeResult> {
  // Interruptor de teste: pula a IA real e devolve uma minuta de exemplo.
  if (process.env.AI_MOCK === '1') {
    await new Promise((resolve) => setTimeout(resolve, 600))
    return { text: draftSimulado(userPrompt), truncated: false }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY não configurada')
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Anthropic API error (${response.status}): ${errBody}`)
  }

  const data = await response.json()
  const textBlock = data.content?.find((block: { type: string }) => block.type === 'text')
  if (!textBlock?.text) {
    throw new Error('Resposta da IA sem conteúdo de texto')
  }

  const truncated = data.stop_reason === 'max_tokens'
  if (truncated) console.warn('[ai] resposta truncada por max_tokens (' + MAX_OUTPUT_TOKENS + ')')
  return { text: textBlock.text as string, truncated }
}

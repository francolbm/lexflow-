import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateWithClaude, generateWithClaudeDetailed, MAX_OUTPUT_TOKENS, TRUNCATION_NOTICE } from './claude'

const reply = (over: Record<string, unknown>) =>
  vi.fn(async () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'minuta' }], ...over }), { status: 200 }))

describe('generateWithClaudeDetailed', () => {
  beforeEach(() => { process.env.ANTHROPIC_API_KEY = 'k'; delete process.env.AI_MOCK })
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('pede 6000 tokens de saída à API', async () => {
    const f = reply({ stop_reason: 'end_turn' }); vi.stubGlobal('fetch', f)
    await generateWithClaudeDetailed('sys', 'user')
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, { body: string }])[1].body)
    expect(body.max_tokens).toBe(6000); expect(MAX_OUTPUT_TOKENS).toBe(6000)
  })
  it('stop_reason max_tokens -> truncated true', async () => {
    vi.stubGlobal('fetch', reply({ stop_reason: 'max_tokens' })); vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await generateWithClaudeDetailed('s', 'u')).toEqual({ text: 'minuta', truncated: true })
  })
  it('stop_reason end_turn -> truncated false', async () => {
    vi.stubGlobal('fetch', reply({ stop_reason: 'end_turn' }))
    expect(await generateWithClaudeDetailed('s', 'u')).toEqual({ text: 'minuta', truncated: false })
  })
  it('generateWithClaude devolve só o texto, sem aviso (read-process faz parse de JSON)', async () => {
    vi.stubGlobal('fetch', reply({ stop_reason: 'max_tokens' })); vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await generateWithClaude('s', 'u')).toBe('minuta')
  })
  it('modo simulado nunca é truncado e não chama a API', async () => {
    process.env.AI_MOCK = '1'; const f = vi.fn(); vi.stubGlobal('fetch', f)
    const r = await generateWithClaudeDetailed('s', 'Tipo de documento: peticao')
    expect(r.truncated).toBe(false); expect(f).not.toHaveBeenCalled()
  })
  it('aviso de truncamento tem o texto combinado', () => {
    expect(TRUNCATION_NOTICE).toContain('[⚠️ TEXTO TRUNCADO'); expect(TRUNCATION_NOTICE).toContain('solicitar continuação')
  })
})

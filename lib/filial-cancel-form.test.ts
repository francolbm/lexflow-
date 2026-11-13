import { describe, it, expect } from 'vitest'
import {
  validateMotivo, canConfirm, shouldForce, accessUntilLabel, buildCancelRequest, mapCancelResponse,
  cancelTitle, demandasLabel, NETWORK_ERROR, GENERIC_ERROR,
} from './filial-cancel-form'
import { cancelBodySchema } from './filial-cancel'

describe('validateMotivo', () => {
  it('sem demandas: vazio é válido (opcional)', () => {
    expect(validateMotivo('', 0)).toBeNull()
    expect(validateMotivo('   ', 0)).toBeNull()
  })
  it('com demandas: vazio ou só espaços é obrigatório', () => {
    expect(validateMotivo('', 2)).toContain('motivo')
    expect(validateMotivo('    ', 1)).toContain('motivo')
  })
  it('limites: 2 inválido, 3 válido, 500 válido, 501 inválido (após o trim)', () => {
    expect(validateMotivo('ab', 0)).not.toBeNull()
    expect(validateMotivo('abc', 0)).toBeNull()
    expect(validateMotivo('a'.repeat(500), 0)).toBeNull()
    expect(validateMotivo('a'.repeat(501), 0)).not.toBeNull()
    expect(validateMotivo('  ab  ', 0)).not.toBeNull()          // trim: só 2 caracteres úteis
    expect(validateMotivo(`  ${'a'.repeat(500)}  `, 0)).toBeNull() // espaços nas pontas não contam
  })
  it('se preenchido sem demandas, também precisa ser válido', () => {
    expect(validateMotivo('x', 0)).not.toBeNull()
  })
  it('é idêntico ao servidor: mesma decisão do cancelBodySchema em vários casos', () => {
    for (const m of ['', ' ', 'a', 'ab', 'abc', ' abc ', 'a'.repeat(500), 'a'.repeat(501), '  ab  ']) {
      const server = m.trim() === '' ? false : cancelBodySchema.safeParse({ motivo: m }).success
      const client = validateMotivo(m, 1) === null // com demandas, vazio é erro (como no servidor)
      expect(client).toBe(server)
    }
  })
})

describe('canConfirm', () => {
  const base = { motivo: 'Encerramento da unidade', demandas: 2, entendi: true, busy: false }
  it('habilita com checkbox marcado e motivo válido', () => expect(canConfirm(base)).toBe(true))
  it('desabilita sem o checkbox', () => expect(canConfirm({ ...base, entendi: false })).toBe(false))
  it('desabilita durante o envio', () => expect(canConfirm({ ...base, busy: true })).toBe(false))
  it('com demandas, desabilita sem motivo; sem demandas, habilita sem motivo', () => {
    expect(canConfirm({ ...base, motivo: '' })).toBe(false)
    expect(canConfirm({ ...base, motivo: '', demandas: 0 })).toBe(true)
  })
  it('sem demandas mas com motivo curto demais: desabilita', () => {
    expect(canConfirm({ ...base, demandas: 0, motivo: 'ab' })).toBe(false)
  })
})

describe('shouldForce', () => {
  it('só força quando a tela exibiu o alerta de demandas', () => {
    expect(shouldForce(0)).toBe(false)
    expect(shouldForce(1)).toBe(true)
    expect(shouldForce(12)).toBe(true)
  })
})

describe('accessUntilLabel (data do checkbox)', () => {
  it('com data: formata no fuso de Brasília', () => expect(accessUntilLabel('2026-12-12T15:10:07+00:00')).toBe('12/12/2026'))
  it('sem data (null/undefined/inválida): "o fim do ciclo já pago"', () => {
    for (const v of [null, undefined, '', 'lixo']) expect(accessUntilLabel(v)).toBe('o fim do ciclo já pago')
  })
})

describe('buildCancelRequest', () => {
  it('sem force e sem motivo: DELETE simples, sem corpo, sem cache', () => {
    const { url, init } = buildCancelRequest('abc', { force: false, motivo: '' })
    expect(url).toBe('/api/escritorio/filial/abc')
    expect(init).toMatchObject({ method: 'DELETE', cache: 'no-store' })
    expect(init.body).toBeUndefined()
  })
  it('com force e motivo: ?force=true e { motivo } já sem espaços nas pontas', () => {
    const { url, init } = buildCancelRequest('abc', { force: true, motivo: '  Teste E2E cancelamento  ' })
    expect(url).toBe('/api/escritorio/filial/abc?force=true')
    expect(JSON.parse(init.body as string)).toEqual({ motivo: 'Teste E2E cancelamento' })
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
  })
  it('sem force mas com motivo (filial sem demandas): sem ?force, com corpo', () => {
    const { url, init } = buildCancelRequest('abc', { force: false, motivo: 'Fechamos a unidade' })
    expect(url).not.toContain('force')
    expect(init.body).toBeDefined()
  })
  it('o id é escapado na URL', () => {
    expect(buildCancelRequest('a/b?c', { force: false, motivo: '' }).url).toBe('/api/escritorio/filial/a%2Fb%3Fc')
  })
})

describe('mapCancelResponse', () => {
  it('200 → ok, com o fim do ciclo quando a API informa', () => {
    expect(mapCancelResponse(200, { cancels_at: '2026-12-12T14:02:25.000Z' })).toEqual({ kind: 'ok', cancelsAt: '2026-12-12T14:02:25.000Z' })
    expect(mapCancelResponse(200, {})).toEqual({ kind: 'ok', cancelsAt: null })
  })
  it('409 demandas_ativas → contagem da API (mínimo 1 se vier inválida)', () => {
    expect(mapCancelResponse(409, { error: 'demandas_ativas', active_demands: 3 })).toEqual({ kind: 'demandas_ativas', count: 3 })
    expect(mapCancelResponse(409, { error: 'demandas_ativas' })).toEqual({ kind: 'demandas_ativas', count: 1 })
  })
  it('409 filial_ja_cancelada', () => {
    expect(mapCancelResponse(409, { error: 'filial_ja_cancelada' })).toEqual({ kind: 'ja_cancelada' })
  })
  it('400 motivo_obrigatorio → mensagem da API, ou a padrão', () => {
    expect(mapCancelResponse(400, { error: 'motivo_obrigatorio', message: 'Informe o motivo.' })).toEqual({ kind: 'motivo', message: 'Informe o motivo.' })
    expect(mapCancelResponse(400, { error: 'motivo_obrigatorio' })).toMatchObject({ kind: 'motivo' })
  })
  it('403, 401 e 404 têm mensagem própria', () => {
    expect(mapCancelResponse(403, { error: 'x' })).toEqual({ kind: 'forbidden', message: 'Apenas o titular da matriz pode cancelar a filial.' })
    expect(mapCancelResponse(401, null)).toMatchObject({ kind: 'unauthorized' })
    expect(mapCancelResponse(404, undefined)).toMatchObject({ kind: 'notfound' })
  })
  it('500, outros 400/409 e lixo viram generic sem vazar a mensagem do servidor', () => {
    expect(mapCancelResponse(500, { error: 'sk_test_segredo' })).toEqual({ kind: 'generic', message: GENERIC_ERROR })
    expect(mapCancelResponse(400, { error: 'Identificador de filial inválido.' })).toMatchObject({ kind: 'generic' })
    expect(mapCancelResponse(409, { error: 'outra' })).toMatchObject({ kind: 'generic' })
    expect(mapCancelResponse(0, null)).toMatchObject({ kind: 'generic' })
  })
  it('mensagem de rede é fixa e clara', () => {
    expect(NETWORK_ERROR).toBe('Falha de conexão. Atualize a página antes de tentar de novo.')
  })
})

describe('textos', () => {
  it('título com o nome da filial e plural das demandas', () => {
    expect(cancelTitle({ name: 'Filial Rio' })).toBe('Cancelar filial Filial Rio')
    expect(demandasLabel(1)).toBe('1 demanda')
    expect(demandasLabel(3)).toBe('3 demandas')
  })
})

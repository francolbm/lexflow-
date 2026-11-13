import { describe, it, expect, vi, beforeEach } from 'vitest'
import { montarPrevia, type PreviaDeps, type MatrizForPreview } from './filial-previa'

const MATRIZ: MatrizForPreview = { id: 'm1', name: 'Matriz', plan_code: 'premium', status: 'active', stripe_subscription_id: 'sub_m' }

function makeDeps(over: Partial<PreviaDeps> = {}): PreviaDeps & Record<string, any> {
  return {
    getOwnedMatriz: vi.fn(async () => MATRIZ),
    getMatrizCnpj: vi.fn(async () => '11222333000181'),
    getPricing: vi.fn(async () => ({ fullCents: 99700, filialCents: 59820 })),
    getCard: vi.fn(async () => ({ marca: 'visa', final4: '4242' })),
    ...over,
  } as any
}

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}) })

describe('montarPrevia — permissão', () => {
  it('quem não é titular de nenhuma matriz: 403 e nada é consultado no Stripe', async () => {
    const d = makeDeps({ getOwnedMatriz: vi.fn(async () => null) })
    expect((await montarPrevia(d, 'u')).status).toBe(403)
    expect(d.getPricing).not.toHaveBeenCalled()
    expect(d.getCard).not.toHaveBeenCalled()
  })

  it.each([
    ['Pro', { plan_code: 'pro' }],
    ['cortesia (sem Stripe)', { stripe_subscription_id: null }],
    ['trialing', { status: 'trialing' }],
    ['past_due', { status: 'past_due' }],
    ['cancelada', { status: 'canceled' }],
  ])('matriz %s: 403', async (_n, over) => {
    const d = makeDeps({ getOwnedMatriz: vi.fn(async () => ({ ...MATRIZ, ...over })) })
    expect((await montarPrevia(d, 'u')).status).toBe(403)
    expect(d.getCard).not.toHaveBeenCalled()
  })
})

describe('montarPrevia — dados', () => {
  it('devolve valor, desconto, cartão e o CNPJ formatado da matriz', async () => {
    const r = await montarPrevia(makeDeps(), 'u')
    expect(r.status).toBe(200)
    expect(r.body).toEqual({
      matriz: { id: 'm1', name: 'Matriz', cnpj: '11.222.333/0001-81' },
      mensalidade_centavos: 59820, preco_cheio_centavos: 99700, desconto_percentual: 40,
      cartao: { marca: 'visa', final4: '4242' },
    })
  })

  it('consulta o cartão da assinatura da matriz', async () => {
    const d = makeDeps()
    await montarPrevia(d, 'u')
    expect(d.getCard).toHaveBeenCalledWith('sub_m')
  })

  it('matriz sem CNPJ cadastrado: cnpj nulo (o wizard confirma pelo nome)', async () => {
    const r = await montarPrevia(makeDeps({ getMatrizCnpj: vi.fn(async () => null) }), 'u')
    expect((r.body.matriz as any).cnpj).toBeNull()
  })

  it('Stripe fora do ar: 200 com valores nulos (o wizard bloqueia a criação, não mostra preço falso)', async () => {
    const r = await montarPrevia(makeDeps({ getPricing: vi.fn(async () => null) }), 'u')
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ mensalidade_centavos: null, preco_cheio_centavos: null, desconto_percentual: null })
  })

  it('erro ao buscar o cartão não derruba a prévia: cartao nulo', async () => {
    const r = await montarPrevia(makeDeps({ getCard: vi.fn(async () => { throw new Error('stripe') }) }), 'u')
    expect(r.status).toBe(200)
    expect(r.body.cartao).toBeNull()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { criarFilial, isValidCnpj, FilialHttpError, type FilialDeps } from './filial'

const USER = 'user-matriz'
const MATRIZ = { id: 'org-matriz', name: 'Matriz', parent_organization_id: null }
const SUB_OK = { plan_code: 'premium', status: 'active', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_m' }

const body = (over: Record<string, unknown> = {}) => ({
  name: 'Filial Cuiabá',
  cnpj: '11.222.333/0001-81',
  razao_social: 'Filial Cuiabá Advocacia LTDA',
  phone: '(65) 99999-1234',
  endereco: { logradouro: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'Cuiabá', estado: 'mt', cep: '78000-000' },
  advogado_titular: { email: 'Novo@Exemplo.com', nome_completo: 'Ana Souza', oab_number: '12345', oab_uf: 'mt' },
  ...over,
})

function makeDeps(over: Partial<FilialDeps> = {}): FilialDeps & Record<string, any> {
  const deps = {
    listOwnedOrgs: vi.fn(async () => [MATRIZ]),
    getSubscription: vi.fn(async () => SUB_OK),
    cnpjExists: vi.fn(async () => false),
    findUserIdByEmail: vi.fn(async () => null),
    createAuthUser: vi.fn(async () => 'user-novo'),
    deleteAuthUser: vi.fn(async () => {}),
    setNewUserProfile: vi.fn(async () => {}),
    fillOabIfEmpty: vi.fn(async () => {}),
    generateActivationLink: vi.fn(async () => 'https://link/ativar'),
    insertOrganization: vi.fn(async () => 'org-filial'),
    purgeOrganization: vi.fn(async () => {}),
    insertEndereco: vi.fn(async () => {}),
    insertSubscriptionRow: vi.fn(async () => {}),
    createStripeSubscription: vi.fn(async () => ({
      id: 'sub_f', status: 'active', priceId: 'price_p', periodStart: new Date(), periodEnd: new Date(),
    })),
    cancelStripeSubscription: vi.fn(async () => {}),
    updateSubscriptionFromStripe: vi.fn(async () => {}),
    activateOrganization: vi.fn(async () => {}),
    audit: vi.fn(async () => {}),
    ...over,
  }
  return deps as any
}

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}) })

describe('isValidCnpj', () => {
  it('aceita CNPJ válido com e sem máscara e recusa inválidos', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true)
    expect(isValidCnpj('11222333000181')).toBe(true)
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false)
    expect(isValidCnpj('00000000000000')).toBe(false)
    expect(isValidCnpj('123')).toBe(false)
  })
})

describe('criarFilial — validações (ordem e falha rápida)', () => {
  it('1) não titular: 403 sem tocar em mais nada', async () => {
    const d = makeDeps({ listOwnedOrgs: vi.fn(async () => []) })
    const r = await criarFilial(d, USER, body())
    expect(r.status).toBe(403)
    expect(d.getSubscription).not.toHaveBeenCalled()
  })

  it.each(['start', 'pro'])('2) plano %s: 403', async (plan) => {
    const d = makeDeps({ getSubscription: vi.fn(async () => ({ ...SUB_OK, plan_code: plan })) })
    const r = await criarFilial(d, USER, body())
    expect(r.status).toBe(403)
    expect(d.createStripeSubscription).not.toHaveBeenCalled()
  })

  it('3) matriz que já é filial: 403 (impede 3 níveis)', async () => {
    const d = makeDeps({ listOwnedOrgs: vi.fn(async () => [{ ...MATRIZ, parent_organization_id: 'org-x' }]) })
    const r = await criarFilial(d, USER, body())
    expect(r.status).toBe(403)
    expect(r.body.error).toMatch(/filial não pode/i)
    expect(d.insertOrganization).not.toHaveBeenCalled()
  })

  it('3) dono de matriz e de filial usa a matriz', async () => {
    const d = makeDeps({ listOwnedOrgs: vi.fn(async () => [{ ...MATRIZ, id: 'f', parent_organization_id: 'org-x' }, MATRIZ]) })
    const r = await criarFilial(d, USER, body())
    expect(r.status).toBe(201)
    expect(d.getSubscription).toHaveBeenCalledWith('org-matriz')
  })

  it.each([
    ['trialing', SUB_OK.stripe_customer_id, 'sub_m'],
    ['past_due', 'cus_1', 'sub_m'],
    ['canceled', 'cus_1', 'sub_m'],
    ['active', null, null], // cortesia (sem Stripe)
  ])('4) assinatura %s sem Stripe ativo: 403', async (status, cus, sid) => {
    const d = makeDeps({
      getSubscription: vi.fn(async () => ({ ...SUB_OK, status, stripe_customer_id: cus, stripe_subscription_id: sid })),
    })
    const r = await criarFilial(d, USER, body())
    expect(r.status).toBe(403)
    expect(d.cnpjExists).not.toHaveBeenCalled()
  })

  it('5) CNPJ duplicado: 409 antes de criar usuário', async () => {
    const d = makeDeps({ cnpjExists: vi.fn(async () => true) })
    const r = await criarFilial(d, USER, body())
    expect(r.status).toBe(409)
    expect(d.createAuthUser).not.toHaveBeenCalled()
    expect(d.createStripeSubscription).not.toHaveBeenCalled()
  })

  it('CNPJ com dígito verificador errado: 400', async () => {
    const d = makeDeps()
    expect((await criarFilial(d, USER, body({ cnpj: '11.222.333/0001-82' }))).status).toBe(400)
  })

  it('6) e-mail inválido: 400', async () => {
    const d = makeDeps()
    const b = body({ advogado_titular: { email: 'nao-e-email', nome_completo: 'Ana', oab_number: '1', oab_uf: 'MT' } })
    const r = await criarFilial(d, USER, b)
    expect(r.status).toBe(400)
    expect(d.createAuthUser).not.toHaveBeenCalled()
  })

  it.each([
    ['sem número', { email: 'a@b.com', nome_completo: 'Ana', oab_uf: 'MT' }],
    ['sem UF', { email: 'a@b.com', nome_completo: 'Ana', oab_number: '1' }],
    ['UF inexistente', { email: 'a@b.com', nome_completo: 'Ana', oab_number: '1', oab_uf: 'XX' }],
  ])('7) OAB %s: 400', async (_n, adv) => {
    const d = makeDeps()
    expect((await criarFilial(d, USER, body({ advogado_titular: adv }))).status).toBe(400)
    expect(d.insertOrganization).not.toHaveBeenCalled()
  })
})

describe('criarFilial — sucesso', () => {
  it('titular novo: cria tudo, devolve link, cobra com o customer e o coupon da matriz', async () => {
    const d = makeDeps()
    const r = await criarFilial(d, USER, body())
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ organization_id: 'org-filial', activation_link: 'https://link/ativar', titular_existente: false })
    expect(d.insertOrganization).toHaveBeenCalledWith({
      name: 'Filial Cuiabá', phone: '(65) 99999-1234', ownerUserId: 'user-novo', parentId: 'org-matriz',
    })
    expect(vi.mocked(d.insertEndereco).mock.calls[0][0]).toMatchObject({ cnpj: '11222333000181', estado: 'MT', cep: '78000000' })
    expect(d.createStripeSubscription).toHaveBeenCalledWith({
      customerId: 'cus_1',
      matrizSubscriptionId: 'sub_m',
      metadata: { organization_id: 'org-filial', parent_organization_id: 'org-matriz' },
      idempotencyKey: 'filial-org-filial',
    })
    expect(d.setNewUserProfile).toHaveBeenCalledWith('user-novo', expect.objectContaining({ email: 'novo@exemplo.com', oabUf: 'MT' }))
    expect(d.activateOrganization).toHaveBeenCalledWith('org-filial')
    expect(d.purgeOrganization).not.toHaveBeenCalled()
  })

  it('titular existente que já é dono de outro escritório: 409, nada criado', async () => {
    const d = makeDeps({
      findUserIdByEmail: vi.fn(async () => 'user-antigo'),
      listOwnedOrgs: vi.fn(async (u: string) => (u === USER ? [MATRIZ] : [{ id: 'o2', name: 'x', parent_organization_id: null }])),
    })
    const r = await criarFilial(d, USER, body())
    expect(r.status).toBe(409)
    expect(r.body.error).toBe('titular_ja_vinculado')
    expect(r.body.message).toBe(
      'Este advogado já é titular de outro escritório no PennaJus. Use outro e-mail OU aguarde a Fase 2, ' +
      'quando será possível dar titularidade de múltiplos escritórios à mesma pessoa.',
    )
    expect(d.insertOrganization).not.toHaveBeenCalled()
    expect(d.deleteAuthUser).not.toHaveBeenCalled()
  })

  it('titular já existente: vincula SEM link e sem recriar perfil', async () => {
    const d = makeDeps({
      findUserIdByEmail: vi.fn(async () => 'user-antigo'),
      listOwnedOrgs: vi.fn(async (u: string) => (u === USER ? [MATRIZ] : [])),
    })
    const r = await criarFilial(d, USER, body())
    expect(r.status).toBe(201)
    expect(r.body.activation_link).toBeNull()
    expect(r.body.titular_existente).toBe(true)
    expect(d.generateActivationLink).not.toHaveBeenCalled()
    expect(d.createAuthUser).not.toHaveBeenCalled()
    expect(d.setNewUserProfile).not.toHaveBeenCalled()
    expect(d.fillOabIfEmpty).toHaveBeenCalledWith('user-antigo', '12345', 'MT')
    expect(d.insertOrganization).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 'user-antigo' }))
  })

  it('falha na auditoria não desfaz a filial', async () => {
    const d = makeDeps({ audit: vi.fn(async () => { throw new Error('x') }) })
    expect((await criarFilial(d, USER, body())).status).toBe(201)
    expect(d.purgeOrganization).not.toHaveBeenCalled()
  })
})

describe('criarFilial — rollback', () => {
  it('Stripe falha: apaga org e usuário NOVO; nada a cancelar', async () => {
    const d = makeDeps({ createStripeSubscription: vi.fn(async () => { throw new Error('boom') }) })
    const r = await criarFilial(d, USER, body())
    expect(r.status).toBe(500)
    expect(r.body.rollback).toBe('completo')
    expect(d.purgeOrganization).toHaveBeenCalledWith('org-filial')
    expect(d.deleteAuthUser).toHaveBeenCalledWith('user-novo')
    expect(d.cancelStripeSubscription).not.toHaveBeenCalled()
  })

  it('Stripe falha com titular existente: NÃO apaga a conta dele', async () => {
    const d = makeDeps({
      findUserIdByEmail: vi.fn(async () => 'user-antigo'),
      listOwnedOrgs: vi.fn(async (u: string) => (u === USER ? [MATRIZ] : [])),
      createStripeSubscription: vi.fn(async () => { throw new Error('boom') }),
    })
    await criarFilial(d, USER, body())
    expect(d.purgeOrganization).toHaveBeenCalled()
    expect(d.deleteAuthUser).not.toHaveBeenCalled()
  })

  it('erro depois do Stripe (ativação): cancela a assinatura, apaga org e usuário, nessa ordem', async () => {
    const order: string[] = []
    const d = makeDeps({
      activateOrganization: vi.fn(async () => { throw new Error('db') }),
      cancelStripeSubscription: vi.fn(async () => { order.push('cancel') }),
      purgeOrganization: vi.fn(async () => { order.push('purge') }),
      deleteAuthUser: vi.fn(async () => { order.push('user') }),
    })
    const r = await criarFilial(d, USER, body())
    expect(r.status).toBe(500)
    expect(order).toEqual(['cancel', 'purge', 'user'])
    expect(d.cancelStripeSubscription).toHaveBeenCalledWith('sub_f')
  })

  it('CNPJ duplicado pego pelo índice único: 409 + rollback', async () => {
    const d = makeDeps({ insertEndereco: vi.fn(async () => { throw new FilialHttpError(409, 'CNPJ duplicado') }) })
    const r = await criarFilial(d, USER, body())
    expect(r.status).toBe(409)
    expect(d.purgeOrganization).toHaveBeenCalled()
    expect(d.createStripeSubscription).not.toHaveBeenCalled()
  })

  it('matriz sem cartão (409 matriz_sem_cartao): desfaz tudo e devolve o código', async () => {
    const d = makeDeps({ createStripeSubscription: vi.fn(async () => { throw new FilialHttpError(409, 'sem cartão', 'matriz_sem_cartao') }) })
    const r = await criarFilial(d, USER, body())
    expect(r.status).toBe(409)
    expect(r.body.error).toBe('matriz_sem_cartao')
    expect(d.purgeOrganization).toHaveBeenCalled()
    expect(d.deleteAuthUser).toHaveBeenCalledWith('user-novo')
  })

  it('cartão recusado (402) vira 402 e desfaz', async () => {
    const d = makeDeps({ createStripeSubscription: vi.fn(async () => { throw new FilialHttpError(402, 'recusado') }) })
    const r = await criarFilial(d, USER, body())
    expect(r.status).toBe(402)
    expect(d.purgeOrganization).toHaveBeenCalled()
  })

  it('um desfazer que falha não impede os outros e marca rollback parcial', async () => {
    const d = makeDeps({
      activateOrganization: vi.fn(async () => { throw new Error('db') }),
      cancelStripeSubscription: vi.fn(async () => { throw new Error('stripe fora') }),
    })
    const r = await criarFilial(d, USER, body())
    expect(r.body.rollback).toBe('parcial')
    expect(d.purgeOrganization).toHaveBeenCalled()
    expect(d.deleteAuthUser).toHaveBeenCalled()
  })

  it('a resposta de erro não vaza mensagem interna', async () => {
    const d = makeDeps({ createStripeSubscription: vi.fn(async () => { throw new Error('sk_test_segredo') }) })
    const r = await criarFilial(d, USER, body())
    expect(JSON.stringify(r.body)).not.toContain('sk_test')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listarFiliais, formatCnpj, type ListDeps, type CandidateOrg, type SubRow } from './filial-list'

const USER = 'u1'
const MATRIZ: CandidateOrg = { id: 'm1', name: 'Matriz', parent_organization_id: null, plan_code: 'premium' }
const FIM = '2026-12-12T14:02:25+00:00'
const MENSAL = 59820

const subAtiva = (id: string): SubRow => ({ organization_id: id, status: 'active', stripe_subscription_id: 'sub_' + id, cancel_at_period_end: false, current_period_end: FIM })

function makeDeps(over: Partial<ListDeps> = {}): ListDeps & Record<string, any> {
  return {
    listCandidateOrgs: vi.fn(async () => [MATRIZ]),
    listFiliais: vi.fn(async () => [
      { id: 'fa', name: 'Filial Ativa', status: 'active', deleted_at: null, created_at: '2026-11-12T10:00:00Z' },
      { id: 'fc', name: 'Filial Cancelada', status: 'pending_deletion', deleted_at: '2026-11-12T14:24:09Z', created_at: '2026-11-12T11:00:00Z' },
    ]),
    getEnderecos: vi.fn(async () => [
      { organization_id: 'fa', cnpj: '11222333000181', cidade: 'Cuiabá', estado: 'MT' },
      { organization_id: 'fc', cnpj: '11.444.777/0001-61', cidade: 'Rio de Janeiro', estado: 'RJ' },
    ]),
    countOpenDemands: vi.fn(async () => ({ fa: 0, fc: 1 })),
    countActiveLawyers: vi.fn(async () => ({ fa: 2, fc: 1 })),
    getSubscriptions: vi.fn(async () => [subAtiva('fa'), { ...subAtiva('fc'), cancel_at_period_end: true }]),
    getFilialMonthlyCents: vi.fn(async () => MENSAL),
    ...over,
  } as any
}
const items = (r: { body: Record<string, any> }) => r.body.filiais as Array<Record<string, any>>

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}) })

describe('listarFiliais — permissão', () => {
  it('sem escritório nenhum: 403 e não consulta filiais', async () => {
    const d = makeDeps({ listCandidateOrgs: vi.fn(async () => []) })
    expect((await listarFiliais(d, USER)).status).toBe(403)
    expect(d.listFiliais).not.toHaveBeenCalled()
  })

  it.each(['pro', 'start', null])('titular de escritório com plano %s: 403', async (plan) => {
    const d = makeDeps({ listCandidateOrgs: vi.fn(async () => [{ ...MATRIZ, plan_code: plan }]) })
    expect((await listarFiliais(d, USER)).status).toBe(403)
  })

  it('titular/admin de uma FILIAL Premium (não é matriz): 403', async () => {
    const d = makeDeps({ listCandidateOrgs: vi.fn(async () => [{ ...MATRIZ, id: 'f', parent_organization_id: 'm1' }]) })
    expect((await listarFiliais(d, USER)).status).toBe(403)
    expect(d.listFiliais).not.toHaveBeenCalled()
  })

  it('admin designado da matriz Premium (não titular) pode listar', async () => {
    const d = makeDeps() // listCandidateOrgs cobre titular OU admin; o filtro é o mesmo
    expect((await listarFiliais(d, 'admin-designado')).status).toBe(200)
    expect(d.listCandidateOrgs).toHaveBeenCalledWith('admin-designado')
  })

  it('só consulta as filiais da matriz do usuário (nunca de outra)', async () => {
    const d = makeDeps()
    await listarFiliais(d, USER)
    expect(d.listFiliais).toHaveBeenCalledWith('m1')
    for (const fn of ['getEnderecos', 'countOpenDemands', 'countActiveLawyers', 'getSubscriptions']) {
      expect(d[fn]).toHaveBeenCalledWith(['fa', 'fc'])
    }
  })
})

describe('listarFiliais — dados', () => {
  it('matriz sem filiais: 200 com lista vazia e sem consultas extras', async () => {
    const d = makeDeps({ listFiliais: vi.fn(async () => []) })
    const r = await listarFiliais(d, USER)
    expect(r.status).toBe(200)
    expect(items(r)).toEqual([])
    expect(d.getEnderecos).not.toHaveBeenCalled()
  })

  it('filial ativa: cobra, tem next_billing_date e cancels_at nulo', async () => {
    const a = items(await listarFiliais(makeDeps(), USER)).find((i) => i.id === 'fa')!
    expect(a).toMatchObject({
      name: 'Filial Ativa', cnpj: '11.222.333/0001-81', cidade: 'Cuiabá', estado: 'MT', status: 'active',
      num_demandas_abertas: 0, num_advogados_ativos: 2,
      faturamento_mensal_estimado_centavos: MENSAL, faturamento_mensal_estimado: 598.2,
      next_billing_date: FIM, cancels_at: null,
    })
  })

  it('filial cancelada: R$ 0, next_billing_date nulo, cancels_at preenchido, demandas visíveis', async () => {
    const c = items(await listarFiliais(makeDeps(), USER)).find((i) => i.id === 'fc')!
    expect(c).toMatchObject({
      status: 'pending_deletion', num_demandas_abertas: 1,
      faturamento_mensal_estimado_centavos: 0, faturamento_mensal_estimado: 0,
      next_billing_date: null, cancels_at: FIM,
    })
  })

  it('resumo soma só quem vai renovar', async () => {
    const r = await listarFiliais(makeDeps(), USER)
    expect(r.body.resumo).toEqual({ total: 2, ativas: 1, canceladas: 1, faturamento_mensal_estimado_centavos: MENSAL })
  })

  it.each([['past_due', true], ['trialing', true], ['canceled', false], ['unpaid', false], ['incomplete', false]])(
    'assinatura %s: renova=%s', async (status, renews) => {
      const d = makeDeps({ getSubscriptions: vi.fn(async () => [{ ...subAtiva('fa'), status }, subAtiva('fc')]) })
      const a = items(await listarFiliais(d, USER)).find((i) => i.id === 'fa')!
      expect(a.faturamento_mensal_estimado_centavos).toBe(renews ? MENSAL : 0)
      expect(a.next_billing_date).toBe(renews ? FIM : null)
    })

  it('filial ativa sem assinatura no Stripe (cortesia): R$ 0 e sem data de cobrança', async () => {
    const d = makeDeps({ getSubscriptions: vi.fn(async () => [{ ...subAtiva('fa'), stripe_subscription_id: null }]) })
    const a = items(await listarFiliais(d, USER)).find((i) => i.id === 'fa')!
    expect(a).toMatchObject({ faturamento_mensal_estimado_centavos: 0, next_billing_date: null })
  })

  it('assinatura com cancelamento agendado mesmo com org ativa: vira cancels_at', async () => {
    const d = makeDeps({ getSubscriptions: vi.fn(async () => [{ ...subAtiva('fa'), cancel_at_period_end: true }, subAtiva('fc')]) })
    const a = items(await listarFiliais(d, USER)).find((i) => i.id === 'fa')!
    expect(a).toMatchObject({ next_billing_date: null, cancels_at: FIM, faturamento_mensal_estimado_centavos: 0 })
  })

  it('Stripe fora do ar: a lista continua, com faturamento nulo (não 0 falso)', async () => {
    const d = makeDeps({ getFilialMonthlyCents: vi.fn(async () => null) })
    const r = await listarFiliais(d, USER)
    expect(r.status).toBe(200)
    const [a, c] = items(r)
    expect(a.faturamento_mensal_estimado).toBeNull()
    expect(c.faturamento_mensal_estimado).toBe(0)
    expect(r.body.resumo).toMatchObject({ faturamento_mensal_estimado_centavos: null })
  })

  it('sem endereço, campos vêm nulos em vez de quebrar', async () => {
    const d = makeDeps({ getEnderecos: vi.fn(async () => []) })
    expect(items(await listarFiliais(d, USER))[0]).toMatchObject({ cnpj: null, cidade: null, estado: null })
  })

  it('número de consultas não cresce com a quantidade de filiais', async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ id: 'f' + i, name: 'F' + i, status: 'active', deleted_at: null, created_at: '2026-11-12T10:00:00Z' }))
    const d = makeDeps({ listFiliais: vi.fn(async () => many), getEnderecos: vi.fn(async () => []), getSubscriptions: vi.fn(async () => []) })
    await listarFiliais(d, USER)
    for (const fn of ['listCandidateOrgs', 'listFiliais', 'getEnderecos', 'countOpenDemands', 'countActiveLawyers', 'getSubscriptions', 'getFilialMonthlyCents']) {
      expect(d[fn]).toHaveBeenCalledTimes(1)
    }
  })
})

describe('formatCnpj', () => {
  it('formata dígitos, preserva já formatado e tolera nulo/valor estranho', () => {
    expect(formatCnpj('11222333000181')).toBe('11.222.333/0001-81')
    expect(formatCnpj('11.222.333/0001-81')).toBe('11.222.333/0001-81')
    expect(formatCnpj(null)).toBeNull()
    expect(formatCnpj('123')).toBe('123')
  })
})

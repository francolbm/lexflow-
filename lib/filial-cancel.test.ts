import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cancelarFilial, type CancelDeps, type OrgRow } from './filial-cancel'

const TITULAR = 'user-matriz'
const FILIAL: OrgRow = { id: 'f1', name: 'Filial', parent_organization_id: 'm1', status: 'active' }
const FIM = new Date('2026-12-12T14:02:25Z')

function makeDeps(over: Partial<CancelDeps> = {}): CancelDeps & Record<string, any> {
  return {
    getOrganization: vi.fn(async (id: string) => (id === 'f1' ? FILIAL : null)),
    getOwnerUserId: vi.fn(async (id: string) => (id === 'm1' ? TITULAR : 'outro-dono')),
    countActiveDemands: vi.fn(async () => 0),
    getStripeSubscriptionId: vi.fn(async () => 'sub_f'),
    scheduleStripeCancel: vi.fn(async () => FIM),
    unscheduleStripeCancel: vi.fn(async () => {}),
    markPendingDeletion: vi.fn(async () => true),
    markSubscriptionCancelling: vi.fn(async () => {}),
    audit: vi.fn(async () => {}),
    ...over,
  } as any
}
const run = (d: CancelDeps, o: Partial<{ user: string; id: string; force: boolean; body: unknown }> = {}) =>
  cancelarFilial(d, o.user ?? TITULAR, o.id ?? 'f1', { force: o.force ?? false, rawBody: o.body })

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}) })

describe('cancelarFilial — autorização e validações', () => {
  it('filial inexistente: 404', async () => {
    const d = makeDeps()
    expect((await run(d, { id: 'nao-existe' })).status).toBe(404)
  })

  it('quem não é titular da matriz: 403 e nada é tocado', async () => {
    const d = makeDeps()
    const r = await run(d, { user: 'intruso' })
    expect(r.status).toBe(403)
    expect(d.scheduleStripeCancel).not.toHaveBeenCalled()
    expect(d.markPendingDeletion).not.toHaveBeenCalled()
  })

  it('titular da própria FILIAL (não da matriz): 403', async () => {
    const d = makeDeps({ getOwnerUserId: vi.fn(async (id: string) => (id === 'm1' ? TITULAR : 'dono-filial')) })
    expect((await run(d, { user: 'dono-filial' })).status).toBe(403)
  })

  it('escritório que não é filial: 400 para o dono, 403 para estranho (não revela o tipo)', async () => {
    const matriz: OrgRow = { id: 'm1', name: 'Matriz', parent_organization_id: null, status: 'active' }
    const d = makeDeps({ getOrganization: vi.fn(async () => matriz) })
    expect((await run(d, { id: 'm1' })).status).toBe(400)
    expect((await run(d, { id: 'm1', user: 'intruso' })).status).toBe(403)
    expect(d.scheduleStripeCancel).not.toHaveBeenCalled()
  })

  it('já em pending_deletion: 409 filial_ja_cancelada (idempotente, sem tocar no Stripe)', async () => {
    const d = makeDeps({ getOrganization: vi.fn(async () => ({ ...FILIAL, status: 'pending_deletion' })) })
    const r = await run(d)
    expect(r.status).toBe(409)
    expect(r.body.error).toBe('filial_ja_cancelada')
    expect(d.scheduleStripeCancel).not.toHaveBeenCalled()
  })

  it('corrida: outra chamada cancelou entre a leitura e a escrita: 409 e desfaz o agendamento', async () => {
    const d = makeDeps({ markPendingDeletion: vi.fn(async () => false) })
    const r = await run(d)
    expect(r.status).toBe(409)
    expect(d.unscheduleStripeCancel).toHaveBeenCalledWith('sub_f')
  })
})

describe('cancelarFilial — demandas ativas', () => {
  it('com demandas e sem force: 409 demandas_ativas com a contagem, nada muda', async () => {
    const d = makeDeps({ countActiveDemands: vi.fn(async () => 3) })
    const r = await run(d)
    expect(r.status).toBe(409)
    expect(r.body).toMatchObject({ error: 'demandas_ativas', active_demands: 3 })
    expect(String(r.body.message)).toContain('?force=true')
    expect(d.scheduleStripeCancel).not.toHaveBeenCalled()
  })

  it.each([[undefined], [{}], [{ motivo: '' }], [{ motivo: 'ab' }]])('com demandas + force mas motivo inválido (%j): 400', async (body) => {
    const d = makeDeps({ countActiveDemands: vi.fn(async () => 2) })
    const r = await run(d, { force: true, body })
    expect(r.status).toBe(400)
    expect(r.body.error).toBe('motivo_obrigatorio')
    expect(d.scheduleStripeCancel).not.toHaveBeenCalled()
  })

  it('com demandas + force + motivo: 200 e registra forced', async () => {
    const d = makeDeps({ countActiveDemands: vi.fn(async () => 2) })
    const r = await run(d, { force: true, body: { motivo: 'Encerramento da unidade' } })
    expect(r.status).toBe(200)
    expect(r.body.active_demands).toBe(2)
    expect(vi.mocked(d.audit).mock.calls[0][0].newData).toMatchObject({ motivo: 'Encerramento da unidade', forced: true, active_demands: 2 })
  })

  it('?force=true sem demandas não vira "forced" na auditoria', async () => {
    const d = makeDeps()
    await run(d, { force: true, body: { motivo: 'Teste E2E cancelamento' } })
    expect(vi.mocked(d.audit).mock.calls[0][0].newData.forced).toBe(false)
  })
})

describe('cancelarFilial — sucesso', () => {
  it('sem demandas e sem motivo: 200, agenda no Stripe, marca no banco, devolve o fim do ciclo', async () => {
    const d = makeDeps()
    const r = await run(d)
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ status: 'pending_deletion', organization_id: 'f1', cancels_at: FIM.toISOString(), active_demands: 0 })
    expect(d.scheduleStripeCancel).toHaveBeenCalledWith('sub_f')
    expect(d.markPendingDeletion).toHaveBeenCalledWith('f1')
    expect(d.markSubscriptionCancelling).toHaveBeenCalledWith('f1', FIM)
  })

  it('motivo opcional, mas se vier curto demais: 400', async () => {
    const d = makeDeps()
    expect((await run(d, { body: { motivo: 'x' } })).status).toBe(400)
    expect(d.scheduleStripeCancel).not.toHaveBeenCalled()
  })

  it('sem assinatura no Stripe: marca a filial e não chama o Stripe', async () => {
    const d = makeDeps({ getStripeSubscriptionId: vi.fn(async () => null) })
    const r = await run(d)
    expect(r.status).toBe(200)
    expect(r.body.cancels_at).toBeNull()
    expect(d.scheduleStripeCancel).not.toHaveBeenCalled()
  })

  it('falha em subscriptions ou auditoria depois de cancelar não vira erro', async () => {
    const d = makeDeps({
      markSubscriptionCancelling: vi.fn(async () => { throw new Error('x') }),
      audit: vi.fn(async () => { throw new Error('y') }),
    })
    expect((await run(d)).status).toBe(200)
    expect(d.unscheduleStripeCancel).not.toHaveBeenCalled()
  })
})

describe('cancelarFilial — falhas', () => {
  it('Stripe falha: 500, nada marcado no banco', async () => {
    const d = makeDeps({ scheduleStripeCancel: vi.fn(async () => { throw new Error('sk_test_segredo') }) })
    const r = await run(d)
    expect(r.status).toBe(500)
    expect(JSON.stringify(r.body)).not.toContain('sk_test')
    expect(d.markPendingDeletion).not.toHaveBeenCalled()
  })

  it('banco falha depois do Stripe: desfaz o agendamento', async () => {
    const d = makeDeps({ markPendingDeletion: vi.fn(async () => { throw new Error('db') }) })
    const r = await run(d)
    expect(r.status).toBe(500)
    expect(r.body.rollback).toBe('completo')
    expect(d.unscheduleStripeCancel).toHaveBeenCalledWith('sub_f')
  })

  it('banco falha e o desfazer também: rollback parcial', async () => {
    const d = makeDeps({
      markPendingDeletion: vi.fn(async () => { throw new Error('db') }),
      unscheduleStripeCancel: vi.fn(async () => { throw new Error('stripe fora') }),
    })
    expect((await run(d)).body.rollback).toBe('parcial')
  })
})

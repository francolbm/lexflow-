import { describe, it, expect } from 'vitest'
import { decideGroupAccess, type OwnedOrgRow } from './filiais-access'

const sub = (over = {}) => ({ plan_code: 'premium', status: 'active', stripe_subscription_id: 'sub_1', ...over })
const org = (over: Partial<OwnedOrgRow> = {}): OwnedOrgRow => ({
  id: 'm1', name: 'Matriz', parent_organization_id: null, subscriptions: sub(), ...over,
})

describe('decideGroupAccess', () => {
  it('titular de matriz Premium com assinatura ativa no Stripe: acesso', () => {
    expect(decideGroupAccess([org()])).toEqual({ eligible: true, orgId: 'm1', orgName: 'Matriz' })
  })

  it('aceita a assinatura como array (1:1 pode vir de qualquer forma do PostgREST)', () => {
    expect(decideGroupAccess([org({ subscriptions: [sub()] })]).eligible).toBe(true)
  })

  it.each([
    ['Pro', { plan_code: 'pro' }],
    ['Start', { plan_code: 'start' }],
    ['cortesia (sem Stripe)', { stripe_subscription_id: null }],
    ['em teste (trialing)', { status: 'trialing' }],
    ['inadimplente', { status: 'past_due' }],
    ['cancelada', { status: 'canceled' }],
  ])('plano/assinatura %s: sem acesso', (_n, over) => {
    expect(decideGroupAccess([org({ subscriptions: sub(over) })]).eligible).toBe(false)
  })

  it('titular de FILIAL Premium: sem acesso (filial nunca é matriz)', () => {
    expect(decideGroupAccess([org({ parent_organization_id: 'm0' })]).eligible).toBe(false)
  })

  it('sem escritório, sem assinatura ou resposta vazia: sem acesso', () => {
    expect(decideGroupAccess([]).eligible).toBe(false)
    expect(decideGroupAccess(null).eligible).toBe(false)
    expect(decideGroupAccess(undefined).eligible).toBe(false)
    expect(decideGroupAccess([org({ subscriptions: null })]).eligible).toBe(false)
  })

  it('dono de uma filial e de uma matriz: acesso pela matriz', () => {
    const r = decideGroupAccess([org({ id: 'f', parent_organization_id: 'm1' }), org()])
    expect(r).toEqual({ eligible: true, orgId: 'm1', orgName: 'Matriz' })
  })
})

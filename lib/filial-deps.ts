// Implementação real (Supabase service_role + Stripe) das dependências de lib/filial.ts.
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe, getStripePriceId } from '@/lib/stripe'
import { FILIAL_COUPON_ID, FilialHttpError, type FilialDeps } from '@/lib/filial'
import { DEMANDAS_ENCERRADAS, type CancelDeps } from '@/lib/filial-cancel'
import type { ListDeps } from '@/lib/filial-list'

export function createFilialDeps(redirectBase: string): FilialDeps {
  const db = createServiceClient()
  const must = <T>(r: { data: T; error: { message: string; code?: string } | null }, what: string): T => {
    if (r.error) throw new Error(`${what}: ${r.error.message}`)
    return r.data
  }

  return {
    async listOwnedOrgs(userId) {
      const r = await db.from('organizations').select('id, name, parent_organization_id')
        .eq('owner_user_id', userId).order('created_at')
      return must(r, 'listOwnedOrgs') ?? []
    },

    async getSubscription(orgId) {
      const r = await db.from('subscriptions')
        .select('plan_code, status, stripe_customer_id, stripe_subscription_id')
        .eq('organization_id', orgId).maybeSingle()
      return must(r, 'getSubscription')
    },

    async cnpjExists(digits) {
      // O índice único compara só dígitos; o cadastro antigo pode ter gravado com máscara.
      const masked = digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
      const r = await db.from('endereco').select('id').in('cnpj', [digits, masked]).limit(1)
      return (must(r, 'cnpjExists') ?? []).length > 0
    },

    async findUserIdByEmail(email) {
      const r = await db.from('profiles').select('id').eq('email', email).maybeSingle()
      return must(r, 'findUserIdByEmail')?.id ?? null
    },

    async createAuthUser(email, fullName) {
      const { data, error } = await db.auth.admin.createUser({
        email, email_confirm: true, user_metadata: { full_name: fullName, email },
      })
      if (error || !data.user) throw new Error(`createAuthUser: ${error?.message ?? 'sem usuário'}`)
      return data.user.id
    },

    async deleteAuthUser(userId) {
      const { error } = await db.auth.admin.deleteUser(userId)
      if (error) throw new Error(`deleteAuthUser: ${error.message}`)
    },

    async setNewUserProfile(userId, p) {
      // handle_new_user já criou a linha; admin da organização é cliente ('advogado'), nunca equipe PennaJus.
      const r = await db.from('profiles').upsert({
        id: userId, full_name: p.fullName, email: p.email, role: 'advogado',
        oab_number: p.oabNumber, oab_uf: p.oabUf,
      })
      must(r, 'setNewUserProfile')
    },

    async fillOabIfEmpty(userId, oabNumber, oabUf) {
      const cur = must(await db.from('profiles').select('oab_number, oab_uf').eq('id', userId).maybeSingle(), 'fillOab.read')
      if (cur && !cur.oab_number && !cur.oab_uf) {
        must(await db.from('profiles').update({ oab_number: oabNumber, oab_uf: oabUf }).eq('id', userId), 'fillOab.write')
      }
    },

    async generateActivationLink(email) {
      const { data, error } = await db.auth.admin.generateLink({
        type: 'magiclink', email, options: { redirectTo: `${redirectBase}/alterar-senha` },
      })
      if (error || !data?.properties?.action_link) throw new Error(`generateLink: ${error?.message ?? 'sem link'}`)
      return data.properties.action_link
    },

    async insertOrganization(o) {
      const r = await db.from('organizations').insert({
        name: o.name, phone: o.phone, owner_user_id: o.ownerUserId,
        parent_organization_id: o.parentId, status: 'pending_activation',
      }).select('id').single()
      return must(r, 'insertOrganization')!.id
    },

    async purgeOrganization(orgId) {
      must(await db.from('organizations').delete().eq('id', orgId), 'purgeOrganization')
    },

    async insertEndereco(e) {
      const { error } = await db.from('endereco').insert(e)
      if (error?.code === '23505') throw new FilialHttpError(409, 'Já existe um escritório cadastrado com este CNPJ.')
      if (error) throw new Error(`insertEndereco: ${error.message}`)
    },

    async insertSubscriptionRow(s) {
      must(await db.from('subscriptions').insert({
        organization_id: s.orgId, plan_code: 'premium', status: 'incomplete',
        billing_email: s.billingEmail, demands_limit: s.demandsLimit, stripe_customer_id: s.customerId,
      }), 'insertSubscriptionRow')
    },

    async createStripeSubscription({ customerId, matrizSubscriptionId, metadata, idempotencyKey }) {
      const priceId = getStripePriceId('premium')
      const stripe = getStripe()
      // O Checkout grava o cartão na assinatura, não como padrão do cliente: usa o da assinatura da matriz.
      const matriz = await stripe.subscriptions.retrieve(matrizSubscriptionId, { expand: ['customer'] })
      const pmOf = (v: unknown): string | null =>
        typeof v === 'string' ? v : (v as { id?: string } | null)?.id ?? null
      const customer = matriz.customer as import('stripe').Stripe.Customer
      const paymentMethod = pmOf(matriz.default_payment_method)
        ?? pmOf((customer as { invoice_settings?: { default_payment_method?: unknown } }).invoice_settings?.default_payment_method)
      if (!paymentMethod) {
        throw new FilialHttpError(409, 'A matriz não tem um cartão cadastrado para cobrar a nova filial.', 'matriz_sem_cartao')
      }
      try {
        const sub = await stripe.subscriptions.create({
          customer: customerId,
          default_payment_method: paymentMethod,
          items: [{ price: priceId }],
          discounts: [{ coupon: FILIAL_COUPON_ID }],
          payment_behavior: 'error_if_incomplete',
          metadata,
        }, { idempotencyKey })
        const item = sub.items.data[0]
        return {
          id: sub.id,
          status: sub.status,
          priceId: item?.price.id ?? priceId,
          periodStart: item?.current_period_start ? new Date(item.current_period_start * 1000) : null,
          periodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
        }
      } catch (err: any) {
        if (err?.type === 'StripeCardError') {
          throw new FilialHttpError(402, 'O cartão da matriz foi recusado ao cobrar a nova filial.')
        }
        throw err
      }
    },

    async cancelStripeSubscription(subId) {
      await getStripe().subscriptions.cancel(subId)
    },

    async updateSubscriptionFromStripe(orgId, s) {
      must(await db.from('subscriptions').update({
        stripe_subscription_id: s.id,
        stripe_price_id: s.priceId,
        status: s.status,
        current_period_start: s.periodStart?.toISOString() ?? null,
        current_period_end: s.periodEnd?.toISOString() ?? null,
      }).eq('organization_id', orgId), 'updateSubscriptionFromStripe')
    },

    async activateOrganization(orgId) {
      must(await db.from('organizations').update({ status: 'active' }).eq('id', orgId), 'activateOrganization')
    },

    async audit({ orgId, userId, newData }) {
      must(await db.from('audit_logs').insert({
        organization_id: orgId, user_id: userId, action: 'filial_created',
        entity: 'organizations', entity_id: orgId, new_data: newData,
      }), 'audit')
    },
  }
}

// ---- Cancelamento de filial (Rota 2) ----
export function createCancelDeps(): CancelDeps {
  const db = createServiceClient()
  const must = <T>(r: { data: T; error: { message: string } | null }, what: string): T => {
    if (r.error) throw new Error(`${what}: ${r.error.message}`)
    return r.data
  }

  return {
    async getOrganization(id) {
      return must(await db.from('organizations')
        .select('id, name, parent_organization_id, status').eq('id', id).maybeSingle(), 'getOrganization')
    },

    async getOwnerUserId(orgId) {
      return must(await db.from('organizations').select('owner_user_id').eq('id', orgId).maybeSingle(), 'getOwnerUserId')
        ?.owner_user_id ?? null
    },

    async countActiveDemands(orgId) {
      const { count, error } = await db.from('demands').select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .not('status', 'in', `(${DEMANDAS_ENCERRADAS.join(',')})`)
      if (error) throw new Error(`countActiveDemands: ${error.message}`)
      return count ?? 0
    },

    async getStripeSubscriptionId(orgId) {
      return must(await db.from('subscriptions').select('stripe_subscription_id').eq('organization_id', orgId).maybeSingle(),
        'getStripeSubscriptionId')?.stripe_subscription_id ?? null
    },

    async scheduleStripeCancel(subId) {
      const stripe = getStripe()
      const cur = await stripe.subscriptions.retrieve(subId)
      if (cur.status === 'canceled' || cur.status === 'incomplete_expired') return null
      const sub = await stripe.subscriptions.update(subId, { cancel_at_period_end: true })
      const ts = sub.cancel_at ?? sub.items.data[0]?.current_period_end
      return ts ? new Date(ts * 1000) : null
    },

    async unscheduleStripeCancel(subId) {
      await getStripe().subscriptions.update(subId, { cancel_at_period_end: false })
    },

    async markPendingDeletion(orgId) {
      const { data, error } = await db.from('organizations')
        .update({ status: 'pending_deletion', deleted_at: new Date().toISOString() })
        .eq('id', orgId).neq('status', 'pending_deletion').select('id')
      if (error) throw new Error(`markPendingDeletion: ${error.message}`)
      return (data ?? []).length > 0
    },

    async markSubscriptionCancelling(orgId, endsAt) {
      must(await db.from('subscriptions').update({
        cancel_at_period_end: true,
        ...(endsAt ? { current_period_end: endsAt.toISOString() } : {}),
      }).eq('organization_id', orgId), 'markSubscriptionCancelling')
    },

    async audit({ orgId, userId, newData }) {
      must(await db.from('audit_logs').insert({
        organization_id: orgId, user_id: userId, action: 'filial_cancel_requested',
        entity: 'organizations', entity_id: orgId, new_data: newData,
      }), 'audit')
    },
  }
}

// ---- Listagem de filiais (Rota 3) ----
export function createListDeps(): ListDeps {
  const db = createServiceClient()
  const must = <T>(r: { data: T; error: { message: string } | null }, what: string): T => {
    if (r.error) throw new Error(`${what}: ${r.error.message}`)
    return r.data
  }

  return {
    async listCandidateOrgs(userId) {
      const owned = must(await db.from('organizations')
        .select('id, name, parent_organization_id').eq('owner_user_id', userId), 'candidates.owned') ?? []
      const adminOf = must(await db.from('organization_members')
        .select('organization_id').eq('user_id', userId).eq('status', 'active').eq('role', 'admin'), 'candidates.admin') ?? []
      const extraIds = adminOf.map((m) => m.organization_id).filter((id) => !owned.some((o) => o.id === id))
      const extra = extraIds.length
        ? must(await db.from('organizations').select('id, name, parent_organization_id').in('id', extraIds), 'candidates.extra') ?? []
        : []
      const orgs = [...owned, ...extra]
      if (orgs.length === 0) return []
      const subs = must(await db.from('subscriptions').select('organization_id, plan_code')
        .in('organization_id', orgs.map((o) => o.id)), 'candidates.subs') ?? []
      return orgs.map((o) => ({ ...o, plan_code: subs.find((s) => s.organization_id === o.id)?.plan_code ?? null }))
    },

    async listFiliais(matrizId) {
      return must(await db.from('organizations').select('id, name, status, deleted_at, created_at')
        .eq('parent_organization_id', matrizId).order('created_at'), 'listFiliais') ?? []
    },

    async getEnderecos(ids) {
      return must(await db.from('endereco').select('organization_id, cnpj, cidade, estado').in('organization_id', ids), 'getEnderecos') ?? []
    },

    async countOpenDemands(ids) {
      // Contagem exata por filial (head:true): o teto de 1000 linhas do PostgREST falsearia um agrupamento no cliente.
      const entries = await Promise.all(ids.map(async (id) => {
        const { count, error } = await db.from('demands').select('id', { count: 'exact', head: true })
          .eq('organization_id', id).not('status', 'in', `(${DEMANDAS_ENCERRADAS.join(',')})`)
        if (error) throw new Error(`countOpenDemands: ${error.message}`)
        return [id, count ?? 0] as const
      }))
      return Object.fromEntries(entries)
    },

    async countActiveLawyers(ids) {
      const members = must(await db.from('organization_members').select('organization_id, user_id, role')
        .in('organization_id', ids).eq('status', 'active').in('role', ['lawyer', 'admin']), 'countActiveLawyers.members') ?? []
      const adminIds = Array.from(new Set(members.filter((m) => m.role === 'admin').map((m) => m.user_id)))
      const withOab = new Set(adminIds.length
        ? (must(await db.from('profiles').select('id').in('id', adminIds).not('oab_number', 'is', null), 'countActiveLawyers.oab') ?? []).map((p) => p.id)
        : [])
      const out: Record<string, number> = {}
      for (const m of members) {
        if (m.role === 'lawyer' || withOab.has(m.user_id)) out[m.organization_id] = (out[m.organization_id] ?? 0) + 1
      }
      return out
    },

    async getSubscriptions(ids) {
      return must(await db.from('subscriptions')
        .select('organization_id, status, stripe_subscription_id, cancel_at_period_end, current_period_end')
        .in('organization_id', ids), 'getSubscriptions') ?? []
    },

    async getFilialMonthlyCents() {
      try {
        const stripe = getStripe()
        const [price, coupon] = await Promise.all([
          stripe.prices.retrieve(getStripePriceId('premium')),
          stripe.coupons.retrieve(FILIAL_COUPON_ID),
        ])
        const base = price.unit_amount
        if (base == null) return null
        if (coupon.percent_off != null) return Math.round(base * (100 - coupon.percent_off) / 100)
        if (coupon.amount_off != null) return Math.max(0, base - coupon.amount_off)
        return base
      } catch (err) {
        console.error('filial listar: preço no Stripe indisponível:', err)
        return null
      }
    },
  }
}

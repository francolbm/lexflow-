// Implementação real (Supabase service_role + Stripe) das dependências de lib/filial.ts.
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe, getStripePriceId } from '@/lib/stripe'
import { FILIAL_COUPON_ID, FilialHttpError, type FilialDeps } from '@/lib/filial'

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

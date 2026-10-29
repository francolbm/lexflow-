import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe, getPlanByPriceId } from '@/lib/stripe'
import { PLANS, normalizeSubscriptionStatus } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Eventos que mudam a assinatura; qualquer outro recebe 200 e é ignorado.
const HANDLED = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

type ServiceClient = ReturnType<typeof createServiceClient>

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = request.headers.get('stripe-signature')
  if (!secret || !signature) {
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 400 })
  }

  // Corpo cru: a assinatura do Stripe é calculada sobre os bytes exatos
  const payload = await request.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret)
  } catch (err: any) {
    console.error('Stripe webhook: assinatura inválida:', err.message)
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
  }

  if (!HANDLED.has(event.type)) return NextResponse.json({ received: true })

  const supabase = createServiceClient()

  // Idempotência: o Stripe reenvia eventos; um id já processado é ignorado
  const { data: seen } = await supabase
    .from('stripe_events').select('processed_at').eq('id', event.id).maybeSingle()
  if (seen?.processed_at) return NextResponse.json({ received: true, duplicate: true })
  if (!seen) {
    await supabase.from('stripe_events')
      .upsert({ id: event.id, type: event.type }, { onConflict: 'id', ignoreDuplicates: true })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription' && session.subscription) {
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
        await syncSubscription(supabase, subId, session.client_reference_id)
      }
    } else {
      const sub = event.data.object as Stripe.Subscription
      await syncSubscription(supabase, sub.id, null)
    }

    await supabase.from('stripe_events')
      .update({ processed_at: new Date().toISOString() }).eq('id', event.id)
    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error(`Stripe webhook ${event.type} ${event.id}:`, err.message)
    // 500 faz o Stripe reenviar (com intervalo crescente, por até 3 dias)
    return NextResponse.json({ error: 'Falha ao processar' }, { status: 500 })
  }
}

// Busca o estado ATUAL no Stripe em vez de confiar no evento: eventos podem
// chegar fora de ordem, e assim o último a ser processado sempre grava o estado certo.
async function syncSubscription(supabase: ServiceClient, subscriptionId: string, orgIdFromCheckout: string | null) {
  const sub = await getStripe().subscriptions.retrieve(subscriptionId)
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  // Escritório: client_reference_id do Checkout > metadata da assinatura > vínculo já gravado
  let orgId = orgIdFromCheckout ?? sub.metadata?.organization_id ?? null
  if (!orgId) {
    const { data } = await supabase
      .from('subscriptions').select('organization_id').eq('stripe_subscription_id', sub.id).maybeSingle()
    orgId = data?.organization_id ?? null
  }
  if (!orgId) throw new Error(`assinatura ${sub.id} sem escritório vinculado`)

  const item = sub.items.data[0]
  const priceId = item?.price.id
  const plan = priceId ? getPlanByPriceId(priceId) : null
  if (!plan) throw new Error(`price ${priceId} não corresponde a nenhum plano`)
  const status = normalizeSubscriptionStatus(sub.status)
  if (!status) throw new Error(`status desconhecido: ${sub.status}`)

  // Evento atrasado de uma assinatura antiga (ex.: cancelada antes de um novo
  // checkout) não pode sobrescrever a assinatura nova do escritório
  const { data: current } = await supabase
    .from('subscriptions').select('stripe_subscription_id').eq('organization_id', orgId).maybeSingle()
  if (current?.stripe_subscription_id && current.stripe_subscription_id !== sub.id
      && (status === 'canceled' || status === 'incomplete_expired')) {
    return
  }

  const { error, count } = await supabase.from('subscriptions').update({
    plan_code: plan,
    status,
    demands_limit: PLANS[plan].demandsLimit,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_end: item.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null,
  }, { count: 'exact' }).eq('organization_id', orgId)
  if (error) throw new Error(error.message)
  if (!count) throw new Error(`escritório ${orgId} sem linha em subscriptions`)
}

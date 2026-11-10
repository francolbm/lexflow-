import { NextRequest, NextResponse } from 'next/server'
import { getStripe, getStripePriceId } from '@/lib/stripe'
import { getOwnerBilling } from '@/lib/billing'
import { PLANS, isPlanCode } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cria a sessão de Checkout para o plano escolhido no cadastro. Trocar de plano
// depois de assinar é pelo Customer Portal, não por um novo Checkout.
export async function POST(request: NextRequest) {
  const ctx = await getOwnerBilling()
  if ('error' in ctx) return ctx.error
  const { user, org, sub, service } = ctx

  // Já tem assinatura no Stripe em andamento: um segundo Checkout criaria cobrança duplicada
  if (sub.stripe_subscription_id && ['active', 'trialing', 'past_due', 'unpaid'].includes(sub.status)) {
    return NextResponse.json({ error: 'Assinatura já existe. Use "Gerenciar assinatura".' }, { status: 409 })
  }
  // Plano pedido pelo botão (upgrade de cortesia na /assinatura) ou, sem pedido, o do cadastro
  const body = await request.json().catch(() => ({}))
  const planCode: unknown = body?.plan ?? sub.plan_code
  if (!isPlanCode(planCode)) {
    return NextResponse.json({ error: 'Plano inválido.' }, { status: 409 })
  }

  const stripe = getStripe()

  // Um cliente Stripe por escritório; gravado já aqui para reaproveitar em novas tentativas
  let customerId = sub.stripe_customer_id as string | null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: org.name,
      metadata: { organization_id: org.id },
    })
    customerId = customer.id
    const { error } = await service.from('subscriptions')
      .update({ stripe_customer_id: customerId }).eq('organization_id', org.id)
    if (error) return NextResponse.json({ error: 'Falha ao preparar pagamento.' }, { status: 500 })
  }

  // Trial (PLANS[x].trialDays, hoje só o Pro) e só uma vez: cliente que já teve qualquer assinatura não ganha de novo
  let trialDays: number | undefined
  if (PLANS[planCode].trialDays) {
    const previous = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 1 })
    if (previous.data.length === 0) trialDays = PLANS[planCode].trialDays
  }

  const origin = new URL(request.url).origin
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: getStripePriceId(planCode), quantity: 1 }],
    client_reference_id: org.id,
    subscription_data: {
      metadata: { organization_id: org.id },
      ...(trialDays ? { trial_period_days: trialDays } : {}),
    },
    payment_method_collection: 'always', // cartão na entrada, inclusive no trial
    locale: 'pt-BR',
    success_url: `${origin}/assinatura?checkout=sucesso`,
    cancel_url: `${origin}/assinatura?checkout=cancelado`,
  })

  return NextResponse.json({ url: session.url })
}

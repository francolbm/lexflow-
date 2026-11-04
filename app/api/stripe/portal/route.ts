import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getOwnerBilling } from '@/lib/billing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Customer Portal do Stripe: trocar plano, cartão, ver faturas, cancelar.
export async function POST(request: NextRequest) {
  const ctx = await getOwnerBilling()
  if ('error' in ctx) return ctx.error
  if (!ctx.sub.stripe_customer_id) {
    return NextResponse.json({ error: 'Nenhuma assinatura paga ainda. Use "Assinar".' }, { status: 409 })
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: ctx.sub.stripe_customer_id,
    return_url: `${new URL(request.url).origin}/assinatura`,
  })
  return NextResponse.json({ url: session.url })
}

import Stripe from 'stripe'
import type { PlanCode } from '@/lib/types'

let client: Stripe | null = null

// Cliente Stripe — só para código de servidor (rotas de API e webhook).
// Criado sob demanda: o build não quebra se a chave ainda não estiver no ambiente.
export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY não configurada')
    client = new Stripe(key)
  }
  return client
}

// Price ID do Stripe para cada plano. Teste e produção diferem só nas envs.
export function getStripePriceId(plan: PlanCode): string {
  const ids: Record<PlanCode, string | undefined> = {
    start: process.env.STRIPE_PRICE_START,
    pro: process.env.STRIPE_PRICE_PRO,
    premium: process.env.STRIPE_PRICE_PREMIUM,
  }
  const id = ids[plan]
  if (!id) throw new Error(`Price ID do plano ${plan} não configurado`)
  return id
}

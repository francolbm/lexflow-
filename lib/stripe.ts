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

// Price IDs do Stripe por plano. Teste e produção diferem só nas envs.
function priceIds(): Record<PlanCode, string | undefined> {
  return {
    start: process.env.STRIPE_PRICE_START,
    pro: process.env.STRIPE_PRICE_PRO,
    premium: process.env.STRIPE_PRICE_PREMIUM,
  }
}

export function getStripePriceId(plan: PlanCode): string {
  const id = priceIds()[plan]
  if (!id) throw new Error(`Price ID do plano ${plan} não configurado`)
  return id
}

// Inverso: Price ID vindo do Stripe -> plano (null se não for nenhum dos nossos)
export function getPlanByPriceId(priceId: string): PlanCode | null {
  const entry = Object.entries(priceIds()).find(([, id]) => id === priceId)
  return (entry?.[0] as PlanCode | undefined) ?? null
}

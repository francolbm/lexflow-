// Prévia de cobrança do wizard "Adicionar filial" (passo 3): quanto custa, em que cartão e qual CNPJ
// a pessoa precisa digitar para confirmar. Só o TITULAR de uma matriz Premium com Stripe ativo.
import { formatCnpj } from './filial-list'
import { normalizeSubscriptionStatus } from './types'

export interface MatrizForPreview {
  id: string
  name: string
  plan_code: string | null
  status: string | null
  stripe_subscription_id: string | null
}
export interface CardInfo { marca: string; final4: string }

export interface PreviaDeps {
  /** Escritório de que o usuário é TITULAR (owner) e que não é filial, com a assinatura dele. */
  getOwnedMatriz(userId: string): Promise<MatrizForPreview | null>
  getMatrizCnpj(orgId: string): Promise<string | null>
  /** Mensalidades em centavos: preço cheio e preço da filial (com cupom). null = Stripe fora do ar. */
  getPricing(): Promise<{ fullCents: number; filialCents: number } | null>
  /** Cartão usado na assinatura da matriz (o mesmo que cobra a filial). null se não houver. */
  getCard(matrizSubscriptionId: string): Promise<CardInfo | null>
}

export type PreviaResult = { status: number; body: Record<string, unknown> }

export async function montarPrevia(deps: PreviaDeps, userId: string): Promise<PreviaResult> {
  const matriz = await deps.getOwnedMatriz(userId)
  const eligible = !!matriz
    && matriz.plan_code === 'premium'
    && normalizeSubscriptionStatus(matriz.status) === 'active'
    && !!matriz.stripe_subscription_id
  if (!matriz || !eligible) {
    return { status: 403, body: { error: 'Apenas o titular de uma matriz Premium com assinatura ativa pode adicionar filiais.' } }
  }

  const [cnpj, pricing, cartao] = await Promise.all([
    deps.getMatrizCnpj(matriz.id),
    deps.getPricing(),
    deps.getCard(matriz.stripe_subscription_id as string).catch(() => null),
  ])

  const desconto = pricing && pricing.fullCents > 0
    ? Math.round((1 - pricing.filialCents / pricing.fullCents) * 100)
    : null

  return {
    status: 200,
    body: {
      matriz: { id: matriz.id, name: matriz.name, cnpj: formatCnpj(cnpj) },
      mensalidade_centavos: pricing?.filialCents ?? null,
      preco_cheio_centavos: pricing?.fullCents ?? null,
      desconto_percentual: desconto,
      cartao,
    },
  }
}

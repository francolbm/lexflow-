// Listagem consolidada das filiais da matriz (Fase 1.5). Lógica pura; I/O injetado (ver createListDeps).
// Escalabilidade: o número de consultas é constante (não depende da quantidade de filiais).

export interface CandidateOrg {
  id: string
  name: string
  parent_organization_id: string | null
  plan_code: string | null
}
export interface FilialRow { id: string; name: string; status: string; deleted_at: string | null; created_at: string }
export interface EnderecoRow { organization_id: string; cnpj: string | null; cidade: string | null; estado: string | null }
export interface SubRow {
  organization_id: string
  status: string
  stripe_subscription_id: string | null
  cancel_at_period_end: boolean
  current_period_end: string | null
}
/** Mensalidades em centavos: preço cheio (matriz) e preço da filial (com o cupom). */
export interface Pricing { fullCents: number; filialCents: number }

export interface ListDeps {
  /** Escritórios em que o usuário é titular OU administrador ativo. */
  listCandidateOrgs(userId: string): Promise<CandidateOrg[]>
  listFiliais(matrizId: string): Promise<FilialRow[]>
  /** Recebe a matriz e as filiais juntas (mesma consulta). */
  getEnderecos(ids: string[]): Promise<EnderecoRow[]>
  /** Demandas em aberto por escritório (status fora de finalized/archived/deletion_requested). */
  countOpenDemands(ids: string[]): Promise<Record<string, number>>
  /** Advogados ativos por escritório: papel 'lawyer' + admins com OAB (o titular da filial é admin e advogado). */
  countActiveLawyers(ids: string[]): Promise<Record<string, number>>
  getSubscriptions(ids: string[]): Promise<SubRow[]>
  /** null se o Stripe não respondeu (a lista continua, com valores em null — nunca um 0 falso). */
  getPricing(): Promise<Pricing | null>
}

export type ListResult = { status: number; body: Record<string, unknown> }

// Só paga/renova nestes estados e se o cancelamento não estiver agendado.
const RENEWING = new Set(['active', 'trialing', 'past_due'])

export function formatCnpj(raw: string | null): string | null {
  if (!raw) return null
  const d = raw.replace(/\D/g, '')
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : raw
}

export async function listarFiliais(deps: ListDeps, userId: string): Promise<ListResult> {
  // Matriz do usuário: escritório Premium que não é filial, onde ele é titular ou admin.
  const candidates = await deps.listCandidateOrgs(userId)
  const matriz = candidates.find((o) => o.parent_organization_id === null && o.plan_code === 'premium')
  if (!matriz) {
    return {
      status: 403,
      body: { error: 'Apenas o titular ou um administrador de uma matriz Premium pode listar filiais.' },
    }
  }

  const filiais = await deps.listFiliais(matriz.id)
  const ids = [matriz.id, ...filiais.map((f) => f.id)]
  const [enderecos, demandas, advogados, subs, pricing] = await Promise.all([
    deps.getEnderecos(ids),
    deps.countOpenDemands(ids),
    deps.countActiveLawyers(ids),
    deps.getSubscriptions(ids),
    deps.getPricing(),
  ])
  const endById = new Map(enderecos.map((e) => [e.organization_id, e]))
  const subById = new Map(subs.map((s) => [s.organization_id, s]))

  // Matriz: cobra o preço cheio enquanto a assinatura renovar.
  const mSub = subById.get(matriz.id)
  const mRenews = !!mSub?.stripe_subscription_id && RENEWING.has(mSub.status) && !mSub.cancel_at_period_end
  const mCents = mRenews ? pricing?.fullCents ?? null : 0
  const mEnd = endById.get(matriz.id)

  let totalFiliais = 0
  const items = filiais.map((f) => {
    const sub = subById.get(f.id)
    const end = endById.get(f.id)
    const cancelling = f.status === 'pending_deletion' || sub?.cancel_at_period_end === true
    const renews = f.status === 'active' && !cancelling && !!sub?.stripe_subscription_id && RENEWING.has(sub.status)
    // Faturamento futuro: só quem vai renovar. null = não foi possível calcular (Stripe fora do ar).
    const cents = renews ? pricing?.filialCents ?? null : 0
    if (cents) totalFiliais += cents

    return {
      id: f.id,
      name: f.name,
      cnpj: formatCnpj(end?.cnpj ?? null),
      cidade: end?.cidade ?? null,
      estado: end?.estado ?? null,
      status: f.status,
      subscription_status: sub?.status ?? null,
      num_demandas_abertas: demandas[f.id] ?? 0,
      num_advogados_ativos: advogados[f.id] ?? 0,
      faturamento_mensal_estimado_centavos: cents,
      faturamento_mensal_estimado: cents === null ? null : cents / 100,
      next_billing_date: renews ? sub?.current_period_end ?? null : null,
      cancels_at: cancelling ? sub?.current_period_end ?? null : null,
      created_at: f.created_at,
    }
  })

  const priced = pricing !== null
  const mrrFiliais = priced ? totalFiliais : null
  const advogadosFiliais = items.reduce((n, i) => n + i.num_advogados_ativos, 0)

  return {
    status: 200,
    body: {
      matriz: {
        id: matriz.id,
        name: matriz.name,
        cnpj: formatCnpj(mEnd?.cnpj ?? null),
        cidade: mEnd?.cidade ?? null,
        estado: mEnd?.estado ?? null,
        num_demandas_abertas: demandas[matriz.id] ?? 0,
        num_advogados_ativos: advogados[matriz.id] ?? 0,
        faturamento_mensal_estimado_centavos: mCents,
      },
      filiais: items,
      resumo: {
        total: items.length,
        ativas: items.filter((i) => i.status === 'active').length,
        canceladas: items.filter((i) => i.status === 'pending_deletion').length,
        faturamento_mensal_estimado_centavos: mrrFiliais,
        // Grupo = matriz + filiais
        mrr_grupo_centavos: mrrFiliais === null || mCents === null ? null : mrrFiliais + mCents,
        advogados_grupo: advogadosFiliais + (advogados[matriz.id] ?? 0),
      },
    },
  }
}

// Cancelamento de filial (Fase 1.5). Mesma ideia de lib/filial.ts: lógica pura, I/O injetado.
// Regra: a filial paga e usa o resto do ciclo (cancel_at_period_end); nada é apagado (LGPD).
import { z } from 'zod'

export const DEMANDAS_ENCERRADAS = ['finalized', 'archived', 'deletion_requested'] as const

export const cancelBodySchema = z.object({
  motivo: z.string({ required_error: 'Informe o motivo do cancelamento (mínimo 3 caracteres).', invalid_type_error: 'O motivo deve ser um texto.' }).trim().min(3, 'Informe o motivo do cancelamento (mínimo 3 caracteres).').max(500, 'Motivo muito longo (máximo 500 caracteres).'),
})

export interface OrgRow {
  id: string
  name: string
  parent_organization_id: string | null
  status: string
}

export interface CancelDeps {
  getOrganization(id: string): Promise<OrgRow | null>
  getOwnerUserId(orgId: string): Promise<string | null>
  countActiveDemands(orgId: string): Promise<number>
  getStripeSubscriptionId(orgId: string): Promise<string | null>
  /** cancel_at_period_end=true. Devolve o fim do ciclo (null se a assinatura já não existe/está encerrada). */
  scheduleStripeCancel(subId: string): Promise<Date | null>
  /** Desfaz o agendamento (compensação se o banco falhar depois do Stripe). */
  unscheduleStripeCancel(subId: string): Promise<void>
  /** Grava status='pending_deletion' e deleted_at. Devolve false se outra chamada já tinha cancelado. */
  markPendingDeletion(orgId: string): Promise<boolean>
  markSubscriptionCancelling(orgId: string, endsAt: Date | null): Promise<void>
  audit(a: { orgId: string; userId: string; newData: Record<string, unknown> }): Promise<void>
}

export type CancelResult = { status: number; body: Record<string, unknown> }
const fail = (status: number, error: string, extra: Record<string, unknown> = {}): CancelResult =>
  ({ status, body: { error, ...extra } })

export async function cancelarFilial(
  deps: CancelDeps,
  userId: string,
  filialId: string,
  opts: { force: boolean; rawBody: unknown },
): Promise<CancelResult> {
  const org = await deps.getOrganization(filialId)
  if (!org) return fail(404, 'Escritório não encontrado.')

  // Titular = dono da matriz da filial. Para quem não é dono, "não é filial" e "não é seu" respondem igual (403),
  // para a rota não revelar o tipo de escritórios alheios.
  const ownerOf = org.parent_organization_id ?? org.id
  if ((await deps.getOwnerUserId(ownerOf)) !== userId) {
    return fail(403, 'Apenas o titular da matriz pode cancelar a filial.')
  }
  if (org.parent_organization_id === null) {
    return fail(400, 'Este escritório não é uma filial.')
  }
  if (org.status === 'pending_deletion') {
    return fail(409, 'filial_ja_cancelada', { message: 'Esta filial já está com o cancelamento agendado.' })
  }

  // Demandas em curso exigem confirmação explícita (?force=true) e motivo.
  const activeDemands = await deps.countActiveDemands(org.id)
  if (activeDemands > 0 && !opts.force) {
    return fail(409, 'demandas_ativas', {
      active_demands: activeDemands,
      message: `A filial tem ${activeDemands} demanda(s) em andamento. Para cancelar mesmo assim, repita a chamada com ?force=true e o motivo no corpo.`,
    })
  }
  // Motivo: obrigatório com demandas ativas; sem demandas é opcional, mas se vier tem que ser válido.
  const raw = (opts.rawBody && typeof opts.rawBody === 'object' ? opts.rawBody : {}) as { motivo?: unknown }
  let motivo: string | null = null
  if (activeDemands > 0 || (raw.motivo !== undefined && raw.motivo !== null && raw.motivo !== '')) {
    const parsed = cancelBodySchema.safeParse(raw)
    if (!parsed.success) return fail(400, 'motivo_obrigatorio', { message: parsed.error.issues[0]?.message })
    motivo = parsed.data.motivo
  }

  // Stripe primeiro (reversível); depois o banco. Se o banco falhar, desfaz o agendamento.
  const subId = await deps.getStripeSubscriptionId(org.id)
  let endsAt: Date | null = null
  let scheduled = false
  try {
    if (subId) {
      endsAt = await deps.scheduleStripeCancel(subId)
      scheduled = true
    }
    if (!(await deps.markPendingDeletion(org.id))) {
      if (scheduled && subId) await deps.unscheduleStripeCancel(subId)
      return fail(409, 'filial_ja_cancelada', { message: 'Esta filial já está com o cancelamento agendado.' })
    }
  } catch (err) {
    console.error('filial cancelar erro:', err)
    let rollback = 'completo'
    if (scheduled && subId) {
      try { await deps.unscheduleStripeCancel(subId) } catch (e) {
        rollback = 'parcial'
        console.error(`filial cancelar: não conseguiu desfazer o agendamento de ${subId}:`, e)
      }
    }
    return fail(
      500,
      rollback === 'completo'
        ? 'Não foi possível cancelar a filial. Nenhuma alteração foi mantida.'
        : 'Não foi possível cancelar a filial e o agendamento no Stripe ficou incompleto. Fale com o suporte PennaJus.',
      { rollback },
    )
  }

  // Daqui em diante a filial já está cancelada: falhas viram aviso, não erro.
  try { await deps.markSubscriptionCancelling(org.id, endsAt) } catch (e) { console.error('filial cancelar: subscriptions:', e) }
  try {
    await deps.audit({
      orgId: org.id, userId,
      newData: {
        parent_organization_id: org.parent_organization_id, motivo, forced: opts.force && activeDemands > 0,
        active_demands: activeDemands, stripe_subscription_id: subId, cancels_at: endsAt?.toISOString() ?? null,
      },
    })
  } catch (e) { console.error('filial cancelar: audit:', e) }

  return {
    status: 200,
    body: {
      status: 'pending_deletion',
      organization_id: org.id,
      cancels_at: endsAt?.toISOString() ?? null,
      active_demands: activeDemands,
      message: endsAt
        ? 'Cancelamento agendado. A filial continua com acesso até o fim do ciclo já pago.'
        : 'Filial marcada como cancelada (sem assinatura ativa no Stripe).',
    },
  }
}

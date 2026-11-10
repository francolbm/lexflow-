import type { SupabaseClient } from '@supabase/supabase-js'

// Cota mensal de demandas. A regra vive no banco (trigger trg_consume_demand_quota
// em demands + função org_demand_usage); aqui só lemos o resultado para a tela.
// - Assinatura Stripe: renova no ciclo de cobrança. Cortesia: dia 1º (Brasília).
// - Conta ao abrir a demanda; ajustes não contam; exclusão não devolve.
// - Equipe PennaJus (profiles.role admin/operador) não consome cota.

export const QUOTA_ERROR = 'PJ001' // SQLSTATE do trigger quando o limite estoura
export const QUOTA_WARN_PERCENT = 80

export interface DemandUsage {
  used: number
  quota: number
  resetsAt: string
  percent: number
  blocked: boolean
  warn: boolean
}

export async function getDemandUsage(supabase: SupabaseClient, orgId: string): Promise<DemandUsage | null> {
  const { data } = await supabase.rpc('org_demand_usage', { org: orgId }).maybeSingle<{
    used: number; quota: number; period_start: string; resets_at: string
  }>()
  if (!data) return null
  const percent = data.quota > 0 ? Math.round((data.used / data.quota) * 100) : 100
  return {
    used: data.used,
    quota: data.quota,
    resetsAt: data.resets_at,
    percent,
    blocked: data.used >= data.quota,
    warn: percent >= QUOTA_WARN_PERCENT,
  }
}

export const fmtResetDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

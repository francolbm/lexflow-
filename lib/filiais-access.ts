// Quem pode ver /filiais: TITULAR de uma matriz Premium (não é filial) com assinatura ativa no Stripe.
// A decisão é uma função pura (testável); getGroupAccess só busca os dados com o login do próprio usuário
// (as policies de RLS já deixam o titular ler o seu escritório e a sua assinatura).
import type { SupabaseClient } from '@supabase/supabase-js'

export interface OwnedOrgRow {
  id: string
  name: string
  parent_organization_id: string | null
  // 1:1 por UNIQUE(organization_id): o PostgREST devolve objeto; aceitamos array por segurança.
  subscriptions: SubInfo | SubInfo[] | null
}
interface SubInfo { plan_code: string | null; status: string | null; stripe_subscription_id: string | null }

export type GroupAccess = { eligible: true; orgId: string; orgName: string } | { eligible: false }

export function decideGroupAccess(orgs: OwnedOrgRow[] | null | undefined): GroupAccess {
  for (const o of orgs ?? []) {
    if (o.parent_organization_id !== null) continue // filial nunca é matriz
    const sub = Array.isArray(o.subscriptions) ? o.subscriptions[0] : o.subscriptions
    if (sub?.plan_code === 'premium' && sub.status === 'active' && !!sub.stripe_subscription_id) {
      return { eligible: true, orgId: o.id, orgName: o.name }
    }
  }
  return { eligible: false }
}

export async function getGroupAccess(supabase: SupabaseClient, userId: string): Promise<GroupAccess> {
  const { data } = await supabase
    .from('organizations')
    .select('id, name, parent_organization_id, subscriptions(plan_code, status, stripe_subscription_id)')
    .eq('owner_user_id', userId)
  return decideGroupAccess(data as OwnedOrgRow[] | null)
}

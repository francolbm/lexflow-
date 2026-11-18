// Flag do menu "Minha Filial": o usuário tem vínculo ativo num escritório que é filial.
// Usa o client do próprio usuário (a RLS já deixa ler o próprio vínculo e o próprio escritório).
import type { SupabaseClient } from '@supabase/supabase-js'
import { filialOrgIdOf, type MembershipRow } from './minha-filial'

export async function getFilialOrgId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(parent_organization_id)')
    .eq('user_id', userId).eq('status', 'active')
  return filialOrgIdOf(data as unknown as MembershipRow[] | null)
}

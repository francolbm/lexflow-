import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdvogadoShell } from '@/components/layout/AdvogadoShell'
import { AdminShell } from '@/components/layout/AdminShell'
import { getAvatarUrl } from '@/lib/avatar'
import { isPlatformStaff } from '@/lib/types'
import { getGroupAccess } from '@/lib/filiais-access'

// Páginas de qualquer usuário logado (ex.: /perfil): a moldura segue o papel na
// plataforma — equipe PennaJus vê o painel admin, clientes veem a área do advogado.
export default async function LogadoLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const avatarUrl = await getAvatarUrl(supabase, profile?.avatar_url)
  if (isPlatformStaff(profile?.role)) {
    return <AdminShell profile={profile} avatarUrl={avatarUrl}>{children}</AdminShell>
  }
  const access = await getGroupAccess(supabase, user.id)
  return <AdvogadoShell profile={profile} avatarUrl={avatarUrl} showFiliais={access.eligible}>{children}</AdvogadoShell>
}

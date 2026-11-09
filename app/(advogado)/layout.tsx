import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdvogadoShell } from '@/components/layout/AdvogadoShell'
import { getAvatarUrl } from '@/lib/avatar'

export default async function AdvogadoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Admins/operadores go to admin panel
  if (profile?.role === 'operador' || profile?.role === 'admin') {
    redirect('/admin')
  }

  return (
    <AdvogadoShell profile={profile} avatarUrl={await getAvatarUrl(supabase, profile?.avatar_url)}>
      {children}
    </AdvogadoShell>
  )
}

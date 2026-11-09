import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/layout/AdminShell'
import { getAvatarUrl } from '@/lib/avatar'

export default async function AdminLayout({
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

  if (!profile || (profile.role !== 'operador' && profile.role !== 'admin')) {
    redirect('/dashboard')
  }

  return (
    <AdminShell profile={profile} avatarUrl={await getAvatarUrl(supabase, profile.avatar_url)}>
      {children}
    </AdminShell>
  )
}

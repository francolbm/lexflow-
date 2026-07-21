import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { NovaDemandaForm } from '@/components/demandas/NovaDemandaForm'

export default async function NovaDemandaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('organization_members').select('organization_id').eq('user_id', user.id).eq('status', 'active').single(),
  ])

  const orgId = membership?.organization_id || null

  return (
    <>
      <Header title="Nova Solicitação" profile={profile} />
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Nova Solicitação</h2>
          <p className="text-gray-400 text-sm mt-1">Preencha os dados para solicitar a produção de um documento jurídico.</p>
        </div>
        <NovaDemandaForm userId={user.id} orgId={orgId} />
      </div>
    </>
  )
}

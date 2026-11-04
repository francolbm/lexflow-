import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
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
  // Mesma função que a RLS usa no insert: a tela e o banco nunca discordam
  const { data: canCreate } = orgId
    ? await supabase.rpc('org_has_active_subscription', { org: orgId })
    : { data: false }

  return (
    <>
      <Header title="Nova Solicitação" profile={profile} />
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Nova Solicitação</h2>
          <p className="text-gray-400 text-sm mt-1">Preencha os dados para solicitar a produção de um documento jurídico.</p>
        </div>
        {orgId && !canCreate ? (
          <Card className="border-0" style={{ backgroundColor: '#112240' }}>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 text-yellow-400" />
              <p className="text-white font-medium">Assinatura inativa</p>
              <p className="text-gray-400 text-sm mt-1">Para abrir novas solicitações, ative ou regularize a assinatura do escritório.</p>
              <Link href="/assinatura" className={buttonVariants({ className: 'gold-btn mt-6 font-semibold' })}>
                Ver assinatura
              </Link>
            </CardContent>
          </Card>
        ) : (
          <NovaDemandaForm userId={user.id} orgId={orgId} />
        )}
      </div>
    </>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default async function AssinaturaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('organization_members').select('organization_id').eq('user_id', user.id).eq('status', 'active').single(),
  ])

  const { data: subscription } = membership
    ? await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', membership.organization_id)
        .single()
    : { data: null }

  const planDetails: Record<string, { name: string; price: string; limit: number; features: string[] }> = {
    start: {
      name: 'Start',
      price: 'R$197/mês',
      limit: 10,
      features: ['10 demandas/mês', 'Todos os tipos de documentos', 'Suporte por e-mail', 'Dashboard completo'],
    },
    pro: {
      name: 'Pro',
      price: 'R$497/mês',
      limit: 30,
      features: ['30 demandas/mês', 'Suporte prioritário', 'SLA garantido', 'Notas estratégicas'],
    },
    premium: {
      name: 'Premium',
      price: 'R$997/mês',
      limit: 80,
      features: ['80 demandas/mês', 'Suporte dedicado 24/7', 'Relatórios avançados', 'Múltiplos usuários'],
    },
  }

  const currentPlan = subscription ? planDetails[subscription.plan_code] : null
  const usagePercent = subscription
    ? Math.round((subscription.demands_used / subscription.demands_limit) * 100)
    : 0

  return (
    <>
      <Header title="Assinatura" profile={profile} />
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Sua Assinatura</h2>
          <p className="text-gray-400 text-sm mt-1">Gerencie seu plano e uso de demandas.</p>
        </div>

        {!subscription || !currentPlan ? (
          <Card className="border-0" style={{ backgroundColor: '#112240' }}>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 text-yellow-400" />
              <p className="text-white font-medium">Nenhum plano ativo</p>
              <p className="text-gray-400 text-sm mt-1">Entre em contato conosco para ativar seu plano.</p>
              <Button className="gold-btn mt-6 font-semibold">Falar com suporte</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border-0" style={{ backgroundColor: '#112240' }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Plano {currentPlan.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500/20 text-green-400 border-0">
                      {subscription.status === 'active' ? 'Ativo' : subscription.status}
                    </Badge>
                    <span className="text-gray-300 font-medium">{currentPlan.price}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Usage bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Demandas utilizadas</span>
                    <span className="text-white font-medium">
                      {subscription.demands_used} / {subscription.demands_limit}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1e3a5f' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(usagePercent, 100)}%`,
                        backgroundColor: usagePercent > 90 ? '#ef4444' : usagePercent > 70 ? '#f59e0b' : '#d4af37',
                      }}
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-1">{usagePercent}% utilizado no período</p>
                </div>

                {/* Features */}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-gray-400 text-sm font-medium mb-3">Recursos inclusos:</p>
                  <ul className="space-y-2">
                    {currentPlan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                        <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#d4af37' }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <p className="text-gray-500 text-sm">
                Precisa de mais demandas? Entre em contato com nosso suporte para fazer upgrade do plano.
              </p>
              <Button className="gold-btn mt-4 font-semibold">Fazer upgrade</Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

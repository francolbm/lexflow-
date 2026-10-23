import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, CheckCircle } from 'lucide-react'
import { PLANS, SUBSCRIPTION_STATUS_LABELS, normalizeSubscriptionStatus, type PlanCode, type SubscriptionStatus } from '@/lib/types'

export default async function PlanosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || (profile.role !== 'operador' && profile.role !== 'admin')) redirect('/dashboard')

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*, organizations(name, profiles!organizations_owner_user_id_fkey(full_name, email))')
    .order('created_at', { ascending: false })

  const subs = subscriptions || []
  const statusOf = (s: any) => normalizeSubscriptionStatus(s.status)
  const ativos = subs.filter(s => statusOf(s) === 'active').length
  const cancelados = subs.filter(s => statusOf(s) === 'canceled').length
  const inadimplentes = subs.filter(s => statusOf(s) === 'past_due').length

  // Só assinaturas ativas pagam; 'trialing' fica de fora do MRR
  const mrr = subs
    .filter(s => statusOf(s) === 'active')
    .reduce((acc, s) => acc + (PLANS[s.plan_code as PlanCode]?.priceCents ?? 0), 0) / 100

  const planColors: Record<PlanCode, string> = {
    start: 'bg-gray-500/20 text-gray-300',
    pro: 'bg-yellow-500/20 text-yellow-300',
    premium: 'bg-purple-500/20 text-purple-300',
  }
  const statusColors: Partial<Record<SubscriptionStatus, string>> = {
    active: 'bg-green-500/20 text-green-400',
    trialing: 'bg-blue-500/20 text-blue-300',
    past_due: 'bg-orange-500/20 text-orange-400',
    canceled: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8" style={{ minHeight: '100vh', backgroundColor: '#060f1e' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Planos & Assinaturas</h1>
        <p className="text-gray-400 mt-1">Gestão de faturamento e planos dos escritórios</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'MRR Estimado', value: `R$ ${mrr.toLocaleString('pt-BR')}`, color: '#d4af37' },
          { label: 'Assinaturas Ativas', value: ativos, color: '#10b981' },
          { label: 'Canceladas', value: cancelados, color: '#ef4444' },
          { label: 'Inadimplentes', value: inadimplentes, color: '#f59e0b' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-0" style={{ backgroundColor: '#0d1f38' }}>
            <CardContent className="pt-5 pb-5">
              <p className="text-gray-500 text-xs mb-1">{label}</p>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela de assinaturas */}
      <Card className="border-0" style={{ backgroundColor: '#0d1f38' }}>
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-3 border-b border-white/10">
            {['Escritório', 'Plano', 'Status', 'Demandas', 'Próxima Cobrança', ''].map(h => (
              <div key={h} className="text-gray-500 text-xs font-medium uppercase tracking-wide">{h}</div>
            ))}
          </div>

          {subs.length === 0 ? (
            <div className="text-center py-16">
              <CreditCard className="h-10 w-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400">Nenhuma assinatura ainda</p>
            </div>
          ) : (
            subs.map((sub: any, idx: number) => {
              const org = sub.organizations
              const owner = org?.profiles
              const status = statusOf(sub)
              return (
                <div
                  key={sub.id}
                  className="flex flex-col md:grid md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 md:gap-4 items-start md:items-center px-4 md:px-6 py-4"
                  style={{ borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                >
                  <div>
                    <p className="text-white text-sm font-medium">{org?.name || '—'}</p>
                    <p className="text-gray-500 text-xs">{owner?.email || '—'}</p>
                  </div>
                  <Badge className={`text-xs border-0 ${planColors[sub.plan_code as PlanCode] || ''}`}>
                    {sub.plan_code?.toUpperCase() || '—'}
                  </Badge>
                  <Badge className={`text-xs border-0 ${(status && statusColors[status]) || ''}`}>
                    {status ? SUBSCRIPTION_STATUS_LABELS[status] : sub.status}
                  </Badge>
                  <div className="text-sm text-center">
                    <span className="text-white">{sub.demands_used}</span>
                    <span className="text-gray-500"> / {sub.demands_limit}</span>
                  </div>
                  <div className="text-gray-400 text-xs">
                    {sub.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString('pt-BR')
                      : '—'}
                  </div>
                  <div>
                    {status === 'active' && (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}

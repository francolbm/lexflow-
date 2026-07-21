import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/demandas/StatusBadge'
import { Header } from '@/components/layout/Header'
import { DemandStatus } from '@/lib/types'
import { PlusCircle, FileText, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const orgId = membership?.organization_id

  // Fetch stats
  let activeCount = 0
  let reviewCount = 0
  let finishedCount = 0
  let recentDemands: Array<{
    id: string
    title: string
    demand_type: string
    status: DemandStatus
    created_at: string | null
    due_at: string | null
  }> = []

  if (orgId) {
    const { data: demands } = await supabase
      .from('demands')
      .select('id, title, demand_type, status, created_at, due_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (demands) {
      const inProgressStatuses = ['received', 'in_triage', 'in_production', 'revision_requested']
      activeCount = demands.filter(d => inProgressStatuses.includes(d.status)).length
      reviewCount = demands.filter(d => d.status === 'delivered').length

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      finishedCount = demands.filter(d =>
        d.status === 'finalized' &&
        d.created_at &&
        new Date(d.created_at) >= startOfMonth
      ).length

      recentDemands = demands.slice(0, 5).map(d => ({
        id: d.id,
        title: d.title,
        demand_type: d.demand_type,
        status: d.status as DemandStatus,
        created_at: d.created_at,
        due_at: d.due_at,
      }))
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  return (
    <>
      <Header title="Visão Geral" profile={profile} />
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Olá, {profile?.full_name?.split(' ')[0] || 'Advogado'}! 👋
            </h2>
            <p className="text-gray-400 mt-1">Aqui está o resumo das suas demandas.</p>
          </div>
          <Link href="/demandas/nova">
            <Button className="gold-btn font-semibold hidden sm:flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Nova Solicitação
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <Card className="border-0" style={{ backgroundColor: '#112240' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-gray-400 text-sm font-medium">Em Andamento</CardTitle>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#3b82f620' }}>
                <FileText className="h-5 w-5" style={{ color: '#3b82f6' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{activeCount}</div>
              <p className="text-gray-500 text-xs mt-1">demandas ativas</p>
            </CardContent>
          </Card>

          <Card className="border-0" style={{ backgroundColor: '#112240' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-gray-400 text-sm font-medium">Aguardando Revisão</CardTitle>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#a855f720' }}>
                <AlertCircle className="h-5 w-5" style={{ color: '#a855f7' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{reviewCount}</div>
              <p className="text-gray-500 text-xs mt-1">pendentes de aprovação</p>
            </CardContent>
          </Card>

          <Card className="border-0" style={{ backgroundColor: '#112240' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-gray-400 text-sm font-medium">Finalizadas no Mês</CardTitle>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#22c55e20' }}>
                <CheckCircle2 className="h-5 w-5" style={{ color: '#22c55e' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{finishedCount}</div>
              <p className="text-gray-500 text-xs mt-1">documentos entregues</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <Card className="border-0" style={{ backgroundColor: '#112240' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base">Atividades Recentes</CardTitle>
            <Link href="/demandas">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white text-xs">
                Ver todas
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentDemands.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4" style={{ backgroundColor: '#d4af3710' }}>
                  <FileText className="h-7 w-7" style={{ color: '#d4af37' }} />
                </div>
                <p className="text-gray-400 font-medium mb-1">Nenhuma demanda ainda</p>
                <p className="text-gray-600 text-sm mb-6">Crie sua primeira solicitação de documento</p>
                <Link href="/demandas/nova">
                  <Button className="gold-btn font-semibold">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar primeira demanda
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-0">
                {recentDemands.map((demand, idx) => (
                  <Link
                    key={demand.id}
                    href={`/demandas/${demand.id}`}
                    className="flex items-center gap-4 py-3 px-2 rounded-lg hover:bg-white/5 transition-colors group"
                    style={{ borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#d4af3710' }}>
                      <FileText className="h-4 w-4" style={{ color: '#d4af37' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate group-hover:text-yellow-300 transition-colors">
                        {demand.title}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">{demand.demand_type}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusBadge status={demand.status} />
                      <div className="flex items-center gap-1 text-gray-500 text-xs hidden sm:flex">
                        <Clock className="h-3 w-3" />
                        {formatDate(demand.due_at || demand.created_at)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mobile CTA */}
        <div className="mt-6 sm:hidden">
          <Link href="/demandas/nova" className="block">
            <Button className="gold-btn font-semibold w-full py-5">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Solicitação
            </Button>
          </Link>
        </div>
      </div>
    </>
  )
}

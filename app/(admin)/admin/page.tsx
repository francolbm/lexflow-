import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DemandStatusBadge } from '@/components/demandas/DemandStatusBadge'
import { DemandStatus } from '@/lib/types'
import { Clock, Users, CheckSquare, AlertTriangle, ChevronRight, Filter, Trash2 } from 'lucide-react'

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { status?: string; urgency?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'operador' && profile.role !== 'admin')) {
    redirect('/dashboard')
  }

  // Fetch all demands (admin sees all)
  let query = supabase
    .from('demands')
    .select('*, profiles!demands_created_by_fkey(full_name, email)')
    .order('created_at', { ascending: false })

  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }
  if (searchParams.urgency) {
    query = query.eq('urgency', searchParams.urgency)
  }

  const { data: demands } = await query
  const allDemands = demands || []

  // Stats
  const pendingCount = allDemands.filter(d => ['received', 'in_triage'].includes(d.status)).length
  const inProductionCount = allDemands.filter(d => d.status === 'in_production').length
  const inReviewCount = allDemands.filter(d => d.status === 'delivered').length
  const adjustmentsCount = allDemands.filter(d => d.status === 'revision_requested').length
  const deletionRequestedCount = allDemands.filter(d => d.status === 'deletion_requested').length

  const statuses: DemandStatus[] = ['received', 'in_triage', 'in_production', 'delivered', 'revision_requested', 'finalized', 'deletion_requested']

  const urgencyColors: Record<string, string> = {
    low: 'bg-gray-500/20 text-gray-400 border-0',
    medium: 'bg-blue-500/20 text-blue-400 border-0',
    high: 'bg-orange-500/20 text-orange-400 border-0',
    urgent: 'bg-red-500/20 text-red-400 border-0',
  }
  const urgencyLabels: Record<string, string> = {
    low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente',
  }


  // SLA calculation (business hours approximation)
  const getSLAStatus = (demand: { created_at: string | null; status: string; urgency: string }) => {
    if (demand.status === 'finalized') return null
    if (!demand.created_at) return null
    const hours = (Date.now() - new Date(demand.created_at).getTime()) / 3600000
    const slaHours = demand.urgency === 'urgent' ? 4 : demand.urgency === 'high' ? 12 : demand.urgency === 'medium' ? 24 : 48
    if (hours > slaHours * 1.5) return 'critical'
    if (hours > slaHours) return 'warning'
    return 'ok'
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8" style={{ minHeight: '100vh', backgroundColor: '#060f1e' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Fila de Operação</h1>
        <p className="text-gray-400 mt-1">{allDemands.length} demanda{allDemands.length !== 1 ? 's' : ''} na fila</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pendentes', count: pendingCount, icon: Clock, color: '#3b82f6' },
          { label: 'Em Produção', count: inProductionCount, icon: CheckSquare, color: '#f59e0b' },
          { label: 'Em Revisão', count: inReviewCount, icon: Users, color: '#a855f7' },
          { label: 'Ajustes', count: adjustmentsCount, icon: AlertTriangle, color: '#ef4444' },
          { label: 'Exclusões', count: deletionRequestedCount, icon: Trash2, color: '#dc2626' },
        ].map(({ label, count, icon: Icon, color }) => (
          <Card key={label} className="border-0" style={{ backgroundColor: '#0d1f38' }}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs">{label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{count}</p>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-1.5 text-gray-500 text-sm">
          <Filter className="h-4 w-4" />
          <span>Status:</span>
        </div>
        <Link href="/admin">
          <Badge variant="outline" className={!searchParams.status ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300' : 'border-white/20 text-gray-400 cursor-pointer'}>
            Todos
          </Badge>
        </Link>
        {statuses.map(s => (
          <Link key={s} href={`/admin?status=${s}${searchParams.urgency ? `&urgency=${searchParams.urgency}` : ''}`}>
            <DemandStatusBadge status={s} className={`cursor-pointer ${searchParams.status === s ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`} />
          </Link>
        ))}
        <div className="flex items-center gap-1.5 text-gray-500 text-sm ml-4">
          <span>Urgência:</span>
        </div>
        {['urgent', 'high', 'medium', 'low'].map(u => (
          <Link key={u} href={`/admin?${searchParams.status ? `status=${searchParams.status}&` : ''}urgency=${u}`}>
            <Badge variant="outline" className={`cursor-pointer ${urgencyColors[u]} ${searchParams.urgency === u ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}>
              {urgencyLabels[u]}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Demands table */}
      <Card className="border-0" style={{ backgroundColor: '#0d1f38' }}>
        <CardContent className="p-0">
          {allDemands.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400 font-medium">Nenhuma demanda encontrada</p>
              <p className="text-gray-600 text-sm mt-1">Tente outros filtros</p>
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-3 px-6 py-3 border-b border-white/10">
                {['ID', 'Título', 'Cliente', 'Tipo', 'Urgência', 'SLA', 'Status'].map(h => (
                  <div key={h} className="text-gray-500 text-xs font-medium uppercase tracking-wide">{h}</div>
                ))}
              </div>

              {allDemands.map((demand, idx) => {
                const slaStatus = getSLAStatus(demand)
                const createdProfile = demand.profiles as { full_name: string; email: string } | null

                return (
                  <Link
                    key={demand.id}
                    href={`/admin/demandas/${demand.id}`}
                    className="flex md:grid md:grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-2 md:gap-3 items-start md:items-center px-4 md:px-6 py-4 hover:bg-white/5 transition-colors group"
                    style={{ borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                  >
                    <div className="text-gray-500 text-xs font-mono hidden md:block">
                      #{demand.id.slice(0, 8)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium group-hover:text-yellow-300 transition-colors truncate">
                        {demand.title}
                      </p>
                      <div className="md:hidden flex items-center gap-2 mt-1">
                        <DemandStatusBadge status={demand.status as DemandStatus} hasDeletionRequest={demand.status === "deletion_requested"} />
                        <span className="text-gray-600 text-xs">{demand.demand_type}</span>
                      </div>
                    </div>
                    <div className="hidden md:block text-gray-400 text-sm truncate max-w-[130px]">
                      {createdProfile?.full_name || '—'}
                    </div>
                    <div className="hidden md:block text-gray-400 text-sm truncate max-w-[120px]">
                      {demand.demand_type}
                    </div>
                    <div className="hidden md:block">
                      <Badge variant="outline" className={`text-xs border-0 ${urgencyColors[demand.urgency] || ''}`}>
                        {urgencyLabels[demand.urgency] || demand.urgency}
                      </Badge>
                    </div>
                    <div className="hidden md:flex items-center gap-1.5">
                      {slaStatus === 'critical' && (
                        <div className="flex items-center gap-1 text-red-400 text-xs">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Atrasado
                        </div>
                      )}
                      {slaStatus === 'warning' && (
                        <div className="flex items-center gap-1 text-orange-400 text-xs">
                          <Clock className="h-3.5 w-3.5" />
                          Atenção
                        </div>
                      )}
                      {slaStatus === 'ok' && (
                        <span className="text-green-400 text-xs">No prazo</span>
                      )}
                      {!slaStatus && (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                      <DemandStatusBadge status={demand.status as DemandStatus} hasDeletionRequest={demand.status === "deletion_requested"} />
                      <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400" />
                    </div>
                  </Link>
                )
              })}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DemandStatusBadge } from '@/components/demandas/DemandStatusBadge'
import { Header } from '@/components/layout/Header'
import { DemandStatus } from '@/lib/types'
import { PlusCircle, FileText, Clock, ChevronRight, Paperclip, Trash2 } from 'lucide-react'
import { DeleteRequestButton } from '@/components/demandas/DeleteRequestButton'

export default async function DemandasPage({
  searchParams,
}: {
  searchParams: { status?: string; area?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const orgId = membership?.organization_id

  let demands: Array<{
    id: string
    title: string
    demand_type: string
    area_of_law: string
    status: DemandStatus
    urgency: string
    created_at: string | null
    due_at: string | null
    file_count: number
    has_deletion_request: boolean
  }> = []

  if (orgId) {
    let query = supabase
      .from('demands')
      .select('id, title, demand_type, area_of_law, status, urgency, created_at, due_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (searchParams.area) {
      query = query.eq('area_of_law', searchParams.area)
    }
    
    // For status filter, handle deletion_requested specially
    if (searchParams.status === 'deletion_requested') {
      query = query.eq('status', 'deletion_requested')
    } else if (searchParams.status) {
      query = query.eq('status', searchParams.status)
    }

    const { data } = await query
    
    // Get file counts for each demand
    const demandIds = (data || []).map(d => d.id)
    let fileCounts: Record<string, number> = {}
    let deletionRequests: Record<string, boolean> = {}
    
    if (demandIds.length > 0) {
      // Get file counts
      const { data: files } = await supabase
        .from('demand_files')
        .select('demand_id')
        .in('demand_id', demandIds)
      
      files?.forEach(f => {
        fileCounts[f.demand_id] = (fileCounts[f.demand_id] || 0) + 1
      })
    }
    
    // Build demands with all info
    demands = (data || []).map(d => ({ 
      ...d, 
      status: d.status as DemandStatus,
      file_count: fileCounts[d.id] || 0,
      has_deletion_request: d.status === 'deletion_requested'
    }))
  }

  const statuses: DemandStatus[] = [
    'received', 'in_triage', 'in_production', 'delivered', 'revision_requested', 'finalized', 'deletion_requested'
  ]

  const urgencyColors: Record<string, string> = {
    low: 'bg-gray-500/20 text-gray-400',
    medium: 'bg-blue-500/20 text-blue-400',
    high: 'bg-orange-500/20 text-orange-400',
    urgent: 'bg-red-500/20 text-red-400',
  }
  const urgencyLabels: Record<string, string> = {
    low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente',
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  return (
    <>
      <Header title="Minhas Demandas" profile={profile} />
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Todas as Demandas</h2>
            <p className="text-gray-400 text-sm mt-0.5">{demands.length} demanda{demands.length !== 1 ? 's' : ''} encontrada{demands.length !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/demandas/nova">
            <Button className="gold-btn font-semibold gap-2">
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Solicitação</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link href="/demandas">
            <Badge
              variant="outline"
              className={!searchParams.status ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300' : 'border-white/20 text-gray-400 hover:border-white/40 cursor-pointer'}
            >
              Todos
            </Badge>
          </Link>
          {statuses.map(s => (
            <Link key={s} href={`/demandas?status=${s}${searchParams.area ? `&area=${searchParams.area}` : ''}`}>
              <DemandStatusBadge status={s} className={searchParams.status === s ? 'opacity-100' : 'opacity-60 hover:opacity-80 cursor-pointer'} />
            </Link>
          ))}
        </div>

        {/* Demands list */}
        <Card className="border-0" style={{ backgroundColor: '#112240' }}>
          <CardContent className="p-0">
            {demands.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4" style={{ backgroundColor: '#d4af3710' }}>
                  <FileText className="h-7 w-7" style={{ color: '#d4af37' }} />
                </div>
                <p className="text-gray-400 font-medium mb-1">
                  {searchParams.status ? 'Nenhuma demanda com esse status' : 'Nenhuma demanda ainda'}
                </p>
                <p className="text-gray-600 text-sm mb-6">
                  {searchParams.status ? 'Tente outro filtro' : 'Crie sua primeira solicitação'}
                </p>
                <Link href="/demandas/nova">
                  <Button className="gold-btn font-semibold">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nova Solicitação
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Table header - desktop */}
                <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-3 border-b border-white/10">
                  <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">ID</div>
                  <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Título</div>
                  <div className="text-gray-500 text-xs font-medium uppercase tracking-wide text-center">Anexos</div>
                  <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Tipo</div>
                  <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Urgência</div>
                  <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Prazo</div>
                  <div className="text-gray-500 text-xs font-medium uppercase tracking-wide text-center">Ações</div>
                </div>

                {/* Rows */}
                {demands.map((demand, idx) => (
                  <div
                    key={demand.id}
                    className="flex md:grid md:grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-2 md:gap-4 items-start md:items-center px-4 md:px-6 py-4 hover:bg-white/5 transition-colors group"
                    style={{ borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                  >
                    <div className="text-gray-500 text-xs font-mono hidden md:block">
                      #{demand.id.slice(0, 8)}
                    </div>
                    <Link href={`/demandas/${demand.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {demand.has_deletion_request && (
                          <span title="Exclusao solicitada"><Trash2 className="h-4 w-4 text-red-400 flex-shrink-0" /></span>
                        )}
                        <p className="text-white text-sm font-medium group-hover:text-yellow-300 transition-colors truncate">
                          {demand.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 md:hidden">
                        <DemandStatusBadge status={demand.status} hasDeletionRequest={demand.has_deletion_request} />
                        <span className="text-gray-600 text-xs">{demand.demand_type}</span>
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          <Paperclip className="h-3 w-3" />
                          {demand.file_count}
                        </span>
                      </div>
                    </Link>
                    <div className="hidden md:flex items-center gap-1.5 justify-center">
                      <Paperclip className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-400 text-sm">{demand.file_count}</span>
                    </div>
                    <div className="text-gray-400 text-sm hidden md:block truncate max-w-[150px]">
                      {demand.demand_type}
                    </div>
                    <div className="hidden md:block">
                      <Badge variant="outline" className={`text-xs border-0 ${urgencyColors[demand.urgency] || 'bg-gray-500/20 text-gray-400'}`}>
                        {urgencyLabels[demand.urgency] || demand.urgency}
                      </Badge>
                    </div>
                    <div className="hidden md:flex items-center gap-1.5 text-gray-400 text-sm">
                      <Clock className="h-3.5 w-3.5 text-gray-600" />
                      {formatDate(demand.due_at)}
                    </div>
                    <div className="hidden md:flex items-center gap-2 justify-center">
                      <DemandStatusBadge status={demand.status} hasDeletionRequest={demand.has_deletion_request} />
                      {!demand.has_deletion_request && (
                        <DeleteRequestButton demandId={demand.id} />
                      )}
                      <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400" />
                    </div>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

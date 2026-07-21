import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/demandas/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DemandStatus, STATUS_LABELS } from '@/lib/types'
import { AdminDemandActions } from '@/components/demandas/AdminDemandActions'
import Link from 'next/link'
import { ChevronLeft, FileText, User, Calendar, CheckCircle, AlertTriangle } from 'lucide-react'

export default async function AdminDemandDetailPage({ params }: { params: { id: string } }) {
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

  const { data: demand } = await supabase
    .from('demands')
    .select('*, profiles!demands_created_by_fkey(full_name, email, oab_number)')
    .eq('id', params.id)
    .single()

  if (!demand) notFound()

  const [
    { data: statusHistory },
    { data: deliveries },
    { data: comments },
    { data: demandFiles },
  ] = await Promise.all([
    supabase
      .from('demand_status_history')
      .select('*, profiles(full_name)')
      .eq('demand_id', params.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('deliveries')
      .select('*, delivery_files(*), profiles(full_name)')
      .eq('demand_id', params.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('comments')
      .select('*, profiles(full_name)')
      .eq('demand_id', params.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('demand_files')
      .select('*')
      .eq('demand_id', params.id),
  ])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const urgencyColors: Record<string, string> = {
    low: 'bg-gray-500/20 text-gray-400 border-0',
    medium: 'bg-blue-500/20 text-blue-400 border-0',
    high: 'bg-orange-500/20 text-orange-400 border-0',
    urgent: 'bg-red-500/20 text-red-400 border-0',
  }
  const urgencyLabels: Record<string, string> = {
    low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente',
  }

  const statusOrder: DemandStatus[] = [
    'received', 'in_triage', 'in_production', 'delivered', 'revision_requested', 'finalized'
  ]
  const currentStatusIdx = statusOrder.indexOf(demand.status as DemandStatus)
  const createdByProfile = demand.profiles as { full_name: string; email: string; oab_number: string | null } | null

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto" style={{ minHeight: '100vh', backgroundColor: '#060f1e' }}>
      {/* Back */}
      <Link href="/admin" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-6 transition-colors group">
        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Fila de Operação
      </Link>

      {/* Header card */}
      <Card className="border-0 mb-6" style={{ backgroundColor: '#0d1f38' }}>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <StatusBadge status={demand.status as DemandStatus} />
                <Badge variant="outline" className={urgencyColors[demand.urgency] || ''}>
                  {urgencyLabels[demand.urgency] || demand.urgency}
                </Badge>
              </div>
              <h1 className="text-white text-xl font-bold">{demand.title}</h1>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-gray-600" />
                  {demand.demand_type}
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-gray-600" />
                  {demand.area_of_law}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  Criado: {demand.created_at ? new Date(demand.created_at).toLocaleDateString('pt-BR') : '—'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client info */}
          <Card className="border-0" style={{ backgroundColor: '#0d1f38' }}>
            <CardHeader>
              <CardTitle className="text-white text-base">Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Nome</span>
                <span className="text-gray-200 font-medium">{createdByProfile?.full_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">E-mail</span>
                <span className="text-gray-200">{createdByProfile?.email || '—'}</span>
              </div>
              {createdByProfile?.oab_number && (
                <div className="flex justify-between">
                  <span className="text-gray-500">OAB</span>
                  <span className="text-gray-200">{createdByProfile.oab_number}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Briefing */}
          <Card className="border-0" style={{ backgroundColor: '#0d1f38' }}>
            <CardHeader>
              <CardTitle className="text-white text-base">Briefing Completo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {demand.objective && (
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Objetivo</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{demand.objective}</p>
                </div>
              )}
              {demand.facts && (
                <div className="pt-4 border-t border-white/5">
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Fatos e Contexto</p>
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{demand.facts}</p>
                </div>
              )}
              {demand.strategic_notes && (
                <div className="pt-4 border-t border-white/5">
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Notas Estratégicas</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{demand.strategic_notes}</p>
                </div>
              )}
              {demand.adjustment_notes && (
                <div className="pt-4 border-t border-white/5">
                  <div className="flex items-start gap-2 bg-red-500/10 rounded-lg p-3">
                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-300 text-xs font-medium uppercase tracking-wide mb-1">Ajustes Solicitados pelo Advogado</p>
                      <p className="text-red-200/80 text-sm">{demand.adjustment_notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attached files */}
          {demandFiles && demandFiles.length > 0 && (
            <Card className="border-0" style={{ backgroundColor: '#0d1f38' }}>
              <CardHeader>
                <CardTitle className="text-white text-base">Arquivos do Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {demandFiles.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ backgroundColor: '#060f1e' }}>
                    <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-300 text-sm flex-1 truncate">{f.original_name}</span>
                    <span className="text-gray-600 text-xs">
                      {f.size_bytes ? (f.size_bytes / 1024 / 1024).toFixed(1) + ' MB' : ''}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Deliveries history */}
          {deliveries && deliveries.length > 0 && (
            <Card className="border-0" style={{ backgroundColor: '#0d1f38' }}>
              <CardHeader>
                <CardTitle className="text-white text-base">Histórico de Versões</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deliveries.map((delivery) => (
                  <div key={delivery.id} className="rounded-lg p-4" style={{ backgroundColor: '#060f1e' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">v{delivery.version_no}</span>
                        <span className="text-gray-500 text-xs">{formatDate(delivery.created_at)}</span>
                        {delivery.visible_to_client ? (
                          <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">Visível ao cliente</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-gray-500/30 text-gray-500">Interno</Badge>
                        )}
                      </div>
                      {delivery.approved_at && (
                        <div className="flex items-center gap-1 text-green-400 text-xs">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Aprovada
                        </div>
                      )}
                    </div>
                    {delivery.notes && (
                      <p className="text-gray-400 text-sm mb-2">{delivery.notes}</p>
                    )}
                    {delivery.delivery_files?.map((df: { id: string; original_name: string }) => (
                      <div key={df.id} className="flex items-center gap-2 text-sm text-gray-400">
                        <FileText className="h-3.5 w-3.5" />
                        <span>{df.original_name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          {comments && comments.length > 0 && (
            <Card className="border-0" style={{ backgroundColor: '#0d1f38' }}>
              <CardHeader>
                <CardTitle className="text-white text-base">Comentários</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="rounded-lg px-4 py-3" style={{ backgroundColor: '#060f1e' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-medium">{c.profiles?.full_name || 'Usuário'}</span>
                      <span className="text-gray-600 text-xs">{formatDate(c.created_at)}</span>
                      {c.internal_only && (
                        <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">Interno</Badge>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm">{c.body}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Admin actions */}
          <AdminDemandActions
            demandId={demand.id}
            currentStatus={demand.status as DemandStatus}
            operatorId={user.id}
            orgId={demand.organization_id}
          />

          {/* Timeline */}
          <Card className="border-0" style={{ backgroundColor: '#0d1f38' }}>
            <CardHeader>
              <CardTitle className="text-white text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {statusOrder.map((s, idx) => {
                  const isDone = idx <= currentStatusIdx
                  const isCurrent = idx === currentStatusIdx
                  const historyEntry = statusHistory?.find(h => h.new_status === s)
                  return (
                    <div key={s} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{
                            backgroundColor: isCurrent ? '#d4af37' : isDone ? '#d4af3730' : '#1e3a5f',
                            border: isCurrent ? '2px solid #d4af37' : isDone ? '2px solid #d4af3760' : '2px solid #1e3a5f',
                          }}
                        >
                          {isDone && !isCurrent && <CheckCircle className="h-3.5 w-3.5" style={{ color: '#d4af37' }} />}
                          {isCurrent && <div className="w-2 h-2 rounded-full bg-[#060f1e]" />}
                        </div>
                        {idx < statusOrder.length - 1 && (
                          <div className="w-0.5 h-7 mt-0.5" style={{ backgroundColor: isDone && idx < currentStatusIdx ? '#d4af3740' : '#1e3a5f' }} />
                        )}
                      </div>
                      <div className="pb-2 pt-1 min-w-0 flex-1">
                        <p className="text-sm font-medium" style={{ color: isCurrent ? '#d4af37' : isDone ? '#e2e8f0' : '#4a6f9a' }}>
                          {STATUS_LABELS[s]}
                        </p>
                        {historyEntry && (
                          <p className="text-gray-600 text-xs mt-0.5">{formatDate(historyEntry.created_at)}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

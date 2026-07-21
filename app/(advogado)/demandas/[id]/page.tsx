import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { StatusBadge } from '@/components/demandas/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DemandStatus, STATUS_LABELS } from '@/lib/types'
import { CommentSection } from '@/components/demandas/CommentSection'
import { DemandActions } from '@/components/demandas/DemandActions'
import {
  FileText, User, Calendar, ChevronLeft,
  AlertTriangle, CheckCircle, Download
} from 'lucide-react'

export default async function DemandaDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: demand }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('demands').select('*').eq('id', params.id).single(),
  ])

  if (!demand) notFound()

  // Verify access
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('organization_id', demand.organization_id)
    .single()

  if (!membership) notFound()

  // Fetch related data
  const [
    { data: statusHistory },
    { data: deliveries },
    { data: comments },
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
      .eq('visible_to_client', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('comments')
      .select('*, profiles(full_name)')
      .eq('demand_id', params.id)
      .eq('internal_only', false)
      .order('created_at', { ascending: true }),
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

  const canAct = demand.status === 'delivered' || demand.status === 'revision_requested'

  return (
    <>
      <Header title="Detalhe da Demanda" profile={profile} />
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
        {/* Back link */}
        <Link href="/demandas" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-6 transition-colors group">
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Minhas Demandas
        </Link>

        {/* Header card */}
        <Card className="border-0 mb-6" style={{ backgroundColor: '#112240' }}>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <StatusBadge status={demand.status as DemandStatus} />
                  <Badge variant="outline" className={urgencyColors[demand.urgency] || 'bg-gray-500/20 text-gray-400 border-0'}>
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
                  {demand.due_at && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      Prazo: {new Date(demand.due_at).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
              {demand.status === 'delivered' && (
                <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-4 py-2 text-purple-300 text-sm flex-shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                  Aguarda sua revisão
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Briefing */}
            <Card className="border-0" style={{ backgroundColor: '#112240' }}>
              <CardHeader>
                <CardTitle className="text-white text-base">Briefing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {demand.objective && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Objetivo</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{demand.objective}</p>
                  </div>
                )}
                {demand.facts && (
                  <div className="pt-3 border-t border-white/5">
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Fatos e Contexto</p>
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{demand.facts}</p>
                  </div>
                )}
                {demand.strategic_notes && (
                  <div className="pt-3 border-t border-white/5">
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Notas Estratégicas</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{demand.strategic_notes}</p>
                  </div>
                )}
                {demand.adjustment_notes && (
                  <div className="pt-3 border-t border-white/5">
                    <div className="flex items-start gap-2 bg-red-500/10 rounded-lg p-3">
                      <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-300 text-xs font-medium uppercase tracking-wide mb-1">Notas de Ajuste</p>
                        <p className="text-red-200/80 text-sm">{demand.adjustment_notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deliveries */}
            {deliveries && deliveries.length > 0 && (
              <Card className="border-0" style={{ backgroundColor: '#112240' }}>
                <CardHeader>
                  <CardTitle className="text-white text-base">Minutas Entregues</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Legal disclaimer */}
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3">
                    <p className="text-yellow-300 text-xs leading-relaxed">
                      <strong>Aviso Jurídico:</strong> Esta minuta atua como apoio técnico documental. A validação jurídica final é responsabilidade exclusiva do advogado.
                    </p>
                  </div>

                  {deliveries.map((delivery) => (
                    <div key={delivery.id} className="rounded-lg p-4" style={{ backgroundColor: '#0a192f' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-white text-sm font-medium">Versão {delivery.version_no}</span>
                          <span className="text-gray-500 text-xs ml-3">{formatDate(delivery.created_at)}</span>
                        </div>
                        {delivery.approved_at && (
                          <div className="flex items-center gap-1.5 text-green-400 text-xs">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Aprovada
                          </div>
                        )}
                      </div>
                      {delivery.notes && (
                        <p className="text-gray-400 text-sm mb-3">{delivery.notes}</p>
                      )}
                      {delivery.delivery_files?.map((df: { id: string; original_name: string }) => (
                        <div key={df.id} className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-300">{df.original_name}</span>
                          <Button variant="ghost" size="sm" className="ml-auto text-gray-400 hover:text-white text-xs gap-1">
                            <Download className="h-3.5 w-3.5" />
                            Baixar
                          </Button>
                        </div>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Actions (approve/request adjustment) */}
            {canAct && (
              <DemandActions
                demandId={demand.id}
                currentStatus={demand.status as DemandStatus}
                orgId={demand.organization_id}
                userId={user.id}
              />
            )}

            {/* Comments */}
            <CommentSection
              demandId={demand.id}
              userId={user.id}
              initialComments={comments || []}
            />
          </div>

          {/* Sidebar - Status timeline */}
          <div className="space-y-6">
            <Card className="border-0" style={{ backgroundColor: '#112240' }}>
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
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              backgroundColor: isCurrent ? '#d4af37' : isDone ? '#d4af3730' : '#1e3a5f',
                              border: isCurrent ? '2px solid #d4af37' : isDone ? '2px solid #d4af3760' : '2px solid #1e3a5f',
                            }}
                          >
                            {isDone && !isCurrent && <CheckCircle className="h-4 w-4" style={{ color: '#d4af37' }} />}
                            {isCurrent && <div className="w-2.5 h-2.5 rounded-full bg-[#0a192f]" />}
                          </div>
                          {idx < statusOrder.length - 1 && (
                            <div
                              className="w-0.5 h-8 mt-0.5"
                              style={{ backgroundColor: isDone && idx < currentStatusIdx ? '#d4af3740' : '#1e3a5f' }}
                            />
                          )}
                        </div>
                        <div className="pb-2 pt-1 min-w-0 flex-1">
                          <p
                            className="text-sm font-medium"
                            style={{ color: isCurrent ? '#d4af37' : isDone ? '#e2e8f0' : '#4a6f9a' }}
                          >
                            {STATUS_LABELS[s]}
                          </p>
                          {historyEntry && (
                            <p className="text-gray-600 text-xs mt-0.5">
                              {formatDate(historyEntry.created_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Meta info */}
            <Card className="border-0" style={{ backgroundColor: '#112240' }}>
              <CardHeader>
                <CardTitle className="text-white text-base">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Criado em</span>
                  <span className="text-gray-300 text-right">
                    {demand.created_at ? new Date(demand.created_at).toLocaleDateString('pt-BR') : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ID</span>
                  <span className="text-gray-400 font-mono text-xs">#{params.id.slice(0, 8)}</span>
                </div>
                {demand.due_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Prazo</span>
                    <span className="text-gray-300">{new Date(demand.due_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

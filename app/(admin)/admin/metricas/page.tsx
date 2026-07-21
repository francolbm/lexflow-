import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Building2, FileText, TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

export default async function MetricasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || (profile.role !== 'operador' && profile.role !== 'admin')) redirect('/dashboard')

  // Buscar dados
  const [
    { count: totalDemands },
    { count: totalUsers },
    { count: totalOrgs },
    { data: demands },
    { data: recentDemands },
  ] = await Promise.all([
    supabase.from('demands').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('demands').select('status, created_at, urgency'),
    supabase.from('demands')
      .select('*, profiles!demands_created_by_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const d = demands || []
  const byStatus = {
    received: d.filter(x => x.status === 'received').length,
    triaging: d.filter(x => x.status === 'in_triage').length,
    in_production: d.filter(x => x.status === 'in_production').length,
    em_revisao: d.filter(x => x.status === 'delivered').length,
    ajustes: d.filter(x => x.status === 'revision_requested').length,
    completed: d.filter(x => x.status === 'finalized').length,
  }

  const thisMonth = d.filter(x => {
    if (!x.created_at) return false
    const dt = new Date(x.created_at)
    const now = new Date()
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
  }).length

  const urgentes = d.filter(x => x.urgency === 'high' || x.urgency === 'urgent').length

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8" style={{ minHeight: '100vh', backgroundColor: '#060f1e' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Métricas Gerais</h1>
        <p className="text-gray-400 mt-1">Visão consolidada da operação LexFlow</p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total de Demandas', value: totalDemands ?? 0, icon: FileText, color: '#d4af37' },
          { label: 'Usuários Cadastrados', value: totalUsers ?? 0, icon: Users, color: '#3b82f6' },
          { label: 'Escritórios Ativos', value: totalOrgs ?? 0, icon: Building2, color: '#10b981' },
          { label: 'Este Mês', value: thisMonth, icon: TrendingUp, color: '#a855f7' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-0" style={{ backgroundColor: '#0d1f38' }}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs">{label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{value}</p>
                </div>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status das demandas */}
        <Card className="border-0" style={{ backgroundColor: '#0d1f38' }}>
          <CardContent className="pt-6">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: '#d4af37' }} />
              Demandas por Status
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Recebido', value: byStatus.received, color: '#3b82f6', total: totalDemands ?? 1 },
                { label: 'Em Triagem', value: byStatus.triaging, color: '#f59e0b', total: totalDemands ?? 1 },
                { label: 'Em Produção', value: byStatus.in_production, color: '#eab308', total: totalDemands ?? 1 },
                { label: 'Em Revisão', value: byStatus.em_revisao, color: '#a855f7', total: totalDemands ?? 1 },
                { label: 'Ajustes', value: byStatus.ajustes, color: '#ef4444', total: totalDemands ?? 1 },
                { label: 'Finalizados', value: byStatus.completed, color: '#10b981', total: totalDemands ?? 1 },
              ].map(({ label, value, color, total }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-white font-medium">{value}</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ backgroundColor: '#ffffff10' }}>
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.round((value / total) * 100)}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alertas operacionais */}
        <Card className="border-0" style={{ backgroundColor: '#0d1f38' }}>
          <CardContent className="pt-6">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" style={{ color: '#d4af37' }} />
              Alertas Operacionais
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#ef444415', border: '1px solid #ef444430' }}>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-gray-300">Demandas Urgentes</span>
                </div>
                <span className="text-red-400 font-bold text-lg">{urgentes}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#f59e0b15', border: '1px solid #f59e0b30' }}>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm text-gray-300">Aguardando Triagem</span>
                </div>
                <span className="text-yellow-400 font-bold text-lg">{byStatus.received}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#a855f715', border: '1px solid #a855f730' }}>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-gray-300">Aguardando Revisão do Advogado</span>
                </div>
                <span className="text-purple-400 font-bold text-lg">{byStatus.em_revisao}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#10b98115', border: '1px solid #10b98130' }}>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-gray-300">Finalizados no Total</span>
                </div>
                <span className="text-green-400 font-bold text-lg">{byStatus.completed}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Últimas demandas */}
      <Card className="border-0" style={{ backgroundColor: '#0d1f38' }}>
        <CardContent className="pt-6">
          <h3 className="text-white font-semibold mb-5">Últimas Demandas</h3>
          {(recentDemands || []).length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhuma demanda ainda</p>
          ) : (
            <div className="space-y-3">
              {(recentDemands || []).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#060f1e' }}>
                  <div>
                    <p className="text-white text-sm font-medium">{d.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{(d.profiles as any)?.full_name || '—'} · {d.demand_type}</p>
                  </div>
                  <Badge className="text-xs border-0" style={{ backgroundColor: '#d4af3720', color: '#d4af37' }}>
                    {d.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

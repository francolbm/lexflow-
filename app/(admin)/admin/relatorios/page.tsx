import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Download, TrendingUp, FileText, Users, Calendar, PieChart } from 'lucide-react'

export default async function RelatoriosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || (profile.role !== 'operador' && profile.role !== 'admin')) redirect('/dashboard')

  const [
    { count: totalDemands },
    { count: totalUsers },
    { count: totalOrgs },
    { data: demands },
  ] = await Promise.all([
    supabase.from('demands').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('demands').select('status, created_at, urgency, demand_type'),
  ])

  const d = demands || []
  
  const byType: Record<string, number> = {}
  d.forEach(x => {
    const t = x.demand_type || 'outro'
    byType[t] = (byType[t] || 0) + 1
  })

  const byUrgency: Record<string, number> = {}
  d.forEach(x => {
    const u = x.urgency || 'medium'
    byUrgency[u] = (byUrgency[u] || 0) + 1
  })

  const monthlyData: Record<string, { label: string; count: number }> = {}
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d2 = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}`
    const label = d2.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    monthlyData[key] = { label, count: 0 }
  }
  d.forEach(x => {
    if (!x.created_at) return
    const dt = new Date(x.created_at)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    if (monthlyData[key]) monthlyData[key].count++
  })

  const months = Object.entries(monthlyData).map(([_, v]) => v)
  const maxCount = Math.max(...months.map(m => m.count), 1)

  const completed = d.filter(x => x.status === 'finalized').length
  const completionRate = d.length > 0 ? Math.round((completed / d.length) * 100) : 0

  return (
    <div className='px-4 sm:px-6 lg:px-8 py-8' style={{ minHeight: '100vh', backgroundColor: '#060f1e' }}>
      <div className='mb-8'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-white'>Relatorios</h1>
            <p className='text-gray-400 mt-1'>Analises e insights da operacao LexFlow</p>
          </div>
          <button className='flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all' style={{ backgroundColor: '#d4af37', color: '#060f1e' }}>
            <Download className='h-4 w-4' />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
        {[
          { label: 'Total de Demandas', value: totalDemands ?? 0, icon: FileText, color: '#d4af37' },
          { label: 'Taxa de Conclusao', value: `${completionRate}%`, icon: TrendingUp, color: '#10b981' },
          { label: 'Usuarios Ativos', value: totalUsers ?? 0, icon: Users, color: '#3b82f6' },
          { label: 'Escritorios', value: totalOrgs ?? 0, icon: PieChart, color: '#a855f7' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className='border-0' style={{ backgroundColor: '#0d1f38' }}>
            <CardContent className='pt-5 pb-5'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-gray-500 text-xs'>{label}</p>
                  <p className='text-3xl font-bold text-white mt-1'>{value}</p>
                </div>
                <div className='w-11 h-11 rounded-xl flex items-center justify-center' style={{ backgroundColor: `${color}20` }}>
                  <Icon className='h-5 w-5' style={{ color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6'>
        <Card className='border-0' style={{ backgroundColor: '#0d1f38' }}>
          <CardContent className='pt-6'>
            <h3 className='text-white font-semibold mb-5 flex items-center gap-2'>
              <FileText className='h-4 w-4' style={{ color: '#d4af37' }} />
              Demandas por Tipo
            </h3>
            <div className='space-y-3'>
              {Object.entries(byType).length === 0 ? (
                <p className='text-gray-500 text-sm text-center py-4'>Sem dados</p>
              ) : (
                Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type}>
                    <div className='flex justify-between text-sm mb-1'>
                      <span className='text-gray-400 capitalize'>{type.replace(/_/g, ' ')}</span>
                      <span className='text-white font-medium'>{count}</span>
                    </div>
                    <div className='h-2 rounded-full' style={{ backgroundColor: '#ffffff10' }}>
                      <div
                        className='h-2 rounded-full transition-all'
                        style={{ width: `${Math.round((count / (totalDemands ?? 1)) * 100)}%`, backgroundColor: '#d4af37' }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className='border-0' style={{ backgroundColor: '#0d1f38' }}>
          <CardContent className='pt-6'>
            <h3 className='text-white font-semibold mb-5 flex items-center gap-2'>
              <BarChart3 className='h-4 w-4' style={{ color: '#d4af37' }} />
              Urgencia das Demandas
            </h3>
            <div className='space-y-3'>
              {[
                { label: 'Critica', value: byUrgency.urgent || 0, color: '#ef4444' },
                { label: 'Alta', value: byUrgency.high || 0, color: '#f59e0b' },
                { label: 'Media', value: byUrgency.medium || 0, color: '#3b82f6' },
                { label: 'Baixa', value: byUrgency.low || 0, color: '#10b981' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className='flex justify-between text-sm mb-1'>
                    <span className='text-gray-400'>{label}</span>
                    <span className='text-white font-medium'>{value}</span>
                  </div>
                  <div className='h-2 rounded-full' style={{ backgroundColor: '#ffffff10' }}>
                    <div
                      className='h-2 rounded-full transition-all'
                      style={{ width: `${Math.round((value / (totalDemands ?? 1)) * 100)}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className='border-0' style={{ backgroundColor: '#0d1f38' }}>
        <CardContent className='pt-6'>
          <h3 className='text-white font-semibold mb-5 flex items-center gap-2'>
            <Calendar className='h-4 w-4' style={{ color: '#d4af37' }} />
            Evolucao de Demandas (Ultimos 6 meses)
          </h3>
          {totalDemands === 0 ? (
            <p className='text-gray-500 text-sm text-center py-8'>Nenhuma demanda cadastrada</p>
          ) : (
            <div className='flex items-end justify-between gap-4 py-4' style={{ height: '200px' }}>
              {months.map((m, i) => (
                <div key={i} className='flex flex-col items-center gap-2 flex-1'>
                  <div className='w-full flex flex-col items-center'>
                    <span className='text-white text-sm font-semibold mb-1'>{m.count}</span>
                    <div
                      className='w-full max-w-16 rounded-t-md transition-all'
                      style={{ height: `${Math.max((m.count / maxCount) * 150, 4)}px`, backgroundColor: '#d4af37' }}
                    />
                  </div>
                  <span className='text-gray-500 text-xs'>{m.label}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className='mt-6 p-4 rounded-lg' style={{ backgroundColor: '#d4af3710', border: '1px solid #d4af3730' }}>
        <p className='text-gray-400 text-sm'>
          <strong style={{ color: '#d4af37' }}>Dica:</strong> Clique em &quot;Exportar PDF&quot; para gerar um relatorio completo com todas as metricas.
        </p>
      </div>
    </div>
  )
}
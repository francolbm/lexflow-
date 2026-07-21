import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export default async function AuditoriaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/admin')

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100)

  const allLogs = logs || []

  const actionColors: Record<string, string> = {
    status_atualizado: 'bg-blue-500/20 text-blue-400',
    minuta_enviada: 'bg-yellow-500/20 text-yellow-400',
    aprovacao_registrada: 'bg-green-500/20 text-green-400',
    ajuste_solicitado: 'bg-orange-500/20 text-orange-400',
    demanda_criada: 'bg-purple-500/20 text-purple-400',
    login: 'bg-gray-500/20 text-gray-400',
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8" style={{ minHeight: '100vh', backgroundColor: '#060f1e' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Auditoria & Logs</h1>
        <p className="text-gray-400 mt-1">Registro imutável de todas as ações críticas da plataforma</p>
        <div className="mt-3 px-3 py-2 rounded-lg inline-flex items-center gap-2 text-xs" style={{ backgroundColor: '#d4af3715', color: '#d4af37' }}>
          <FileText className="h-3.5 w-3.5" />
          Visível apenas para administradores · Logs não podem ser editados ou excluídos
        </div>
      </div>

      <Card className="border-0" style={{ backgroundColor: '#0d1f38' }}>
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-white/10">
            {['Data/Hora', 'Ação', 'Usuário', 'Entidade', 'IP'].map(h => (
              <div key={h} className="text-gray-500 text-xs font-medium uppercase tracking-wide">{h}</div>
            ))}
          </div>

          {allLogs.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-10 w-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400">Nenhum log registrado ainda</p>
              <p className="text-gray-600 text-sm mt-1">Os logs aparecerão conforme os usuários realizarem ações na plataforma</p>
            </div>
          ) : (
            allLogs.map((log: any, idx: number) => (
              <div
                key={log.id}
                className="flex flex-col md:grid md:grid-cols-[auto_1fr_auto_auto_auto] gap-2 md:gap-4 items-start md:items-center px-4 md:px-6 py-3"
                style={{ borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
              >
                <div className="text-gray-500 text-xs font-mono whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('pt-BR')}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${actionColors[log.action] || 'bg-gray-500/20 text-gray-400'}`}>
                    {log.action}
                  </span>
                </div>
                <div className="text-gray-400 text-xs truncate max-w-[140px]">
                  {(log.profiles as any)?.full_name || '—'}
                </div>
                <div className="text-gray-500 text-xs">
                  {log.entity} {log.entity_id ? `·${log.entity_id.slice(0, 8)}` : ''}
                </div>
                <div className="text-gray-600 text-xs font-mono">
                  {log.ip_address || '—'}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

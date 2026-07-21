import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, ChevronRight, Shield } from 'lucide-react'

export default async function UsuariosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || (profile.role !== 'operador' && profile.role !== 'admin')) redirect('/dashboard')

  const { data: users } = await supabase
    .from('profiles')
    .select('*, organization_members(role, status, organizations(name))')
    .order('created_at', { ascending: false })

  const allUsers = users || []

  const roleColors: Record<string, string> = {
    admin: 'bg-red-500/20 text-red-400',
    operador: 'bg-yellow-500/20 text-yellow-400',
    advogado: 'bg-blue-500/20 text-blue-400',
  }
  const roleLabels: Record<string, string> = {
    admin: 'Admin', operador: 'Operador', advogado: 'Advogado',
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8" style={{ minHeight: '100vh', backgroundColor: '#060f1e' }}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuários</h1>
          <p className="text-gray-400 mt-1">{allUsers.length} usuário{allUsers.length !== 1 ? 's' : ''} cadastrado{allUsers.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <Card className="border-0" style={{ backgroundColor: '#0d1f38' }}>
        <CardContent className="p-0">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-white/10">
            {['Nome', 'E-mail', 'Papel', 'Escritório', ''].map(h => (
              <div key={h} className="text-gray-500 text-xs font-medium uppercase tracking-wide">{h}</div>
            ))}
          </div>

          {allUsers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-10 w-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400">Nenhum usuário cadastrado ainda</p>
            </div>
          ) : (
            allUsers.map((u: any, idx: number) => {
              const membership = u.organization_members?.[0]
              const orgName = membership?.organizations?.name || '—'
              return (
                <div
                  key={u.id}
                  className="flex flex-col md:grid md:grid-cols-[1fr_1fr_auto_auto_auto] gap-2 md:gap-4 items-start md:items-center px-4 md:px-6 py-4"
                  style={{ borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                >
                  <div>
                    <p className="text-white text-sm font-medium">{u.full_name || '—'}</p>
                    {u.oab_number && (
                      <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
                        <Shield className="h-3 w-3" /> OAB {u.oab_number}
                      </p>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm truncate">{u.email}</p>
                  <Badge className={`text-xs border-0 ${roleColors[u.role] || 'bg-gray-500/20 text-gray-400'}`}>
                    {roleLabels[u.role] || u.role}
                  </Badge>
                  <p className="text-gray-400 text-sm truncate max-w-[150px]">{orgName}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
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

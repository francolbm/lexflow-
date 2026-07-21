import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, Users, Settings } from 'lucide-react'

export default async function EscritoriosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || (profile.role !== 'operador' && profile.role !== 'admin')) redirect('/dashboard')

  const { data: orgs } = await supabase
    .from('organizations')
    .select('*, profiles!organizations_owner_user_id_fkey(full_name, email), organization_members(count), subscriptions(plan_code, status, demands_used, demands_limit)')
    .order('created_at', { ascending: false })

  const allOrgs = orgs || []

  // Fetch endereco data
  const { data: enderecos } = await supabase
    .from('endereco')
    .select('*')
    .in('organization_id', allOrgs.map(o => o.id))

  const planColors: Record<string, string> = {
    start: 'bg-gray-500/20 text-gray-300',
    pro: 'bg-yellow-500/20 text-yellow-300',
    premium: 'bg-purple-500/20 text-purple-300',
    enterprise: 'bg-blue-500/20 text-blue-300',
  }
  const statusColors: Record<string, string> = {
    ativo: 'bg-green-500/20 text-green-400',
    cancelado: 'bg-red-500/20 text-red-400',
    inadimplente: 'bg-orange-500/20 text-orange-400',
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8" style={{ minHeight: '100vh', backgroundColor: '#060f1e' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Escritórios</h1>
        <p className="text-gray-400 mt-1">{allOrgs.length} escritório{allOrgs.length !== 1 ? 's' : ''} cadastrado{allOrgs.length !== 1 ? 's' : ''}</p>
      </div>

      {allOrgs.length === 0 ? (
        <Card className="border-0" style={{ backgroundColor: '#0d1f38' }}>
          <CardContent className="text-center py-16">
            <Building2 className="h-10 w-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum escritório cadastrado ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allOrgs.map((org: any) => {
            const owner = org.profiles
            const sub = org.subscriptions?.[0]
            const membersCount = org.organization_members?.[0]?.count ?? 0
            const endereco = enderecos?.find(e => e.organization_id === org.id)
            return (
              <Card key={org.id} className="border-0" style={{ backgroundColor: '#0d1f38' }}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#d4af3720', color: '#d4af37' }}>
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{org.name}</p>
                        <p className="text-gray-500 text-xs">{org.slug}</p>
                      </div>
                    </div>
                    {sub && (
                      <Badge className={`text-xs border-0 ${planColors[sub.plan_code] || ''}`}>
                        {sub.plan_code?.toUpperCase()}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Responsável</span>
                      <span className="text-gray-300 truncate max-w-[150px]">{owner?.full_name || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">E-mail</span>
                      <span className="text-gray-300 truncate max-w-[150px]">{owner?.email || '—'}</span>
                    </div>
                    {endereco?.cnpj && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">CNPJ</span>
                        <span className="text-gray-300">{endereco.cnpj}</span>
                      </div>
                    )}
                    {endereco?.razao_social && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Razão Social</span>
                        <span className="text-gray-300 truncate max-w-[150px]">{endereco.razao_social}</span>
                      </div>
                    )}
                    {endereco?.full_address && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Endereço</span>
                        <span className="text-gray-300 truncate max-w-[150px]">{endereco.full_address}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Membros</span>
                      <span className="text-gray-300 flex items-center gap-1">
                        <Users className="h-3 w-3" /> {membersCount}
                      </span>
                    </div>
                    {sub && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Demandas usadas</span>
                          <span className="text-gray-300">{sub.demands_used} / {sub.demands_limit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Assinatura</span>
                          <Badge className={`text-xs border-0 ${statusColors[sub.status] || ''}`}>
                            {sub.status}
                          </Badge>
                        </div>
                        {/* Barra de uso */}
                        <div className="mt-3">
                          <div className="h-1.5 rounded-full" style={{ backgroundColor: '#ffffff10' }}>
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${Math.min(100, Math.round((sub.demands_used / sub.demands_limit) * 100))}%`,
                                backgroundColor: sub.demands_used / sub.demands_limit > 0.8 ? '#ef4444' : '#d4af37'
                              }}
                            />
                          </div>
                          <p className="text-gray-600 text-xs mt-1">
                            {Math.round((sub.demands_used / sub.demands_limit) * 100)}% do plano utilizado
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      Cadastrado em {new Date(org.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <Link href={`/admin/escritorios/${org.id}/membros`}>
                      <Button variant="outline" size="sm" className="border-white/20 text-gray-400 hover:text-white text-xs">
                        <Settings className="h-3 w-3 mr-1" />
                        Gerenciar
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

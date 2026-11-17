import { redirect } from 'next/navigation'
import { Lock, TriangleAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { InfoCard } from '@/components/layout/InfoCard'
import { FiliaisView } from '@/components/filiais/FiliaisView'
import { getGroupAccess } from '@/lib/filiais-access'
import { listarFiliais } from '@/lib/filial-list'
import { createListDeps } from '@/lib/filial-deps'
import type { GroupData } from '@/lib/filiais-types'

export const dynamic = 'force-dynamic'

const TITLE = 'Filiais do Grupo'

export default async function FiliaisPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Só o titular de matriz Premium com assinatura ativa no Stripe (mesma regra do item do menu).
  const access = await getGroupAccess(supabase, user.id)
  if (!access.eligible) {
    return (
      <>
        <Header title={TITLE} profile={profile} />
        <InfoCard icon={Lock} title="Acesso restrito à área de Filiais">
          Esta área é exclusiva do titular de um escritório matriz no plano Premium com assinatura ativa.
        </InfoCard>
      </>
    )
  }

  // Mesma lógica da Rota 3 (GET /api/escritorio/filial), chamada direto no servidor, sem desvio por HTTP.
  let data: GroupData | null = null
  try {
    const result = await listarFiliais(createListDeps(), user.id)
    if (result.status === 200) data = result.body as unknown as GroupData
  } catch (err) {
    console.error('filiais page: falha ao listar:', err)
  }

  return (
    <>
      <Header title={TITLE} profile={profile} />
      {data
        ? <FiliaisView data={data} />
        : (
          <InfoCard icon={TriangleAlert} title="Não foi possível carregar as filiais">
            Tente novamente em instantes. Se o problema continuar, fale com o suporte PennaJus.
          </InfoCard>
        )}
    </>
  )
}

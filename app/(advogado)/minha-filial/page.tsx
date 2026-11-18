import { redirect } from 'next/navigation'
import { Lock, TriangleAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { InfoCard } from '@/components/layout/InfoCard'
import { MinhaFilialView } from '@/components/minha-filial/MinhaFilialView'
import { loadMinhaFilial } from '@/lib/minha-filial-db'
import type { MinhaFilialData } from '@/lib/minha-filial'

export const dynamic = 'force-dynamic'

export default async function MinhaFilialPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  let data: MinhaFilialData | null = null
  let failed = false
  try {
    data = await loadMinhaFilial(user.id)
  } catch (err) {
    failed = true
    console.error('minha-filial page:', err)
  }

  return (
    <>
      <Header title="Minha Filial" profile={profile} />
      {data ? <MinhaFilialView data={data} />
        : failed ? (
          <InfoCard icon={TriangleAlert} title="Não foi possível carregar a filial">
            Tente novamente em instantes. Se o problema continuar, fale com o suporte PennaJus.
          </InfoCard>
        ) : (
          <InfoCard icon={Lock} title="Acesso restrito">
            Esta área é exclusiva dos membros de um escritório filial.
          </InfoCard>
        )}
    </>
  )
}

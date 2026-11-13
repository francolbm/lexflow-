import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Lock, TriangleAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { FiliaisView } from '@/components/filiais/FiliaisView'
import { getGroupAccess } from '@/lib/filiais-access'
import { listarFiliais } from '@/lib/filial-list'
import { createListDeps } from '@/lib/filial-deps'
import type { GroupData } from '@/lib/filiais-types'

export const dynamic = 'force-dynamic'

const TITLE = 'Filiais do Grupo'

function Aviso({ icon: Icon, title, children }: { icon: typeof Lock; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <div className="rounded-xl border border-white/10 bg-[#112240] p-8">
        <Icon className="mx-auto h-10 w-10" style={{ color: '#d4af37' }} aria-hidden />
        <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-gray-400">{children}</p>
        <Link href="/dashboard" className="mt-5 inline-block text-sm font-medium" style={{ color: '#d4af37' }}>
          Voltar para a Visão Geral
        </Link>
      </div>
    </div>
  )
}

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
        <Aviso icon={Lock} title="Acesso restrito à área de Filiais">
          Esta área é exclusiva do titular de um escritório matriz no plano Premium com assinatura ativa.
        </Aviso>
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
          <Aviso icon={TriangleAlert} title="Não foi possível carregar as filiais">
            Tente novamente em instantes. Se o problema continuar, fale com o suporte PennaJus.
          </Aviso>
        )}
    </>
  )
}

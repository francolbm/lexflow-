import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCancelDeps } from '@/lib/filial-deps'
import { cancelarFilial } from '@/lib/filial-cancel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// DELETE /api/escritorio/filial/[id] — agenda o cancelamento de uma filial (acesso até o fim do ciclo pago).
// ?force=true + { "motivo": "..." } é exigido quando a filial tem demandas em andamento.
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!UUID.test(params.id)) {
    return NextResponse.json({ error: 'Identificador de filial inválido.' }, { status: 400 })
  }

  const rawBody = await request.json().catch(() => undefined) // DELETE costuma vir sem corpo
  const force = new URL(request.url).searchParams.get('force') === 'true'

  try {
    const { status, body } = await cancelarFilial(createCancelDeps(), user.id, params.id, { force, rawBody })
    return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('filial DELETE error:', err)
    return NextResponse.json({ error: 'Erro interno ao cancelar a filial.' }, { status: 500 })
  }
}

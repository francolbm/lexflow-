import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPreviaDeps } from '@/lib/filial-deps'
import { montarPrevia } from '@/lib/filial-previa'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/escritorio/filial/previa — valor, cartão e CNPJ da matriz para o passo de confirmação do wizard.
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { status, body } = await montarPrevia(createPreviaDeps(), user.id)
    return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('filial previa error:', err)
    return NextResponse.json({ error: 'Erro interno ao calcular a prévia.' }, { status: 500 })
  }
}

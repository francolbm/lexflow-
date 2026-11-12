import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFilialDeps, createListDeps } from '@/lib/filial-deps'
import { criarFilial } from '@/lib/filial'
import { listarFiliais } from '@/lib/filial-list'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/escritorio/filial — lista as filiais da matriz (titular ou admin) com o painel consolidado.
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { status, body } = await listarFiliais(createListDeps(), user.id)
    return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('filial GET error:', err)
    return NextResponse.json({ error: 'Erro interno ao listar as filiais.' }, { status: 500 })
  }
}

// POST /api/escritorio/filial — cria uma filial Premium vinculada à matriz do titular autenticado.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL
    || `https://${request.headers.get('host') || 'pennajus.com.br'}`

  try {
    const { status, body: out } = await criarFilial(createFilialDeps(base), user.id, body)
    return NextResponse.json(out, { status, headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    // Falha antes de qualquer escrita (ex.: consulta de validação).
    console.error('filial POST error:', err)
    return NextResponse.json({ error: 'Erro interno ao criar a filial.' }, { status: 500 })
  }
}

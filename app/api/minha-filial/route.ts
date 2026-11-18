import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadMinhaFilial } from '@/lib/minha-filial-db'

export const dynamic = 'force-dynamic'

// GET /api/minha-filial: dados da filial do usuário logado. Sem parâmetros: o escritório vem do vínculo da sessão.
export async function GET() {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  try {
    const data = await loadMinhaFilial(user.id)
    if (!data) return NextResponse.json({ error: 'Área exclusiva de membros de uma filial.' }, { status: 403 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('minha-filial:', err)
    return NextResponse.json({ error: 'Falha ao carregar a filial.' }, { status: 500 })
  }
}

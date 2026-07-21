import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  try {
    // Get raw body
    const rawBody = await request.text()
    
    if (!rawBody || rawBody.trim() === '') {
      return NextResponse.json({ error: 'Body vazio' }, { status: 400 })
    }
    
    let body;
    
    // First try direct parse
    try {
      body = JSON.parse(rawBody)
    } catch (e) {
      // If failed, try to unescape
      try {
        const unescaped = rawBody.replace(/\\+/g, '')
        body = JSON.parse(unescaped)
      } catch {
        return NextResponse.json({ error: 'Formato JSON invalido' }, { status: 400 })
      }
    }
    
    const demandId = body.demandId || body.demand_id
    const reason = body.reason || body.motivo
    
    if (!demandId || !reason) {
      return NextResponse.json({ error: 'demandId e reason sao obrigatorios' }, { status: 400 })
    }

    // Verify user is authenticated
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    // Create service client directly with env vars
    const serviceClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return [] },
          setAll() {},
        },
      }
    )

    // Get demand with organization_id
    const { data: demand, error: fetchError } = await serviceClient
      .from('demands')
      .select('id, organization_id')
      .eq('id', demandId)
      .single()
    
    if (fetchError || !demand) {
      return NextResponse.json({ error: 'Demanda nao encontrada' }, { status: 404 })
    }

    // Check if there's already a deletion request for this demand
    const { data: existingRequest } = await serviceClient
      .from('comments')
      .select('id')
      .eq('demand_id', demandId)
      .ilike('body', '%SOLICITACAO DE EXCLUSAO%')
      .limit(1)
    
    if (existingRequest && existingRequest.length > 0) {
      return NextResponse.json({ error: 'Ja existe uma solicitacao de exclusao para esta demanda' }, { status: 400 })
    }

    // Update the demand status to deletion_requested
    const { error: statusError } = await serviceClient
      .from('demands')
      .update({ status: 'deletion_requested' })
      .eq('id', demandId)

    if (statusError) {
      console.error('Status update error:', statusError)
      return NextResponse.json({ error: 'Erro ao atualizar status: ' + statusError.message }, { status: 500 })
    }

    // Create comment with the reason and organization_id
    const { error: commentError } = await serviceClient
      .from('comments')
      .insert({
        demand_id: demandId,
        organization_id: demand.organization_id,
        author_user_id: user.id,
        body: '[SOLICITACAO DE EXCLUSAO] ' + reason,
        internal_only: true,
      })

    if (commentError) {
      console.error('Comment error:', commentError)
      // Don't fail - status already updated
    }

    // Create audit log entry
    await serviceClient
      .from('audit_logs')
      .insert({
        organization_id: demand.organization_id,
        user_id: user.id,
        action: 'deletion_request',
        entity: 'demands',
        entity_id: demandId,
        new_data: { reason, requested_at: new Date().toISOString() },
      })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete request error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor: ' + error.message }, { status: 500 })
  }
}
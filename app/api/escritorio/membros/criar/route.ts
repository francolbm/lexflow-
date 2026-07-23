import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Mapeia o papel de organização (app_role) para o papel exibido no perfil.
const PROFILE_ROLE: Record<string, string> = {
  lawyer: 'advogado',
  assistant: 'assistente',
  admin: 'admin',
}

function gerarSenhaTemporaria(): string {
  // 12 caracteres, base64 url-safe, sem ambiguidade de padding.
  return randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12) + 'A9'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const orgId: string = body.orgId
    const email: string = (body.email || '').trim().toLowerCase()
    const fullName: string = (body.fullName || '').trim()
    const cpf: string | null = body.cpf || null
    const oabNumber: string | null = body.oabNumber || null
    const oabUf: string | null = body.oabUf || null
    const orgRole: string = body.orgRole // 'lawyer' | 'assistant' | 'admin'

    if (!orgId || !email || !fullName || !orgRole) {
      return NextResponse.json({ error: 'Dados obrigatórios: orgId, email, nome e cargo.' }, { status: 400 })
    }
    if (!['lawyer', 'assistant', 'admin'].includes(orgRole)) {
      return NextResponse.json({ error: 'Cargo inválido.' }, { status: 400 })
    }
    if (orgRole === 'lawyer' && !oabNumber) {
      return NextResponse.json({ error: 'OAB é obrigatória para cadastrar um Advogado.' }, { status: 400 })
    }

    // 1) Autenticação: quem chama precisa ser gestor (admin) do escritório.
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const serviceClient = createServiceClient()

    const { data: requesterMembership } = await serviceClient
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!requesterMembership || requesterMembership.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas um administrador do escritório pode cadastrar membros.' }, { status: 403 })
    }

    // 2) Gate de plano: só PRO/PREMIUM podem cadastrar membros.
    const { data: sub } = await serviceClient
      .from('subscriptions')
      .select('plan_code, status')
      .eq('organization_id', orgId)
      .single()

    if (!sub || sub.status !== 'active' || !['pro', 'premium'].includes(sub.plan_code)) {
      return NextResponse.json(
        { error: 'O cadastro de membros pelo escritório está disponível apenas nos planos PRO e PREMIUM.' },
        { status: 403 }
      )
    }

    // 3) Se já existe conta com esse e-mail, apenas vincula (não recria).
    const { data: existingProfile } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    let userId: string
    let tempPassword: string | null = null
    let invited = false

    if (existingProfile) {
      userId = existingProfile.id

      const { data: alreadyMember } = await serviceClient
        .from('organization_members')
        .select('id')
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .maybeSingle()

      if (alreadyMember) {
        return NextResponse.json({ error: 'Este usuário já é membro deste escritório.' }, { status: 400 })
      }
    } else {
      // 4) Preferência: convite por e-mail (o membro define a própria senha).
      //    Fallback automático para senha temporária se o e-mail do Supabase
      //    Auth ainda não estiver configurado.
      const base = process.env.NEXT_PUBLIC_SITE_URL
        || `https://${request.headers.get('host') || 'lexflowsaas.vercel.app'}`
      const redirectTo = `${base}/alterar-senha`

      const { data: inviteData, error: inviteErr } = await serviceClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName, email },
        redirectTo,
      })

      if (!inviteErr && inviteData?.user) {
        userId = inviteData.user.id
        invited = true
      } else {
        tempPassword = gerarSenhaTemporaria()
        const { data: authData, error: createErr } = await serviceClient.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: fullName, email },
        })
        if (createErr || !authData.user) {
          return NextResponse.json(
            { error: 'Erro ao criar conta: ' + (createErr?.message || inviteErr?.message || 'desconhecido') },
            { status: 400 }
          )
        }
        userId = authData.user.id
      }

      await serviceClient.from('profiles').upsert({
        id: userId,
        full_name: fullName,
        email,
        role: PROFILE_ROLE[orgRole],
        cpf,
        oab_number: oabNumber,
        oab_uf: oabUf,
        // oab_verified fica false; será validado pela API da OAB depois.
      })
    }

    // 5) Vincula ao escritório com o papel de organização correto.
    const { error: linkErr } = await serviceClient.from('organization_members').insert({
      organization_id: orgId,
      user_id: userId,
      role: orgRole,
      status: 'active',
    })

    if (linkErr) {
      return NextResponse.json({ error: 'Erro ao vincular ao escritório: ' + linkErr.message }, { status: 500 })
    }

    // 6) Auditoria.
    await serviceClient.from('audit_logs').insert({
      organization_id: orgId,
      user_id: user.id,
      action: existingProfile ? 'member_linked' : 'member_created',
      entity: 'organization_members',
      entity_id: userId,
      new_data: { email, org_role: orgRole, profile_role: PROFILE_ROLE[orgRole], created: !existingProfile, invited },
    })

    return NextResponse.json({
      success: true,
      userId,
      created: !existingProfile,
      invited,
      // Senha temporária só é devolvida no fallback (e-mail não configurado).
      tempPassword,
      message: existingProfile
        ? 'Usuário existente vinculado ao escritório.'
        : invited
          ? `Convite enviado por e-mail para ${email}. O membro define a senha pelo link recebido.`
          : 'Membro criado e vinculado. Repasse a senha temporária com segurança.',
    })
  } catch (error: any) {
    console.error('criar-membro error:', error)
    return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 })
  }
}

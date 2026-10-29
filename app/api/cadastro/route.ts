import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { PLANS, isPlanCode } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const { email, password, fullName, oabNumber, planType: rawPlanType = 'start', cnpj, razaoSocial, cep, logradouro, numero, complemento, bairro, cidade, estado } = await request.json()

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, senha e nome completo são obrigatórios' },
        { status: 400 }
      )
    }

    // 'free' foi extinto na v4; aceito como Start só por compatibilidade com
    // páginas de cadastro antigas abertas no navegador. Remover depois.
    const planType = rawPlanType === 'free' ? 'start' : rawPlanType
    if (!isPlanCode(planType)) {
      return NextResponse.json(
        { error: 'Plano inválido. Escolha Start, Pro ou Premium.' },
        { status: 400 }
      )
    }
    const plan = PLANS[planType]

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Use service role for all operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Create Supabase server client with service role
    const supabase = createServerClient(supabaseUrl, serviceKey, {
      cookies: {
        getAll() { return [] },
        setAll() {}
      }
    })

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.' },
        { status: 400 }
      )
    }

    // Create auth user
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        email: email
      }
    })

    if (signUpError) {
      return NextResponse.json(
        { error: signUpError.message },
        { status: 400 }
      )
    }

    const userId = authData.user?.id
    if (!userId) {
      return NextResponse.json(
        { error: 'Falha ao criar usuário' },
        { status: 500 }
      )
    }

    // Create slug for organization
    const slug = fullName.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36)

    // Build full address
    const fullAddress = logradouro ? `${logradouro}${numero ? ', ' + numero : ''}${complemento ? ', ' + complemento : ''}` : null

    // Se qualquer passo falhar daqui pra frente, desfaz tudo: sem conta pela metade.
    let orgId: string | null = null
    const rollback = async (step: string, err: { message: string }) => {
      console.error(`Signup ${step} error:`, err)
      if (orgId) await supabase.from('organizations').delete().eq('id', orgId) // cascade: membros, assinatura, endereço
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Não foi possível concluir o cadastro. Tente novamente.' },
        { status: 500 }
      )
    }

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: fullName,
        slug: slug,
        owner_user_id: userId,
      })
      .select()
      .single()
    if (orgError || !orgData) return rollback('organization', orgError ?? { message: 'sem retorno' })
    orgId = orgData.id

    // Planos com escritório (Pro/Premium): titular é gestor do escritório; Start é advogado solo
    const isAdmin = plan.hasOffice

    // profiles.role 'admin'/'operador' = equipe PennaJus (painel da plataforma).
    // Nunca vem do cadastro: todo cliente é 'advogado'.
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: fullName,
      email: email,
      role: 'advogado',
      oab_number: oabNumber || null,
      accepted_terms_at: new Date().toISOString()
    })
    if (profileError) return rollback('profile', profileError)

    // O vínculo do titular como 'admin' já é criado pelo trigger
    // bootstrap_owner_membership ao inserir o escritório.

    // Subscription para todos os planos: fonte de verdade do plano por organização.
    const { error: subError } = await supabase.from('subscriptions').insert({
      organization_id: orgData.id,
      plan_code: planType,
      status: 'active',
      demands_used: 0,
      demands_limit: plan.demandsLimit,
    })
    if (subError) return rollback('subscription', subError)

    // Endereço/CNPJ só para planos com escritório (Pro/Premium)
    if (isAdmin && (cnpj || logradouro)) {
      const { error: enderecoError } = await supabase.from('endereco').upsert({
        organization_id: orgData.id,
        cnpj: cnpj || null,
        razao_social: razaoSocial || null,
        cep: cep || null,
        logradouro: logradouro || null,
        numero: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade: cidade || null,
        estado: estado || null,
        full_address: fullAddress
      }, { onConflict: 'organization_id' })
      if (enderecoError) return rollback('endereco', enderecoError)
    }

    // Start (solo): titular vira 'lawyer' para poder finalizar as próprias demandas.
    // Fica por último: depois disso o trigger ensure_org_has_lawyer impediria o rollback.
    if (!isAdmin) {
      const { error: memberError } = await supabase.from('organization_members')
        .update({ role: 'lawyer' })
        .eq('organization_id', orgData.id)
        .eq('user_id', userId)
      if (memberError) return rollback('member', memberError)
    }

    return NextResponse.json({
      success: true,
      userId: userId,
      isAdmin: isAdmin,
      message: isAdmin ? 'Conta de administrador criada com sucesso' : 'Conta criada com sucesso'
    })

  } catch (error: any) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
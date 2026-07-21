import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, fullName, oabNumber, planType = 'free', cnpj, razaoSocial, cep, logradouro, numero, complemento, bairro, cidade, estado } = await request.json()

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, senha e nome completo são obrigatórios' },
        { status: 400 }
      )
    }

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

    // Create organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: fullName,
        slug: slug,
        owner_user_id: userId,
      })
      .select()
      .single()

    if (orgError) {
      console.error('Organization creation error:', orgError)
      // Don't fail - org might already exist
    }

    // Determine role based on plan
    const isAdmin = ['pro', 'premium'].includes(planType)
    const userRole = isAdmin ? 'admin' : 'advogado'

    // Create profile
    await supabase.from('profiles').upsert({
      id: userId,
      full_name: fullName,
      email: email,
      role: userRole,
      oab_number: oabNumber || null,
      accepted_terms_at: new Date().toISOString()
    })

    // Add user to organization if org was created (only for pro/premium)
    if (orgData?.id) {
      await supabase.from('organization_members').insert({
        organization_id: orgData.id,
        user_id: userId,
        role: isAdmin ? 'owner' : 'member',
        status: 'active'
      })
      
      // Create subscription record for pro/premium
      if (isAdmin) {
        await supabase.from('subscriptions').upsert({
          organization_id: orgData.id,
          plan_code: planType,
          status: 'active',
          demands_used: 0,
          demands_limit: planType === 'premium' ? 999 : 100,
          created_at: new Date().toISOString()
        })
        
        // Save endereco data if provided
        if (cnpj || logradouro) {
          await supabase.from('endereco').upsert({
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
        }
      }
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
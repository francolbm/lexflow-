import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: Request) {
  try {
    const { organizationId, cnpj, razaoSocial, cep, logradouro, numero, complemento, bairro, cidade, estado } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId é obrigatório' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createServerClient(supabaseUrl, serviceKey, {
      cookies: { getAll() { return [] }, setAll() {} }
    })

    const fullAddress = logradouro 
      ? `${logradouro}${numero ? ', ' + numero : ''}${complemento ? ' - ' + complemento : ''}`
      : null

    // Create or update endereco record
    const { data, error } = await supabase
      .from('endereco')
      .upsert({
        organization_id: organizationId,
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
      .select()
      .single()

    if (error) {
      console.error('Endereco upsert error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message
      })
    }

    return NextResponse.json({ success: true, data })

  } catch (error: any) {
    console.error('Endereco API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId é obrigatório' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createServerClient(supabaseUrl, serviceKey, {
      cookies: { getAll() { return [] }, setAll() {} }
    })

    const { data, error } = await supabase
      .from('endereco')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      return NextResponse.json({ data: null })
    }

    return NextResponse.json({ success: true, data })

  } catch (error: any) {
    console.error('Get endereco error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
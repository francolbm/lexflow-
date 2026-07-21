import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: Request) {
  try {
    const { userId, legalName, cnpj, cep, logradouro, numero, complemento, bairro, cidade, estado } = await request.json()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createServerClient(supabaseUrl, serviceKey, {
      cookies: { getAll() { return [] }, setAll() {} }
    })

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single()

    if (!member) {
      return NextResponse.json(
        { error: 'Você não é dono de nenhum escritório' },
        { status: 404 }
      )
    }

    // Try to insert or update in organizations table
    const { data: org, error: updateError } = await supabase
      .from('organizations')
      .update({
        legal_name: legalName || null,
        cnpj: cnpj || null,
        address: logradouro ? `${logradouro}${numero ? ', ' + numero : ''}${complemento ? ', ' + complemento : ''}` : null,
        cep: cep || null,
        city: cidade || null,
        state: estado || null
      })
      .eq('id', member.organization_id)
      .select()
      .single()

    if (updateError) {
      // Table doesn't have columns - create office_profiles table
      const { error: insertError } = await supabase
        .from('office_profiles')
        .upsert({
          organization_id: member.organization_id,
          legal_name: legalName,
          cnpj: cnpj,
          cep: cep,
          logradouro: logradouro,
          numero: numero,
          complemento: complemento,
          bairro: bairro,
          cidade: cidade,
          estado: estado,
          address: logradouro ? `${logradouro}${numero ? ', ' + numero : ''}${complemento ? ', ' + complemento : ''}` : null
        }, { onConflict: 'organization_id' })

      if (insertError) {
        return NextResponse.json({ 
          success: true, 
          warning: 'Dados do escritório não puderam ser salvos completamente',
          error: updateError.message
        })
      }

      return NextResponse.json({ success: true, message: 'Dados do escritório salvos' })
    }

    return NextResponse.json({ success: true, message: 'Dados do escritório salvos' })

  } catch (error: any) {
    console.error('Office API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
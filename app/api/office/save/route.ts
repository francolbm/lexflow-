import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: Request) {
  try {
    const { userId, organizationId, legalName, cnpj, cep, logradouro, numero, complemento, bairro, cidade, estado } = await request.json()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createServerClient(supabaseUrl, serviceKey, {
      cookies: { getAll() { return [] }, setAll() {} }
    })

    const address = logradouro ? `${logradouro}${numero ? ', ' + numero : ''}${complemento ? ', ' + complemento : ''}` : null

    // Try to insert into office_profiles
    const { error } = await supabase
      .from('office_profiles')
      .insert({
        organization_id: organizationId,
        legal_name: legalName,
        cnpj: cnpj,
        cep: cep,
        logradouro: logradouro,
        numero: numero,
        complemento: complemento,
        bairro: bairro,
        cidade: cidade,
        estado: estado,
        address: address
      })

    if (error) {
      console.log('office_profiles error:', error.message)
      // Table doesn't exist yet - will need manual creation
      return NextResponse.json({ 
        success: false, 
        message: 'Tabela office_profiles não existe. Colunas necessárias na tabela organizations: legal_name, cnpj, address, cep, city, state',
        needs_setup: true
      })
    }

    return NextResponse.json({ success: true, message: 'Dados do escritório salvos' })

  } catch (error: any) {
    console.error('Save office error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
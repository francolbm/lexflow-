import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // SQL to add columns to organizations table
    const sql = `
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS legal_name text,
      ADD COLUMN IF NOT EXISTS cnpj text,
      ADD COLUMN IF NOT EXISTS address text,
      ADD COLUMN IF NOT EXISTS cep text,
      ADD COLUMN IF NOT EXISTS city text,
      ADD COLUMN IF NOT EXISTS state text;
    `

    // Try to execute via RPC if available
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql })
    })

    if (response.ok) {
      return NextResponse.json({ success: true, message: 'Columns added via RPC' })
    }

    // If RPC not available, return instructions
    return NextResponse.json({ 
      success: false, 
      message: 'Cannot add columns via API. Please run this SQL manually in Supabase dashboard:',
      sql: sql
    }, { status: 200 })

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      manual_sql: `
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state text;
      `
    }, { status: 200 })
  }
}
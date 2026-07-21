import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  await supabase.auth.signOut()

  const response = NextResponse.redirect(new URL('/login', request.url), 302)
  response.cookies.set('sb-access-token', '', { path: '/', maxAge: 0 })
  response.cookies.set('sb-refresh-token', '', { path: '/', maxAge: 0 })

  return response
}

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/login', request.url), 302)
}
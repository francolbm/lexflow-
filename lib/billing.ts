import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Só o dono do escritório (organizations.owner_user_id) paga e gerencia a assinatura.
export async function getOwnerBilling() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }

  const service = createServiceClient()
  const { data: org } = await service
    .from('organizations').select('id, name, parent_organization_id').eq('owner_user_id', user.id).maybeSingle()
  if (!org) {
    return { error: NextResponse.json({ error: 'Só o titular do escritório pode gerenciar a assinatura.' }, { status: 403 }) }
  }
  // Filial cobra no mesmo customer Stripe da matriz: o Portal/Checkout dela exporia as assinaturas da matriz.
  if (org.parent_organization_id) {
    return { error: NextResponse.json({ error: 'A assinatura desta filial é gerenciada pela matriz.' }, { status: 403 }) }
  }

  const { data: sub } = await service
    .from('subscriptions')
    .select('plan_code, status, stripe_customer_id, stripe_subscription_id')
    .eq('organization_id', org.id).maybeSingle()
  if (!sub) return { error: NextResponse.json({ error: 'Escritório sem assinatura.' }, { status: 409 }) }

  return { user, org, sub, service }
}

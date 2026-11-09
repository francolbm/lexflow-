import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { PerfilSections } from '@/components/perfil/PerfilSections'
import { getAvatarUrl } from '@/lib/avatar'
import { isPlatformStaff, type OrgRole } from '@/lib/types'

export default async function PerfilPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('organization_members')
      .select('role, organization_id, organizations(owner_user_id)')
      .eq('user_id', user.id).eq('status', 'active').maybeSingle(),
  ])
  if (!profile) redirect('/login')

  const staff = isPlatformStaff(profile.role)
  // Mesma regra do /api/stripe/portal (getOwnerBilling): só o titular do escritório
  // gerencia a assinatura. A equipe PennaJus gerencia assinaturas pelo /admin.
  const org = (membership as { organizations?: { owner_user_id?: string } | null } | null)?.organizations
  const isOwner = !staff && org?.owner_user_id === user.id
  const { data: sub } = isOwner
    ? await supabase.from('subscriptions').select('stripe_customer_id').eq('organization_id', membership!.organization_id).maybeSingle()
    : { data: null }

  return (
    <>
      {/* Na área do advogado o Header traz o menu mobile; no admin quem faz isso é o AdminMobileNav do layout */}
      {!staff && <Header title="Meu perfil" profile={profile} />}
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-3xl mx-auto">
        {staff && <h1 className="mb-6 text-xl font-bold text-white">Meu perfil</h1>}
        <PerfilSections
          profile={{
            id: profile.id,
            fullName: profile.full_name ?? '',
            email: profile.email ?? user.email ?? '',
            phone: profile.phone ?? '',
            oabNumber: profile.oab_number,
            oabUf: profile.oab_uf,
            createdAt: profile.created_at,
            hasAvatar: !!profile.avatar_url,
          }}
          avatarUrl={await getAvatarUrl(supabase, profile.avatar_url)}
          roleLabel={staff
            ? `Equipe PennaJus (${profile.role === 'admin' ? 'Admin' : 'Operador'})`
            : membership?.role ? ORG_ROLE_LABELS[membership.role as OrgRole] : null}
          billing={isOwner ? { hasStripeCustomer: !!sub?.stripe_customer_id } : null}
        />
      </div>
    </>
  )
}

const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  admin: 'Admin', lawyer: 'Advogado', assistant: 'Assistente', client: 'Cliente',
}

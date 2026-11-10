import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { LegalArea, OrgRole } from '@/lib/types'
import { getAvatarUrl } from '@/lib/avatar'
import { getLogoUrl } from '@/lib/logo'
import type { OfficeData } from '@/lib/office-shared'

// Quem pode o quê no escritório (Fase B do /perfil). Vale para TELA e ROTA:
// - titular (organizations.owner_user_id): tudo, inclusive remover membros
// - admin designado (organization_members.role = 'admin', não titular): logo e dados
// - demais membros: só veem a lista de membros
// O navegador não grava organizations/endereco/organization_areas/organization_members
// (migrations organizations_restrict_client_updates e perfil_fase_b): as rotas gravam
// com a chave de serviço DEPOIS desta checagem.

export { BR_UFS, MEMBER_ROLE_LABELS } from '@/lib/office-shared'

export interface OfficeAccess {
  userId: string
  orgId: string
  ownerUserId: string
  role: OrgRole
  isOwner: boolean
  canEdit: boolean        // logo + dados do escritório
  canRemoveMembers: boolean
}

export function accessFor(userId: string, m: { organization_id: string; role: OrgRole }, ownerUserId: string): OfficeAccess {
  const isOwner = ownerUserId === userId
  return {
    userId, orgId: m.organization_id, ownerUserId, role: m.role, isOwner,
    canEdit: isOwner || m.role === 'admin',
    canRemoveMembers: isOwner,
  }
}

// Escritório ativo do usuário logado (cada usuário tem um vínculo ativo hoje).
export async function getOfficeAccess(): Promise<OfficeAccess | null> {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data: m } = await service.from('organization_members')
    .select('organization_id, role, organizations(owner_user_id)')
    .eq('user_id', user.id).eq('status', 'active')
    .order('created_at').limit(1).maybeSingle()
  const owner = (m as { organizations?: { owner_user_id?: string } | null } | null)?.organizations?.owner_user_id
  if (!m || !owner) return null
  return accessFor(user.id, m as { organization_id: string; role: OrgRole }, owner)
}

// Para as rotas: devolve o acesso ou a resposta de erro pronta.
export async function requireOffice(need: 'edit' | 'removeMembers'): Promise<OfficeAccess | NextResponse> {
  const access = await getOfficeAccess()
  if (!access) return NextResponse.json({ error: 'Não autenticado ou sem escritório.' }, { status: 401 })
  if (need === 'edit' && !access.canEdit) {
    return NextResponse.json({ error: 'Só o titular ou um admin do escritório pode alterar estes dados.' }, { status: 403 })
  }
  if (need === 'removeMembers' && !access.canRemoveMembers) {
    return NextResponse.json({ error: 'Só o titular do escritório pode remover membros.' }, { status: 403 })
  }
  return access
}

// Tudo que as seções 4-6 do /perfil mostram. Lê com a chave de serviço DEPOIS de
// confirmar o vínculo ativo do usuário (assistentes não leem perfis de colegas pela RLS).
export async function loadOfficeData(userId: string): Promise<OfficeData | null> {
  const service = createServiceClient()
  const { data: m } = await service.from('organization_members')
    .select('organization_id, role, organizations(owner_user_id)')
    .eq('user_id', userId).eq('status', 'active')
    .order('created_at').limit(1).maybeSingle()
  const ownerId = (m as { organizations?: { owner_user_id?: string } | null } | null)?.organizations?.owner_user_id
  if (!m || !ownerId) return null
  const access = accessFor(userId, m as { organization_id: string; role: OrgRole }, ownerId)
  const orgId = access.orgId

  const [{ data: org }, { data: end }, { data: areas }, { data: owner }, { data: members }] = await Promise.all([
    service.from('organizations').select('name, slug, phone, logo_url').eq('id', orgId).single(),
    service.from('endereco').select('*').eq('organization_id', orgId).maybeSingle(),
    service.from('organization_areas').select('area').eq('organization_id', orgId),
    service.from('profiles').select('full_name, oab_number, oab_uf, oab_verified').eq('id', ownerId).single(),
    service.from('organization_members')
      .select('user_id, role, created_at, profiles(full_name, email, avatar_url)')
      .eq('organization_id', orgId).eq('status', 'active').order('created_at'),
  ])
  if (!org) return null

  type Row = { user_id: string; role: OrgRole; created_at: string; profiles: { full_name: string | null; email: string | null; avatar_url: string | null } | null }
  const list = await Promise.all(((members ?? []) as unknown as Row[]).map(async (r) => ({
    userId: r.user_id,
    fullName: r.profiles?.full_name ?? '',
    email: r.profiles?.email ?? '',
    role: r.role,
    isOwner: r.user_id === ownerId,
    joinedAt: r.created_at,
    avatarUrl: await getAvatarUrl(service, r.profiles?.avatar_url),
  })))
  list.sort((a, b) => Number(b.isOwner) - Number(a.isOwner)) // titular primeiro

  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    canEdit: access.canEdit,
    canRemoveMembers: access.canRemoveMembers,
    viewerId: userId,
    org: { name: org.name, slug: org.slug, phone: s(org.phone), hasLogo: !!org.logo_url },
    logoUrl: access.canEdit ? await getLogoUrl(service, org.logo_url) : null,
    endereco: {
      cnpj: s(end?.cnpj), razao_social: s(end?.razao_social), cep: s(end?.cep), logradouro: s(end?.logradouro),
      numero: s(end?.numero), complemento: s(end?.complemento), bairro: s(end?.bairro), cidade: s(end?.cidade), estado: s(end?.estado),
    },
    areas: (areas ?? []).map((a) => a.area as LegalArea),
    owner: {
      fullName: owner?.full_name ?? '', oabNumber: owner?.oab_number ?? null,
      oabUf: owner?.oab_uf ?? null, oabVerified: !!owner?.oab_verified,
    },
    members: list,
  }
}

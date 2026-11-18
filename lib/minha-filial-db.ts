// Dados da tela "Minha Filial" (servidor, chave de serviço). A RLS não deixa assistente/lawyer ler colegas,
// então o escritório é resolvido SÓ pelo vínculo ativo da sessão (userId), nunca por id vindo da requisição.
import { createServiceClient } from '@/lib/supabase/server'
import { getAvatarUrl } from '@/lib/avatar'
import { DEMANDAS_ENCERRADAS } from '@/lib/filial-cancel'
import { filialOrgIdOf, papelLabel, monthStartBrasiliaIso, type MembershipRow, type MinhaFilialData } from '@/lib/minha-filial'
import type { OrgRole } from '@/lib/types'

export async function loadMinhaFilial(userId: string): Promise<MinhaFilialData | null> {
  const db = createServiceClient()
  const { data: mine } = await db.from('organization_members')
    .select('organization_id, organizations(parent_organization_id)')
    .eq('user_id', userId).eq('status', 'active')
  const orgId = filialOrgIdOf(mine as unknown as MembershipRow[] | null)
  if (!orgId) return null

  const since = monthStartBrasiliaIso()
  const [{ data: org }, { data: end }, { data: sub }, { data: members }, abertas, finalizadas] = await Promise.all([
    db.from('organizations').select('name, phone, status, owner_user_id').eq('id', orgId).single(),
    db.from('endereco').select('cnpj, cep, logradouro, numero, complemento, bairro, cidade, estado').eq('organization_id', orgId).maybeSingle(),
    db.from('subscriptions').select('current_period_end').eq('organization_id', orgId).maybeSingle(),
    db.from('organization_members')
      .select('user_id, role, created_at, profiles(full_name, avatar_url)')
      .eq('organization_id', orgId).eq('status', 'active').order('created_at'),
    db.from('demands').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).not('status', 'in', `(${DEMANDAS_ENCERRADAS.join(',')})`),
    db.from('demands').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('status', 'finalized').gte('updated_at', since),
  ])
  if (!org) return null
  if (abertas.error) throw new Error(`minha-filial abertas: ${abertas.error.message}`)
  if (finalizadas.error) throw new Error(`minha-filial finalizadas: ${finalizadas.error.message}`)

  type Row = { user_id: string; role: OrgRole; profiles: { full_name: string | null; avatar_url: string | null } | null }
  const list = await Promise.all(((members ?? []) as unknown as Row[]).map(async (r) => {
    const isOwner = r.user_id === org.owner_user_id
    return {
      userId: r.user_id,
      fullName: r.profiles?.full_name ?? '',
      role: papelLabel(r.role, isOwner),
      isOwner,
      avatarUrl: await getAvatarUrl(db, r.profiles?.avatar_url),
    }
  }))
  list.sort((a, b) => Number(b.isOwner) - Number(a.isOwner))

  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  const cancelada = org.status === 'pending_deletion'
  return {
    name: org.name,
    cancelada,
    accessUntil: cancelada ? (sub?.current_period_end ?? null) : null,
    endereco: {
      cnpj: s(end?.cnpj), cep: s(end?.cep), logradouro: s(end?.logradouro), numero: s(end?.numero),
      complemento: s(end?.complemento), bairro: s(end?.bairro), cidade: s(end?.cidade), estado: s(end?.estado),
    },
    phone: s(org.phone),
    members: list,
    metrics: { emAndamento: abertas.count ?? 0, finalizadasMes: finalizadas.count ?? 0, membrosAtivos: list.length },
  }
}

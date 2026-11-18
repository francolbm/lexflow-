// Regras puras da tela "Minha Filial" (sem servidor/React): visibilidade, papéis e janela do mês.
import type { OrgRole } from '@/lib/types'

type OrgRef = { parent_organization_id: string | null }

export interface MembershipRow {
  organization_id: string
  // O PostgREST devolve objeto; aceitamos array por segurança.
  organizations: OrgRef | OrgRef[] | null
}

/** Escritório do usuário SE for uma filial (parent_organization_id preenchido); senão null. */
export function filialOrgIdOf(rows: MembershipRow[] | null | undefined): string | null {
  for (const r of rows ?? []) {
    const o = Array.isArray(r.organizations) ? r.organizations[0] : r.organizations
    if (o?.parent_organization_id) return r.organization_id
  }
  return null
}

export type MembroPapel = 'Titular' | 'Admin' | 'Advogado' | 'Assistente'

/** Titular = dono do escritório (qualquer papel); demais pelo papel no vínculo. */
export function papelLabel(role: OrgRole, isOwner: boolean): MembroPapel {
  if (isOwner) return 'Titular'
  if (role === 'admin') return 'Admin'
  if (role === 'lawyer') return 'Advogado'
  return 'Assistente'
}

/** Início do mês corrente em Brasília (UTC-3, sem horário de verão desde 2019), em ISO UTC. */
export function monthStartBrasiliaIso(now: Date = new Date()): string {
  const br = new Date(now.getTime() - 3 * 3600 * 1000)
  return new Date(Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), 1, 3)).toISOString()
}

export interface MinhaFilialMember {
  userId: string
  fullName: string
  role: MembroPapel
  isOwner: boolean
  avatarUrl: string | null
  // e-mail/telefone de colegas NÃO são expostos (LGPD)
}

export interface MinhaFilialData {
  name: string
  cancelada: boolean
  /** Só preenchido quando cancelada (fim do ciclo já pago). */
  accessUntil: string | null
  endereco: { cnpj: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; estado: string; cep: string }
  phone: string
  members: MinhaFilialMember[]
  metrics: { emAndamento: number; finalizadasMes: number; membrosAtivos: number }
}

/** Partes do endereço, ignorando as vazias. */
export function enderecoLinhas(e: MinhaFilialData['endereco']): { rua: string; bairro: string; cidadeUf: string; cep: string } {
  const rua = [e.logradouro, e.numero].filter(Boolean).join(', ') + (e.complemento ? ` – ${e.complemento}` : '')
  return { rua, bairro: e.bairro, cidadeUf: [e.cidade, e.estado].filter(Boolean).join('/'), cep: e.cep }
}

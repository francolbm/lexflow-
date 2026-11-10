import type { LegalArea, OrgRole } from '@/lib/types'

// Parte do "escritório" que roda também no navegador (sem imports de servidor).

export const MEMBER_ROLE_LABELS: Record<OrgRole, string> = {
  admin: 'Admin', lawyer: 'Advogado', assistant: 'Assistente',
  client: 'client', // papel sem uso hoje: aparece cru se um dia existir
}

export const BR_UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] as const

export const formatCep = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export interface OfficeMember {
  userId: string
  fullName: string
  email: string
  role: OrgRole
  isOwner: boolean
  joinedAt: string
  avatarUrl: string | null
}

export interface OfficeData {
  canEdit: boolean
  canRemoveMembers: boolean
  viewerId: string
  org: { name: string; slug: string; phone: string; hasLogo: boolean }
  logoUrl: string | null
  endereco: {
    cnpj: string; razao_social: string; cep: string; logradouro: string; numero: string
    complemento: string; bairro: string; cidade: string; estado: string
  }
  areas: LegalArea[]
  owner: { fullName: string; oabNumber: string | null; oabUf: string | null; oabVerified: boolean }
  members: OfficeMember[]
}

// Papel exibido no perfil (profiles.role)
export type UserRole = 'advogado' | 'assistente' | 'operador' | 'admin'

// Papel dentro da organização (organization_members.role — enum app_role no banco).
// 'lawyer' = Advogado (abre e aprova), 'assistant' = Assistente (abre, não aprova),
// 'admin' = gestor do escritório, 'client' = cliente externo.
export type OrgRole = 'admin' | 'lawyer' | 'assistant' | 'client'

export type DemandStatus =
  | 'received'
  | 'in_triage'
  | 'awaiting_complement'
  | 'in_production'
  | 'in_internal_review'
  | 'delivered'
  | 'revision_requested'
  | 'finalized'
  | 'archived'
  | 'deletion_requested'

export type DemandUrgency = 'low' | 'medium' | 'high' | 'urgent'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone?: string
  role: UserRole
  oab_number?: string
  accepted_terms_at?: string
  created_at?: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  owner_user_id: string
  created_at?: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: string
  status: string
  created_at?: string
}

export interface Demand {
  id: string
  organization_id: string
  created_by: string
  assigned_lawyer_id?: string
  title: string
  demand_type: string
  area_of_law: string
  objective?: string
  facts?: string
  strategic_notes?: string
  urgency: DemandUrgency
  status: DemandStatus
  adjustment_notes?: string
  due_at?: string
  created_at?: string
  updated_at?: string
  profiles?: Profile
}

export interface DemandFile {
  id: string
  demand_id: string
  organization_id: string
  bucket_name: string
  storage_path: string
  original_name: string
  mime_type: string
  size_bytes: number
  created_at?: string
}

export interface Delivery {
  id: string
  demand_id: string
  organization_id: string
  version_no: number
  delivered_by: string
  notes?: string
  visible_to_client: boolean
  approved_at?: string
  approved_by?: string
  created_at?: string
  delivery_files?: DeliveryFile[]
  profiles?: Profile
}

export interface DeliveryFile {
  id: string
  delivery_id: string
  demand_id: string
  bucket_name: string
  storage_path: string
  original_name: string
  created_at?: string
}

export interface Comment {
  id: string
  demand_id: string
  organization_id: string
  author_user_id: string
  body: string
  internal_only: boolean
  created_at?: string
  profiles?: Profile
}

export interface Notification {
  id: string
  user_id: string
  organization_id?: string
  demand_id?: string
  type: string
  title: string
  message: string
  read: boolean
  created_at?: string
}

export interface DemandStatusHistory {
  id: string
  demand_id: string
  organization_id: string
  changed_by: string
  previous_status: DemandStatus
  new_status: DemandStatus
  notes?: string
  created_at?: string
  profiles?: Profile
}

export interface BriefingTemplate {
  id: string
  demand_type: string
  area_of_law: string
  name: string
  fields: BriefingField[]
  created_at?: string
}

export interface BriefingField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date'
  required: boolean
  options?: string[]
  placeholder?: string
}

// Planos oficiais PennaJus v4 (subscriptions.plan_code). Sem plano free:
// o teste será trial do Pro via Stripe.
export type PlanCode = 'start' | 'pro' | 'premium'

export interface PlanInfo {
  code: PlanCode
  name: string
  priceCents: number      // mensalidade em centavos de BRL (bate com o Price no Stripe)
  demandsLimit: number    // demandas por mês
  hasOffice: boolean      // true = escritório com gestor (admin) e membros; false = advogado solo
  features: string[]
}

// Fonte única dos planos — todo lugar que precisa de nome, preço ou limite lê daqui.
export const PLANS: Record<PlanCode, PlanInfo> = {
  start: {
    code: 'start',
    name: 'Start',
    priceCents: 19700,
    demandsLimit: 10,
    hasOffice: false,
    features: ['10 demandas/mês', 'Todos os tipos de documentos', 'Suporte por e-mail', 'Dashboard completo'],
  },
  pro: {
    code: 'pro',
    name: 'Pro',
    priceCents: 49700,
    demandsLimit: 30,
    hasOffice: true,
    features: ['30 demandas/mês', 'Suporte prioritário', 'SLA garantido', 'Notas estratégicas'],
  },
  premium: {
    code: 'premium',
    name: 'Premium',
    priceCents: 99700,
    demandsLimit: 80,
    hasOffice: true,
    features: ['80 demandas/mês', 'Suporte dedicado 24/7', 'Relatórios avançados', 'Múltiplos usuários'],
  },
}

export const PLAN_CODES = Object.keys(PLANS) as PlanCode[]

export function isPlanCode(value: unknown): value is PlanCode {
  return typeof value === 'string' && value in PLANS
}

// Ex.: 19700 -> "R$ 197,00"
export function formatPlanPrice(priceCents: number): string {
  return (priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export interface Subscription {
  id: string
  organization_id: string
  // string (e não PlanCode) até a migration converter linhas antigas como 'free'
  plan_code: string
  status: string
  demands_used: number
  demands_limit: number
  created_at?: string
}

export interface AuditLog {
  id: string
  organization_id: string
  user_id: string
  action: string
  entity: string
  entity_id: string
  previous_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  created_at?: string
}

// Labels em português para exibição
export const STATUS_LABELS: Record<DemandStatus, string> = {
  received: 'Recebido',
  in_triage: 'Em Triagem',
  awaiting_complement: 'Aguardando Complemento',
  in_production: 'Em Produção',
  in_internal_review: 'Em Revisão Interna',
  delivered: 'Em Revisão',
  revision_requested: 'Ajustes Solicitados',
  finalized: 'Finalizado',
  archived: 'Arquivado',
  deletion_requested: 'Exclusão Solicitada',
}

export const URGENCY_LABELS: Record<DemandUrgency, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
}

// Valores em português para display, mas o banco usa inglês
export const DEMAND_TYPES = [
  'Contrato',
  'Petição',
  'Parecer Jurídico',
  'Notificação Extrajudicial',
  'Procuração',
  'Estatuto/Regimento',
  'Acordo',
  'Recurso',
  'Memorando',
  'Outro',
]

// Áreas de atuação — 12 slugs oficiais (enum legal_area no banco).
// O banco só aceita esses valores; qualquer coisa fora do enum é rejeitada.
export type LegalArea =
  | 'criminal'
  | 'empresarial'
  | 'civel_contencioso'
  | 'trabalhista'
  | 'tributario'
  | 'familia_sucessoes'
  | 'consumidor'
  | 'ambiental'
  | 'administrativo'
  | 'digital'
  | 'previdenciario'
  | 'imobiliario'

// Rótulo exibido -> slug enviado ao banco. Preserva ordem intencional.
export const LEGAL_AREAS: { slug: LegalArea; label: string }[] = [
  { slug: 'criminal',           label: 'Criminal' },
  { slug: 'empresarial',        label: 'Empresarial' },
  { slug: 'civel_contencioso',  label: 'Contencioso Cível' },
  { slug: 'trabalhista',        label: 'Trabalhista' },
  { slug: 'tributario',         label: 'Tributário' },
  { slug: 'familia_sucessoes',  label: 'Família e Sucessões' },
  { slug: 'consumidor',         label: 'Consumidor' },
  { slug: 'ambiental',          label: 'Ambiental' },
  { slug: 'administrativo',     label: 'Administrativo' },
  { slug: 'digital',            label: 'Digital (LGPD, internet)' },
  { slug: 'previdenciario',     label: 'Previdenciário' },
  { slug: 'imobiliario',        label: 'Imobiliário' },
]

// Retro-compatibilidade temporária: alguns lugares ainda importam AREAS_OF_LAW.
// Aqui a lista vira a de RÓTULOS extraídos de LEGAL_AREAS.
export const AREAS_OF_LAW = LEGAL_AREAS.map(a => a.label)

// Mapa rótulo -> slug (usado ao gravar no banco)
export const AREA_LABEL_TO_SLUG: Record<string, LegalArea> =
  Object.fromEntries(LEGAL_AREAS.map(a => [a.label, a.slug])) as Record<string, LegalArea>

// Mapeamento de valores frontend (português) para backend (inglês)
export const DEMAND_TYPE_MAP: Record<string, string> = {
  'Contrato': 'contract',
  'Petição': 'petition',
  'Parecer Jurídico': 'legal_opinion',
  'Notificação Extrajudicial': 'extrajudicial_notification',
  'Procuração': 'power_of_attorney',
  'Estatuto/Regimento': 'statute',
  'Acordo': 'agreement',
  'Recurso': 'appeal',
  'Memorando': 'memorandum',
  'Outro': 'other',
}

export const URGENCY_MAP: Record<string, string> = {
  'low': 'low',
  'medium': 'medium',
  'high': 'high',
  'urgent': 'urgent',
}

// Reverso para display
export const URGENCY_REVERSE_MAP: Record<string, string> = {
  'low': 'low',
  'medium': 'medium',
  'high': 'high',
  'urgent': 'urgent',
}
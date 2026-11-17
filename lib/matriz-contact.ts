// /assinatura de FILIAL: quem vê o quê. A assinatura da filial é paga e gerenciada pela matriz (mesmo cliente Stripe).
//   A) titular da filial  -> card "gerenciada pela matriz" com o contato do titular da matriz
//   B) demais membros     -> card simples "contate o administrador do seu escritório" (SEM dados da matriz)
//   C) todo o resto       -> /assinatura normal
import { formatDateBR } from './br-format'

export type AssinaturaView = 'normal' | 'filial_titular' | 'filial_membro'

interface OrgForView { owner_user_id: string | null; parent_organization_id: string | null }

export function decideAssinaturaView(org: OrgForView | null | undefined, userId: string): AssinaturaView {
  if (!org || !org.parent_organization_id) return 'normal'
  return org.owner_user_id === userId ? 'filial_titular' : 'filial_membro'
}

export interface MatrizContact {
  matrizName: string
  titularName: string | null
  titularEmail: string | null
}

interface MatrizRows {
  matriz: { name: string | null; owner_user_id: string | null } | null
  titular: { full_name: string | null; email: string | null } | null
}

/** Rows do banco -> contato exibível (null se a matriz não foi encontrada). */
export function buildMatrizContact(rows: MatrizRows): MatrizContact | null {
  if (!rows.matriz) return null
  const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null)
  return {
    matrizName: clean(rows.matriz.name) ?? 'matriz',
    titularName: clean(rows.titular?.full_name),
    titularEmail: clean(rows.titular?.email),
  }
}

/** Linha extra do card do titular quando a filial já foi cancelada (cancelamento agendado). */
export function cancelNote(orgStatus: string | null | undefined, accessUntilIso: string | null | undefined): string | null {
  if (orgStatus !== 'pending_deletion') return null
  const d = formatDateBR(accessUntilIso)
  return d === '—'
    ? 'Cancelamento agendado: o acesso continua até o fim do ciclo já pago.'
    : `Cancelamento agendado: o acesso continua até ${d}.`
}

export const MATRIZ_MANAGED = {
  title: 'Assinatura gerenciada pela matriz',
  text: (matrizName: string) =>
    `Sua assinatura Pennajus Premium Filial está vinculada ao escritório matriz ${matrizName}. ` +
    'Para alterações de plano, forma de pagamento ou cancelamento, contate o titular da matriz.',
  back: 'Voltar à Visão Geral',
}

export const MEMBRO_FILIAL = {
  title: 'Área administrativa',
  text: 'A assinatura e a cobrança são gerenciadas pelo administrador do seu escritório. Contate o administrador do seu escritório para dúvidas ou alterações.',
  back: 'Voltar à Visão Geral',
}

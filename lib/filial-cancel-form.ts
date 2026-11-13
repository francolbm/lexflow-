// Lógica pura do modal "Cancelar filial" (sem React): validação do motivo, quando forçar, montagem
// do DELETE e tradução das respostas da API. A regra do motivo é a MESMA do servidor (cancelBodySchema).
import { cancelBodySchema } from './filial-cancel'
import { formatDateBR } from './br-format'

export const MOTIVO_MIN = 3
export const MOTIVO_MAX = 500
export const NETWORK_ERROR = 'Falha de conexão. Atualize a página antes de tentar de novo.'
export const GENERIC_ERROR = 'Não foi possível cancelar a filial agora. Tente novamente em instantes.'
const MOTIVO_OBRIGATORIO = `Informe o motivo do cancelamento (mínimo ${MOTIVO_MIN} caracteres).`

export const cancelTitle = (filial: { name: string }): string => `Cancelar filial ${filial.name}`

/** Singular/plural da frase do alerta amarelo. */
export const demandasLabel = (n: number): string => `${n} ${n === 1 ? 'demanda' : 'demandas'}`

/**
 * Motivo: obrigatório com demandas em andamento; sem demandas é opcional, mas, se preenchido, precisa ser
 * válido (3 a 500 caracteres, após o trim — idêntico ao servidor). Devolve a mensagem de erro ou null.
 */
export function validateMotivo(motivo: string, demandasAbertas: number): string | null {
  if (!motivo.trim()) return demandasAbertas > 0 ? MOTIVO_OBRIGATORIO : null
  const parsed = cancelBodySchema.safeParse({ motivo })
  return parsed.success ? null : parsed.error.issues[0]?.message ?? 'Motivo inválido.'
}

/** O botão "Confirmar cancelamento" só habilita com o checkbox marcado, motivo válido e sem envio em curso. */
export function canConfirm(s: { motivo: string; demandas: number; entendi: boolean; busy: boolean }): boolean {
  return !s.busy && s.entendi && validateMotivo(s.motivo, s.demandas) === null
}

/** ?force=true SOMENTE quando a tela exibiu o alerta de demandas (abertura com demandas ou depois de um 409). */
export const shouldForce = (demandasExibidas: number): boolean => demandasExibidas > 0

/** Data do checkbox: "12/12/2026" ou, sem data conhecida, "o fim do ciclo já pago". */
export function accessUntilLabel(iso: string | null | undefined): string {
  const d = formatDateBR(iso)
  return d === '—' ? 'o fim do ciclo já pago' : d
}

/** DELETE /api/escritorio/filial/{id}[?force=true] com { motivo } quando houver motivo. */
export function buildCancelRequest(filialId: string, opts: { force: boolean; motivo: string }) {
  const motivo = opts.motivo.trim()
  const url = `/api/escritorio/filial/${encodeURIComponent(filialId)}${opts.force ? '?force=true' : ''}`
  const init: RequestInit = {
    method: 'DELETE',
    cache: 'no-store',
    ...(motivo ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ motivo }) } : {}),
  }
  return { url, init }
}

export type CancelOutcome =
  | { kind: 'ok'; cancelsAt: string | null }
  | { kind: 'demandas_ativas'; count: number }
  | { kind: 'ja_cancelada' }
  | { kind: 'motivo'; message: string }
  | { kind: 'forbidden'; message: string }
  | { kind: 'unauthorized'; message: string }
  | { kind: 'notfound'; message: string }
  | { kind: 'generic'; message: string }

interface CancelBody { error?: string; message?: string; cancels_at?: string | null; active_demands?: number }

export function mapCancelResponse(status: number, body: CancelBody | null | undefined): CancelOutcome {
  const b = body ?? {}
  if (status === 200) return { kind: 'ok', cancelsAt: b.cancels_at ?? null }
  if (status === 409 && b.error === 'demandas_ativas') {
    const n = Number(b.active_demands)
    return { kind: 'demandas_ativas', count: Number.isFinite(n) && n > 0 ? n : 1 }
  }
  if (status === 409 && b.error === 'filial_ja_cancelada') return { kind: 'ja_cancelada' }
  if (status === 400 && b.error === 'motivo_obrigatorio') return { kind: 'motivo', message: b.message || MOTIVO_OBRIGATORIO }
  if (status === 403) return { kind: 'forbidden', message: 'Apenas o titular da matriz pode cancelar a filial.' }
  if (status === 401) return { kind: 'unauthorized', message: 'Sua sessão expirou. Entre novamente e repita o cancelamento.' }
  if (status === 404) return { kind: 'notfound', message: 'Esta filial não foi encontrada. Atualize a página.' }
  return { kind: 'generic', message: GENERIC_ERROR }
}

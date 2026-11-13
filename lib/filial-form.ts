// Lógica pura do wizard "Adicionar filial" (sem React): validação por passo, payload da Rota 1,
// confirmação digitada e tradução dos erros da API para o passo/campo certo.
import { UFS, isValidCnpj, onlyDigits } from './br-format'

export interface FilialForm {
  // passo 1 — escritório
  name: string; cnpj: string; razao_social: string
  cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; estado: string
  phone: string
  // passo 2 — advogado titular
  email: string; nome_completo: string; oab_number: string; oab_uf: string
}
export type FieldErrors = Partial<Record<keyof FilialForm, string>>

export const emptyForm = (): FilialForm => ({
  name: '', cnpj: '', razao_social: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  phone: '',
  email: '', nome_completo: '', oab_number: '', oab_uf: '',
})

export const isDirty = (f: FilialForm): boolean => Object.values(f).some((v) => v.trim() !== '')

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const filled = (v: string) => v.trim().length > 0

export function validateStep1(f: FilialForm): FieldErrors {
  const e: FieldErrors = {}
  if (!filled(f.name)) e.name = 'Informe o nome fantasia.'
  else if (f.name.trim().length > 120) e.name = 'Máximo de 120 caracteres.'
  if (!filled(f.cnpj)) e.cnpj = 'Informe o CNPJ.'
  else if (!isValidCnpj(f.cnpj)) e.cnpj = 'CNPJ inválido.'
  if (!filled(f.razao_social)) e.razao_social = 'Informe a razão social.'
  else if (f.razao_social.trim().length > 200) e.razao_social = 'Máximo de 200 caracteres.'
  if (!filled(f.cep)) e.cep = 'Informe o CEP.'
  else if (onlyDigits(f.cep).length !== 8) e.cep = 'O CEP deve ter 8 dígitos.'
  if (!filled(f.logradouro)) e.logradouro = 'Informe o logradouro.'
  if (!filled(f.numero)) e.numero = 'Informe o número.'
  if (!filled(f.bairro)) e.bairro = 'Informe o bairro.'
  if (!filled(f.cidade)) e.cidade = 'Informe a cidade.'
  if (!(UFS as readonly string[]).includes(f.estado.trim().toUpperCase())) e.estado = 'Selecione o estado.'
  const phone = onlyDigits(f.phone).length
  if (!filled(f.phone)) e.phone = 'Informe o telefone.'
  else if (phone !== 10 && phone !== 11) e.phone = 'Telefone inválido (DDD + número).'
  return e
}

export function validateStep2(f: FilialForm): FieldErrors {
  const e: FieldErrors = {}
  if (!filled(f.email)) e.email = 'Informe o e-mail do advogado.'
  else if (!EMAIL.test(f.email.trim())) e.email = 'E-mail inválido.'
  if (!filled(f.nome_completo)) e.nome_completo = 'Informe o nome completo.'
  else if (f.nome_completo.trim().length > 150) e.nome_completo = 'Máximo de 150 caracteres.'
  const oab = onlyDigits(f.oab_number).length
  if (!filled(f.oab_number)) e.oab_number = 'Informe o número da OAB.'
  else if (oab < 1 || oab > 10) e.oab_number = 'Número da OAB inválido.'
  if (!(UFS as readonly string[]).includes(f.oab_uf.trim().toUpperCase())) e.oab_uf = 'Selecione a UF da OAB.'
  return e
}

/** Corpo do POST /api/escritorio/filial exatamente como a Rota 1 espera. */
export function buildPayload(f: FilialForm) {
  const complemento = f.complemento.trim()
  return {
    name: f.name.trim(),
    cnpj: f.cnpj.trim(),
    razao_social: f.razao_social.trim(),
    phone: f.phone.trim(),
    endereco: {
      logradouro: f.logradouro.trim(),
      numero: f.numero.trim(),
      ...(complemento ? { complemento } : {}),
      bairro: f.bairro.trim(),
      cidade: f.cidade.trim(),
      estado: f.estado.trim().toUpperCase(),
      cep: f.cep.trim(),
    },
    advogado_titular: {
      email: f.email.trim().toLowerCase(),
      nome_completo: f.nome_completo.trim(),
      oab_number: onlyDigits(f.oab_number),
      oab_uf: f.oab_uf.trim().toUpperCase(),
    },
  }
}

// ---- Atrito protetivo do passo 3 ----
export interface MatrizRef { name: string; cnpj: string | null }

/** Com CNPJ cadastrado, confirma pelo CNPJ (só dígitos); sem CNPJ, pelo nome da matriz. */
export function confirmMatches(typed: string, matriz: MatrizRef | null): boolean {
  if (!matriz || !typed.trim()) return false
  if (matriz.cnpj) return onlyDigits(typed) === onlyDigits(matriz.cnpj)
  const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
  return norm(typed) === norm(matriz.name)
}

export const confirmLabel = (matriz: MatrizRef | null): string =>
  matriz?.cnpj ? 'Confirme digitando o CNPJ da matriz' : 'Confirme digitando o nome da matriz'

// ---- Erros da API -> passo/campo ----
export interface ApiErrorTarget { step: 1 | 2 | 3; field?: keyof FilialForm; message: string }

export function mapApiError(status: number, body: { error?: string; message?: string } | null | undefined): ApiErrorTarget {
  const err = body?.error ?? ''
  const msg = body?.message ?? err

  if (status === 401) return { step: 3, message: 'Sua sessão expirou. Entre novamente e repita o cadastro.' }
  if (status === 402) return { step: 3, message: msg || 'O cartão da matriz foi recusado ao cobrar a nova filial.' }
  if (status === 409) {
    if (err === 'titular_ja_vinculado') return { step: 2, field: 'email', message: msg }
    if (err === 'matriz_sem_cartao') return { step: 3, message: 'A matriz não tem um cartão cadastrado para cobrar a nova filial. Cadastre um cartão em Assinatura e tente de novo.' }
    if (/CNPJ/i.test(err)) return { step: 1, field: 'cnpj', message: err }
    return { step: 3, message: msg || 'Não foi possível concluir o cadastro.' }
  }
  if (status === 400) {
    // Mensagens da validação da Rota 1 (zod): aponta o campo pelo texto.
    if (/OAB/i.test(err)) return { step: 2, field: /UF/i.test(err) ? 'oab_uf' : 'oab_number', message: err }
    if (/e-?mail/i.test(err)) return { step: 2, field: 'email', message: err }
    if (/advogado/i.test(err)) return { step: 2, field: 'nome_completo', message: err }
    if (/CNPJ/i.test(err)) return { step: 1, field: 'cnpj', message: err }
    if (/CEP/i.test(err)) return { step: 1, field: 'cep', message: err }
    if (/Telefone/i.test(err)) return { step: 1, field: 'phone', message: err }
    if (/Estado/i.test(err)) return { step: 1, field: 'estado', message: err }
    if (/Logradouro/i.test(err)) return { step: 1, field: 'logradouro', message: err }
    if (/Bairro/i.test(err)) return { step: 1, field: 'bairro', message: err }
    if (/Cidade/i.test(err)) return { step: 1, field: 'cidade', message: err }
    if (/Raz/i.test(err)) return { step: 1, field: 'razao_social', message: err }
    if (/Nome da filial/i.test(err)) return { step: 1, field: 'name', message: err }
    return { step: 1, message: err || 'Confira os dados informados.' }
  }
  return { step: 3, message: msg || 'Não foi possível criar a filial agora. Tente novamente em instantes.' }
}

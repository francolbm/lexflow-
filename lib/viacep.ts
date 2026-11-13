// ViaCEP (https://viacep.com.br): preenchimento opcional do endereço pelo CEP. Falhou? Silêncio:
// a pessoa simplesmente digita o endereço. Só dados públicos de endereço são consultados.
import { onlyDigits } from './br-format'

export interface CepAddress { logradouro: string; bairro: string; cidade: string; estado: string }

/** Resposta crua do ViaCEP -> endereço; null se o CEP não existe ({"erro": true}) ou veio algo inesperado. */
export function parseViaCep(json: unknown): CepAddress | null {
  if (!json || typeof json !== 'object') return null
  const j = json as Record<string, unknown>
  if (j.erro) return null
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const out = { logradouro: str(j.logradouro), bairro: str(j.bairro), cidade: str(j.localidade), estado: str(j.uf).toUpperCase() }
  return out.cidade || out.estado ? out : null
}

export async function lookupCep(cep: string, signal?: AbortSignal): Promise<CepAddress | null> {
  const digits = onlyDigits(cep)
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal })
    if (!res.ok) return null
    return parseViaCep(await res.json())
  } catch {
    return null
  }
}

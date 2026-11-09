// Regras puras do /perfil (sem React), usadas pelos componentes e testáveis isoladamente.

// (XX) XXXX-XXXX (fixo) ou (XX) XXXXX-XXXX (celular), formatado enquanto digita
export function formatPhone(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Regras da nova senha; devolve o que falta (vazio = válida)
export function passwordProblems(pw: string) {
  const missing: string[] = []
  if (pw.length < 8) missing.push('8 caracteres')
  if (!/[A-Z]/.test(pw)) missing.push('1 letra maiúscula')
  if (!/[0-9]/.test(pw)) missing.push('1 número')
  if (!/[^A-Za-z0-9]/.test(pw)) missing.push('1 caractere especial')
  return missing
}

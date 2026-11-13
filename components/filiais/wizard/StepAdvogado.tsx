'use client'

import { Info } from 'lucide-react'
import { onlyDigits } from '@/lib/br-format'
import { TextField, UfSelect } from './Field'
import type { StepProps } from './StepEscritorio'

// Passo 2 — advogado titular da filial
export function StepAdvogado({ form, errors, set, touch }: StepProps) {
  return (
    <div className="space-y-4" data-step="2">
      <div className="flex gap-3 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 p-3 text-sm text-gray-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#d4af37' }} aria-hidden />
        <p>
          Essa pessoa será o administrador e advogado titular da filial e receberá um link de ativação.
          Enquanto o envio por e-mail não está disponível, o link será exibido no final do cadastro para você repassar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <TextField id="a-email" label="E-mail" value={form.email} onChange={(v) => set('email', v)} onBlur={() => touch('email')}
          error={errors.email} className="sm:col-span-3" type="email" inputMode="email" autoComplete="off" autoFocus />
        <TextField id="a-nome" label="Nome completo" value={form.nome_completo} onChange={(v) => set('nome_completo', v)} onBlur={() => touch('nome_completo')}
          error={errors.nome_completo} className="sm:col-span-3" />
        <TextField id="a-oab" label="Número da OAB" value={form.oab_number} onChange={(v) => set('oab_number', onlyDigits(v).slice(0, 10))} onBlur={() => touch('oab_number')}
          error={errors.oab_number} className="sm:col-span-3" inputMode="numeric" placeholder="Somente números" />
        <UfSelect id="a-oab-uf" label="UF da OAB" value={form.oab_uf} onChange={(v) => set('oab_uf', v)} onBlur={() => touch('oab_uf')}
          error={errors.oab_uf} className="sm:col-span-3" />
      </div>
    </div>
  )
}

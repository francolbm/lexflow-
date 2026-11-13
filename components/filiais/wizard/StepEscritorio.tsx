'use client'

import { Loader2 } from 'lucide-react'
import { maskCep, maskCnpj } from '@/lib/br-format'
import { formatPhone } from '@/lib/perfil'
import type { FieldErrors, FilialForm } from '@/lib/filial-form'
import { TextField, UfSelect } from './Field'

export interface StepProps {
  form: FilialForm
  errors: FieldErrors
  set: (field: keyof FilialForm, value: string) => void
  touch: (field: keyof FilialForm) => void
}

// Passo 1 — dados do escritório (nome fantasia, CNPJ, razão social, endereço e telefone)
export function StepEscritorio({ form, errors, set, touch, cepLoading }: StepProps & { cepLoading: boolean }) {
  const t = (f: keyof FilialForm) => () => touch(f)
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6" data-step="1">
      <TextField id="f-name" label="Nome fantasia" value={form.name} onChange={(v) => set('name', v)} onBlur={t('name')}
        error={errors.name} className="sm:col-span-6" placeholder="Ex.: Penna & Associados — Unidade Rio" autoFocus />
      <TextField id="f-cnpj" label="CNPJ" value={form.cnpj} onChange={(v) => set('cnpj', maskCnpj(v))} onBlur={t('cnpj')}
        error={errors.cnpj} className="sm:col-span-3" placeholder="00.000.000/0000-00" inputMode="numeric" />
      <TextField id="f-razao" label="Razão social" value={form.razao_social} onChange={(v) => set('razao_social', v)} onBlur={t('razao_social')}
        error={errors.razao_social} className="sm:col-span-3" />

      <div className="sm:col-span-2">
        <TextField id="f-cep" label="CEP" value={form.cep} onChange={(v) => set('cep', maskCep(v))} onBlur={t('cep')}
          error={errors.cep} placeholder="00000-000" inputMode="numeric"
          hint={cepLoading ? undefined : 'Preenche o endereço automaticamente'} />
        {cepLoading && (
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-400"><Loader2 className="h-3 w-3 animate-spin" />Buscando endereço…</p>
        )}
      </div>
      <TextField id="f-logradouro" label="Logradouro" value={form.logradouro} onChange={(v) => set('logradouro', v)} onBlur={t('logradouro')}
        error={errors.logradouro} className="sm:col-span-4" autoComplete="street-address" />

      <TextField id="f-numero" label="Número" value={form.numero} onChange={(v) => set('numero', v)} onBlur={t('numero')}
        error={errors.numero} className="sm:col-span-2" maxLength={10} />
      <TextField id="f-complemento" label="Complemento" value={form.complemento} onChange={(v) => set('complemento', v)}
        optional className="sm:col-span-4" placeholder="Sala, andar…" />

      <TextField id="f-bairro" label="Bairro" value={form.bairro} onChange={(v) => set('bairro', v)} onBlur={t('bairro')}
        error={errors.bairro} className="sm:col-span-2" />
      <TextField id="f-cidade" label="Cidade" value={form.cidade} onChange={(v) => set('cidade', v)} onBlur={t('cidade')}
        error={errors.cidade} className="sm:col-span-3" />
      <UfSelect id="f-estado" label="Estado" value={form.estado} onChange={(v) => set('estado', v)} onBlur={t('estado')}
        error={errors.estado} className="sm:col-span-1" />

      <TextField id="f-phone" label="Telefone" value={form.phone} onChange={(v) => set('phone', formatPhone(v))} onBlur={t('phone')}
        error={errors.phone} className="sm:col-span-3" placeholder="(00) 00000-0000" inputMode="tel" autoComplete="tel" />
    </div>
  )
}

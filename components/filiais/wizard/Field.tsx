'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UFS } from '@/lib/br-format'

export const inputCls = 'bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-9'

interface FieldProps {
  id: string
  label: string
  error?: string
  hint?: string
  optional?: boolean
  className?: string
  children: React.ReactNode
}

/** Rótulo + controle + mensagem de erro (aria-live) no padrão do wizard. */
export function Field({ id, label, error, hint, optional, className, children }: FieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="text-sm text-gray-300">
        {label}{optional && <span className="ml-1 text-xs text-gray-500">(opcional)</span>}
      </Label>
      <div className="mt-1">{children}</div>
      {error
        ? <p id={`${id}-erro`} role="alert" className="mt-1 text-xs text-red-300">{error}</p>
        : hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  )
}

interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: string
  optional?: boolean
  className?: string
  placeholder?: string
  type?: string
  inputMode?: 'numeric' | 'tel' | 'email' | 'text'
  autoComplete?: string
  maxLength?: number
  onBlur?: () => void
  autoFocus?: boolean
}

export function TextField({ id, label, value, onChange, error, hint, optional, className, placeholder, type, inputMode, autoComplete, maxLength, onBlur, autoFocus }: TextFieldProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <Input
        id={id} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        placeholder={placeholder} type={type} inputMode={inputMode} autoComplete={autoComplete ?? 'off'}
        maxLength={maxLength} autoFocus={autoFocus}
        aria-invalid={!!error} aria-describedby={error ? `${id}-erro` : undefined}
        className={inputCls}
      />
    </Field>
  )
}

interface UfSelectProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  className?: string
  onBlur?: () => void
}

/** UF em <select> nativo: no celular abre o seletor do sistema, que é mais confortável que um menu customizado. */
export function UfSelect({ id, label, value, onChange, error, className, onBlur }: UfSelectProps) {
  return (
    <Field id={id} label={label} error={error} className={className}>
      <select
        id={id} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        aria-invalid={!!error} aria-describedby={error ? `${id}-erro` : undefined}
        className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
      >
        <option value="" className="bg-[#0a192f]">Selecione</option>
        {UFS.map((uf) => <option key={uf} value={uf} className="bg-[#0a192f]">{uf}</option>)}
      </select>
    </Field>
  )
}

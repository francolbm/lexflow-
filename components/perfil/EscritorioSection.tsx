'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, BadgeCheck, Check, Loader2, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { formatPhone } from '@/lib/perfil'
import { BR_UFS, formatCep, type OfficeData } from '@/lib/office-shared'
import { LEGAL_AREAS, type LegalArea } from '@/lib/types'

const field = 'mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500'
const readOnly = 'mt-1 bg-white/5 border-white/10 text-gray-400'
const label = 'text-gray-300 text-sm'

function ResponsavelCard({ owner }: { owner: OfficeData['owner'] }) {
  if (!owner.oabNumber) {
    return (
      <div data-responsavel="sem-oab" role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <div className="space-y-1">
            <p className="font-semibold text-red-300">Advogado Responsável não designado</p>
            <p className="text-sm text-red-200/90">
              O titular do escritório ({owner.fullName || 'sem nome'}) não tem OAB cadastrada.
              Contate o suporte em <span className="font-medium text-white select-all">suporte@pennajus.com</span>.
            </p>
            <p className="text-xs text-red-200/70">Enquanto isso, os dados do escritório não podem ser salvos.</p>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div data-responsavel="ok" className="rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/5 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Scale className="h-5 w-5 text-[#d4af37]" />
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Advogado Responsável</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-semibold text-white">{owner.fullName}</p>
        <p className="text-sm text-gray-300 tabular-nums">OAB {owner.oabNumber}{owner.oabUf ? `/${owner.oabUf}` : ''}</p>
        {owner.oabVerified
          ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300"><BadgeCheck className="h-3.5 w-3.5" />Verificada</span>
          : <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300"><AlertTriangle className="h-3.5 w-3.5" />Não verificada</span>}
      </div>
      <p className="text-xs text-gray-400">
        O advogado responsável é o titular do escritório e responde tecnicamente pelas peças produzidas.
        Em breve poderemos designar um advogado diferente do titular.
      </p>
    </div>
  )
}

export function EscritorioSection({ office }: { office: OfficeData }) {
  const router = useRouter()
  const toast = useToast()
  const e = office.endereco
  const [f, setF] = useState({
    name: office.org.name, phone: formatPhone(office.org.phone), razao_social: e.razao_social,
    cep: formatCep(e.cep), logradouro: e.logradouro, numero: e.numero, complemento: e.complemento,
    bairro: e.bairro, cidade: e.cidade, estado: e.estado,
  })
  const [areas, setAreas] = useState<Set<LegalArea>>(new Set(office.areas))
  const [saving, setSaving] = useState(false)
  const blocked = !office.owner.oabNumber
  const set = (k: keyof typeof f) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((cur) => ({ ...cur, [k]: k === 'phone' ? formatPhone(ev.target.value) : k === 'cep' ? formatCep(ev.target.value) : ev.target.value }))
  const toggle = (a: LegalArea) => setAreas((cur) => {
    const next = new Set(cur)
    if (next.has(a)) next.delete(a); else next.add(a)
    return next
  })

  async function save(ev: React.FormEvent) {
    ev.preventDefault()
    if (blocked) return
    if (f.name.trim().length < 2) {
      toast.add({ type: 'error', title: 'Informe o nome do escritório' })
      return
    }
    setSaving(true)
    const res = await fetch('/api/escritorio/dados', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, name: f.name.trim(), areas: Array.from(areas) }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      toast.add({ type: 'error', title: 'Não foi possível salvar', description: data.error || 'Tente novamente em instantes.' })
      return
    }
    toast.add({ title: 'Dados do escritório salvos' })
    router.refresh()
  }

  return (
    <form onSubmit={save} className="space-y-6" data-office-section="dados">
      <ResponsavelCard owner={office.owner} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="of-name" className={label}>Nome fantasia</Label>
          <Input id="of-name" value={f.name} onChange={set('name')} maxLength={120} className={field} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="of-razao" className={label}>Razão social</Label>
          <Input id="of-razao" value={f.razao_social} onChange={set('razao_social')} maxLength={200} className={field} />
        </div>
        <div>
          <Label htmlFor="of-phone" className={label}>Telefone</Label>
          <Input id="of-phone" inputMode="tel" placeholder="(11) 3456-7890" value={f.phone} onChange={set('phone')} className={field} />
        </div>
        <div>
          <Label htmlFor="of-cnpj" className={label}>CNPJ</Label>
          <Input id="of-cnpj" value={e.cnpj || 'Não informado'} readOnly disabled className={readOnly} />
          <p className="mt-1 text-xs text-gray-500">Para alterar o CNPJ, fale com o suporte.</p>
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Endereço</legend>
        <div className="grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <Label htmlFor="of-cep" className={label}>CEP</Label>
            <Input id="of-cep" inputMode="numeric" placeholder="01310-100" value={f.cep} onChange={set('cep')} className={field} />
          </div>
          <div className="sm:col-span-4">
            <Label htmlFor="of-logradouro" className={label}>Logradouro</Label>
            <Input id="of-logradouro" value={f.logradouro} onChange={set('logradouro')} maxLength={200} className={field} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="of-numero" className={label}>Número</Label>
            <Input id="of-numero" value={f.numero} onChange={set('numero')} maxLength={20} className={field} />
          </div>
          <div className="sm:col-span-4">
            <Label htmlFor="of-complemento" className={label}>Complemento</Label>
            <Input id="of-complemento" value={f.complemento} onChange={set('complemento')} maxLength={100} className={field} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="of-bairro" className={label}>Bairro</Label>
            <Input id="of-bairro" value={f.bairro} onChange={set('bairro')} maxLength={100} className={field} />
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="of-cidade" className={label}>Cidade</Label>
            <Input id="of-cidade" value={f.cidade} onChange={set('cidade')} maxLength={100} className={field} />
          </div>
          <div className="sm:col-span-1">
            <Label htmlFor="of-uf" className={label}>UF</Label>
            <select
              id="of-uf" value={f.estado} onChange={set('estado')}
              className="mt-1 h-9 w-full rounded-md border border-white/10 bg-[#0d1b33] px-2 text-sm text-white"
            >
              <option value="">—</option>
              {BR_UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Áreas de atuação</legend>
        <div className="flex flex-wrap gap-2">
          {LEGAL_AREAS.map(({ slug, label: l }) => {
            const on = areas.has(slug)
            return (
              <button
                key={slug} type="button" aria-pressed={on} data-area={slug} onClick={() => toggle(slug)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors ${on
                  ? 'border-[#d4af37] bg-[#d4af37]/15 text-[#f0d77a]'
                  : 'border-white/15 text-gray-300 hover:border-white/30'}`}
              >
                {on && <Check className="h-3.5 w-3.5" />}{l}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col items-end gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">Identificador interno: <span className="font-mono text-gray-400">{office.org.slug}</span></p>
        <Button type="submit" disabled={saving || blocked} data-save-office className="gold-btn font-semibold">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando…</> : 'Salvar dados do escritório'}
        </Button>
      </div>
    </form>
  )
}

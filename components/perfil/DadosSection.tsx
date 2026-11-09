'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { formatPhone } from '@/lib/perfil'
import type { PerfilData } from './PerfilSections'

const field = 'mt-1 bg-white/5 border-white/10 text-white'
const readOnly = 'mt-1 bg-white/5 border-white/10 text-gray-400'

export function DadosSection({ profile, roleLabel }: { profile: PerfilData; roleLabel: string | null }) {
  const router = useRouter()
  const toast = useToast()
  const [fullName, setFullName] = useState(profile.fullName)
  const [phone, setPhone] = useState(formatPhone(profile.phone))
  const [saving, setSaving] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const name = fullName.trim().replace(/\s+/g, ' ')
    const digits = phone.replace(/\D/g, '')
    if (name.length < 3) {
      toast.add({ type: 'error', title: 'Informe seu nome completo' })
      return
    }
    if (digits && digits.length !== 10 && digits.length !== 11) {
      toast.add({ type: 'error', title: 'Telefone incompleto', description: 'Use o formato (11) 91234-5678.' })
      return
    }
    setSaving(true)
    // Só nome e telefone são editáveis pelo navegador (grant por coluna em profiles)
    const { error } = await createClient().from('profiles')
      .update({ full_name: name, phone: digits ? formatPhone(digits) : null })
      .eq('id', profile.id)
    setSaving(false)
    if (error) {
      toast.add({ type: 'error', title: 'Não foi possível salvar', description: 'Tente novamente em instantes.' })
      return
    }
    setFullName(name)
    toast.add({ title: 'Dados salvos' })
    router.refresh() // nome novo na barra lateral
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const oab = profile.oabNumber ? `${profile.oabNumber}${profile.oabUf ? ` / ${profile.oabUf}` : ''}` : 'Não informada'

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <Label htmlFor="fullName" className="text-gray-300 text-sm">Nome completo</Label>
        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} className={field} />
        <p className="mt-1 text-xs text-gray-500">Membro desde {memberSince}</p>
      </div>
      <div>
        <Label htmlFor="phone" className="text-gray-300 text-sm">Telefone</Label>
        <Input
          id="phone" inputMode="tel" placeholder="(11) 91234-5678" value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))} className={field}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="email" className="text-gray-300 text-sm">E-mail</Label>
          <Input id="email" value={profile.email} readOnly disabled className={readOnly} />
        </div>
        <div>
          <Label htmlFor="oab" className="text-gray-300 text-sm">OAB</Label>
          <Input id="oab" value={oab} readOnly disabled className={readOnly} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="papel" className="text-gray-300 text-sm">Papel</Label>
          <Input id="papel" value={roleLabel ?? '—'} readOnly disabled className={readOnly} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="gold-btn font-semibold">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando…</> : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}

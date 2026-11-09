'use client'

import { useState } from 'react'
import { ChevronDown, Camera, UserRound, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ToastProvider } from '@/components/ui/toast'
import { AvatarSection } from './AvatarSection'
import { DadosSection } from './DadosSection'
import { SegurancaSection } from './SegurancaSection'

export interface PerfilData {
  id: string
  fullName: string
  email: string
  phone: string
  oabNumber: string | null
  oabUf: string | null
  createdAt: string
  hasAvatar: boolean
}

type SectionId = 'foto' | 'dados' | 'seguranca'

// 3 seções: no mobile viram acordeão (uma aberta por vez); do md para cima ficam todas abertas
export function PerfilSections({ profile, avatarUrl, roleLabel, billing }: {
  profile: PerfilData
  avatarUrl: string | null
  roleLabel: string | null
  billing: { hasStripeCustomer: boolean } | null
}) {
  const [open, setOpen] = useState<SectionId>('foto')

  const section = (id: SectionId, title: string, Icon: typeof Camera, body: React.ReactNode) => (
    <Card className="border-0 overflow-hidden py-0 gap-0" style={{ backgroundColor: '#112240' }}>
      <button
        type="button"
        onClick={() => setOpen(id)}
        aria-expanded={open === id}
        className="flex w-full items-center gap-3 px-5 py-4 text-left md:cursor-default"
      >
        <Icon className="h-5 w-5" style={{ color: '#d4af37' }} />
        <span className="flex-1 font-semibold text-white">{title}</span>
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform md:hidden ${open === id ? 'rotate-180' : ''}`} />
      </button>
      <div data-section={id} className={`${open === id ? 'block' : 'hidden'} md:block border-t border-white/10 px-5 py-5`}>
        {body}
      </div>
    </Card>
  )

  return (
    <ToastProvider>
      <div className="space-y-4">
        {section('foto', 'Foto de perfil', Camera, <AvatarSection profile={profile} initialUrl={avatarUrl} />)}
        {section('dados', 'Dados pessoais', UserRound, <DadosSection profile={profile} roleLabel={roleLabel} />)}
        {section('seguranca', 'Segurança', ShieldCheck, <SegurancaSection email={profile.email} billing={billing} />)}
      </div>
    </ToastProvider>
  )
}

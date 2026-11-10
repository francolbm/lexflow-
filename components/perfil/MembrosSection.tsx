'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Crown, Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { initialsOf } from '@/lib/avatar'
import { MEMBER_ROLE_LABELS, type OfficeData, type OfficeMember } from '@/lib/office-shared'

const outlineBtn = 'border-white/20 bg-transparent text-white hover:bg-white/10'
const CONFIRM_WORD = 'REMOVER'

export function MembrosSection({ office }: { office: OfficeData }) {
  const router = useRouter()
  const toast = useToast()
  const [members, setMembers] = useState(office.members)
  const [target, setTarget] = useState<OfficeMember | null>(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)

  function ask(m: OfficeMember) {
    setTyped('')
    setTarget(m)
  }

  async function remove() {
    if (!target || typed !== CONFIRM_WORD) return
    setBusy(true)
    const res = await fetch(`/api/escritorio/membros/${target.userId}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      toast.add({ type: 'error', title: 'Não foi possível remover', description: data.error || 'Tente novamente em instantes.' })
      return
    }
    setMembers((cur) => cur.filter((m) => m.userId !== target.userId))
    toast.add({ title: `${target.fullName || target.email} foi removido do escritório` })
    setTarget(null)
    router.refresh()
  }

  return (
    <div className="space-y-4" data-office-section="membros">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-400">{members.length} {members.length === 1 ? 'membro' : 'membros'} no escritório</p>
        <div className="flex items-center gap-2" title="Em breve: requer módulo de convite por e-mail (próxima atualização)">
          <Button type="button" variant="outline" disabled data-invite className={`${outlineBtn} disabled:opacity-60`}>
            <UserPlus className="mr-2 h-4 w-4" />Convidar membro
          </Button>
          <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/50 bg-[#d4af37]/10 px-2 py-0.5 text-xs font-medium text-[#d4af37]">
            <Clock className="h-3 w-3" />Em breve
          </span>
        </div>
      </div>

      <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
        {members.map((m) => (
          <li key={m.userId} data-member={m.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold"
              style={{ backgroundColor: '#d4af3720', color: '#d4af37' }}
            >
              {m.avatarUrl
                // eslint-disable-next-line @next/next/no-img-element -- link assinado do Storage
                ? <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />
                : initialsOf(m.fullName || m.email)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium text-white">{m.fullName || '—'}</p>
                {m.isOwner && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#d4af37]/15 px-2 py-0.5 text-xs font-medium text-[#d4af37]">
                    <Crown className="h-3 w-3" />Titular
                  </span>
                )}
                {m.userId === office.viewerId && <span className="text-xs text-gray-500">(você)</span>}
              </div>
              <p className="truncate text-sm text-gray-400">{m.email}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-right">
                <p className="text-gray-300">{MEMBER_ROLE_LABELS[m.role]}</p>
                <p className="text-xs text-gray-500">
                  desde {new Date(m.joinedAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                </p>
              </div>
              {office.canRemoveMembers && !m.isOwner && (
                <Button
                  type="button" variant="outline" size="sm" onClick={() => ask(m)} data-remove={m.userId}
                  className="border-red-500/40 bg-transparent text-red-300 hover:bg-red-500/10"
                >
                  Remover
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={!!target} onOpenChange={(o) => { if (!o && !busy) setTarget(null) }}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#112240' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Remover {target?.fullName || target?.email} do escritório?</DialogTitle>
            <DialogDescription className="text-gray-300">
              Essa ação não pode ser desfeita. O usuário perde acesso a todas as demandas e dados do escritório.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="confirm-remove" className="text-sm text-gray-300">
              Digite <span className="font-mono font-semibold text-white">{CONFIRM_WORD}</span> para confirmar
            </label>
            <Input
              id="confirm-remove" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off"
              className="bg-white/5 border-white/10 text-white font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={busy} className={outlineBtn}>Cancelar</Button>
            <Button
              onClick={remove} disabled={busy || typed !== CONFIRM_WORD}
              className="bg-red-600 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
            >
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Removendo…</> : 'Remover membro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

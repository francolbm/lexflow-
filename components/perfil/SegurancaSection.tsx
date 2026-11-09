'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { passwordProblems } from '@/lib/perfil'

const outlineBtn = 'border-white/20 bg-transparent text-white hover:bg-white/10'

export function SegurancaSection({ email, billing }: { email: string; billing: { hasStripeCustomer: boolean } | null }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [opening, setOpening] = useState(false)

  function reset() {
    setCurrent('')
    setNext('')
    setConfirm('')
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    const missing = passwordProblems(next)
    if (missing.length) {
      toast.add({ type: 'error', title: 'Senha fraca', description: `A nova senha precisa ter pelo menos: ${missing.join(', ')}.` })
      return
    }
    if (next !== confirm) {
      toast.add({ type: 'error', title: 'As senhas não conferem' })
      return
    }
    if (next === current) {
      toast.add({ type: 'error', title: 'A nova senha deve ser diferente da atual' })
      return
    }

    setBusy(true)
    const supabase = createClient()
    // updateUser não pede a senha atual; conferimos antes entrando com ela
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: current })
    if (authErr) {
      setBusy(false)
      toast.add({ type: 'error', title: 'Senha atual incorreta' })
      return
    }
    const { error } = await supabase.auth.updateUser({ password: next })
    if (error) {
      setBusy(false)
      toast.add({ type: 'error', title: 'Não foi possível alterar a senha', description: error.message })
      return
    }
    toast.add({ title: 'Senha alterada', description: 'Entre de novo com a nova senha.' })
    await fetch('/api/logout', { method: 'POST' }) // encerra a sessão em todos os aparelhos
    setTimeout(() => { window.location.href = '/login' }, 1500)
  }

  async function openPortal() {
    setOpening(true)
    const tab = window.open('', '_blank') // abre já no clique para o navegador não bloquear
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setOpening(false)
    if (!res.ok || !data.url) {
      tab?.close()
      toast.add({ type: 'error', title: 'Não foi possível abrir a assinatura', description: data.error })
      return
    }
    if (tab) tab.location.href = data.url
    else window.location.href = data.url
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-white text-sm font-medium">Senha</p>
          <p className="text-gray-500 text-xs">Ao alterar, você sai de todos os aparelhos.</p>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)} className={outlineBtn}>Alterar senha</Button>
      </div>

      {billing && (
        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-white text-sm font-medium">Assinatura do escritório</p>
            <p className="text-gray-500 text-xs">Plano, forma de pagamento e faturas.</p>
          </div>
          {billing.hasStripeCustomer ? (
            <Button onClick={openPortal} disabled={opening} className="gold-btn font-semibold">
              {opening ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Abrindo…</> : 'Gerenciar assinatura'}
            </Button>
          ) : (
            <Link href="/assinatura" className={buttonVariants({ className: 'gold-btn font-semibold' })}>
              Gerenciar assinatura
            </Link>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!busy) { setOpen(o); if (!o) reset() } }}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#112240' }}>
          <DialogHeader><DialogTitle className="text-white">Alterar senha</DialogTitle></DialogHeader>
          <form onSubmit={changePassword} className="space-y-3">
            <PasswordField id="pw-current" label="Senha atual" value={current} onChange={setCurrent} autoComplete="current-password" />
            <PasswordField id="pw-new" label="Nova senha" value={next} onChange={setNext} autoComplete="new-password" />
            <PasswordField id="pw-confirm" label="Confirmar nova senha" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            <p className="text-xs text-gray-500">Mínimo de 8 caracteres, com 1 letra maiúscula, 1 número e 1 caractere especial.</p>
            <DialogFooter>
              <Button type="submit" disabled={busy} className="gold-btn font-semibold">
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Alterando…</> : 'Alterar senha'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PasswordField({ id, label, value, onChange, autoComplete }: {
  id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-gray-300 text-sm">{label}</Label>
      <Input
        id={id} type="password" autoComplete={autoComplete} value={value} required
        onChange={(e) => onChange(e.target.value)} className="mt-1 bg-white/5 border-white/10 text-white"
      />
    </div>
  )
}

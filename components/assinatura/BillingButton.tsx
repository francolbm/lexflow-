'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PlanCode } from '@/lib/types'

// 'checkout' -> /api/stripe/checkout (assinar; `plan` escolhe o plano, senão o do cadastro)
// 'portal'   -> /api/stripe/portal (gerenciar; `upgrade` abre direto a troca de plano)
export function BillingButton({ action, label, plan, upgrade, secondary }: {
  action: 'checkout' | 'portal'
  label: string
  plan?: PlanCode
  upgrade?: boolean
  secondary?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/stripe/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, upgrade }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Não foi possível abrir o pagamento.')
      window.location.href = data.url
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div>
      <Button
        onClick={handleClick} disabled={loading}
        variant={secondary ? 'outline' : 'default'}
        className={secondary ? 'border-white/20 bg-transparent text-white hover:bg-white/10' : 'gold-btn font-semibold'}
      >
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Abrindo…</> : label}
      </Button>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  )
}

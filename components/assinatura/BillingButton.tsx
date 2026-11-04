'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// 'checkout' -> /api/stripe/checkout (assinar); 'portal' -> /api/stripe/portal (gerenciar)
export function BillingButton({ action, label }: { action: 'checkout' | 'portal'; label: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/stripe/${action}`, { method: 'POST' })
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
      <Button onClick={handleClick} disabled={loading} className="gold-btn font-semibold">
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Abrindo…</> : label}
      </Button>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  )
}

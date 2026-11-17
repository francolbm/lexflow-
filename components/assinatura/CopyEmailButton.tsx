'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToastProvider, useToast } from '@/components/ui/toast'

function Inner({ email }: { email: string }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(email)
    } catch {
      // Sem permissão da área de transferência (ex.: http): copia por um campo temporário.
      const ta = document.createElement('textarea')
      ta.value = email
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand?.('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    toast.add({ title: 'E-mail copiado!' })
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Button
      type="button" variant="outline" size="sm" onClick={copy} data-copiar-email
      className="shrink-0 border-white/20 bg-transparent text-white hover:bg-white/10"
    >
      {copied ? <><Check className="mr-1.5 h-3.5 w-3.5" />Copiado</> : <><Copy className="mr-1.5 h-3.5 w-3.5" />Copiar e-mail</>}
    </Button>
  )
}

/** Botão "Copiar e-mail" com toast "E-mail copiado!" (traz o próprio ToastProvider: a /assinatura não tem um). */
export function CopyEmailButton({ email }: { email: string }) {
  return <ToastProvider><Inner email={email} /></ToastProvider>
}

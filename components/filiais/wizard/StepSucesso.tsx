'use client'

import { useState } from 'react'
import { Check, CheckCircle2, Copy, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface CreatedFilial {
  organization_id: string
  activation_link: string | null
  titular_existente: boolean
  message?: string
}

// Passo 4 — sucesso, com o link de ativação copiável (enquanto não há envio por e-mail)
export function StepSucesso({ result, titularEmail }: { result: CreatedFilial; titularEmail: string }) {
  const [copied, setCopied] = useState(false)
  const link = result.activation_link

  async function copy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // Sem permissão da área de transferência (ex.: http): seleciona o texto para Ctrl+C.
      ;(document.getElementById('link-ativacao') as HTMLInputElement | null)?.select()
      document.execCommand?.('copy')
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="space-y-5 text-center" data-step="4">
      <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#d4af37]/20" aria-hidden />
        <CheckCircle2 className="relative h-14 w-14 animate-in zoom-in-50 duration-300" style={{ color: '#d4af37' }} aria-hidden />
      </div>
      <div>
        <h3 className="text-xl font-bold text-white">Filial criada! 🎉</h3>
        <p className="mt-1 text-sm text-gray-300">A assinatura já está ativa e o advogado titular já pode ser avisado.</p>
      </div>

      {link ? (
        <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-left" data-link>
          <p className="text-sm text-gray-200">
            Envie este link de ativação para <strong className="break-all">{titularEmail}</strong>:
          </p>
          <div className="flex gap-2">
            <Input id="link-ativacao" readOnly value={link} onFocus={(e) => e.currentTarget.select()}
              className="h-9 flex-1 border-white/10 bg-white/5 font-mono text-xs text-white" aria-label="Link de ativação" />
            <Button type="button" onClick={copy} data-copiar className="shrink-0 bg-[#d4af37] font-semibold text-[#0a192f] hover:bg-[#e0bf4f]">
              {copied ? <><Check className="mr-1.5 h-4 w-4" />Copiado!</> : <><Copy className="mr-1.5 h-4 w-4" />Copiar</>}
            </Button>
          </div>
          <p className="flex gap-2 text-xs text-amber-200">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Este link dá acesso à conta do advogado e <strong>não será exibido novamente</strong>. Copie agora e envie só a ele.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-left text-sm text-gray-200" data-sem-link>
          O advogado <strong className="break-all">{titularEmail}</strong> já tinha conta no PennaJus e foi vinculado à filial.
          Ele entra com a própria senha, sem precisar de link.
        </div>
      )}
    </div>
  )
}

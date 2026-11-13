'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import type { FilialItem } from '@/lib/filiais-types'
import {
  MOTIVO_MAX, NETWORK_ERROR, accessUntilLabel, buildCancelRequest, canConfirm, cancelTitle, demandasLabel,
  mapCancelResponse, shouldForce, validateMotivo,
} from '@/lib/filial-cancel-form'

const outlineBtn = 'border-white/20 bg-transparent text-white hover:bg-white/10'

export interface CancelBodyProps {
  filial: FilialItem
  demandas: number
  motivo: string
  onMotivo: (v: string) => void
  onMotivoBlur: () => void
  motivoError: string | null
  entendi: boolean
  onEntendi: (v: boolean) => void
  busy: boolean
  topError: string | null
  onBack: () => void
  onConfirm: () => void
}

/** Corpo + rodapé do modal (apresentação pura: sem hooks de rota/toast, para poder ser renderizado nos testes). */
export function CancelFilialBody(p: CancelBodyProps) {
  const required = p.demandas > 0
  const until = accessUntilLabel(p.filial.next_billing_date ?? p.filial.cancels_at)
  const len = p.motivo.trim().length
  const enabled = canConfirm({ motivo: p.motivo, demandas: p.demandas, entendi: p.entendi, busy: p.busy })

  return (
    <>
      <div className="space-y-4 px-4 py-5 sm:px-6">
        {p.topError && (
          <div role="alert" data-erro-api className="flex gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><p>{p.topError}</p>
          </div>
        )}

        {required && (
          <div data-alerta-demandas className="flex gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">Essa filial tem {demandasLabel(p.demandas)} em andamento</p>
              <p className="mt-0.5 text-xs text-amber-200/90">Elas continuam acessíveis até o fim do ciclo pago. Informe o motivo para continuar.</p>
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="cancel-motivo" className="text-sm text-gray-300">
            Motivo do cancelamento
            <span className="ml-1 text-xs text-gray-500">{required ? '(obrigatório)' : '(opcional)'}</span>
          </Label>
          <Textarea
            id="cancel-motivo" value={p.motivo} rows={3} disabled={p.busy}
            onChange={(e) => p.onMotivo(e.target.value)} onBlur={p.onMotivoBlur}
            aria-invalid={!!p.motivoError} aria-describedby={p.motivoError ? 'cancel-motivo-erro' : undefined}
            className="mt-1 border-white/10 bg-white/5 text-white placeholder:text-gray-500"
            placeholder="Por que esta filial está sendo cancelada?"
          />
          <div className="mt-1 flex items-start justify-between gap-2">
            {p.motivoError
              ? <p id="cancel-motivo-erro" role="alert" className="text-xs text-red-300">{p.motivoError}</p>
              : <span />}
            <span className={`shrink-0 text-xs ${len > MOTIVO_MAX ? 'text-red-300' : 'text-gray-500'}`} data-contador>{len}/{MOTIVO_MAX}</span>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-gray-200">
          <input
            type="checkbox" checked={p.entendi} disabled={p.busy} onChange={(e) => p.onEntendi(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#d4af37]" data-entendi
          />
          <span>Entendo que o acesso continua até {until}</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-4 py-3 sm:px-6">
        <Button variant="outline" onClick={p.onBack} disabled={p.busy} className={outlineBtn}>Voltar</Button>
        <Button
          onClick={p.onConfirm} disabled={!enabled} data-confirmar-cancelamento
          className="bg-red-600 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {p.busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cancelando…</> : 'Confirmar cancelamento'}
        </Button>
      </div>
    </>
  )
}

/** Modal "Cancelar filial". Montado só enquanto aberto (cada abertura começa do zero). Chama DELETE na Rota 2. */
export function CancelFilialDialog({ filial, onClose, onCancelled }: {
  filial: FilialItem
  onClose: () => void
  onCancelled?: () => void
}) {
  const router = useRouter()
  const toast = useToast()
  const [motivo, setMotivo] = useState('')
  const [touched, setTouched] = useState(false)
  const [entendi, setEntendi] = useState(false)
  const [busy, setBusy] = useState(false)
  const [demandas, setDemandas] = useState(filial.num_demandas_abertas) // sobe se um 409 revelar demandas novas
  const [topError, setTopError] = useState<string | null>(null)
  const [apiMotivoError, setApiMotivoError] = useState<string | null>(null)

  const localError = touched ? validateMotivo(motivo, demandas) : null
  const motivoError = apiMotivoError ?? localError

  async function confirm() {
    if (!canConfirm({ motivo, demandas, entendi, busy })) return // defesa extra: o botão já fica desabilitado
    setBusy(true)
    setTopError(null)
    setApiMotivoError(null)
    try {
      const { url, init } = buildCancelRequest(filial.id, { force: shouldForce(demandas), motivo })
      const res = await fetch(url, init)
      const out = mapCancelResponse(res.status, await res.json().catch(() => ({})))
      switch (out.kind) {
        case 'ok':
          toast.add({
            title: 'Cancelamento agendado',
            description: `A filial continua com acesso até ${accessUntilLabel(out.cancelsAt ?? filial.next_billing_date)}.`,
          })
          onCancelled?.()
          router.refresh()
          onClose()
          return
        case 'ja_cancelada':
          toast.add({ title: 'Esta filial já estava com o cancelamento agendado' })
          router.refresh()
          onClose()
          return
        case 'demandas_ativas':
          // A lista estava desatualizada: mostra o alerta, exige o motivo e pede uma nova confirmação.
          setDemandas(out.count)
          setEntendi(false)
          setTouched(true)
          setTopError('Surgiram demandas em andamento nesta filial. Informe o motivo e confirme de novo.')
          return
        case 'motivo':
          setApiMotivoError(out.message)
          return
        default:
          setTopError(out.message)
      }
    } catch {
      setTopError(NETWORK_ERROR)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <DialogContent
        showCloseButton={!busy}
        className="w-full max-w-[calc(100%-1rem)] gap-0 p-0 sm:max-w-lg"
        style={{ backgroundColor: '#112240' }}
        data-cancel-dialog
      >
        <DialogHeader className="border-b border-white/10 px-4 py-4 sm:px-6">
          <DialogTitle className="text-lg text-white">{cancelTitle(filial)}</DialogTitle>
          <DialogDescription className="text-gray-300">
            O cancelamento é agendado para o fim do ciclo já pago. Nada é apagado.
          </DialogDescription>
        </DialogHeader>
        <CancelFilialBody
          filial={filial} demandas={demandas}
          motivo={motivo} onMotivo={(v) => { setMotivo(v); setApiMotivoError(null) }} onMotivoBlur={() => setTouched(true)}
          motivoError={motivoError} entendi={entendi} onEntendi={setEntendi} busy={busy}
          topError={topError} onBack={onClose} onConfirm={confirm}
        />
      </DialogContent>
    </Dialog>
  )
}

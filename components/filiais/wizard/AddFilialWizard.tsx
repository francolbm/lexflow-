'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  buildPayload, confirmMatches, emptyForm, isDirty, mapApiError, validateStep1, validateStep2,
  type FieldErrors, type FilialForm,
} from '@/lib/filial-form'
import { lookupCep } from '@/lib/viacep'
import { onlyDigits } from '@/lib/br-format'
import type { Previa, PreviaState } from '@/lib/filiais-types'
import { StepEscritorio } from './StepEscritorio'
import { StepAdvogado } from './StepAdvogado'
import { StepConfirmacao } from './StepConfirmacao'
import { StepSucesso, type CreatedFilial } from './StepSucesso'

type Step = 1 | 2 | 3 | 4
const STEP_TITLES: Record<1 | 2 | 3, { title: string; desc: string }> = {
  1: { title: 'Dados do escritório', desc: 'Informe os dados cadastrais da nova filial.' },
  2: { title: 'Advogado titular', desc: 'Quem vai administrar a filial.' },
  3: { title: 'Confirmação', desc: 'Revise os dados e a cobrança antes de criar.' },
}

const outlineBtn = 'border-white/20 bg-transparent text-white hover:bg-white/10'
const goldBtn = 'bg-[#d4af37] font-semibold text-[#0a192f] hover:bg-[#e0bf4f] disabled:opacity-50'

/** Wizard de 4 passos em um modal único. Montado só enquanto está aberto, então cada abertura começa do zero. */
export function AddFilialWizard({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FilialForm>(emptyForm())
  const [touched, setTouched] = useState<Partial<Record<keyof FilialForm, boolean>>>({})
  const [attempted, setAttempted] = useState<{ 1: boolean; 2: boolean }>({ 1: false, 2: false })
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [created, setCreated] = useState<CreatedFilial | null>(null)
  const [previa, setPrevia] = useState<PreviaState>({ status: 'loading' })
  const [cepLoading, setCepLoading] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  // ---- prévia de cobrança: busca ao abrir, para estar pronta quando chegar no passo 3 ----
  const loadPrevia = useCallback(async () => {
    setPrevia({ status: 'loading' })
    try {
      const res = await fetch('/api/escritorio/filial/previa', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPrevia({ status: 'error', message: res.status === 403 ? (data.error || 'Sem permissão para adicionar filiais.') : 'Não foi possível calcular a cobrança agora.' })
        return
      }
      setPrevia({ status: 'ok', data: data as Previa })
    } catch {
      setPrevia({ status: 'error', message: 'Falha de conexão ao calcular a cobrança.' })
    }
  }, [])
  useEffect(() => { loadPrevia() }, [loadPrevia])

  // ---- campos / validação ----
  const set = useCallback((field: keyof FilialForm, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    setServerErrors((e) => (e[field] ? { ...e, [field]: undefined } : e)) // erro vindo da API some quando o campo muda
    setBanner(null)
  }, [])
  const touch = useCallback((field: keyof FilialForm) => setTouched((t) => (t[field] ? t : { ...t, [field]: true })), [])

  const err1 = useMemo(() => validateStep1(form), [form])
  const err2 = useMemo(() => validateStep2(form), [form])
  // Mostra o erro do campo se ele já foi tocado, se a pessoa já tentou avançar, ou se veio da API.
  const visible = (errs: FieldErrors, stepKey: 1 | 2): FieldErrors => {
    const out: FieldErrors = {}
    for (const k of Object.keys(errs) as (keyof FilialForm)[]) {
      if (touched[k] || attempted[stepKey]) out[k] = errs[k]
    }
    for (const k of Object.keys(serverErrors) as (keyof FilialForm)[]) {
      if (serverErrors[k]) out[k] = serverErrors[k]
    }
    return out
  }

  // ---- ViaCEP: ao completar 8 dígitos, preenche só os campos ainda vazios ----
  const cepDigits = onlyDigits(form.cep)
  const lastCep = useRef('')
  useEffect(() => {
    if (cepDigits.length !== 8) { lastCep.current = ''; return }
    if (cepDigits === lastCep.current) return
    lastCep.current = cepDigits
    const ctrl = new AbortController()
    setCepLoading(true)
    lookupCep(cepDigits, ctrl.signal).then((addr) => {
      setCepLoading(false)
      if (!addr) return
      setForm((f) => ({
        ...f,
        logradouro: f.logradouro.trim() ? f.logradouro : addr.logradouro,
        bairro: f.bairro.trim() ? f.bairro : addr.bairro,
        cidade: f.cidade.trim() ? f.cidade : addr.cidade,
        estado: f.estado ? f.estado : addr.estado,
      }))
    })
    return () => { ctrl.abort(); setCepLoading(false) }
  }, [cepDigits])

  const scrollTop = () => bodyRef.current?.scrollTo({ top: 0 })
  const goto = (s: Step) => { setStep(s); setBanner(null); scrollTop() }

  function next() {
    if (step === 1) {
      setAttempted((a) => ({ ...a, 1: true }))
      if (Object.keys(err1).length) { scrollTop(); return }
      goto(2)
    } else if (step === 2) {
      setAttempted((a) => ({ ...a, 2: true }))
      if (Object.keys(err2).length) return
      setTyped('')
      goto(3)
    }
  }

  // ---- envio (Rota 1) ----
  const matrizRef = previa.status === 'ok' ? { name: previa.data.matriz.name, cnpj: previa.data.matriz.cnpj } : null
  const canCreate = !busy && previa.status === 'ok'
    && previa.data.mensalidade_centavos !== null && !!previa.data.cartao
    && confirmMatches(typed, matrizRef)

  async function submit() {
    if (!canCreate) return // defesa em profundidade: o botão já fica desabilitado
    setBusy(true)
    setBanner(null)
    try {
      const res = await fetch('/api/escritorio/filial', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload(form)),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        setCreated(body as CreatedFilial)
        goto(4)
        router.refresh() // a lista e os KPIs ao fundo já refletem a nova filial
        return
      }
      // Volta ao passo certo: erro de campo vira mensagem no campo; o resto vira aviso no topo do passo.
      const target = mapApiError(res.status, body)
      if (target.field) setServerErrors((e) => ({ ...e, [target.field as keyof FilialForm]: target.message }))
      if (target.step !== 3) setAttempted((a) => ({ ...a, [target.step]: true }))
      setStep(target.step)
      setBanner(target.field ? null : target.message)
      scrollTop()
    } catch {
      setBanner('Falha de conexão. Antes de tentar de novo, atualize a página e confira se a filial não foi criada.')
    } finally {
      setBusy(false)
    }
  }

  // ---- fechar ----
  function requestClose() {
    if (busy) return
    if (step === 4) return finish()
    if (isDirty(form)) { setConfirmDiscard(true); return }
    onClose()
  }
  function finish(scrollToList = false) {
    router.refresh()
    onClose()
    if (scrollToList) setTimeout(() => document.getElementById('filiais-titulo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
  }

  const head = step === 4 ? null : STEP_TITLES[step]

  return (
    <Dialog open onOpenChange={(open) => { if (!open) requestClose() }}>
      <DialogContent
        showCloseButton={!busy}
        className="flex max-h-[94dvh] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        style={{ backgroundColor: '#112240' }}
        data-wizard
      >
        <DialogHeader className="border-b border-white/10 px-4 py-4 sm:px-6">
          <DialogTitle className="text-lg text-white">{step === 4 ? 'Filial criada' : 'Adicionar filial'}</DialogTitle>
          {head ? (
            <DialogDescription className="text-gray-300">
              <span className="font-medium text-white">Passo {step} de 3 · {head.title}.</span> {head.desc}
            </DialogDescription>
          ) : <DialogDescription className="sr-only">Cadastro concluído.</DialogDescription>}
          {step !== 4 && (
            <div className="mt-3 flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step}>
              {[1, 2, 3].map((n) => (
                <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-[#d4af37]' : 'bg-white/15'}`} />
              ))}
            </div>
          )}
        </DialogHeader>

        <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {step === 1 && <StepEscritorio form={form} errors={visible(err1, 1)} set={set} touch={touch} cepLoading={cepLoading} />}
          {step === 2 && <StepAdvogado form={form} errors={visible(err2, 2)} set={set} touch={touch} />}
          {step === 3 && (
            <StepConfirmacao
              form={form} previa={previa} onRetryPrevia={loadPrevia} onEdit={(s) => goto(s)}
              typed={typed} onTyped={(v) => { setTyped(v); setBanner(null) }} banner={banner}
            />
          )}
          {step === 4 && created && <StepSucesso result={created} titularEmail={form.email.trim().toLowerCase()} />}
          {banner && step !== 3 && step !== 4 && (
            <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{banner}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3 sm:px-6">
          {confirmDiscard ? (
            <>
              <p className="text-sm text-gray-200">Descartar o cadastro desta filial? Os dados digitados serão perdidos.</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setConfirmDiscard(false)} className={outlineBtn}>Continuar editando</Button>
                <Button onClick={onClose} className="bg-red-600 font-semibold text-white hover:bg-red-500">Descartar</Button>
              </div>
            </>
          ) : step === 4 ? (
            <>
              <Button variant="outline" onClick={() => finish()} className={outlineBtn}>Fechar</Button>
              <Button onClick={() => finish(true)} className={goldBtn}>Ver na lista</Button>
            </>
          ) : (
            <>
              <Button variant="outline" disabled={busy} className={outlineBtn}
                onClick={() => (step === 1 ? requestClose() : goto((step - 1) as Step))}>
                {step === 1 ? 'Cancelar' : <><ArrowLeft className="mr-1.5 h-4 w-4" />Voltar</>}
              </Button>
              {step < 3 ? (
                <Button onClick={next} data-next className={goldBtn}>Continuar<ArrowRight className="ml-1.5 h-4 w-4" /></Button>
              ) : (
                <Button onClick={submit} disabled={!canCreate} data-criar className={goldBtn}>
                  {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando filial…</> : 'Criar filial'}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

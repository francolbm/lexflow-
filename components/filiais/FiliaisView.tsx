'use client'

import { Building2, Plus, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import type { FilialItem, GroupData } from '@/lib/filiais-types'
import { KpiCards } from './KpiCards'
import { MatrizCard } from './MatrizCard'
import { FilialCard } from './FilialCard'
import { AddFilialWizard } from './wizard/AddFilialWizard'
import { CancelFilialDialog } from './CancelFilialDialog'
import { BillingButton } from '@/components/assinatura/BillingButton'
import { formatBRL } from '@/lib/br-format'

// Valor ilustrativo da filial (R$ 997 com 40% de desconto permanente). A cobrança real vem do cupom no Stripe.
const FILIAL_PRECO_CENTAVOS = 59820

// Modo cortesia: descobre o produto, mas ainda não pode criar filiais (precisa da assinatura paga).
function CortesiaEducativo() {
  return (
    <div data-cortesia-educativo className="rounded-xl border border-dashed border-[#d4af37]/40 px-6 py-10 text-center">
      <Target className="mx-auto h-10 w-10" style={{ color: '#d4af37' }} aria-hidden />
      <h3 className="mt-3 text-lg font-semibold text-white">Modelo Franquia Premium disponível</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-300">
        O PennaJus Premium permite cadastrar múltiplos escritórios como filiais de uma matriz, com 40% de desconto permanente
        em cada filial adicional ({formatBRL(FILIAL_PRECO_CENTAVOS)}/mês cada). Ideal pra grupos jurídicos com matriz e filiais em cidades diferentes.
      </p>
      <p className="mx-auto mt-3 max-w-xl text-sm text-gray-400">
        Sua assinatura atual é cortesia. Para começar a cadastrar filiais, ative sua assinatura Premium paga.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <BillingButton action="checkout" plan="premium" label="Ativar assinatura Premium" />
        <span title="Ative sua assinatura para habilitar" data-add-filial-disabled-wrap>
          <Button disabled data-add-first-filial-disabled className="disabled:opacity-50" variant="outline">
            <Plus className="mr-1.5 h-4 w-4" />Adicionar primeira filial
          </Button>
        </span>
      </div>
    </div>
  )
}

function Inner({ data, cortesia }: { data: GroupData; cortesia: boolean }) {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<FilialItem | null>(null)
  const addFilial = () => setWizardOpen(true)
  const cancelFilial = (f: FilialItem) => setCancelTarget(f)

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <KpiCards resumo={data.resumo} />
      <MatrizCard matriz={data.matriz} cortesia={cortesia} />

      <section aria-labelledby="filiais-titulo">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 id="filiais-titulo" className="text-base font-semibold text-white">
            Filiais <span className="ml-1 text-sm font-normal text-gray-400">({data.resumo.total})</span>
          </h2>
          {/* Desktop/tablet (a partir de sm): botão no topo direito da seção. No mobile é o botão flutuante abaixo. */}
          {!cortesia && data.filiais.length > 0 && (
            <Button
              onClick={addFilial} data-add-filial-top
              className="hidden bg-[#d4af37] font-semibold text-[#0a192f] hover:bg-[#e0bf4f] sm:inline-flex"
            >
              <Plus className="mr-1.5 h-4 w-4" />Adicionar filial
            </Button>
          )}
        </div>

        {cortesia ? <CortesiaEducativo /> : data.filiais.length === 0 ? (
          <div data-empty className="rounded-xl border border-dashed border-white/15 px-6 py-12 text-center">
            <Building2 className="mx-auto h-10 w-10" style={{ color: '#d4af3780' }} aria-hidden />
            <p className="mt-3 font-medium text-white">Nenhuma filial ainda</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-400">
              Cada filial é um escritório com equipe e demandas próprias, cobrado com 40% de desconto no mesmo cartão da matriz.
            </p>
            <Button onClick={addFilial} className="mt-5 bg-[#d4af37] font-semibold text-[#0a192f] hover:bg-[#e0bf4f]">
              <Plus className="mr-1.5 h-4 w-4" />Adicionar a primeira filial
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-filiais-grid>
            {data.filiais.map((f) => <FilialCard key={f.id} filial={f} onCancel={cancelFilial} />)}
          </div>
        )}
      </section>

      {/* Mobile (abaixo de sm): botão flutuante. Sem filiais, o botão do estado vazio já faz esta ação. */}
      {!cortesia && data.filiais.length > 0 && (
        <Button
          onClick={addFilial} data-add-filial-fab
          className="fixed bottom-5 right-5 z-40 h-12 rounded-full bg-[#d4af37] px-5 text-sm font-bold text-[#0a192f] shadow-lg shadow-black/40 hover:bg-[#e0bf4f] sm:hidden"
        >
          <Plus className="mr-1.5 h-5 w-5" />Adicionar filial
        </Button>
      )}

      {!cortesia && wizardOpen && <AddFilialWizard onClose={() => setWizardOpen(false)} />}
      {cancelTarget && <CancelFilialDialog filial={cancelTarget} onClose={() => setCancelTarget(null)} />}
    </div>
  )
}

export function FiliaisView({ data, cortesia = false }: { data: GroupData; cortesia?: boolean }) {
  return <ToastProvider><Inner data={data} cortesia={cortesia} /></ToastProvider>
}

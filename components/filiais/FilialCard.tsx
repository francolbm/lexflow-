'use client'

import { MoreVertical, Eye, Ban, MapPin } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatBRL, formatDateBR } from '@/lib/br-format'
import type { FilialItem } from '@/lib/filiais-types'
import { FilialStatusBadge } from './FilialStatusBadge'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-white">{value}</dd>
    </div>
  )
}

export function FilialCard({ filial, onCancel }: { filial: FilialItem; onCancel: (f: FilialItem) => void }) {
  const cancelled = filial.status === 'pending_deletion'
  const place = [filial.cidade, filial.estado].filter(Boolean).join('/')
  const money = filial.faturamento_mensal_estimado_centavos

  return (
    // Sem navegação por enquanto (detalhes ficam para o sub-passo 4.2), mas já com cara de clicável.
    <article
      data-filial={filial.id}
      className={`relative cursor-pointer rounded-xl border p-4 transition-colors hover:border-[#d4af37]/50 ${
        cancelled ? 'border-red-500/25 bg-[#112240]/70' : 'border-white/10 bg-[#112240]'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-white" title={filial.name}>{filial.name}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-gray-400">
            {place && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{place}</span>}
            {filial.cnpj && <span className="text-xs text-gray-500">{filial.cnpj}</span>}
          </p>
        </div>

        <DropdownMenu>
          {/* Estilo aplicado direto no Trigger (já é um <button>). NÃO usar render={<Button />}: o Button do projeto
              não repassa ref no React 18, o Base UI perde o elemento âncora e o menu fica invisível em top:0/left:0. */}
          <DropdownMenuTrigger
            aria-label={`Ações da filial ${filial.name}`} data-filial-menu
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'shrink-0 text-gray-400 hover:bg-white/10 hover:text-white')}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48 border-0 bg-[#0d1f38] text-white ring-white/15">
            <DropdownMenuItem disabled title="Em breve" className="focus:bg-white/10 focus:text-white">
              <Eye className="h-4 w-4" />Ver detalhes <span className="ml-auto text-xs text-gray-500">em breve</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive" disabled={cancelled} data-cancel-filial
              title={cancelled ? 'O cancelamento desta filial já está agendado' : undefined}
              onClick={() => onCancel(filial)}
              className="text-red-300 focus:bg-red-500/15 focus:text-red-200"
            >
              <Ban className="h-4 w-4" />Cancelar filial
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3"><FilialStatusBadge status={filial.status} /></div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Demandas" value={String(filial.num_demandas_abertas)} />
        <Stat label="Advogados" value={String(filial.num_advogados_ativos)} />
        <Stat label="Mensal" value={money === null ? '—' : formatBRL(money)} />
      </dl>

      <p className="mt-4 border-t border-white/10 pt-3 text-xs text-gray-400">
        {filial.next_billing_date
          ? <>Próxima cobrança: <span className="font-medium text-gray-200">{formatDateBR(filial.next_billing_date)}</span></>
          : filial.cancels_at
            ? <>Acesso até: <span className="font-medium text-red-300">{formatDateBR(filial.cancels_at)}</span></>
            : <>Sem cobrança agendada</>}
      </p>
    </article>
  )
}

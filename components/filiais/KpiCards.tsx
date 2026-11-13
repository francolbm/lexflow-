import { CircleDollarSign, Building2, Scale } from 'lucide-react'
import { formatBRL } from '@/lib/br-format'
import type { GroupResumo } from '@/lib/filiais-types'

function Kpi({ icon: Icon, label, value, hint }: { icon: typeof Scale; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#112240] p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
        <Icon className="h-4 w-4 shrink-0" style={{ color: '#d4af37' }} aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  )
}

export function KpiCards({ resumo }: { resumo: GroupResumo }) {
  const mrr = resumo.mrr_grupo_centavos
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4" data-kpis>
      <Kpi
        icon={CircleDollarSign} label="MRR do Grupo"
        value={mrr === null ? '—' : formatBRL(mrr)}
        hint={mrr === null ? 'Valores indisponíveis no momento' : `Matriz + ${resumo.ativas} ${resumo.ativas === 1 ? 'filial ativa' : 'filiais ativas'}`}
      />
      <Kpi
        icon={Building2} label="Filiais ativas" value={String(resumo.ativas)}
        hint={resumo.canceladas > 0 ? `${resumo.total} no total · ${resumo.canceladas} cancelada${resumo.canceladas > 1 ? 's' : ''}` : `${resumo.total} no total`}
      />
      <Kpi icon={Scale} label="Advogados no Grupo" value={String(resumo.advogados_grupo)} hint="Na matriz e nas filiais" />
    </div>
  )
}

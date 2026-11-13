import { Crown, MapPin } from 'lucide-react'
import { formatBRL } from '@/lib/br-format'
import type { MatrizInfo } from '@/lib/filiais-types'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold text-white">{value}</dd>
    </div>
  )
}

// Destaque da matriz. Sem ações: os dados do escritório são editados em "Meu perfil".
export function MatrizCard({ matriz }: { matriz: MatrizInfo }) {
  const place = [matriz.cidade, matriz.estado].filter(Boolean).join('/')
  return (
    <section
      data-matriz
      className="rounded-xl border border-[#d4af37]/40 p-4 sm:p-5"
      style={{ background: 'linear-gradient(135deg, #d4af3714 0%, #112240 55%)' }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#d4af37] px-2.5 py-0.5 text-xs font-bold text-[#0a192f]">
          <Crown className="h-3 w-3" aria-hidden />Matriz
        </span>
        <span className="text-xs text-gray-400">Plano Premium</span>
      </div>
      <h2 className="mt-2 truncate text-lg font-bold text-white sm:text-xl" title={matriz.name}>{matriz.name}</h2>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
        {matriz.cnpj && <span>CNPJ {matriz.cnpj}</span>}
        {place && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{place}</span>}
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
        <Stat label="Demandas abertas" value={String(matriz.num_demandas_abertas)} />
        <Stat label="Advogados" value={String(matriz.num_advogados_ativos)} />
        <Stat
          label="Mensalidade"
          value={matriz.faturamento_mensal_estimado_centavos === null ? '—' : formatBRL(matriz.faturamento_mensal_estimado_centavos)}
        />
      </dl>
    </section>
  )
}

import { Crown, Building2, FileText, CheckCircle2, Users } from 'lucide-react'
import { initialsOf } from '@/lib/avatar'
import { maskCnpj, formatDateBR } from '@/lib/br-format'
import { formatPhone } from '@/lib/perfil'
import { enderecoLinhas, type MinhaFilialData } from '@/lib/minha-filial'

const card = 'rounded-xl border border-white/10 bg-[#112240] p-5'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="w-32 shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-gray-200">{value || '—'}</dd>
    </div>
  )
}

// Tela só leitura (sem botões de ação). Sem faturamento, sem dados da matriz, sem e-mail de colegas.
export function MinhaFilialView({ data }: { data: MinhaFilialData }) {
  const end = enderecoLinhas(data.endereco)
  const addr = [end.rua, end.bairro, end.cidadeUf, end.cep && `CEP ${end.cep}`].filter(Boolean).join(' · ')
  const metrics = [
    { key: 'andamento', label: 'Demandas em andamento', value: data.metrics.emAndamento, icon: FileText },
    { key: 'finalizadas', label: 'Finalizadas este mês', value: data.metrics.finalizadasMes, icon: CheckCircle2 },
    { key: 'membros', label: 'Membros ativos', value: data.metrics.membrosAtivos, icon: Users },
  ]
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8" data-minha-filial>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <Building2 className="h-6 w-6" style={{ color: '#d4af37' }} aria-hidden />
          <h2 className="text-xl font-bold text-white">{data.name}</h2>
          <span
            data-status-badge={data.cancelada ? 'cancelada' : 'ativa'}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${data.cancelada ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
          >
            {data.cancelada ? 'Cancelada' : 'Ativa'}
          </span>
        </div>
        {data.cancelada && (
          <p data-acesso-ate className="mt-2 text-sm font-medium text-red-400">
            Acesso até: {formatDateBR(data.accessUntil)}
          </p>
        )}
      </div>

      <section className={card} data-section="dados">
        <h3 className="mb-2 font-semibold text-white">Dados do escritório</h3>
        <dl className="divide-y divide-white/5">
          <Row label="Nome" value={data.name} />
          <Row label="CNPJ" value={data.endereco.cnpj ? maskCnpj(data.endereco.cnpj) : ''} />
          <Row label="Endereço" value={addr} />
          <Row label="Telefone" value={data.phone ? formatPhone(data.phone) : ''} />
          <Row label="Cidade/UF" value={end.cidadeUf} />
        </dl>
      </section>

      <section className={card} data-section="membros">
        <h3 className="mb-3 font-semibold text-white">Membros do escritório</h3>
        <ul className="divide-y divide-white/10">
          {data.members.map((m) => (
            <li key={m.userId} data-member className="flex items-center gap-3 py-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold"
                style={{ backgroundColor: '#d4af3720', color: '#d4af37' }}
              >
                {m.avatarUrl
                  // eslint-disable-next-line @next/next/no-img-element -- link assinado do Storage
                  ? <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />
                  : initialsOf(m.fullName)}
              </div>
              <p className="min-w-0 flex-1 truncate font-medium text-white">{m.fullName || '—'}</p>
              {m.isOwner ? (
                <span data-badge-titular className="inline-flex items-center gap-1 rounded-full bg-[#d4af37]/15 px-2 py-0.5 text-xs font-medium text-[#d4af37]">
                  <Crown className="h-3 w-3" aria-hidden />Titular
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-gray-300">{m.role}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 sm:grid-cols-3" data-section="metricas">
        {metrics.map(({ key, label, value, icon: Icon }) => (
          <div key={key} data-metric={key} className={card}>
            <Icon className="h-5 w-5" style={{ color: '#d4af37' }} aria-hidden />
            <p className="mt-3 text-3xl font-bold text-white">{value}</p>
            <p className="mt-1 text-sm text-gray-400">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

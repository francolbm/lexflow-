import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface InfoCardProps {
  icon: LucideIcon
  title: string
  children: React.ReactNode
  /** Conteúdo extra entre o texto e o link (ex.: caixa de contato). */
  extra?: React.ReactNode
  /** 'gold' = borda dourada (avisos de gestão); 'default' = borda sutil (ex.: "Acesso restrito"). */
  accent?: 'default' | 'gold'
  backLabel?: string
  backHref?: string
}

// Card informativo centralizado (navy, ícone dourado), padrão do "Acesso restrito" e dos avisos de assinatura.
export function InfoCard({ icon: Icon, title, children, extra, accent = 'default', backLabel = 'Voltar para a Visão Geral', backHref = '/dashboard' }: InfoCardProps) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <div
        data-info-card={accent}
        className={`rounded-xl border bg-[#112240] p-8 ${accent === 'gold' ? 'border-[#d4af37]/40' : 'border-white/10'}`}
      >
        <Icon className="mx-auto h-10 w-10" style={{ color: '#d4af37' }} aria-hidden />
        <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-gray-400">{children}</p>
        {extra}
        <Link href={backHref} className="mt-5 inline-block text-sm font-medium" style={{ color: '#d4af37' }}>
          {backLabel}
        </Link>
      </div>
    </div>
  )
}

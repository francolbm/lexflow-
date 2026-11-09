import { CheckCircle, Clock } from 'lucide-react'
import { planFeatureList, type PlanCode } from '@/lib/types'

// Lista de recursos de um plano (home e /assinatura). Itens de roadmap
// ("(em desenvolvimento)") saem apagados, em itálico e com relógio no lugar do check.
export function PlanFeatureList({ code, className = 'space-y-3' }: { code: PlanCode; className?: string }) {
  return (
    <ul className={className}>
      {planFeatureList(code).map(({ label, roadmap }) => (
        <li
          key={label}
          className={`flex items-center gap-2 text-sm ${roadmap ? 'text-gray-500 italic' : 'text-gray-300'}`}
        >
          {roadmap ? (
            <Clock className="h-4 w-4 flex-shrink-0 text-gray-500" aria-label="Em desenvolvimento" />
          ) : (
            <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#d4af37' }} />
          )}
          {label}
        </li>
      ))}
    </ul>
  )
}

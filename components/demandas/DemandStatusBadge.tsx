import { DemandStatus } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: DemandStatus
  hasDeletionRequest?: boolean
  className?: string
}

const statusConfig: Record<DemandStatus, { label: string; className: string }> = {
  received: {
    label: 'Recebido',
    className: 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30',
  },
  in_triage: {
    label: 'Em Triagem',
    className: 'bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30',
  },
  awaiting_complement: {
    label: 'Aguardando Complemento',
    className: 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30',
  },
  in_production: {
    label: 'Em Produção',
    className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30',
  },
  in_internal_review: {
    label: 'Em Revisão Interna',
    className: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30',
  },
  delivered: {
    label: 'Em Revisão',
    className: 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30',
  },
  revision_requested: {
    label: 'Ajustes Solicitados',
    className: 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30',
  },
  finalized: {
    label: 'Finalizado',
    className: 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30',
  },
  archived: {
    label: 'Arquivado',
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30',
  },
  deletion_requested: {
    label: 'Exclusão Solicitada',
    className: 'bg-red-600/20 text-red-300 border-red-500/30 hover:bg-red-500/30',
  },
}

export function DemandStatusBadge({ status, hasDeletionRequest, className }: StatusBadgeProps) {
  // If has deletion request, always show as deletion_requested
  const effectiveStatus = hasDeletionRequest ? 'deletion_requested' : status
  const config = statusConfig[effectiveStatus] ?? {
    label: status,
    className: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  }

  return (
    <Badge
      variant='outline'
      className={cn('text-xs font-medium border', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
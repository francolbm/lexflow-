import type { FilialStatus } from '@/lib/filiais-types'

const MAP: Record<FilialStatus, { label: string; cls: string }> = {
  active: { label: 'Ativa', cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
  pending_deletion: { label: 'Cancelada', cls: 'bg-red-500/15 text-red-300 ring-red-500/30' },
  pending_activation: { label: 'Ativando', cls: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
}

export function FilialStatusBadge({ status }: { status: FilialStatus }) {
  const { label, cls } = MAP[status] ?? MAP.active
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  )
}

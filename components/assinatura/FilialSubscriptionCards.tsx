import { Building2, Info } from 'lucide-react'
import { InfoCard } from '@/components/layout/InfoCard'
import { MATRIZ_MANAGED, MEMBRO_FILIAL, type MatrizContact } from '@/lib/matriz-contact'
import { CopyEmailButton } from './CopyEmailButton'

/** (A) Titular da filial: contato do titular da matriz + linha extra se a filial já foi cancelada. */
export function MatrizManagedCard({ contact, cancelNote }: { contact: MatrizContact | null; cancelNote: string | null }) {
  return (
    <InfoCard
      icon={Building2} accent="gold" title={MATRIZ_MANAGED.title} backLabel={MATRIZ_MANAGED.back}
      extra={
        <div className="mt-5 space-y-4 text-left">
          {contact && (contact.titularName || contact.titularEmail) ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4" data-contato-matriz>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Titular da matriz</p>
              {contact.titularName && <p className="mt-2 text-sm text-gray-200"><span className="text-gray-500">Nome: </span>{contact.titularName}</p>}
              {contact.titularEmail && (
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 break-all text-sm text-gray-200"><span className="text-gray-500">E-mail: </span>{contact.titularEmail}</p>
                  <CopyEmailButton email={contact.titularEmail} />
                </div>
              )}
            </div>
          ) : null}
          {cancelNote && (
            <p data-cancel-note className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{cancelNote}</p>
          )}
        </div>
      }
    >
      {MATRIZ_MANAGED.text(contact?.matrizName ?? 'matriz')}
    </InfoCard>
  )
}

/** (B) Lawyer/assistant da filial: nenhum dado da matriz, só a orientação. */
export function MembroFilialCard() {
  return (
    <InfoCard icon={Info} accent="gold" title={MEMBRO_FILIAL.title} backLabel={MEMBRO_FILIAL.back}>
      {MEMBRO_FILIAL.text}
    </InfoCard>
  )
}

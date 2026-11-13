'use client'

import { AlertTriangle, CreditCard, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatBRL, formatDateBR, maskCnpj } from '@/lib/br-format'
import { confirmLabel, confirmMatches, type FilialForm } from '@/lib/filial-form'
import type { PreviaState } from '@/lib/filiais-types'
import { inputCls } from './Field'

const BRAND: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', elo: 'Elo', discover: 'Discover', diners: 'Diners Club', jcb: 'JCB', unionpay: 'UnionPay' }
const brandName = (b: string) => BRAND[b] ?? (b ? b.charAt(0).toUpperCase() + b.slice(1) : 'Cartão')

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="min-w-0 break-words text-gray-100">{children}</dd>
    </div>
  )
}

interface Props {
  form: FilialForm
  previa: PreviaState
  onRetryPrevia: () => void
  onEdit: (step: 1 | 2) => void
  typed: string
  onTyped: (v: string) => void
  banner: string | null
}

// Passo 3 — resumo, prévia da cobrança e confirmação digitada (atrito protetivo)
export function StepConfirmacao({ form, previa, onRetryPrevia, onEdit, typed, onTyped, banner }: Props) {
  const addr = [
    `${form.logradouro.trim()}, ${form.numero.trim()}${form.complemento.trim() ? ` — ${form.complemento.trim()}` : ''}`,
    form.bairro.trim(), `${form.cidade.trim()}/${form.estado.trim().toUpperCase()}`, `CEP ${form.cep.trim()}`,
  ].join(' · ')
  const data = previa.status === 'ok' ? previa.data : null
  const matrizRef = data ? { name: data.matriz.name, cnpj: data.matriz.cnpj } : null
  const byCnpj = !!data?.matriz.cnpj
  const match = confirmMatches(typed, matrizRef)
  const today = formatDateBR(new Date().toISOString())

  return (
    <div className="space-y-5" data-step="3">
      {banner && (
        <div role="alert" data-erro-api className="flex gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><p>{banner}</p>
        </div>
      )}

      {/* Resumo dos passos 1 e 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Escritório</h3>
            <button type="button" onClick={() => onEdit(1)} className="text-xs font-medium hover:underline" style={{ color: '#d4af37' }}>Editar</button>
          </div>
          <dl className="space-y-1.5">
            <Row label="Nome fantasia">{form.name.trim()}</Row>
            <Row label="Razão social">{form.razao_social.trim()}</Row>
            <Row label="CNPJ">{form.cnpj.trim()}</Row>
            <Row label="Endereço">{addr}</Row>
            <Row label="Telefone">{form.phone.trim()}</Row>
          </dl>
        </section>
        <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Advogado titular</h3>
            <button type="button" onClick={() => onEdit(2)} className="text-xs font-medium hover:underline" style={{ color: '#d4af37' }}>Editar</button>
          </div>
          <dl className="space-y-1.5">
            <Row label="Nome">{form.nome_completo.trim()}</Row>
            <Row label="E-mail">{form.email.trim().toLowerCase()}</Row>
            <Row label="OAB">{form.oab_number.trim()}/{form.oab_uf.trim().toUpperCase()}</Row>
          </dl>
        </section>
      </div>

      {/* Prévia da cobrança */}
      {previa.status === 'loading' && (
        <div className="flex items-center gap-2 rounded-lg border border-white/10 p-4 text-sm text-gray-400" data-previa="loading">
          <Loader2 className="h-4 w-4 animate-spin" />Calculando a cobrança…
        </div>
      )}
      {previa.status === 'error' && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200" data-previa="erro">
          <p>{previa.message}</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetryPrevia} className="mt-3 border-white/20 bg-transparent text-white hover:bg-white/10">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Tentar de novo
          </Button>
        </div>
      )}
      {data && (
        <div className="rounded-xl border-2 border-[#d4af37]/60 bg-[#d4af37]/10 p-4" data-previa="ok">
          {data.mensalidade_centavos === null ? (
            <p className="text-sm text-amber-200">O valor da assinatura está indisponível no momento. Aguarde alguns instantes e tente de novo.</p>
          ) : (
            <>
              <p className="text-base font-semibold text-white">
                Nova assinatura Premium Filial — <span style={{ color: '#d4af37' }}>{formatBRL(data.mensalidade_centavos)}/mês</span>
              </p>
              {data.desconto_percentual ? (
                <p className="mt-0.5 text-sm text-gray-300">
                  ({data.desconto_percentual}% de desconto aplicado automaticamente
                  {data.preco_cheio_centavos ? <> sobre {formatBRL(data.preco_cheio_centavos)}</> : null})
                </p>
              ) : null}
              <p className="mt-3 text-sm text-gray-200">Primeira cobrança: <strong>hoje ({today})</strong>, assim que você confirmar.</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-200">
                <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
                No cartão da matriz:{' '}
                {data.cartao
                  ? <strong>{brandName(data.cartao.marca)} final {data.cartao.final4}</strong>
                  : <strong className="text-amber-200">nenhum cartão encontrado</strong>}
              </p>
              {!data.cartao && (
                <p className="mt-2 text-xs text-amber-200">A matriz precisa ter um cartão cadastrado em Assinatura para cobrar a nova filial.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Atrito protetivo */}
      <div>
        <Label htmlFor="confirm-matriz" className="text-sm text-gray-300">{confirmLabel(matrizRef)}</Label>
        <Input
          id="confirm-matriz" value={typed} autoComplete="off" disabled={!data}
          onChange={(e) => onTyped(byCnpj ? maskCnpj(e.target.value) : e.target.value)}
          placeholder={byCnpj ? '00.000.000/0000-00' : data ? `Digite: ${data.matriz.name}` : ''}
          inputMode={byCnpj ? 'numeric' : 'text'} className={`${inputCls} mt-1 font-mono`}
          aria-invalid={typed.length > 0 && !match}
        />
        <p className="mt-1 text-xs text-gray-500">
          {byCnpj
            ? 'Confirma que você está criando uma filial, com cobrança, na matriz certa.'
            : 'A matriz não tem CNPJ cadastrado; confirme digitando o nome dela.'}
        </p>
      </div>
    </div>
  )
}

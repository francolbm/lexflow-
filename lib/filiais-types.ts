// Formato da resposta de listarFiliais (GET /api/escritorio/filial) consumido pela tela /filiais.

export type FilialStatus = 'active' | 'pending_activation' | 'pending_deletion'

export interface MatrizInfo {
  id: string
  name: string
  cnpj: string | null
  cidade: string | null
  estado: string | null
  num_demandas_abertas: number
  num_advogados_ativos: number
  /** Mensalidade da matriz em centavos; null = Stripe indisponível. */
  faturamento_mensal_estimado_centavos: number | null
}

export interface FilialItem {
  id: string
  name: string
  cnpj: string | null
  cidade: string | null
  estado: string | null
  status: FilialStatus
  subscription_status: string | null
  num_demandas_abertas: number
  num_advogados_ativos: number
  faturamento_mensal_estimado_centavos: number | null
  faturamento_mensal_estimado: number | null
  next_billing_date: string | null
  cancels_at: string | null
  created_at: string
}

export interface GroupResumo {
  total: number
  ativas: number
  canceladas: number
  faturamento_mensal_estimado_centavos: number | null
  mrr_grupo_centavos: number | null
  advogados_grupo: number
}

export interface GroupData {
  matriz: MatrizInfo
  filiais: FilialItem[]
  resumo: GroupResumo
}

// Resposta de GET /api/escritorio/filial/previa (passo 3 do wizard "Adicionar filial").
export interface Previa {
  matriz: { id: string; name: string; cnpj: string | null }
  mensalidade_centavos: number | null
  preco_cheio_centavos: number | null
  desconto_percentual: number | null
  cartao: { marca: string; final4: string } | null
}
export type PreviaState =
  | { status: 'loading' }
  | { status: 'ok'; data: Previa }
  | { status: 'error'; message: string }

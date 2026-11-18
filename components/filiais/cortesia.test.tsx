import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { FiliaisView } from './FiliaisView'
import type { GroupData } from '@/lib/filiais-types'

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
const DATA: GroupData = {
  matriz: { id: 'm', name: 'Teste Premium', cnpj: null, cidade: null, estado: null, num_demandas_abertas: 1, num_advogados_ativos: 2, faturamento_mensal_estimado_centavos: 0 },
  filiais: [],
  resumo: { total: 0, ativas: 0, canceladas: 0, faturamento_mensal_estimado_centavos: 0, mrr_grupo_centavos: 0, advogados_grupo: 2 },
}

describe('/filiais em modo cortesia', () => {
  const html = renderToStaticMarkup(<FiliaisView data={DATA} cortesia />)
  const t = text(html)
  it('card da matriz com mensalidade "Cortesia" e seção Filiais (0) pontilhada', () => {
    expect(html).toContain('data-matriz'); expect(t).toContain('Cortesia'); expect(t).toContain('Filiais (0)')
    expect(html).toContain('data-cortesia-educativo'); expect(html).toContain('border-dashed')
  })
  it('texto educativo com R$ 598,20 e 40%', () => {
    expect(t).toContain('Modelo Franquia Premium disponível'); expect(t).toContain('40% de desconto permanente')
    expect(t).toMatch(/R\$\s598,20/); expect(t).toContain('Sua assinatura atual é cortesia')
  })
  it('CTA dourado de checkout e botão de adicionar desabilitado com tooltip', () => {
    expect(t).toContain('Ativar assinatura Premium'); expect(html).toContain('gold-btn')
    expect(html).toMatch(/data-add-first-filial-disabled[^>]*disabled|disabled[^>]*data-add-first-filial-disabled/)
    expect(html).toContain('title="Ative sua assinatura para habilitar"'); expect(t).toContain('Adicionar primeira filial')
  })
  it('não oferece criação de filial (sem estado vazio normal)', () => {
    expect(html).not.toContain('data-empty'); expect(html).not.toContain('data-add-filial-top')
  })
})

describe('/filiais em modo pagante', () => {
  const html = renderToStaticMarkup(<FiliaisView data={DATA} />)
  it('sem mudança: estado vazio com botão habilitado, sem CTA de assinatura', () => {
    expect(html).toContain('data-empty'); expect(text(html)).toContain('Adicionar a primeira filial')
    expect(html).not.toContain('data-cortesia-educativo'); expect(text(html)).not.toContain('Ativar assinatura Premium')
    expect(text(html)).not.toContain('Cortesia')
  })
})

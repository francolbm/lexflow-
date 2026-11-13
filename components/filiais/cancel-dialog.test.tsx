// Smoke tests de RENDERIZAÇÃO do corpo do modal "Cancelar filial" (react-dom/server; sem cliques).
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { FilialItem } from '@/lib/filiais-types'
import { cancelTitle } from '@/lib/filial-cancel-form'
import { CancelFilialBody, type CancelBodyProps } from './CancelFilialDialog'

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;| /g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
const noop = () => {}

const filial = (over: Partial<FilialItem> = {}): FilialItem => ({
  id: 'f1', name: 'Filial Rio de Janeiro', cnpj: '11.222.333/0001-81', cidade: 'Rio de Janeiro', estado: 'RJ', status: 'active',
  subscription_status: 'active', num_demandas_abertas: 0, num_advogados_ativos: 1,
  faturamento_mensal_estimado_centavos: 59820, faturamento_mensal_estimado: 598.2,
  next_billing_date: '2026-12-12T15:10:07+00:00', cancels_at: null, created_at: '2026-11-12T10:00:00+00:00', ...over,
})
const render = (over: Partial<CancelBodyProps> = {}, f: FilialItem = filial()) =>
  renderToStaticMarkup(
    <CancelFilialBody
      filial={f} demandas={f.num_demandas_abertas} motivo="" onMotivo={noop} onMotivoBlur={noop} motivoError={null}
      entendi={false} onEntendi={noop} busy={false} topError={null} onBack={noop} onConfirm={noop} {...over}
    />,
  )
/** Botão "Confirmar cancelamento": devolve a tag de abertura para checar o atributo disabled. */
const confirmTag = (html: string) => html.match(/<button[^>]*data-confirmar-cancelamento[^>]*>/)?.[0] ?? ''
/** Atributo disabled de verdade (as classes "disabled:opacity-50" também contêm a palavra, por isso a regex). */
const isDisabled = (tag: string) => /\sdisabled(=""|\s|>)/.test(tag)

describe('CancelFilialBody — sem demandas', () => {
  it('não mostra o alerta amarelo e o motivo é opcional', () => {
    const html = render()
    expect(html).not.toContain('data-alerta-demandas')
    expect(text(html)).toContain('Motivo do cancelamento (opcional)')
  })
  it('botão vermelho "Confirmar cancelamento" nasce desabilitado (checkbox desmarcado)', () => {
    const html = render()
    expect(text(html)).toContain('Confirmar cancelamento')
    expect(isDisabled(confirmTag(html))).toBe(true)
    expect(confirmTag(html)).toContain('bg-red-600')
    expect(text(html)).toContain('Voltar')
  })
  it('com o checkbox marcado, o botão habilita (motivo é opcional)', () => {
    expect(isDisabled(confirmTag(render({ entendi: true })))).toBe(false)
  })
  it('checkbox mostra a data do fim do ciclo, no formato brasileiro', () => {
    expect(text(render())).toContain('Entendo que o acesso continua até 12/12/2026')
  })
  it('sem data conhecida: "o fim do ciclo já pago"', () => {
    expect(text(render({}, filial({ next_billing_date: null })))).toContain('Entendo que o acesso continua até o fim do ciclo já pago')
  })
  it('sem next_billing_date mas com cancels_at: usa o cancels_at', () => {
    expect(text(render({}, filial({ next_billing_date: null, cancels_at: '2026-12-05T14:02:25+00:00' })))).toContain('até 05/12/2026')
  })
  it('contador de caracteres sobre 500', () => {
    expect(text(render({ motivo: 'abcde' }))).toContain('5/500')
  })
})

describe('CancelFilialBody — com demandas', () => {
  it('mostra o alerta amarelo com a contagem e marca o motivo como obrigatório', () => {
    const html = render({}, filial({ num_demandas_abertas: 3 }))
    expect(html).toContain('data-alerta-demandas')
    expect(text(html)).toContain('Essa filial tem 3 demandas em andamento')
    expect(text(html)).toContain('Motivo do cancelamento (obrigatório)')
  })
  it('singular quando é 1 demanda', () => {
    expect(text(render({}, filial({ num_demandas_abertas: 1 })))).toContain('Essa filial tem 1 demanda em andamento')
  })
  it('checkbox marcado mas sem motivo: continua desabilitado; com motivo válido: habilita', () => {
    const f = filial({ num_demandas_abertas: 2 })
    expect(isDisabled(confirmTag(render({ entendi: true }, f)))).toBe(true)
    expect(isDisabled(confirmTag(render({ entendi: true, motivo: 'Teste E2E cancelamento' }, f)))).toBe(false)
  })
  it('a contagem do estado (depois de um 409) prevalece sobre a da lista', () => {
    expect(text(render({ demandas: 5 }, filial({ num_demandas_abertas: 0 })))).toContain('Essa filial tem 5 demandas em andamento')
  })
})

describe('CancelFilialBody — erros e envio', () => {
  it('erro do campo motivo e aviso no topo aparecem', () => {
    const html = render({ motivoError: 'Motivo muito longo.', topError: 'Falha de conexão. Atualize a página antes de tentar de novo.' })
    expect(text(html)).toContain('Motivo muito longo.')
    expect(html).toContain('data-erro-api')
    expect(text(html)).toContain('Falha de conexão')
  })
  it('durante o envio: spinner "Cancelando…" e tudo travado', () => {
    const html = render({ busy: true, entendi: true })
    expect(text(html)).toContain('Cancelando…')
    expect(isDisabled(confirmTag(html))).toBe(true)
    expect(html).toMatch(/<textarea[^>]*disabled/)
  })
})

describe('título', () => {
  it('"Cancelar filial {nome}"', () => {
    expect(cancelTitle(filial())).toBe('Cancelar filial Filial Rio de Janeiro')
  })
})

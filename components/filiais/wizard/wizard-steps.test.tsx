// Smoke tests de RENDERIZAÇÃO dos passos do wizard (react-dom/server; sem navegador, sem cliques).
// Pegam erro de tela e conferem o texto/valores principais; a interação em si é validada no navegador.
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { emptyForm, type FilialForm } from '@/lib/filial-form'
import type { PreviaState } from '@/lib/filiais-types'
import { StepEscritorio } from './StepEscritorio'
import { StepAdvogado } from './StepAdvogado'
import { StepConfirmacao } from './StepConfirmacao'
import { StepSucesso } from './StepSucesso'

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;| /g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
const form = (over: Partial<FilialForm> = {}): FilialForm => ({
  ...emptyForm(),
  name: 'Filial RJ', cnpj: '11.222.333/0001-81', razao_social: 'Filial RJ LTDA', cep: '20010-000', logradouro: 'Rua Teste', numero: '100',
  bairro: 'Centro', cidade: 'Rio de Janeiro', estado: 'RJ', phone: '(21) 99999-0000',
  email: 'adv@exemplo.com', nome_completo: 'Dr. Teste', oab_number: '999999', oab_uf: 'RJ', ...over,
})
const noop = () => {}
const ok = (over: object = {}): PreviaState => ({
  status: 'ok',
  data: { matriz: { id: 'm', name: 'Teste Premium', cnpj: null }, mensalidade_centavos: 59820, preco_cheio_centavos: 99700, desconto_percentual: 40, cartao: { marca: 'visa', final4: '4242' }, ...over },
})

describe('Passo 1 — escritório', () => {
  it('renderiza todos os campos, com erros quando informados', () => {
    const html = renderToStaticMarkup(<StepEscritorio form={emptyForm()} errors={{ cnpj: 'CNPJ inválido.', name: 'Informe o nome fantasia.' }} set={noop} touch={noop} cepLoading={false} />)
    for (const id of ['f-name', 'f-cnpj', 'f-razao', 'f-cep', 'f-logradouro', 'f-numero', 'f-complemento', 'f-bairro', 'f-cidade', 'f-estado', 'f-phone']) expect(html).toContain(`id="${id}"`)
    expect(text(html)).toContain('CNPJ inválido.')
    expect(html).toContain('role="alert"')
    expect(html).toContain('(opcional)')              // complemento
    expect(html.match(/<option /g)?.length).toBe(28)    // "Selecione" + 27 UFs
  })
  it('mostra "Buscando endereço…" durante a consulta do CEP', () => {
    expect(text(renderToStaticMarkup(<StepEscritorio form={emptyForm()} errors={{}} set={noop} touch={noop} cepLoading />))).toContain('Buscando endereço')
  })
})

describe('Passo 2 — advogado titular', () => {
  it('mostra o texto aprovado do aviso e os 4 campos', () => {
    const html = renderToStaticMarkup(<StepAdvogado form={emptyForm()} errors={{}} set={noop} touch={noop} />)
    expect(text(html)).toContain('Essa pessoa será o administrador e advogado titular da filial e receberá um link de ativação.')
    for (const id of ['a-email', 'a-nome', 'a-oab', 'a-oab-uf']) expect(html).toContain(`id="${id}"`)
  })
})

describe('Passo 3 — confirmação', () => {
  const render = (previa: PreviaState, typed = '', banner: string | null = null) =>
    renderToStaticMarkup(<StepConfirmacao form={form()} previa={previa} onRetryPrevia={noop} onEdit={noop} typed={typed} onTyped={noop} banner={banner} />)

  it('resumo dos passos 1 e 2 e prévia de cobrança com valor, desconto, data e cartão', () => {
    const t = text(render(ok()))
    expect(t).toContain('Filial RJ'); expect(t).toContain('Filial RJ LTDA'); expect(t).toContain('Rua Teste, 100')
    expect(t).toContain('Rio de Janeiro/RJ'); expect(t).toContain('adv@exemplo.com'); expect(t).toContain('999999/RJ')
    expect(t).toContain('Nova assinatura Premium Filial — R$ 598,20/mês')
    expect(t).toContain('40% de desconto aplicado automaticamente sobre R$ 997,00')
    expect(t).toContain('Primeira cobrança: hoje (')
    expect(t).toContain('No cartão da matriz: Visa final 4242')
  })
  it('matriz SEM CNPJ: pede o nome da matriz', () => {
    const t = text(render(ok()))
    expect(t).toContain('Confirme digitando o nome da matriz')
    expect(render(ok())).toContain('Digite: Teste Premium')
  })
  it('matriz COM CNPJ: pede o CNPJ, com máscara de exemplo', () => {
    const html = render(ok({ matriz: { id: 'm', name: 'M', cnpj: '11.222.333/0001-81' } }))
    expect(text(html)).toContain('Confirme digitando o CNPJ da matriz')
    expect(html).toContain('placeholder="00.000.000/0000-00"')
  })
  it('carregando, erro (com "Tentar de novo") e campo de confirmação travado sem prévia', () => {
    const loading = render({ status: 'loading' })
    expect(text(loading)).toContain('Calculando a cobrança'); expect(loading).toContain('disabled')
    const err = render({ status: 'error', message: 'Falha de conexão ao calcular a cobrança.' })
    expect(text(err)).toContain('Falha de conexão'); expect(text(err)).toContain('Tentar de novo')
  })
  it('sem cartão ou sem valor: avisa e não inventa preço', () => {
    expect(text(render(ok({ cartao: null })))).toContain('nenhum cartão encontrado')
    const semValor = text(render(ok({ mensalidade_centavos: null, desconto_percentual: null })))
    expect(semValor).toContain('indisponível no momento'); expect(semValor).not.toContain('/mês')
  })
  it('aviso de erro da API aparece no topo', () => {
    expect(render(ok(), '', 'O cartão da matriz foi recusado.')).toContain('data-erro-api')
  })
})

describe('Passo 4 — sucesso', () => {
  it('titular novo: mostra o link copiável e o aviso de que não será exibido de novo', () => {
    const html = renderToStaticMarkup(<StepSucesso result={{ organization_id: 'o', activation_link: 'https://x.supabase.co/auth/v1/verify?token=abc', titular_existente: false }} titularEmail="adv@exemplo.com" />)
    const t = text(html)
    expect(t).toContain('Filial criada!'); expect(t).toContain('adv@exemplo.com')
    expect(html).toContain('value="https://x.supabase.co/auth/v1/verify?token=abc"')
    expect(html).toContain('readOnly=""'.toLowerCase()) // somente leitura
    expect(t).toContain('não será exibido novamente'); expect(t).toContain('Copiar')
    expect(html).not.toContain('data-sem-link')
  })
  it('titular que já tinha conta: sem link, com explicação', () => {
    const html = renderToStaticMarkup(<StepSucesso result={{ organization_id: 'o', activation_link: null, titular_existente: true }} titularEmail="adv@exemplo.com" />)
    expect(html).toContain('data-sem-link'); expect(html).not.toContain('data-link'); expect(text(html)).toContain('já tinha conta')
  })
})


// Smoke tests de renderização dos cards da /assinatura de filial (react-dom/server).
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Lock } from 'lucide-react'
import { InfoCard } from '@/components/layout/InfoCard'
import { MatrizManagedCard, MembroFilialCard } from './FilialSubscriptionCards'

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
const CONTACT = { matrizName: 'Teste Premium', titularName: 'Franco Premium', titularEmail: 'premium@pennajus.com' }

describe('(A) card do titular da filial', () => {
  const html = renderToStaticMarkup(<MatrizManagedCard contact={CONTACT} cancelNote={null} />)
  const t = text(html)
  it('título, texto com o nome da matriz, contato e botões', () => {
    expect(t).toContain('Assinatura gerenciada pela matriz')
    expect(t).toContain('vinculada ao escritório matriz Teste Premium')
    expect(t).toContain('contate o titular da matriz')
    expect(t).toContain('Titular da matriz'); expect(t).toContain('Nome: Franco Premium'); expect(t).toContain('E-mail: premium@pennajus.com')
    expect(html).toContain('data-copiar-email'); expect(t).toContain('Copiar e-mail')
    expect(t).toContain('Voltar à Visão Geral'); expect(html).toContain('href="/dashboard"')
  })
  it('borda dourada (padrão dos avisos de assinatura)', () => {
    expect(html).toContain('data-info-card="gold"'); expect(html).toContain('border-[#d4af37]/40')
  })
  it('sem cancelamento: não mostra a linha extra', () => {
    expect(html).not.toContain('data-cancel-note')
  })
  it('com cancelamento agendado: mostra a linha extra', () => {
    const h = renderToStaticMarkup(<MatrizManagedCard contact={CONTACT} cancelNote="Cancelamento agendado: o acesso continua até 13/12/2026." />)
    expect(h).toContain('data-cancel-note'); expect(text(h)).toContain('acesso continua até 13/12/2026')
  })
  it('sem contato (matriz não achada): mantém o texto e omite a caixa de contato e o botão de copiar', () => {
    const h = renderToStaticMarkup(<MatrizManagedCard contact={null} cancelNote={null} />)
    expect(text(h)).toContain('contate o titular da matriz'); expect(h).not.toContain('data-contato-matriz'); expect(h).not.toContain('data-copiar-email')
  })
  it('sem e-mail: mostra o nome e não oferece copiar', () => {
    const h = renderToStaticMarkup(<MatrizManagedCard contact={{ ...CONTACT, titularEmail: null }} cancelNote={null} />)
    expect(text(h)).toContain('Nome: Franco Premium'); expect(h).not.toContain('data-copiar-email')
  })
})

describe('(B) card do lawyer/assistant da filial — nada da matriz', () => {
  const html = renderToStaticMarkup(<MembroFilialCard />)
  const t = text(html)
  it('só a orientação e o botão de voltar', () => {
    expect(t).toContain('Área administrativa'); expect(t).toContain('administrador do seu escritório'); expect(t).toContain('Voltar à Visão Geral')
  })
  it('NÃO expõe nome/e-mail da matriz nem botão de copiar', () => {
    expect(html).not.toContain('data-contato-matriz'); expect(html).not.toContain('data-copiar-email'); expect(html).not.toContain('@')
    expect(t.toLowerCase()).not.toContain('matriz')
  })
})

describe('InfoCard compartilhado', () => {
  it('o "Acesso restrito" mantém a borda sutil e o texto padrão do link', () => {
    const h = renderToStaticMarkup(<InfoCard icon={Lock} title="Acesso restrito à área de Filiais">texto</InfoCard>)
    expect(h).toContain('data-info-card="default"'); expect(h).toContain('border-white/10'); expect(h).not.toContain('border-[#d4af37]/40')
    expect(text(h)).toContain('Voltar para a Visão Geral')
  })
})

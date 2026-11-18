import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MinhaFilialView } from './MinhaFilialView'
import type { MinhaFilialData } from '@/lib/minha-filial'

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ')

const DATA: MinhaFilialData = {
  name: 'Filial RJ', cancelada: false, accessUntil: null, phone: '21987654321',
  endereco: { cnpj: '11222333000181', cep: '20000-000', logradouro: 'Rua A', numero: '10', complemento: '', bairro: 'Centro', cidade: 'Rio de Janeiro', estado: 'RJ' },
  members: [
    { userId: 'u1', fullName: 'Ana Titular', role: 'Titular', isOwner: true, avatarUrl: null },
    { userId: 'u2', fullName: 'Bruno Advogado', role: 'Advogado', isOwner: false, avatarUrl: null },
    { userId: 'u3', fullName: 'Carla Assistente', role: 'Assistente', isOwner: false, avatarUrl: null },
  ],
  metrics: { emAndamento: 4, finalizadasMes: 2, membrosAtivos: 3 },
}

describe('MinhaFilialView', () => {
  const html = renderToStaticMarkup(<MinhaFilialView data={DATA} />)
  const t = text(html)

  it('cabeçalho ativo, sem "Acesso até"', () => {
    expect(t).toContain('Filial RJ'); expect(html).toContain('data-status-badge="ativa"'); expect(t).toContain('Ativa')
    expect(html).not.toContain('data-acesso-ate')
  })
  it('dados com máscaras', () => {
    expect(t).toContain('11.222.333/0001-81'); expect(t).toContain('(21) 98765-4321')
    expect(t).toContain('Rua A, 10'); expect(t).toContain('Rio de Janeiro/RJ')
  })
  it('membros: iniciais, papéis, titular dourado, sem e-mail', () => {
    expect(t).toContain('AT'); expect(t).toContain('Advogado'); expect(t).toContain('Assistente')
    expect(html).toContain('data-badge-titular'); expect(html.match(/data-badge-titular/g)).toHaveLength(1)
    expect(html).not.toContain('@')
  })
  it('3 métricas', () => {
    expect(html).toContain('data-metric="andamento"'); expect(html).toContain('data-metric="finalizadas"'); expect(html).toContain('data-metric="membros"')
    expect(t).toContain('Demandas em andamento'); expect(t).toContain('Finalizadas este mês'); expect(t).toContain('Membros ativos')
  })
  it('só leitura: sem botões nem links de ação; sem faturamento/matriz', () => {
    expect(html).not.toContain('<button'); expect(html).not.toContain('<a ')
    expect(t).not.toMatch(/mensalidade|R\$|matriz/i)
  })
  it('cancelada: badge vermelho e "Acesso até" em vermelho', () => {
    const h = renderToStaticMarkup(<MinhaFilialView data={{ ...DATA, cancelada: true, accessUntil: '2026-12-13T12:00:00Z' }} />)
    expect(h).toContain('data-status-badge="cancelada"'); expect(text(h)).toContain('Cancelada')
    expect(h).toMatch(/data-acesso-ate[^>]*text-red-400/); expect(text(h)).toContain('Acesso até: 13/12/2026')
  })
})

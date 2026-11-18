import { describe, it, expect } from 'vitest'
import { filialOrgIdOf, papelLabel, monthStartBrasiliaIso, enderecoLinhas } from './minha-filial'

describe('filialOrgIdOf (visibilidade do menu/rota)', () => {
  it('filial -> id do escritório', () => {
    expect(filialOrgIdOf([{ organization_id: 'f1', organizations: { parent_organization_id: 'm1' } }])).toBe('f1')
  })
  it('aceita relação como array', () => {
    expect(filialOrgIdOf([{ organization_id: 'f1', organizations: [{ parent_organization_id: 'm1' }] }])).toBe('f1')
  })
  it('matriz / escritório único -> null', () => {
    expect(filialOrgIdOf([{ organization_id: 'm1', organizations: { parent_organization_id: null } }])).toBeNull()
  })
  it('sem vínculo / dados vazios -> null', () => {
    expect(filialOrgIdOf([])).toBeNull()
    expect(filialOrgIdOf(null)).toBeNull()
    expect(filialOrgIdOf([{ organization_id: 'x', organizations: null }])).toBeNull()
  })
})

describe('papelLabel', () => {
  it('titular tem prioridade sobre o papel', () => {
    expect(papelLabel('admin', true)).toBe('Titular')
    expect(papelLabel('lawyer', true)).toBe('Titular')
  })
  it('demais papéis', () => {
    expect(papelLabel('admin', false)).toBe('Admin')
    expect(papelLabel('lawyer', false)).toBe('Advogado')
    expect(papelLabel('assistant', false)).toBe('Assistente')
  })
})

describe('monthStartBrasiliaIso', () => {
  it('meio do mês -> dia 1 às 03:00Z', () => {
    expect(monthStartBrasiliaIso(new Date('2026-11-18T15:00:00Z'))).toBe('2026-11-01T03:00:00.000Z')
  })
  it('01/12 00:30Z ainda é 30/11 em Brasília -> mês de novembro', () => {
    expect(monthStartBrasiliaIso(new Date('2026-12-01T00:30:00Z'))).toBe('2026-11-01T03:00:00.000Z')
  })
  it('01/12 03:00Z já é dezembro em Brasília', () => {
    expect(monthStartBrasiliaIso(new Date('2026-12-01T03:00:00Z'))).toBe('2026-12-01T03:00:00.000Z')
  })
})

describe('enderecoLinhas', () => {
  it('monta partes e ignora vazias', () => {
    const e = { cnpj: '', cep: '20000-000', logradouro: 'Rua A', numero: '10', complemento: 'sala 2', bairro: 'Centro', cidade: 'Rio de Janeiro', estado: 'RJ' }
    expect(enderecoLinhas(e)).toEqual({ rua: 'Rua A, 10 – sala 2', bairro: 'Centro', cidadeUf: 'Rio de Janeiro/RJ', cep: '20000-000' })
    expect(enderecoLinhas({ ...e, cidade: '', estado: '' }).cidadeUf).toBe('')
  })
})

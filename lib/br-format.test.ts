import { describe, it, expect } from 'vitest'
import { isValidCnpj, maskCnpj, maskCep, formatBRL, onlyDigits, UFS } from './br-format'

describe('isValidCnpj', () => {
  it('valida pelos dígitos verificadores, com e sem máscara', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true)
    expect(isValidCnpj('98765432000198')).toBe(true)
    expect(isValidCnpj('12.345.678/0001-90')).toBe(false)
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false)
  })
  it('recusa tamanho errado e sequências repetidas', () => {
    expect(isValidCnpj('')).toBe(false)
    expect(isValidCnpj('123')).toBe(false)
    expect(isValidCnpj('00000000000000')).toBe(false)
    expect(isValidCnpj('11111111111111')).toBe(false)
  })
})

describe('máscaras', () => {
  it('maskCnpj é progressiva e corta no tamanho', () => {
    expect(maskCnpj('')).toBe('')
    expect(maskCnpj('11')).toBe('11')
    expect(maskCnpj('11222')).toBe('11.222')
    expect(maskCnpj('11222333')).toBe('11.222.333')
    expect(maskCnpj('112223330001')).toBe('11.222.333/0001')
    expect(maskCnpj('11222333000181')).toBe('11.222.333/0001-81')
    expect(maskCnpj('11.222.333/0001-81999')).toBe('11.222.333/0001-81')
    expect(maskCnpj('ab11x')).toBe('11')
  })
  it('maskCep é progressiva e corta no tamanho', () => {
    expect(maskCep('01310')).toBe('01310')
    expect(maskCep('01310000')).toBe('01310-000')
    expect(maskCep('01310-000999')).toBe('01310-000')
  })
  it('é idempotente: mascarar o já mascarado não muda nada', () => {
    expect(maskCnpj(maskCnpj('11222333000181'))).toBe('11.222.333/0001-81')
    expect(maskCep(maskCep('01310000'))).toBe('01310-000')
  })
})

describe('formatBRL / onlyDigits / UFS', () => {
  it('formata centavos em reais (pt-BR)', () => {
    expect(formatBRL(59820).replace(/\s/g, ' ')).toBe('R$ 598,20')
    expect(formatBRL(99700).replace(/\s/g, ' ')).toBe('R$ 997,00')
    expect(formatBRL(0).replace(/\s/g, ' ')).toBe('R$ 0,00')
  })
  it('onlyDigits e as 27 UFs', () => {
    expect(onlyDigits('(65) 99999-1234')).toBe('65999991234')
    expect(UFS).toHaveLength(27)
  })
})

import { formatDateBR } from './br-format'
describe('formatDateBR', () => {
  it('formata no fuso de Brasília (23h de 11/12 em UTC-3 ainda é dia 11)', () => {
    expect(formatDateBR('2026-12-12T15:10:07+00:00')).toBe('12/12/2026')
    expect(formatDateBR('2026-12-12T01:00:00+00:00')).toBe('11/12/2026')
  })
  it('vazio ou inválido vira traço', () => {
    expect(formatDateBR(null)).toBe('—')
    expect(formatDateBR(undefined)).toBe('—')
    expect(formatDateBR('lixo')).toBe('—')
  })
})

import { describe, it, expect } from 'vitest'
import {
  emptyForm, isDirty, validateStep1, validateStep2, buildPayload, confirmMatches, confirmLabel, mapApiError, type FilialForm,
} from './filial-form'
import { filialSchema } from './filial'
import { parseViaCep } from './viacep'

const valid = (over: Partial<FilialForm> = {}): FilialForm => ({
  name: 'Filial Cuiabá', cnpj: '11.222.333/0001-81', razao_social: 'Filial Cuiabá Advocacia LTDA',
  cep: '78000-000', logradouro: 'Rua A', numero: '10', complemento: '', bairro: 'Centro', cidade: 'Cuiabá', estado: 'MT',
  phone: '(65) 99999-1234',
  email: 'Ana@Exemplo.com', nome_completo: 'Ana Souza', oab_number: '12.345', oab_uf: 'MT',
  ...over,
})

describe('validateStep1', () => {
  it('formulário completo e válido: sem erros', () => {
    expect(validateStep1(valid())).toEqual({})
  })
  it('formulário vazio: todos os campos obrigatórios acusam erro (complemento é opcional)', () => {
    const e = validateStep1(emptyForm())
    expect(Object.keys(e).sort()).toEqual(['bairro', 'cep', 'cidade', 'cnpj', 'estado', 'logradouro', 'name', 'numero', 'phone', 'razao_social'].sort())
    expect(e.complemento).toBeUndefined()
  })
  it('CNPJ com dígito verificador errado ou incompleto', () => {
    expect(validateStep1(valid({ cnpj: '12.345.678/0001-90' })).cnpj).toBe('CNPJ inválido.')
    expect(validateStep1(valid({ cnpj: '11.222' })).cnpj).toBe('CNPJ inválido.')
  })
  it('CEP precisa de 8 dígitos, com ou sem máscara', () => {
    expect(validateStep1(valid({ cep: '78000' })).cep).toBeDefined()
    expect(validateStep1(valid({ cep: '78000000' })).cep).toBeUndefined()
  })
  it('telefone aceita 10 ou 11 dígitos', () => {
    expect(validateStep1(valid({ phone: '(65) 3333-1234' })).phone).toBeUndefined()
    expect(validateStep1(valid({ phone: '(65) 9999' })).phone).toBeDefined()
    expect(validateStep1(valid({ phone: '(65) 99999-12345' })).phone).toBeDefined() // 12 dígitos: o campo (máscara) já impede, mas a validação também recusa
  })
  it('estado precisa ser uma UF válida', () => {
    expect(validateStep1(valid({ estado: 'XX' })).estado).toBeDefined()
    expect(validateStep1(valid({ estado: 'mt' })).estado).toBeUndefined()
  })
  it('espaços em branco não contam como preenchido', () => {
    expect(validateStep1(valid({ name: '   ' })).name).toBeDefined()
  })
})

describe('validateStep2', () => {
  it('válido: sem erros', () => expect(validateStep2(valid())).toEqual({}))
  it('vazio: 4 erros', () => expect(Object.keys(validateStep2(emptyForm())).sort()).toEqual(['email', 'nome_completo', 'oab_number', 'oab_uf']))
  it.each(['sem-arroba', 'a@b', 'a b@c.com', '@c.com'])('e-mail inválido (%s)', (email) => {
    expect(validateStep2(valid({ email })).email).toBe('E-mail inválido.')
  })
  it('OAB: só dígitos contam; UF obrigatória e válida', () => {
    expect(validateStep2(valid({ oab_number: 'abc' })).oab_number).toBeDefined()
    expect(validateStep2(valid({ oab_number: '12345678901' })).oab_number).toBeDefined()
    expect(validateStep2(valid({ oab_uf: '' })).oab_uf).toBeDefined()
  })
})

describe('buildPayload — o que o wizard envia é aceito pela Rota 1', () => {
  it('passa no schema do servidor (filialSchema)', () => {
    expect(filialSchema.safeParse(buildPayload(valid())).success).toBe(true)
  })
  it('normaliza: e-mail minúsculo, OAB só dígitos, UF maiúscula, complemento omitido se vazio', () => {
    const p = buildPayload(valid({ complemento: '  ', estado: 'mt', oab_uf: 'mt' }))
    expect(p.advogado_titular).toEqual({ email: 'ana@exemplo.com', nome_completo: 'Ana Souza', oab_number: '12345', oab_uf: 'MT' })
    expect(p.endereco).not.toHaveProperty('complemento')
    expect(p.endereco.estado).toBe('MT')
  })
  it('com complemento, ele vai no endereço', () => {
    expect(buildPayload(valid({ complemento: ' Sala 2 ' })).endereco.complemento).toBe('Sala 2')
  })
  it('qualquer formulário que passa nos passos 1 e 2 também passa no schema do servidor', () => {
    const f = valid({ cnpj: '98765432000198', cep: '01310000', phone: '11999990000', oab_number: '888888', oab_uf: 'sp', estado: 'sp' })
    expect(validateStep1(f)).toEqual({})
    expect(validateStep2(f)).toEqual({})
    expect(filialSchema.safeParse(buildPayload(f)).success).toBe(true)
  })
})

describe('isDirty', () => {
  it('vazio não é sujo; qualquer campo preenchido é', () => {
    expect(isDirty(emptyForm())).toBe(false)
    expect(isDirty({ ...emptyForm(), name: 'x' })).toBe(true)
    expect(isDirty({ ...emptyForm(), name: '   ' })).toBe(false)
  })
})

describe('confirmMatches / confirmLabel (atrito protetivo)', () => {
  const comCnpj = { name: 'Matriz', cnpj: '11.222.333/0001-81' }
  const semCnpj = { name: 'Teste  Premium', cnpj: null }
  it('com CNPJ: compara só os dígitos (com ou sem máscara)', () => {
    expect(confirmMatches('11.222.333/0001-81', comCnpj)).toBe(true)
    expect(confirmMatches('11222333000181', comCnpj)).toBe(true)
    expect(confirmMatches('11222333000182', comCnpj)).toBe(false)
    expect(confirmMatches('11.222.333', comCnpj)).toBe(false)
  })
  it('sem CNPJ: compara o nome (sem diferenciar maiúsculas nem espaços repetidos)', () => {
    expect(confirmMatches('teste premium', semCnpj)).toBe(true)
    expect(confirmMatches('  TESTE   PREMIUM ', semCnpj)).toBe(true)
    expect(confirmMatches('Teste Pro', semCnpj)).toBe(false)
  })
  it('vazio ou sem dados da matriz nunca confirma', () => {
    expect(confirmMatches('', comCnpj)).toBe(false)
    expect(confirmMatches('   ', semCnpj)).toBe(false)
    expect(confirmMatches('x', null)).toBe(false)
  })
  it('rótulo muda conforme exista CNPJ', () => {
    expect(confirmLabel(comCnpj)).toContain('CNPJ')
    expect(confirmLabel(semCnpj)).toContain('nome')
  })
})

describe('mapApiError', () => {
  it('titular_ja_vinculado volta para o passo 2, no campo e-mail, com a mensagem da API', () => {
    expect(mapApiError(409, { error: 'titular_ja_vinculado', message: 'Já é titular' })).toEqual({ step: 2, field: 'email', message: 'Já é titular' })
  })
  it('CNPJ duplicado volta para o passo 1, no campo CNPJ', () => {
    expect(mapApiError(409, { error: 'Já existe um escritório cadastrado com este CNPJ.' })).toMatchObject({ step: 1, field: 'cnpj' })
  })
  it('matriz_sem_cartao e cartão recusado ficam no passo 3', () => {
    expect(mapApiError(409, { error: 'matriz_sem_cartao' }).step).toBe(3)
    expect(mapApiError(402, { error: 'O cartão da matriz foi recusado ao cobrar a nova filial.' })).toMatchObject({ step: 3 })
  })
  it.each([
    ['UF da OAB inválida.', 2, 'oab_uf'], ['Número da OAB inválido.', 2, 'oab_number'], ['E-mail do advogado inválido.', 2, 'email'],
    ['CNPJ inválido.', 1, 'cnpj'], ['CEP inválido.', 1, 'cep'], ['Telefone inválido.', 1, 'phone'], ['Estado (UF) inválido.', 1, 'estado'],
  ])('400 "%s" aponta o passo %i, campo %s', (error, step, field) => {
    expect(mapApiError(400, { error })).toMatchObject({ step, field })
  })
  it('401, 403 e 500 ficam no passo 3 com mensagem utilizável', () => {
    expect(mapApiError(401, null)).toMatchObject({ step: 3 })
    expect(mapApiError(403, { error: 'Filiais estão disponíveis apenas no plano Premium.' })).toMatchObject({ step: 3, message: 'Filiais estão disponíveis apenas no plano Premium.' })
    expect(mapApiError(500, { error: 'Não foi possível criar a filial. Nenhuma alteração foi mantida.' }).message).toContain('Nenhuma alteração')
    expect(mapApiError(500, undefined).message.length).toBeGreaterThan(10)
  })
})

describe('parseViaCep', () => {
  it('converte a resposta do ViaCEP', () => {
    expect(parseViaCep({ cep: '01310-100', logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'sp' }))
      .toEqual({ logradouro: 'Avenida Paulista', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP' })
  })
  it('CEP inexistente ({"erro": true}) e lixo viram null', () => {
    expect(parseViaCep({ erro: true })).toBeNull()
    expect(parseViaCep(null)).toBeNull()
    expect(parseViaCep('x')).toBeNull()
    expect(parseViaCep({})).toBeNull()
  })
  it('CEP geral de cidade pequena (sem logradouro/bairro) ainda preenche cidade e UF', () => {
    expect(parseViaCep({ logradouro: '', bairro: '', localidade: 'Cuiabá', uf: 'MT' })).toEqual({ logradouro: '', bairro: '', cidade: 'Cuiabá', estado: 'MT' })
  })
})

import { describe, it, expect } from 'vitest'
import { decideAssinaturaView, buildMatrizContact, cancelNote, MATRIZ_MANAGED, MEMBRO_FILIAL } from './matriz-contact'

const U = 'user-1'

describe('decideAssinaturaView — quem vê o quê na /assinatura', () => {
  it('A) dono de uma FILIAL: card da matriz', () => {
    expect(decideAssinaturaView({ owner_user_id: U, parent_organization_id: 'm1' }, U)).toBe('filial_titular')
  })
  it('B) membro (lawyer/assistant) de uma FILIAL que não é o dono: card simples', () => {
    expect(decideAssinaturaView({ owner_user_id: 'outro', parent_organization_id: 'm1' }, U)).toBe('filial_membro')
  })
  it('C) dono da matriz (sem parent): tela normal', () => {
    expect(decideAssinaturaView({ owner_user_id: U, parent_organization_id: null }, U)).toBe('normal')
  })
  it('C) membro de escritório SEM parent (matriz ou escritório único): tela normal', () => {
    expect(decideAssinaturaView({ owner_user_id: 'outro', parent_organization_id: null }, U)).toBe('normal')
  })
  it('sem escritório / sem dados: tela normal (comportamento atual)', () => {
    expect(decideAssinaturaView(null, U)).toBe('normal')
    expect(decideAssinaturaView(undefined, U)).toBe('normal')
  })
  it('dono nulo numa filial: nunca é titular (cai no card simples, sem dados da matriz)', () => {
    expect(decideAssinaturaView({ owner_user_id: null, parent_organization_id: 'm1' }, U)).toBe('filial_membro')
  })
})

describe('buildMatrizContact', () => {
  it('monta nome da matriz, nome e e-mail do titular', () => {
    expect(buildMatrizContact({ matriz: { name: 'Teste Premium', owner_user_id: 'o' }, titular: { full_name: 'Franco Premium', email: 'premium@pennajus.com' } }))
      .toEqual({ matrizName: 'Teste Premium', titularName: 'Franco Premium', titularEmail: 'premium@pennajus.com' })
  })
  it('matriz não encontrada: null', () => {
    expect(buildMatrizContact({ matriz: null, titular: null })).toBeNull()
  })
  it('perfil ausente ou campos vazios viram null (a tela omite em vez de mostrar vazio)', () => {
    expect(buildMatrizContact({ matriz: { name: 'M', owner_user_id: 'o' }, titular: null })).toEqual({ matrizName: 'M', titularName: null, titularEmail: null })
    expect(buildMatrizContact({ matriz: { name: '  ', owner_user_id: 'o' }, titular: { full_name: ' ', email: '' } }))
      .toEqual({ matrizName: 'matriz', titularName: null, titularEmail: null })
  })
  it('apara espaços', () => {
    expect(buildMatrizContact({ matriz: { name: ' M ', owner_user_id: 'o' }, titular: { full_name: ' Ana ', email: ' a@b.com ' } }))
      .toEqual({ matrizName: 'M', titularName: 'Ana', titularEmail: 'a@b.com' })
  })
})

describe('cancelNote', () => {
  it('só aparece com a filial em pending_deletion', () => {
    expect(cancelNote('active', '2026-12-13T11:44:49+00:00')).toBeNull()
    expect(cancelNote(null, '2026-12-13T11:44:49+00:00')).toBeNull()
    expect(cancelNote(undefined, null)).toBeNull()
  })
  it('com a data do fim do ciclo (fuso de Brasília)', () => {
    expect(cancelNote('pending_deletion', '2026-12-13T11:44:49+00:00')).toBe('Cancelamento agendado: o acesso continua até 13/12/2026.')
  })
  it('sem data conhecida, usa o texto genérico', () => {
    expect(cancelNote('pending_deletion', null)).toBe('Cancelamento agendado: o acesso continua até o fim do ciclo já pago.')
  })
})

describe('textos', () => {
  it('o texto do titular cita a matriz e orienta a contatar o titular dela', () => {
    expect(MATRIZ_MANAGED.title).toBe('Assinatura gerenciada pela matriz')
    expect(MATRIZ_MANAGED.text('Teste Premium')).toBe(
      'Sua assinatura Pennajus Premium Filial está vinculada ao escritório matriz Teste Premium. Para alterações de plano, forma de pagamento ou cancelamento, contate o titular da matriz.')
  })
  it('o texto do membro NÃO tem como citar a matriz (a função nem recebe o nome)', () => {
    expect(MEMBRO_FILIAL.title).toBe('Área administrativa')
    expect(MEMBRO_FILIAL.text).toContain('administrador do seu escritório')
    expect(MEMBRO_FILIAL.text.toLowerCase()).not.toContain('matriz')
  })
})

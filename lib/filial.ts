// Criação de filial Premium (Fase 1.5). Lógica pura: todo acesso a Supabase/Stripe
// entra por `FilialDeps`, o que permite testar ordem de validação e rollback sem rede.
import { z } from 'zod'
import { PLANS, normalizeSubscriptionStatus } from './types'
import { UFS, onlyDigits, isValidCnpj } from './br-format'

export { onlyDigits, isValidCnpj }

export const FILIAL_COUPON_ID = 'FILIAL_PENNAJUS_40'

const req = (label: string) => z.string({ required_error: `${label} é obrigatório.` }).trim().min(1, `${label} é obrigatório.`)

export const filialSchema = z.object({
  name: req('Nome da filial').max(120),
  cnpj: req('CNPJ').refine(isValidCnpj, 'CNPJ inválido.'),
  razao_social: req('Razão social').max(200),
  phone: req('Telefone').refine((v) => [10, 11].includes(onlyDigits(v).length), 'Telefone inválido.'),
  endereco: z.object({
    logradouro: req('Logradouro'),
    numero: req('Número'),
    complemento: z.string().trim().optional(),
    bairro: req('Bairro'),
    cidade: req('Cidade'),
    estado: z.string().trim().toUpperCase().refine((v) => (UFS as readonly string[]).includes(v), 'Estado (UF) inválido.'),
    cep: req('CEP').refine((v) => onlyDigits(v).length === 8, 'CEP inválido.'),
  }, { required_error: 'Endereço é obrigatório.' }),
  advogado_titular: z.object({
    email: req('E-mail do advogado').toLowerCase().pipe(z.string().email('E-mail do advogado inválido.')),
    nome_completo: req('Nome do advogado').max(150),
    oab_number: req('Número da OAB').refine((v) => onlyDigits(v).length >= 1, 'Número da OAB inválido.'),
    oab_uf: req('UF da OAB').toUpperCase().refine((v) => (UFS as readonly string[]).includes(v), 'UF da OAB inválida.'),
  }, { required_error: 'Advogado titular é obrigatório.' }),
})
export type FilialInput = z.infer<typeof filialSchema>

export interface OwnedOrg { id: string; name: string; parent_organization_id: string | null }
export interface SubRow {
  plan_code: string
  status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}
export interface StripeSubResult {
  id: string
  status: string
  priceId: string | null
  periodStart: Date | null
  periodEnd: Date | null
}

export interface FilialDeps {
  listOwnedOrgs(userId: string): Promise<OwnedOrg[]>
  getSubscription(orgId: string): Promise<SubRow | null>
  cnpjExists(cnpjDigits: string): Promise<boolean>
  findUserIdByEmail(email: string): Promise<string | null>
  createAuthUser(email: string, fullName: string): Promise<string>
  deleteAuthUser(userId: string): Promise<void>
  setNewUserProfile(userId: string, p: { fullName: string; email: string; oabNumber: string; oabUf: string }): Promise<void>
  fillOabIfEmpty(userId: string, oabNumber: string, oabUf: string): Promise<void>
  generateActivationLink(email: string): Promise<string>
  insertOrganization(o: { name: string; phone: string; ownerUserId: string; parentId: string }): Promise<string>
  /** Apaga a organização; as FKs em cascata levam endereço, assinatura e membros. */
  purgeOrganization(orgId: string): Promise<void>
  insertEndereco(e: Record<string, string | null>): Promise<void>
  insertSubscriptionRow(s: { orgId: string; customerId: string; billingEmail: string; demandsLimit: number }): Promise<void>
  createStripeSubscription(a: {
    customerId: string; matrizSubscriptionId: string; metadata: Record<string, string>; idempotencyKey: string
  }): Promise<StripeSubResult>
  cancelStripeSubscription(subId: string): Promise<void>
  updateSubscriptionFromStripe(orgId: string, s: StripeSubResult): Promise<void>
  activateOrganization(orgId: string): Promise<void>
  audit(a: { orgId: string; userId: string; newData: Record<string, unknown> }): Promise<void>
}

export type FilialResult = { status: number; body: Record<string, unknown> }
const fail = (status: number, error: string, extra: Record<string, unknown> = {}): FilialResult =>
  ({ status, body: { error, ...extra } })

/** Erro com resposta HTTP já definida (ex.: CNPJ duplicado detectado pelo índice único). */
export class FilialHttpError extends Error {
  /** `code` (opcional): código estável para o front; a resposta vira { error: code, message }. */
  constructor(public status: number, message: string, public code?: string) { super(message) }
}

const TITULAR_JA_VINCULADO =
  'Este advogado já é titular de outro escritório no PennaJus. Use outro e-mail OU aguarde a Fase 2, ' +
  'quando será possível dar titularidade de múltiplos escritórios à mesma pessoa.'

export async function criarFilial(deps: FilialDeps, userId: string, rawBody: unknown): Promise<FilialResult> {
  // 1) Titular da matriz. Se o usuário é dono de mais de um escritório, prefere o que não é filial.
  const owned = await deps.listOwnedOrgs(userId)
  if (owned.length === 0) {
    return fail(403, 'Apenas o titular de um escritório pode criar filiais.')
  }
  const matriz = owned.find((o) => o.parent_organization_id === null) ?? owned[0]

  // 2) Plano Premium
  const sub = await deps.getSubscription(matriz.id)
  if (sub?.plan_code !== 'premium') {
    return fail(403, 'Filiais estão disponíveis apenas no plano Premium.')
  }

  // 3) Matriz não pode ser filial (impede hierarquia de 3+ níveis)
  if (matriz.parent_organization_id !== null) {
    return fail(403, 'Uma filial não pode criar outras filiais.')
  }

  // 4) Assinatura Stripe ativa (cortesia/trial/inadimplente não servem: a filial cobra no mesmo customer)
  if (normalizeSubscriptionStatus(sub.status) !== 'active' || !sub.stripe_customer_id || !sub.stripe_subscription_id) {
    return fail(403, 'A matriz precisa ter uma assinatura Premium ativa no Stripe para criar filiais.')
  }
  const customerId = sub.stripe_customer_id

  // 5–7) Corpo da requisição (CNPJ, e-mail e OAB) e CNPJ duplicado.
  //      A validação de formato roda antes da consulta ao banco para falhar sem custo.
  const parsed = filialSchema.safeParse(rawBody)
  if (!parsed.success) {
    return fail(400, parsed.error.issues[0]?.message ?? 'Dados inválidos.')
  }
  const input = parsed.data
  const cnpj = onlyDigits(input.cnpj)
  if (await deps.cnpjExists(cnpj)) {
    return fail(409, 'Já existe um escritório cadastrado com este CNPJ.')
  }

  // Operações com compensação: cada passo empilha o seu desfazer.
  const undo: Array<{ name: string; run: () => Promise<void> }> = []
  const titular = input.advogado_titular
  let orgId: string | null = null
  try {
    // Usuário primeiro: organizations.owner_user_id é NOT NULL.
    let titularId = await deps.findUserIdByEmail(titular.email)
    const titularExistente = titularId !== null
    let activationLink: string | null = null
    if (titularId === null) {
      const newId = await deps.createAuthUser(titular.email, titular.nome_completo)
      titularId = newId
      undo.push({ name: 'deleteAuthUser', run: () => deps.deleteAuthUser(newId) })
      await deps.setNewUserProfile(newId, {
        fullName: titular.nome_completo, email: titular.email,
        oabNumber: titular.oab_number, oabUf: titular.oab_uf,
      })
      // Só e-mail recém-criado recebe link: devolver link de conta existente seria tomada de conta.
      activationLink = await deps.generateActivationLink(titular.email)
    } else {
      // getOwnerBilling() assume 1 escritório por dono; quem já é titular de outro quebraria /assinatura.
      if ((await deps.listOwnedOrgs(titularId)).length > 0) {
        throw new FilialHttpError(409, TITULAR_JA_VINCULADO, 'titular_ja_vinculado')
      }
      await deps.fillOabIfEmpty(titularId, titular.oab_number, titular.oab_uf)
    }

    // O trigger trg_bootstrap_owner_membership já cria o dono como admin da filial.
    const newOrgId = await deps.insertOrganization({
      name: input.name, phone: input.phone, ownerUserId: titularId, parentId: matriz.id,
    })
    orgId = newOrgId
    undo.push({ name: 'purgeOrganization', run: () => deps.purgeOrganization(newOrgId) })

    const e = input.endereco
    const full = [`${e.logradouro}, ${e.numero}`, e.complemento, e.bairro, `${e.cidade}/${e.estado}`, `CEP ${onlyDigits(e.cep)}`]
      .filter(Boolean).join(' - ')
    await deps.insertEndereco({
      organization_id: newOrgId, cnpj, razao_social: input.razao_social,
      cep: onlyDigits(e.cep), logradouro: e.logradouro, numero: e.numero,
      complemento: e.complemento || null, bairro: e.bairro, cidade: e.cidade, estado: e.estado,
      full_address: full,
    })

    await deps.insertSubscriptionRow({
      orgId: newOrgId, customerId, billingEmail: titular.email, demandsLimit: PLANS.premium.demandsLimit,
    })

    // Stripe por último: é o único passo que gera cobrança.
    const stripeSub = await deps.createStripeSubscription({
      customerId,
      matrizSubscriptionId: sub.stripe_subscription_id as string,
      metadata: { organization_id: newOrgId, parent_organization_id: matriz.id },
      idempotencyKey: `filial-${newOrgId}`,
    })
    undo.push({ name: 'cancelStripeSubscription', run: () => deps.cancelStripeSubscription(stripeSub.id) })

    await deps.updateSubscriptionFromStripe(newOrgId, stripeSub)
    await deps.activateOrganization(newOrgId)

    try {
      await deps.audit({
        orgId: newOrgId, userId,
        newData: { parent_organization_id: matriz.id, stripe_subscription_id: stripeSub.id, titular_existente: titularExistente },
      })
    } catch (err) {
      console.error('filial audit falhou:', err) // auditoria não desfaz uma filial já cobrada e ativa
    }

    return {
      status: 201,
      body: {
        organization_id: newOrgId,
        activation_link: activationLink,
        titular_existente: titularExistente,
        message: titularExistente
          ? 'Filial criada. O advogado já tinha conta e foi vinculado; ele entra com a própria senha.'
          : 'Filial criada. Envie o link de ativação ao advogado titular.',
      },
    }
  } catch (err) {
    const failed: string[] = []
    for (const step of undo.reverse()) {
      try { await step.run() } catch (e) {
        failed.push(step.name)
        console.error(`filial rollback ${step.name} falhou (org ${orgId}):`, e)
      }
    }
    if (err instanceof FilialHttpError) {
      return err.code
        ? { status: err.status, body: { error: err.code, message: err.message } }
        : fail(err.status, err.message)
    }
    console.error('filial criar erro:', err)
    return fail(
      500,
      failed.length === 0
        ? 'Não foi possível criar a filial. Nenhuma alteração foi mantida.'
        : 'Não foi possível criar a filial e a limpeza ficou incompleta. Fale com o suporte PennaJus.',
      { rollback: failed.length === 0 ? 'completo' : 'parcial' },
    )
  }
}

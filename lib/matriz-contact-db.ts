// Busca do contato da matriz (servidor, chave de serviço). A lógica pura fica em lib/matriz-contact.ts.
import { createServiceClient } from '@/lib/supabase/server'
import { buildMatrizContact, type MatrizContact } from './matriz-contact'

/**
 * Contato do titular da matriz. Roda com a chave de serviço (a RLS não deixa a filial ler a matriz), por isso
 * recebe SÓ o id do escritório da própria sessão (membership do usuário logado) e só devolve nome/e-mail.
 * NUNCA chamar com um id vindo da requisição.
 */
export async function getMatrizContact(filialOrgId: string): Promise<MatrizContact | null> {
  const db = createServiceClient()
  const { data: filial } = await db.from('organizations').select('parent_organization_id').eq('id', filialOrgId).maybeSingle()
  if (!filial?.parent_organization_id) return null
  const { data: matriz } = await db.from('organizations').select('name, owner_user_id').eq('id', filial.parent_organization_id).maybeSingle()
  if (!matriz) return null
  const { data: titular } = matriz.owner_user_id
    ? await db.from('profiles').select('full_name, email').eq('id', matriz.owner_user_id).maybeSingle()
    : { data: null }
  return buildMatrizContact({ matriz, titular })
}

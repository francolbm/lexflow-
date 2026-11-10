import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireOffice } from '@/lib/office'

// Remove um membro do escritório. Só o titular; nunca o próprio titular.
// O trigger trg_ensure_org_has_lawyer impede remover o último Advogado ativo.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function DELETE(_req: Request, { params }: { params: { user_id: string } }) {
  const access = await requireOffice('removeMembers')
  if (access instanceof NextResponse) return access

  const target = params.user_id
  if (!UUID.test(target)) return NextResponse.json({ error: 'Membro inválido.' }, { status: 400 })
  if (target === access.ownerUserId) {
    return NextResponse.json({ error: 'O titular não pode ser removido do escritório.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: member } = await service.from('organization_members')
    .select('id, role, profiles(full_name, email)')
    .eq('organization_id', access.orgId).eq('user_id', target).maybeSingle()
  if (!member) return NextResponse.json({ error: 'Este usuário não é membro do seu escritório.' }, { status: 404 })

  const { error } = await service.from('organization_members').delete().eq('id', member.id)
  if (error) {
    if (error.code === '23514') {
      return NextResponse.json({
        error: 'Não é possível remover o único Advogado do escritório. Cadastre outro Advogado antes de remover este.',
      }, { status: 409 })
    }
    return NextResponse.json({ error: 'Não foi possível remover o membro.' }, { status: 500 })
  }

  await service.from('audit_logs').insert({
    organization_id: access.orgId, user_id: access.userId, action: 'member_removed',
    entity: 'organization_members', entity_id: target,
    previous_data: { role: member.role, ...((member as { profiles?: object | null }).profiles ?? {}) },
  })

  return NextResponse.json({ ok: true })
}

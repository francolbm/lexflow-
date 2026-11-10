import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { BR_UFS, requireOffice } from '@/lib/office'
import { LEGAL_AREAS, type LegalArea } from '@/lib/types'

// Dados do escritório (Fase B do /perfil). Titular ou admin do escritório.
// Só os campos abaixo são lidos do corpo: owner_user_id, slug e CNPJ nunca são
// aceitos daqui (CNPJ e slug são só leitura; troca de titular é pelo suporte).
// A OAB do titular é aviso de tela por enquanto; a trava real vem com a API da OAB.

const AREA_SLUGS = new Set<string>(LEGAL_AREAS.map((a) => a.slug))
const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '')
const text = (v: unknown, max: number) => {
  const s = String(v ?? '').trim()
  return s ? s.slice(0, max) : null
}

export async function PUT(req: Request) {
  const access = await requireOffice('edit')
  if (access instanceof NextResponse) return access

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const name = text(body.name, 120)
  if (!name || name.length < 2) return NextResponse.json({ error: 'Informe o nome do escritório.' }, { status: 400 })

  const phone = digits(body.phone)
  if (phone && (phone.length < 10 || phone.length > 11)) {
    return NextResponse.json({ error: 'Telefone inválido: use DDD + número.' }, { status: 400 })
  }
  const cep = digits(body.cep)
  if (cep && cep.length !== 8) return NextResponse.json({ error: 'CEP inválido: são 8 dígitos.' }, { status: 400 })
  const estado = text(body.estado, 2)?.toUpperCase() ?? null
  if (estado && !(BR_UFS as readonly string[]).includes(estado)) {
    return NextResponse.json({ error: 'UF inválida.' }, { status: 400 })
  }
  const areas: unknown = body.areas ?? []
  if (!Array.isArray(areas) || areas.some((a) => typeof a !== 'string' || !AREA_SLUGS.has(a))) {
    return NextResponse.json({ error: 'Área de atuação inválida.' }, { status: 400 })
  }

  const addr = {
    razao_social: text(body.razao_social, 200),
    cep: cep || null,
    logradouro: text(body.logradouro, 200),
    numero: text(body.numero, 20),
    complemento: text(body.complemento, 100),
    bairro: text(body.bairro, 100),
    cidade: text(body.cidade, 100),
    estado,
  }
  const fullAddress = addr.logradouro
    ? [
        [addr.logradouro, addr.numero, addr.complemento].filter(Boolean).join(', '),
        addr.bairro,
        [addr.cidade, addr.estado].filter(Boolean).join('/'),
        addr.cep && `CEP ${addr.cep.slice(0, 5)}-${addr.cep.slice(5)}`,
      ].filter(Boolean).join(' - ')
    : null

  const service = createServiceClient()
  const fail = () => NextResponse.json({ error: 'Não foi possível salvar os dados do escritório.' }, { status: 500 })

  const { error: orgErr } = await service.from('organizations')
    .update({ name, phone: phone || null }).eq('id', access.orgId)
  if (orgErr) return fail()

  // CNPJ fica como está: o upsert não envia a coluna
  const { error: addrErr } = await service.from('endereco')
    .upsert({ organization_id: access.orgId, ...addr, full_address: fullAddress, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id' })
  if (addrErr) return fail()

  // Áreas: grava exatamente a seleção enviada
  const wanted = Array.from(new Set(areas as LegalArea[]))
  const { error: delErr } = await service.from('organization_areas').delete().eq('organization_id', access.orgId)
  if (delErr) return fail()
  if (wanted.length) {
    const { error: insErr } = await service.from('organization_areas')
      .insert(wanted.map((area) => ({ organization_id: access.orgId, area })))
    if (insErr) return fail()
  }

  await service.from('audit_logs').insert({
    organization_id: access.orgId, user_id: access.userId, action: 'office_updated',
    entity: 'organizations', entity_id: access.orgId,
    new_data: { name, phone: phone || null, ...addr, areas: wanted },
  })

  return NextResponse.json({ ok: true })
}

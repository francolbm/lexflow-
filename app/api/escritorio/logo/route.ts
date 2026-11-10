import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { detectImageType } from '@/lib/avatar'
import { LOGO_BUCKET, LOGO_FORMAT_ERROR, LOGO_MAX_BYTES, LOGO_SIZE_ERROR, getLogoUrl, logoPath } from '@/lib/logo'
import { requireOffice } from '@/lib/office'

// Único caminho de escrita do logo: o bucket "logos" não tem policy de escrita e
// organizations.logo_url não é editável pelo navegador. Titular ou admin do escritório.

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const

export async function POST(req: Request) {
  const access = await requireOffice('edit')
  if (access instanceof NextResponse) return access

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'Envie uma imagem.' }, { status: 400 })
  if (file.size > LOGO_MAX_BYTES) return NextResponse.json({ error: LOGO_SIZE_ERROR }, { status: 413 })

  // Tipo real pelos primeiros bytes: SVG (texto) e qualquer outra coisa são recusados
  const bytes = new Uint8Array(await file.arrayBuffer())
  const type = detectImageType(bytes)
  if (!type) return NextResponse.json({ error: LOGO_FORMAT_ERROR }, { status: 415 })

  const service = createServiceClient()
  const { data: org } = await service.from('organizations').select('logo_url').eq('id', access.orgId).single()
  const path = logoPath(access.orgId, EXT[type])

  const { error: upErr } = await service.storage.from(LOGO_BUCKET).upload(path, bytes, { contentType: type })
  if (upErr) return NextResponse.json({ error: 'Não foi possível salvar o logo.' }, { status: 500 })

  const { error: dbErr } = await service.from('organizations').update({ logo_url: path }).eq('id', access.orgId)
  if (dbErr) {
    await service.storage.from(LOGO_BUCKET).remove([path])
    return NextResponse.json({ error: 'Não foi possível salvar o logo.' }, { status: 500 })
  }
  // O anterior só sai depois que o novo está gravado
  if (org?.logo_url) await service.storage.from(LOGO_BUCKET).remove([org.logo_url])

  return NextResponse.json({ url: await getLogoUrl(service, path) })
}

export async function DELETE() {
  const access = await requireOffice('edit')
  if (access instanceof NextResponse) return access

  const service = createServiceClient()
  const { data: org } = await service.from('organizations').select('logo_url').eq('id', access.orgId).single()
  const { error } = await service.from('organizations').update({ logo_url: null }).eq('id', access.orgId)
  if (error) return NextResponse.json({ error: 'Não foi possível remover o logo.' }, { status: 500 })
  if (org?.logo_url) await service.storage.from(LOGO_BUCKET).remove([org.logo_url])

  return NextResponse.json({ ok: true })
}

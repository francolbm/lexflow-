import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  AVATAR_BUCKET, AVATAR_FORMAT_ERROR, AVATAR_MAX_BYTES, AVATAR_SIZE_ERROR, detectImageType, getAvatarUrl,
} from '@/lib/avatar'

// Único caminho de escrita das fotos de perfil: o bucket não tem policies de escrita
// e profiles.avatar_url não é editável pelo navegador. Aqui o conteúdo real é conferido.

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const

async function currentUser() {
  const { data: { user } } = await createClient().auth.getUser()
  return user
}

export async function POST(req: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'Envie uma imagem.' }, { status: 400 })
  if (file.size > AVATAR_MAX_BYTES) return NextResponse.json({ error: AVATAR_SIZE_ERROR }, { status: 413 })

  const bytes = new Uint8Array(await file.arrayBuffer())
  const type = detectImageType(bytes)
  if (!type) return NextResponse.json({ error: AVATAR_FORMAT_ERROR }, { status: 415 })

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('avatar_url').eq('id', user.id).single()
  const path = `${user.id}/${Date.now()}.${EXT[type]}`

  const { error: upErr } = await service.storage.from(AVATAR_BUCKET).upload(path, bytes, { contentType: type })
  if (upErr) return NextResponse.json({ error: 'Não foi possível salvar a foto.' }, { status: 500 })

  const { error: dbErr } = await service.from('profiles').update({ avatar_url: path }).eq('id', user.id)
  if (dbErr) {
    await service.storage.from(AVATAR_BUCKET).remove([path])
    return NextResponse.json({ error: 'Não foi possível salvar a foto.' }, { status: 500 })
  }
  // A anterior só sai depois que a nova está gravada
  if (profile?.avatar_url) await service.storage.from(AVATAR_BUCKET).remove([profile.avatar_url])

  return NextResponse.json({ url: await getAvatarUrl(service, path) })
}

export async function DELETE() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('avatar_url').eq('id', user.id).single()
  const { error } = await service.from('profiles').update({ avatar_url: null }).eq('id', user.id)
  if (error) return NextResponse.json({ error: 'Não foi possível remover a foto.' }, { status: 500 })
  if (profile?.avatar_url) await service.storage.from(AVATAR_BUCKET).remove([profile.avatar_url])

  return NextResponse.json({ ok: true })
}

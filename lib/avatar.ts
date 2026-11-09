import type { SupabaseClient } from '@supabase/supabase-js'

export const AVATAR_BUCKET = 'avatars'
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const AVATAR_SIZE = 400          // saída quadrada 400x400
export const AVATAR_JPEG_QUALITY = 0.85
export const AVATAR_FORMAT_ERROR = 'Formato não suportado. Use uma imagem PNG, JPG ou WEBP.'
export const AVATAR_SIZE_ERROR = 'Arquivo acima do limite: a foto pode ter no máximo 2 MB.'

// profiles.avatar_url guarda o CAMINHO no bucket (ex.: "<user_id>/1731000000.jpg"),
// não um link: o bucket é privado e links assinados expiram.
export async function getAvatarUrl(supabase: SupabaseClient, path: string | null | undefined) {
  if (!path) return null
  const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 60 * 60)
  return data?.signedUrl ?? null
}

export function initialsOf(name: string | null | undefined) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  return parts.length ? parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase() : '?'
}

// Tipo REAL da imagem pelos primeiros bytes (não confia no tipo declarado).
// SVG é texto e não bate com nenhuma assinatura, então é recusado.
export function detectImageType(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  const at = (i: number, sig: number[]) => sig.every((b, j) => bytes[i + j] === b)
  if (at(0, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) return 'image/webp' // RIFF....WEBP
  return null
}

// Navegador: recorta a área escolhida e devolve um JPEG 400x400
export async function cropToJpeg(src: string, area: { x: number; y: number; width: number; height: number }) {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    i.src = src
  })
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff' // PNG com transparência vira fundo branco no JPEG
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE)
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem.'))), 'image/jpeg', AVATAR_JPEG_QUALITY))
}

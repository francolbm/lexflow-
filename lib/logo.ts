import type { SupabaseClient } from '@supabase/supabase-js'

// Logo do escritório: mesmo padrão da foto de perfil (lib/avatar.ts).
// Bucket privado "logos", só leitura pelo navegador (membros + equipe);
// a única escrita é /api/escritorio/logo, que confere o conteúdo real do arquivo.
// O tipo pelos primeiros bytes (detectImageType) e o recorte 400x400 (cropToJpeg)
// são os mesmos do avatar: importe de '@/lib/avatar'.

export const LOGO_BUCKET = 'logos'
export const LOGO_MAX_BYTES = 2 * 1024 * 1024
export const LOGO_FORMAT_ERROR = 'Formato não suportado. Use uma imagem PNG, JPG ou WEBP (SVG não é aceito).'
export const LOGO_SIZE_ERROR = 'Arquivo acima do limite: o logo pode ter no máximo 2 MB.'

// organizations.logo_url guarda o CAMINHO no bucket ("orgs/<org_id>/<timestamp>.jpg"),
// não um link: o bucket é privado e links assinados expiram.
export const logoPath = (orgId: string, ext: string) => `orgs/${orgId}/${Date.now()}.${ext}`

export async function getLogoUrl(supabase: SupabaseClient, path: string | null | undefined) {
  if (!path) return null
  const { data } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(path, 60 * 60)
  return data?.signedUrl ?? null
}

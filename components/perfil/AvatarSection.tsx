'use client'

import { AVATAR_FORMAT_ERROR, AVATAR_MAX_BYTES, AVATAR_SIZE_ERROR, initialsOf } from '@/lib/avatar'
import { ImageUpload } from './ImageUpload'
import type { PerfilData } from './PerfilSections'

export function AvatarSection({ profile, initialUrl }: { profile: PerfilData; initialUrl: string | null }) {
  return (
    <ImageUpload
      endpoint="/api/perfil/avatar"
      initialUrl={initialUrl}
      hasImage={profile.hasAvatar}
      fallback={<span data-testid="avatar-initials">{initialsOf(profile.fullName)}</span>}
      shape="round"
      noun={{ one: 'foto', the: 'a foto', changed: 'Foto atualizada', removed: 'Foto removida' }}
      maxBytes={AVATAR_MAX_BYTES}
      formatError={AVATAR_FORMAT_ERROR}
      sizeError={AVATAR_SIZE_ERROR}
      alt="Sua foto de perfil"
    />
  )
}

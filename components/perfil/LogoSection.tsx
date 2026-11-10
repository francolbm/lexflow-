'use client'

import { LOGO_FORMAT_ERROR, LOGO_MAX_BYTES, LOGO_SIZE_ERROR } from '@/lib/logo'
import type { OfficeData } from '@/lib/office-shared'
import { ImageUpload } from './ImageUpload'

export function LogoSection({ office }: { office: OfficeData }) {
  return (
    <div className="space-y-3" data-office-section="logo">
      <ImageUpload
        endpoint="/api/escritorio/logo"
        initialUrl={office.logoUrl}
        hasImage={office.org.hasLogo}
        fallback={<span>{office.org.name.charAt(0).toUpperCase() || '?'}</span>}
        shape="square"
        noun={{ one: 'logo', the: 'o logo', changed: 'Logo atualizado', removed: 'Logo removido' }}
        maxBytes={LOGO_MAX_BYTES}
        formatError={LOGO_FORMAT_ERROR}
        sizeError={LOGO_SIZE_ERROR}
        alt={`Logo de ${office.org.name}`}
        testId="logo-preview"
      />
      <p className="text-xs text-gray-500">SVG não é aceito. O logo é recortado em formato quadrado.</p>
    </div>
  )
}

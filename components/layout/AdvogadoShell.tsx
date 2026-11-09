import { Sidebar } from './Sidebar'
import { UserAvatarProvider } from './UserAvatarContext'
import type { Profile } from '@/lib/types'

// Moldura da área do cliente (advogado): sidebar fixa no desktop; no mobile cada
// página renderiza o <Header>, que abre a mesma sidebar como gaveta.
export function AdvogadoShell({ profile, avatarUrl, children }: {
  profile: Profile | null; avatarUrl: string | null; children: React.ReactNode
}) {
  return (
    <UserAvatarProvider url={avatarUrl}>
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0a192f' }}>
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:flex-shrink-0 lg:w-64">
          <div className="flex flex-col w-64 border-r border-white/10">
            <Sidebar profile={profile} />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </UserAvatarProvider>
  )
}

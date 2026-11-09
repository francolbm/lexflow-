import { AdminSidebar } from './AdminSidebar'
import { AdminMobileNav } from './AdminMobileNav'
import { UserAvatarProvider } from './UserAvatarContext'
import type { Profile } from '@/lib/types'

// Moldura do painel da equipe PennaJus: sidebar fixa no desktop, barra com gaveta no mobile.
export function AdminShell({ profile, avatarUrl, children }: {
  profile: Profile | null; avatarUrl: string | null; children: React.ReactNode
}) {
  return (
    <UserAvatarProvider url={avatarUrl}>
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#060f1e' }}>
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:flex-shrink-0 lg:w-64">
          <div className="flex flex-col w-64 border-r border-white/10">
            <AdminSidebar profile={profile} />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminMobileNav profile={profile} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </UserAvatarProvider>
  )
}

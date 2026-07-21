'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Scale, LayoutDashboard, FileText, PlusCircle, CreditCard, LogOut, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Profile } from '@/lib/types'

interface SidebarProps {
  profile: Profile | null
  onClose?: () => void
}

const navItems = [
  { href: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/demandas', label: 'Minhas Demandas', icon: FileText },
  { href: '/demandas/nova', label: 'Nova Solicitação', icon: PlusCircle },
  { href: '/assinatura', label: 'Assinatura', icon: CreditCard },
]

export function Sidebar({ profile, onClose }: SidebarProps) {
  const pathname = usePathname()

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'JF'

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0a192f' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Scale className="h-6 w-6" style={{ color: '#d4af37' }} />
          <span className="text-lg font-bold text-white tracking-wide">LexFlow</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
              style={isActive ? { backgroundColor: '#d4af3715', color: '#d4af37' } : {}}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-sm font-semibold" style={{ backgroundColor: '#d4af3720', color: '#d4af37' }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{profile?.full_name || 'Usuário'}</p>
            <p className="text-gray-500 text-xs truncate">{profile?.email || ''}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 text-sm"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, BarChart3, LogOut, X, Building2, CreditCard, TrendingUp, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Profile } from '@/lib/types'

interface AdminSidebarProps {
  profile: Profile | null
  onClose?: () => void
}

const navGroups = [
  {
    label: 'Operação',
    items: [
      { href: '/admin', label: 'Fila de Demandas', icon: LayoutDashboard, exact: true },
      { href: '/admin/metricas', label: 'Métricas', icon: TrendingUp },
    ]
  },
  {
    label: 'Gestão',
    items: [
      { href: '/admin/usuarios', label: 'Usuários', icon: Users },
      { href: '/admin/escritorios', label: 'Escritórios', icon: Building2 },
      { href: '/admin/planos', label: 'Planos & Assinaturas', icon: CreditCard },
    ]
  },
  {
    label: 'Relatórios',
    items: [
      { href: '/admin/relatorios', label: 'Relatórios', icon: BarChart3 },
      { href: '/admin/auditoria', label: 'Auditoria & Logs', icon: FileText },
    ]
  },
]

export function AdminSidebar({ profile, onClose }: AdminSidebarProps) {
  const pathname = usePathname()

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AD'

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#060f1e' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Image src="/logo-eagle.png" alt="LexFlow" width={30} height={30} className="rounded" />
          <div>
            <span className="text-lg font-bold text-white tracking-wide">LexFlow</span>
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#d4af3720', color: '#d4af37' }}>
              Admin
            </span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-6 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-600">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
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
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
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
            <p className="text-white text-sm font-medium truncate">{profile?.full_name || 'Admin'}</p>
            <p className="text-xs font-medium" style={{ color: '#d4af37' }}>
              {profile?.role === 'admin' ? 'Administrador' : 'Operador'}
            </p>
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

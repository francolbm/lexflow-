'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Menu } from 'lucide-react'
import { AdminSidebar } from './AdminSidebar'
import { Profile } from '@/lib/types'

// Barra superior do painel admin no MOBILE: hambúrguer que abre a
// AdminSidebar como gaveta. Em telas lg+ ela some (a sidebar fixa assume).
export function AdminMobileNav({ profile }: { profile: Profile | null }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div
        className="lg:hidden sticky top-0 z-40 flex items-center gap-3 h-14 px-4 border-b border-white/10"
        style={{ backgroundColor: '#060f1e' }}
      >
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="text-gray-300 hover:text-white transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <Image src="/logo-eagle.png" alt="PennaJus" width={24} height={24} className="rounded" />
          <span className="text-white font-bold tracking-wide">PennaJus</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ backgroundColor: '#d4af3720', color: '#d4af37' }}
          >
            Admin
          </span>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72">
            <AdminSidebar profile={profile} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}

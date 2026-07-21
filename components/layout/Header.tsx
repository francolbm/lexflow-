'use client'

import { useState } from 'react'
import { Menu, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sidebar } from './Sidebar'
import { Profile } from '@/lib/types'

interface HeaderProps {
  title: string
  profile: Profile | null
}

export function Header({ title, profile }: HeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-white/10 px-4 sm:px-6 h-16" style={{ backgroundColor: '#0d1f38' }}>
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden text-gray-400 hover:text-white transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-lg font-semibold text-white">{title}</h1>
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white relative">
          <Bell className="h-5 w-5" />
        </Button>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72">
            <Sidebar profile={profile} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}

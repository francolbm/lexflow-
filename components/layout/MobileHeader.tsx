'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { SidebarWrapper } from './SidebarWrapper'

interface MobileHeaderProps {
  logo?: string
  title: string
  badge?: string
  badgeColor?: string
  navItems?: Array<{
    href: string
    label: string
    icon: React.ReactNode
    isActive?: boolean
  }>
  sidebar?: React.ReactNode
}

export function MobileHeader({
  logo,
  title,
  badge,
  badgeColor = '#d4af37',
  sidebar
}: MobileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile header bar */}
      <div
        className='flex items-center lg:hidden'
        style={{ backgroundColor: '#060f1e', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <button
          onClick={() => setMenuOpen(true)}
          className='flex items-center justify-center w-12 h-12 text-gray-400 hover:text-white'
        >
          <Menu className='h-5 w-5' />
        </button>
        <div className='flex items-center gap-2'>
          {logo && (
            <Image src={logo} alt={title} width={24} height={24} className='rounded' />
          )}
          <span className='text-white font-semibold text-sm'>{title}</span>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          className='fixed inset-0 z-50 lg:hidden'
          onClick={() => setMenuOpen(false)}
        >
          {/* Backdrop */}
          <div
            className='absolute inset-0'
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          />

          {/* Sidebar drawer */}
          <div
            className='absolute left-0 top-0 bottom-0 w-72 max-w-full'
            style={{ backgroundColor: '#060f1e', animation: 'slideInLeft 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className='flex items-center justify-between px-6 py-5 border-b border-white/10'>
              <div className='flex items-center gap-2'>
                {logo && (
                  <Image src={logo} alt={title} width={30} height={30} className='rounded' />
                )}
                <div>
                  <span className='text-lg font-bold text-white tracking-wide'>{title}</span>
                  {badge && (
                    <span
                      className='ml-2 text-xs px-1.5 py-0.5 rounded font-medium'
                      style={{ backgroundColor: `${badgeColor}20`, color: badgeColor }}
                    >
                      {badge}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className='text-gray-400 hover:text-white'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            {/* Sidebar content */}
            <div className='h-[calc(100%-76px)] overflow-y-auto'>
              <SidebarWrapper onMenuClose={() => setMenuOpen(false)}>
                {sidebar}
              </SidebarWrapper>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
'use client'

import { useEffect } from 'react'

interface SidebarWrapperProps {
  children: React.ReactNode
  onMenuClose: () => void
}

export function SidebarWrapper({ children, onMenuClose }: SidebarWrapperProps) {
  useEffect(() => {
    // Find all links in the sidebar and add click handlers to close the menu
    const sidebar = document.querySelector('[data-sidebar-content]')
    if (sidebar) {
      const links = sidebar.querySelectorAll('a')
      links.forEach(link => {
        link.addEventListener('click', onMenuClose)
      })
      return () => {
        links.forEach(link => {
          link.removeEventListener('click', onMenuClose)
        })
      }
    }
  }, [onMenuClose])

  return (
    <div data-sidebar-content>
      {children}
    </div>
  )
}

import { useCallback, useState, type ReactNode } from 'react'

import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { Sidebar } from '@/components/layout/Sidebar'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isMobileNavOpen, setMobileNavOpen] = useState(false)

  const openMobileNav = useCallback(() => setMobileNavOpen(true), [])
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])

  return (
    <div className="min-h-dvh bg-neutral-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-neutral-900 focus:px-3 focus:py-2 focus:text-sm focus:text-neutral-100"
      >
        Skip to content
      </a>

      <Header onMenuClick={openMobileNav} isMenuOpen={isMobileNavOpen} />
      <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 sm:px-6">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 overflow-y-auto py-6 lg:block">
          <Sidebar />
        </aside>

        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 py-6">
          <AppErrorBoundary>{children}</AppErrorBoundary>
        </main>
      </div>

      <MobileNav open={isMobileNavOpen} onClose={closeMobileNav} />
    </div>
  )
}
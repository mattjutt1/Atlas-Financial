'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Header } from './Header'
import { Footer } from './Footer'
import { MobileNavigation } from '@/components/mobile/MobileNavigation'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { ApolloProvider } from '@/components/providers/ApolloProvider'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Routes that should hide mobile navigation
  const hideNavRoutes = ['/auth', '/onboarding']
  const shouldHideNav = hideNavRoutes.some(route => pathname.startsWith(route))

  return (
    <SessionProvider>
      <ApolloProvider>
        <div className="min-h-screen-mobile flex flex-col bg-gray-50 dark:bg-gray-900">
          {/* Desktop Header - Hidden on mobile */}
          <div className="md:block hidden">
            <Header />
          </div>

          {/* Main Content Area */}
          <main className={`flex-1 ${isMobile && !shouldHideNav ? 'pb-20' : ''}`}>
            {children}
          </main>

          {/* Desktop Footer - Hidden on mobile */}
          <div className="md:block hidden">
            <Footer />
          </div>

          {/* Mobile Navigation - Only shown on mobile and authenticated routes */}
          {isMobile && !shouldHideNav && (
            <MobileNavigation />
          )}
        </div>
      </ApolloProvider>
    </SessionProvider>
  )
}

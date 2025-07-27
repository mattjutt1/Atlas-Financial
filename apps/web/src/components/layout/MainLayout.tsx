'use client'

import { ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { ApolloProvider } from '@/components/providers/ApolloProvider'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SessionProvider>
      <ApolloProvider>
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </ApolloProvider>
    </SessionProvider>
  )
}
'use client'

import { SuperTokensWrapper } from 'supertokens-auth-react'
import { ReactNode } from 'react'
import '@/lib/auth' // Initialize SuperTokens config

interface SessionProviderProps {
  children: ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <SuperTokensWrapper>
      {children}
    </SuperTokensWrapper>
  )
}

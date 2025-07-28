'use client'

import { ApolloProvider as ApolloProviderBase } from '@apollo/client'
import { apolloClient } from '@/lib/apollo-client'
import { ReactNode } from 'react'

interface ApolloProviderProps {
  children: ReactNode
}

export function ApolloProvider({ children }: ApolloProviderProps) {
  return (
    <ApolloProviderBase client={apolloClient}>
      {children}
    </ApolloProviderBase>
  )
}

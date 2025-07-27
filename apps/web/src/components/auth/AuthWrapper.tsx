'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionContext } from 'supertokens-auth-react/recipe/session'
import { LoadingSpinner } from '@/components/common'

interface AuthWrapperProps {
  children: ReactNode
  requireAuth?: boolean
}

export function AuthWrapper({ children, requireAuth = true }: AuthWrapperProps) {
  const session = useSessionContext()
  const router = useRouter()

  useEffect(() => {
    if (requireAuth && session.loading === false && !session.doesSessionExist) {
      router.push('/auth/signin')
    }
  }, [session, requireAuth, router])

  if (session.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (requireAuth && !session.doesSessionExist) {
    return null // Will redirect in useEffect
  }

  return <>{children}</>
}
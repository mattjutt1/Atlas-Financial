'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useSessionContext } from 'supertokens-auth-react/recipe/session'

// Dynamically import SuperTokens UI to avoid SSR issues
const AuthPage = dynamic(
  async () => {
    const { EmailPasswordAuth } = await import('supertokens-auth-react/recipe/emailpassword/prebuiltui')
    return EmailPasswordAuth
  },
  { ssr: false }
)

export default function Auth() {
  const session = useSessionContext()
  const router = useRouter()

  useEffect(() => {
    if (session.loading === false && session.doesSessionExist) {
      // User is already logged in, redirect to dashboard
      router.push('/')
    }
  }, [session, router])

  if (session.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (session.doesSessionExist) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Atlas Financial
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your Brutal Honesty Personal Finance Platform
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <AuthPage />
          </div>
        </div>
      </div>
    </div>
  )
}

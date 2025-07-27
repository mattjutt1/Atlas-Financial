'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionContext } from 'supertokens-auth-react/recipe/session'
import { redirectToAuth } from 'supertokens-auth-react'

export default function SignInPage() {
  const session = useSessionContext()
  const router = useRouter()

  useEffect(() => {
    if (session.loading === false) {
      if (session.doesSessionExist) {
        // User is already logged in, redirect to dashboard
        router.push('/')
      } else {
        // Redirect to SuperTokens auth UI
        redirectToAuth()
      }
    }
  }, [session, router])

  // Show loading while checking session or redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="card p-8 text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to Atlas Financial
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Redirecting to authentication...
            </p>
          </div>

          <div className="text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-sm">Loading authentication system</p>
          </div>
        </div>
      </div>
    </div>
  )
}
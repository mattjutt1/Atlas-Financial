'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.'
      case 'AccessDenied':
        return 'Access denied. You do not have permission to sign in.'
      case 'Verification':
        return 'The verification link was invalid or has expired.'
      default:
        return 'An unexpected error occurred during authentication.'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-danger-50 to-danger-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="card p-8 text-center">
          <div className="mb-8">
            <div className="w-16 h-16 bg-danger-100 dark:bg-danger-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-danger-600 dark:text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Authentication Error
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {getErrorMessage(error)}
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/auth/signin"
              className="btn-primary block w-full py-3"
            >
              Try Again
            </Link>

            <Link
              href="/"
              className="btn-secondary block w-full py-3"
            >
              Go Home
            </Link>
          </div>

          {error && (
            <div className="mt-6 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm text-gray-600 dark:text-gray-400">
              Error Code: {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  )
}

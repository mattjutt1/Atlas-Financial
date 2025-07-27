import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { middleware as superTokensMiddleware } from 'supertokens-node/framework/express'
import { getSSRSession } from 'supertokens-node/recipe/session/framework/express'
import './lib/supertokens-backend'

export async function middleware(request: NextRequest) {
  // Skip middleware for static files and API routes that don't need auth
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.includes('.') // static files
  ) {
    return NextResponse.next()
  }

  // Protected routes that require authentication
  const protectedRoutes = ['/', '/accounts', '/transactions', '/budget', '/debt', '/portfolio', '/insights', '/profile', '/preferences']
  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute) {
    try {
      // Check if user has a valid session
      const session = await getSSRSession(request, NextResponse.next())
      
      if (!session) {
        // Redirect to auth page if no session
        return NextResponse.redirect(new URL('/auth/signin', request.url))
      }
    } catch (error) {
      // If there's an error checking session, redirect to auth
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
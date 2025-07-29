/**
 * Shared Authentication Components
 */

import React from 'react'

export interface AuthWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireAuth?: boolean
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({
  children,
  fallback = null,
  requireAuth = false
}) => {
  // Basic component wrapper for auth
  return <>{children}</>
}

export interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
  requiredPermissions?: string[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/auth/signin',
  requiredPermissions = []
}) => {
  // Basic protected route component
  return <>{children}</>
}
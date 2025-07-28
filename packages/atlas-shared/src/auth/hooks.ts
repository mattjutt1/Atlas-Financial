/**
 * Consolidated Authentication Hooks
 * Eliminates duplicate auth hook patterns across applications
 */

import { useQuery } from '@apollo/client'
import { useSessionContext } from 'supertokens-auth-react/recipe/session'
import { useEffect, useState } from 'react'

import type { AtlasUser } from '../types'
import { GET_USER_BY_EMAIL } from '../graphql/queries'
import { createLogger } from '../monitoring'

const logger = createLogger('auth-hooks')

/**
 * Enhanced authentication hook that combines SuperTokens session with backend user data
 * Consolidates useAuthentication patterns from apps/web
 */
export function useAuthentication() {
  const session = useSessionContext()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Extract user email from SuperTokens session
  useEffect(() => {
    if (session.loading === false && session.doesSessionExist) {
      const userId = session.userId
      const accessTokenPayload = session.accessTokenPayload

      // Try to get email from access token payload
      const email = accessTokenPayload.email ||
                   accessTokenPayload['https://hasura.io/jwt/claims']?.['x-hasura-user-email'] ||
                   null

      setUserEmail(email)
      logger.debug('User email extracted from session', { userId, email })
    } else {
      setUserEmail(null)
    }
  }, [session])

  const isLoading = session.loading
  const isAuthenticated = session.doesSessionExist && !session.loading
  const isUnauthenticated = !session.doesSessionExist && !session.loading

  // Fetch user data from backend (skip if no email available)
  const { data: userData, loading: userLoading, error: userError } = useQuery(GET_USER_BY_EMAIL, {
    variables: { email: userEmail },
    skip: !isAuthenticated || !userEmail,
    errorPolicy: 'ignore' // Don't fail if user doesn't exist in backend yet
  })

  const backendUser = userData?.users?.[0]

  // Combine session user with backend user data
  const user: AtlasUser | null = backendUser ? {
    id: backendUser.id,
    email: backendUser.email,
    firstName: backendUser.firstName,
    lastName: backendUser.lastName,
    emailVerified: backendUser.emailVerified || true,
    roles: backendUser.roles || ['user'],
    permissions: backendUser.permissions || [],
    createdAt: backendUser.createdAt,
    lastLoginAt: backendUser.lastLoginAt,
    metadata: backendUser.metadata
  } : (isAuthenticated && userEmail ? {
    id: session.userId,
    email: userEmail,
    firstName: undefined,
    lastName: undefined,
    emailVerified: true,
    roles: ['user'],
    permissions: [],
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    metadata: {}
  } : null)

  return {
    session: session.doesSessionExist ? {
      user: user,
      userId: session.userId,
      accessToken: session.accessToken,
      accessTokenPayload: session.accessTokenPayload
    } : null,
    status: isLoading ? 'loading' : (isAuthenticated ? 'authenticated' : 'unauthenticated'),
    isLoading: isLoading || userLoading,
    isAuthenticated,
    isUnauthenticated,
    user,
    backendUser,
    userError
  }
}

/**
 * Hook for checking user roles
 */
export function useRole(requiredRole: string) {
  const { user } = useAuthentication()
  
  return {
    hasRole: user?.roles.includes(requiredRole as any) || false,
    roles: user?.roles || [],
    user
  }
}

/**
 * Hook for checking user permissions
 */
export function usePermission(resource: string, action: string) {
  const { user } = useAuthentication()
  
  const hasPermission = user?.permissions.some(
    permission => 
      permission.resource === resource && 
      permission.action === action
  ) || false

  return {
    hasPermission,
    permissions: user?.permissions || [],
    user
  }
}

/**
 * Hook for managing auth state with local storage persistence
 */
export function useAuthState() {
  const auth = useAuthentication()
  const [lastActivity, setLastActivity] = useState<Date>(new Date())

  // Update last activity on user interaction
  useEffect(() => {
    const updateActivity = () => setLastActivity(new Date())
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true)
      })
    }
  }, [])

  // Check for session timeout
  const isSessionExpired = () => {
    if (!auth.isAuthenticated) return false
    
    const timeoutMinutes = 30 // 30 minutes of inactivity
    const timeDiff = new Date().getTime() - lastActivity.getTime()
    const minutesDiff = timeDiff / (1000 * 60)
    
    return minutesDiff > timeoutMinutes
  }

  return {
    ...auth,
    lastActivity,
    isSessionExpired: isSessionExpired(),
    timeoutMinutes: 30
  }
}

/**
 * Hook for user profile management
 */
export function useUserProfile() {
  const { user, isAuthenticated } = useAuthentication()
  const [isUpdating, setIsUpdating] = useState(false)

  const updateProfile = async (updates: Partial<AtlasUser>) => {
    if (!isAuthenticated || !user) {
      throw new Error('User must be authenticated to update profile')
    }

    setIsUpdating(true)
    try {
      // Call backend API to update profile
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const updatedUser = await response.json()
      logger.info('Profile updated successfully', { userId: user.id })
      
      return updatedUser
    } catch (error) {
      logger.error('Failed to update profile', { error, userId: user.id })
      throw error
    } finally {
      setIsUpdating(false)
    }
  }

  const getProfileCompleteness = (): number => {
    if (!user) return 0

    const fields = ['firstName', 'lastName', 'email']
    const completedFields = fields.filter(field => 
      user[field as keyof AtlasUser] !== undefined && 
      user[field as keyof AtlasUser] !== ''
    ).length

    return Math.round((completedFields / fields.length) * 100)
  }

  return {
    user,
    isUpdating,
    updateProfile,
    profileCompleteness: getProfileCompleteness(),
    isComplete: getProfileCompleteness() === 100
  }
}
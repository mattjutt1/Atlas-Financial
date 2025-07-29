/**
 * Consolidated Authentication Hooks
 * Eliminates duplicate auth hook patterns across applications
 */

import { useQuery } from '@apollo/client'
import { useEffect, useState } from 'react'
import Session from 'supertokens-auth-react/recipe/session'

import type { AtlasUser } from '../types'
import { GET_USER_BY_EMAIL } from '../graphql/queries'
import { createLogger } from '../monitoring'
import { useAuth } from './providers'

const logger = createLogger('auth-hooks')

/**
 * Enhanced authentication hook that combines SuperTokens session with backend user data
 * Consolidates useAuthentication patterns from apps/web
 */
export function useAuthentication() {
  const auth = useAuth()
  const [sessionInfo, setSessionInfo] = useState<any>(null)

  // Get session information from SuperTokens
  useEffect(() => {
    const loadSession = async () => {
      try {
        const hasSession = await Session.doesSessionExist()
        if (hasSession) {
          // Get basic session info without getSessionInformation
          setSessionInfo({ hasSession, userId: await Session.getUserId() })
        }
      } catch (error) {
        logger.error('Failed to load session', { error })
      }
    }

    loadSession()
  }, [auth.isAuthenticated])

  // Fetch user data from backend if authenticated
  const { data: userData, loading: userLoading, error: userError } = useQuery(GET_USER_BY_EMAIL, {
    variables: { email: auth.user?.email },
    skip: !auth.isAuthenticated || !auth.user?.email,
    errorPolicy: 'ignore'
  })

  const backendUser = userData?.users?.[0]

  return {
    session: sessionInfo,
    status: auth.isLoading ? 'loading' : (auth.isAuthenticated ? 'authenticated' : 'unauthenticated'),
    isLoading: auth.isLoading || userLoading,
    isAuthenticated: auth.isAuthenticated,
    isUnauthenticated: !auth.isAuthenticated && !auth.isLoading,
    user: auth.user,
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

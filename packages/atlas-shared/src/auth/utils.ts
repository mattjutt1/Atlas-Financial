/**
 * Shared Authentication Utilities
 */

import type { AtlasUser, Permission } from '../types'

/**
 * Check if user has specific permission
 */
export function hasPermission(
  user: AtlasUser | null,
  permission: string
): boolean {
  if (!user) return false
  return user.permissions.some(p => `${p.resource}:${p.action}` === permission)
}

/**
 * Check if user has any of the specified roles
 */
export function hasRole(
  user: AtlasUser | null,
  roles: string | string[]
): boolean {
  if (!user) return false
  const roleArray = Array.isArray(roles) ? roles : [roles]
  return user.roles.some(role => roleArray.includes(role))
}

/**
 * Get user display name
 */
export function getUserDisplayName(user: AtlasUser | null): string {
  if (!user) return 'Guest'
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  if (user.firstName) return user.firstName
  return user.email
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Extract user ID from JWT token (basic implementation)
 */
export function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub || payload.userId || null
  } catch {
    return null
  }
}

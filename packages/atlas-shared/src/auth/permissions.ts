/**
 * Permission Management for Atlas Financial
 */

import type { Permission, AtlasUser } from '../types'

/**
 * Permission constants
 */
export const PERMISSIONS = {
  // Account permissions
  ACCOUNTS_READ: 'accounts:read',
  ACCOUNTS_WRITE: 'accounts:write',
  ACCOUNTS_DELETE: 'accounts:delete',

  // Transaction permissions
  TRANSACTIONS_READ: 'transactions:read',
  TRANSACTIONS_WRITE: 'transactions:write',
  TRANSACTIONS_DELETE: 'transactions:delete',

  // Portfolio permissions
  PORTFOLIO_READ: 'portfolio:read',
  PORTFOLIO_WRITE: 'portfolio:write',
  PORTFOLIO_DELETE: 'portfolio:delete',

  // Admin permissions
  ADMIN_READ: 'admin:read',
  ADMIN_WRITE: 'admin:write',
  ADMIN_DELETE: 'admin:delete',

  // System permissions
  SYSTEM_READ: 'system:read',
  SYSTEM_WRITE: 'system:write'
} as const

/**
 * Role-based permission mapping
 */
export const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),
  user: [
    PERMISSIONS.ACCOUNTS_READ,
    PERMISSIONS.ACCOUNTS_WRITE,
    PERMISSIONS.TRANSACTIONS_READ,
    PERMISSIONS.TRANSACTIONS_WRITE,
    PERMISSIONS.PORTFOLIO_READ,
    PERMISSIONS.PORTFOLIO_WRITE
  ],
  premium: [
    PERMISSIONS.ACCOUNTS_READ,
    PERMISSIONS.ACCOUNTS_WRITE,
    PERMISSIONS.TRANSACTIONS_READ,
    PERMISSIONS.TRANSACTIONS_WRITE,
    PERMISSIONS.PORTFOLIO_READ,
    PERMISSIONS.PORTFOLIO_WRITE
  ],
  analyst: [
    PERMISSIONS.ACCOUNTS_READ,
    PERMISSIONS.TRANSACTIONS_READ,
    PERMISSIONS.PORTFOLIO_READ,
    PERMISSIONS.SYSTEM_READ
  ],
  support: [
    PERMISSIONS.ACCOUNTS_READ,
    PERMISSIONS.TRANSACTIONS_READ,
    PERMISSIONS.SYSTEM_READ
  ]
} as const

/**
 * Check if user has required permissions
 */
export function checkPermission(
  user: AtlasUser | null,
  requiredPermission: string
): boolean {
  if (!user) return false

  // Check direct permissions
  const hasDirectPermission = user.permissions.some(p =>
    `${p.resource}:${p.action}` === requiredPermission
  )

  if (hasDirectPermission) return true

  // Check role-based permissions
  return user.roles.some(role => {
    const rolePerms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]
    return rolePerms?.includes(requiredPermission as any) || false
  })
}

/**
 * Check if user has any of the required permissions
 */
export function checkAnyPermission(
  user: AtlasUser | null,
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some(permission =>
    checkPermission(user, permission)
  )
}

/**
 * Check if user has all required permissions
 */
export function checkAllPermissions(
  user: AtlasUser | null,
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every(permission =>
    checkPermission(user, permission)
  )
}

/**
 * Get all permissions for a user
 */
export function getUserPermissions(user: AtlasUser | null): string[] {
  if (!user) return []

  const directPermissions = user.permissions.map(p => `${p.resource}:${p.action}`)

  const rolePermissions = user.roles.flatMap(role => {
    const rolePerms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]
    return rolePerms || []
  })

  return [...new Set([...directPermissions, ...rolePermissions])]
}

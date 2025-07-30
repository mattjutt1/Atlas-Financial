/**
 * JWT Utilities for Atlas Financial
 */

export interface JWTPayload {
  sub: string
  email: string
  roles: string[]
  permissions: string[]
  iat: number
  exp: number
  aud?: string
  iss?: string
}

/**
 * Decode JWT token without verification
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(atob(parts[1]))
    return payload as JWTPayload
  } catch {
    return null
  }
}

/**
 * Check if JWT is expired
 */
export function isJWTExpired(token: string): boolean {
  const payload = decodeJWT(token)
  if (!payload || !payload.exp) return true

  return Date.now() >= payload.exp * 1000
}

/**
 * Get JWT expiration time
 */
export function getJWTExpiration(token: string): Date | null {
  const payload = decodeJWT(token)
  if (!payload || !payload.exp) return null

  return new Date(payload.exp * 1000)
}

/**
 * Extract user info from JWT
 */
export function getUserFromJWT(token: string) {
  const payload = decodeJWT(token)
  if (!payload) return null

  return {
    id: payload.sub,
    email: payload.email,
    roles: payload.roles || [],
    permissions: payload.permissions || []
  }
}

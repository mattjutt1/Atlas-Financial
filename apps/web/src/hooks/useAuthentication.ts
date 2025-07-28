import { useSessionContext } from 'supertokens-auth-react/recipe/session'
import { useQuery } from '@apollo/client'
import { GET_USER_BY_EMAIL } from '@/lib/graphql/queries'
import { useEffect, useState } from 'react'

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
  const user = backendUser ? {
    id: backendUser.id,
    email: backendUser.email,
    name: backendUser.name || userEmail,
    userId: session.userId
  } : (isAuthenticated && userEmail ? {
    email: userEmail,
    name: userEmail,
    userId: session.userId
  } : (isAuthenticated ? {
    userId: session.userId,
    email: userEmail,
    name: session.userId
  } : null))

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

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
      // Get email from access token payload or make API call to get user info
      setUserEmail(accessTokenPayload.email || null)
    } else {
      setUserEmail(null)
    }
  }, [session])

  const isLoading = session.loading
  const isAuthenticated = session.doesSessionExist && !session.loading
  const isUnauthenticated = !session.doesSessionExist && !session.loading

  // Fetch user data from backend
  const { data: userData, loading: userLoading } = useQuery(GET_USER_BY_EMAIL, {
    variables: { email: userEmail },
    skip: !isAuthenticated || !userEmail
  })

  const backendUser = userData?.users?.[0]
  
  // Combine session user with backend user data
  const user = backendUser ? {
    id: backendUser.id,
    email: backendUser.email,
    name: backendUser.name || userEmail
  } : (isAuthenticated && userEmail ? {
    email: userEmail,
    name: userEmail
  } : null)

  return {
    session: session.doesSessionExist ? {
      user: user,
      userId: session.userId,
      accessToken: session.accessToken
    } : null,
    status: isLoading ? 'loading' : (isAuthenticated ? 'authenticated' : 'unauthenticated'),
    isLoading: isLoading || userLoading,
    isAuthenticated,
    isUnauthenticated,
    user,
    backendUser
  }
}
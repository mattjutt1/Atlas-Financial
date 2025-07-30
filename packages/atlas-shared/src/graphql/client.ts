/**
 * Shared Apollo Client Configuration
 */

import { ApolloClient, InMemoryCache, HttpLink, split, from } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { createClient } from 'graphql-ws'

import type { AuthConfig } from '../types'
import { createLogger } from '../monitoring'

const logger = createLogger('graphql-client')

interface CreateApolloClientOptions {
  httpUri: string
  wsUri: string
  auth?: AuthConfig
  getToken?: () => string | null
}

/**
 * Create configured Apollo Client instance
 */
export function createApolloClient({
  httpUri,
  wsUri,
  auth,
  getToken
}: CreateApolloClientOptions) {
  // HTTP Link for queries and mutations
  const httpLink = new HttpLink({
    uri: httpUri,
    credentials: 'include'
  })

  // WebSocket Link for subscriptions
  const wsLink = new GraphQLWsLink(
    createClient({
      url: wsUri,
      connectionParams: () => {
        const token = getToken?.()
        return token ? { Authorization: `Bearer ${token}` } : {}
      }
    })
  )

  // Auth Link for adding authorization headers
  const authLink = setContext((_, { headers }) => {
    const token = getToken?.()

    return {
      headers: {
        ...headers,
        ...(token && { Authorization: `Bearer ${token}` }),
        'Content-Type': 'application/json'
      }
    }
  })

  // Error Link for handling GraphQL and network errors
  const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, locations, path }) => {
        logger.error('GraphQL error', {
          message,
          locations,
          path,
          operation: operation.operationName
        })
      })
    }

    if (networkError) {
      logger.error('Network error', {
        error: networkError,
        operation: operation.operationName
      })

      // Handle authentication errors
      if ('statusCode' in networkError && networkError.statusCode === 401) {
        // Token expired or invalid - redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/signin'
        }
      }
    }
  })

  // Split link to route between HTTP and WebSocket
  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query)
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      )
    },
    wsLink,
    httpLink
  )

  // Combine all links
  const link = from([errorLink, authLink, splitLink])

  // Configure cache
  const cache = new InMemoryCache({
    typePolicies: {
      accounts: {
        fields: {
          balance: {
            merge: false // Replace the entire balance object
          }
        }
      },
      transactions: {
        fields: {
          // Enable pagination for transactions
          items: {
            merge(existing: any[] = [], incoming: any[]) {
              return [...existing, ...incoming]
            }
          }
        }
      }
    }
  })

  return new ApolloClient({
    link,
    cache,
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
        notifyOnNetworkStatusChange: true
      },
      query: {
        errorPolicy: 'all'
      }
    },
    connectToDevTools: process.env.NODE_ENV === 'development'
  })
}

/**
 * Default Apollo Client factory for Atlas Financial
 */
export function createAtlasApolloClient(getToken?: () => string | null) {
  const httpUri = process.env.NEXT_PUBLIC_HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql'
  const wsUri = process.env.NEXT_PUBLIC_HASURA_WS_ENDPOINT || 'ws://localhost:8080/v1/graphql'

  return createApolloClient({
    httpUri,
    wsUri,
    getToken
  })
}

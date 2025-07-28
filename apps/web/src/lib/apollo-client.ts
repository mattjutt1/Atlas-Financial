import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { getMainDefinition } from '@apollo/client/utilities'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'
// Note: Using SuperTokens for auth instead of NextAuth
// import { getSession } from 'next-auth/react'

// Temporary auth helper until SuperTokens session is properly integrated
const getSession = async () => {
  // TODO: Replace with SuperTokens session management
  return {
    accessToken: process.env.NEXT_PUBLIC_HASURA_ADMIN_SECRET
  }
}

// HTTP link to Hasura GraphQL endpoint
const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_HASURA_URL || 'http://localhost:8081/v1/graphql',
})

// WebSocket link for subscriptions
const wsLink = typeof window !== 'undefined' ? new GraphQLWsLink(
  createClient({
    url: process.env.NEXT_PUBLIC_HASURA_WS_URL || 'ws://localhost:8081/v1/graphql',
    connectionParams: async () => {
      // Get authentication for WebSocket connection
      const session = await getSession()
      return {
        headers: {
          authorization: session?.accessToken ? `Bearer ${session.accessToken}` : '',
          'x-hasura-admin-secret': process.env.NEXT_PUBLIC_HASURA_ADMIN_SECRET || '',
          'x-hasura-role': 'user',
        }
      }
    },
    retryAttempts: 5,
    retryWait: async function retry(retries: number): Promise<void> {
      // Exponential backoff with jitter
      const delay = Math.min(1000 * Math.pow(2, retries), 30000)
      const jitter = Math.random() * 1000
      return new Promise(resolve => setTimeout(resolve, delay + jitter))
    },
    shouldRetry: (errOrCloseEvent: any) => {
      // Retry on network errors but not on auth failures
      if (errOrCloseEvent && typeof errOrCloseEvent === 'object' && 'code' in errOrCloseEvent) {
        return errOrCloseEvent.code !== 4401 // Don't retry on auth failure
      }
      return true
    },
    on: {
      connected: () => {
        console.log('WebSocket connected for real-time subscriptions')
      },
      closed: () => {
        console.log('WebSocket connection closed')
      },
      error: (error) => {
        console.error('WebSocket connection error:', error)
      }
    }
  })
) : null

// Auth link to add authentication headers
const authLink = setContext(async (_, { headers }) => {
  // Get the authentication token from NextAuth session
  const session = await getSession()

  return {
    headers: {
      ...headers,
      authorization: session?.accessToken ? `Bearer ${session.accessToken}` : '',
      'x-hasura-admin-secret': process.env.NEXT_PUBLIC_HASURA_ADMIN_SECRET || '',
      'x-hasura-role': 'user',
    }
  }
})

// Error link for handling GraphQL and network errors
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.warn(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
      )
    })
  }

  if (networkError) {
    console.warn(`Network error: ${networkError}`)

    // Handle authentication errors
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      // Could trigger a re-authentication flow here
      console.warn('Authentication error - user may need to re-login')
    }
  }
})

// Split link: WebSocket for subscriptions, HTTP for queries/mutations
const splitLink = typeof window !== 'undefined' && wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query)
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        )
      },
      wsLink,
      from([errorLink, authLink, httpLink])
    )
  : from([errorLink, authLink, httpLink])

// Create Apollo Client instance
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      // Cache policies for financial data
      Account: {
        fields: {
          transactions: {
            merge(existing = [], incoming) {
              return [...existing, ...incoming]
            }
          }
        }
      },
      Transaction: {
        keyFields: ['id'],
        fields: {
          // Ensure ML categorization updates are properly cached
          ml_category_confidence: {
            merge: (existing, incoming) => incoming // Always use latest confidence
          },
          ml_category_suggestions: {
            merge: (existing, incoming) => incoming // Always use latest suggestions
          }
        }
      },
      Budget: {
        keyFields: ['id']
      },
      Debt: {
        keyFields: ['id']
      },
      // ML-specific cache policies
      MLTransactionCategory: {
        keyFields: ['transaction_id', 'category'],
        fields: {
          confidence: {
            merge: (existing, incoming) => incoming // Always use latest confidence
          }
        }
      },
      MLCategoryInsight: {
        keyFields: ['id'],
        fields: {
          insights: {
            merge: (existing = [], incoming) => {
              // Keep only the latest 50 insights to prevent memory bloat
              const combined = [...existing, ...incoming]
              return combined.slice(-50).sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )
            }
          }
        }
      }
    }
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-and-network',
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
    },
  },
  connectToDevTools: process.env.NODE_ENV === 'development',
})

import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { getSession } from 'next-auth/react'

// HTTP link to Hasura GraphQL endpoint
const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_HASURA_URL || 'http://localhost:8081/v1/graphql',
})

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

// Create Apollo Client instance
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
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
        keyFields: ['id']
      },
      Budget: {
        keyFields: ['id']
      },
      Debt: {
        keyFields: ['id']
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

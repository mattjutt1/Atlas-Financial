'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import SuperTokens from 'supertokens-auth-react';
import { SuperTokensWrapper } from 'supertokens-auth-react';
import Session from 'supertokens-auth-react/recipe/session';
import EmailPassword from 'supertokens-auth-react/recipe/emailpassword';
import { SessionAuth } from 'supertokens-auth-react/recipe/session';
import { redirectToAuth } from 'supertokens-auth-react';

// Types
interface AtlasUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  roles: string[];
  createdAt: string;
  lastLoginAt: string;
}

interface AuthContextType {
  user: AtlasUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// SuperTokens Configuration for Modular Monolith
const initializeSuperTokens = () => {
  if (typeof window !== 'undefined') {
    SuperTokens.init({
      appInfo: {
        appName: 'Atlas Financial Core Platform',
        apiDomain: process.env.NEXT_PUBLIC_SUPERTOKENS_API_DOMAIN || 'http://localhost:3000',
        websiteDomain: process.env.NEXT_PUBLIC_SUPERTOKENS_WEBSITE_DOMAIN || 'http://localhost:3000',
        apiBasePath: '/auth',
        websiteBasePath: '/auth',
      },
      recipeList: [
        EmailPassword.init({
          style: {
            container: {
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            },
            inputWrapper: {
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
            },
            button: {
              backgroundColor: '#3b82f6',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
            },
          },
          signInAndUpFeature: {
            defaultToSignUp: false,
          },
          resetPasswordUsingTokenFeature: {
            disableDefaultUI: false,
          },
        }),
        Session.init({
          tokenTransferMethod: 'cookie',
          sessionTokenFrontendDomain: process.env.NEXT_PUBLIC_SESSION_DOMAIN || 'localhost',
          cookieDomain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || 'localhost',
          cookieSecure: process.env.NODE_ENV === 'production',
          cookieSameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          sessionExpiredStatusCode: 401,
          invalidClaimStatusCode: 403,
          override: {
            functions: (originalImplementation) => ({
              ...originalImplementation,
              
              // Custom session validation
              getSessionInformation: async function (input) {
                const sessionInfo = await originalImplementation.getSessionInformation(input);
                
                // Add custom user data enrichment
                if (sessionInfo) {
                  try {
                    // Fetch additional user data from our API
                    const userResponse = await fetch('/api/auth/user-profile', {
                      headers: {
                        'Authorization': `Bearer ${input.accessToken}`,
                      },
                    });
                    
                    if (userResponse.ok) {
                      const userData = await userResponse.json();
                      return {
                        ...sessionInfo,
                        customUserData: userData,
                      };
                    }
                  } catch (error) {
                    console.warn('Failed to fetch user profile:', error);
                  }
                }
                
                return sessionInfo;
              },
            }),
          },
        }),
      ],
      
      // Custom styling for Atlas branding
      style: `
        [data-supertokens~=container] {
          --palette-background: 255, 255, 255;
          --palette-inputBackground: 255, 255, 255;
          --palette-inputBorder: 209, 213, 219;
          --palette-primary: 59, 130, 246;
          --palette-primaryBorder: 59, 130, 246;
          --palette-success: 34, 197, 94;
          --palette-successBackground: 240, 253, 244;
          --palette-error: 239, 68, 68;
          --palette-errorBackground: 254, 242, 242;
          --palette-textTitle: 17, 24, 39;
          --palette-textLabel: 75, 85, 99;
          --palette-textPrimary: 17, 24, 39;
          --palette-textLink: 59, 130, 246;
        }
        
        [data-supertokens~=button] {
          font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 500;
          border-radius: 0.375rem;
          transition: all 0.2s ease-in-out;
        }
        
        [data-supertokens~=button]:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        [data-supertokens~=input] {
          font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
          border-radius: 0.375rem;
          border: 1px solid rgb(209, 213, 219);
          transition: border-color 0.2s ease-in-out;
        }
        
        [data-supertokens~=input]:focus {
          border-color: rgb(59, 130, 246);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
      `,
    });
  }
};

// Initialize SuperTokens
initializeSuperTokens();

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AtlasUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const hasSession = await Session.doesSessionExist();
        
        if (hasSession) {
          const sessionInfo = await Session.getSessionInformation();
          
          // Extract user data from session
          const atlasUser: AtlasUser = {
            id: sessionInfo.userId,
            email: sessionInfo.customUserData?.email || '',
            firstName: sessionInfo.customUserData?.firstName,
            lastName: sessionInfo.customUserData?.lastName,
            emailVerified: sessionInfo.customUserData?.emailVerified || false,
            roles: sessionInfo.customUserData?.roles || ['user'],
            createdAt: sessionInfo.customUserData?.createdAt || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          
          setUser(atlasUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  // Session event listeners
  useEffect(() => {
    const handleSessionChange = (event: any) => {
      if (event.action === 'SESSION_CREATED' || event.action === 'REFRESH_SESSION') {
        // Reload user data when session changes
        const loadUserData = async () => {
          try {
            const sessionInfo = await Session.getSessionInformation();
            const atlasUser: AtlasUser = {
              id: sessionInfo.userId,
              email: sessionInfo.customUserData?.email || '',
              firstName: sessionInfo.customUserData?.firstName,
              lastName: sessionInfo.customUserData?.lastName,
              emailVerified: sessionInfo.customUserData?.emailVerified || false,
              roles: sessionInfo.customUserData?.roles || ['user'],
              createdAt: sessionInfo.customUserData?.createdAt || new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            
            setUser(atlasUser);
            setIsAuthenticated(true);
          } catch (error) {
            console.error('Failed to load user data:', error);
          }
        };
        
        loadUserData();
      } else if (event.action === 'SIGN_OUT') {
        setUser(null);
        setIsAuthenticated(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('supertokensSessionChange', handleSessionChange);
      
      return () => {
        window.removeEventListener('supertokensSessionChange', handleSessionChange);
      };
    }
  }, []);

  // Sign out function
  const signOut = async () => {
    try {
      await Session.signOut();
      setUser(null);
      setIsAuthenticated(false);
      // Redirect to sign in page
      redirectToAuth();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  // Refresh session function
  const refreshSession = async () => {
    try {
      await Session.attemptRefreshingSession();
    } catch (error) {
      console.error('Failed to refresh session:', error);
      // If refresh fails, redirect to auth
      redirectToAuth();
    }
  };

  // Check if user has a specific role
  const hasRole = (role: string): boolean => {
    return user?.roles.includes(role) || false;
  };

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    signOut,
    refreshSession,
    hasRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      <SuperTokensWrapper>
        {children}
      </SuperTokensWrapper>
    </AuthContext.Provider>
  );
}

// Auth Hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Protected Route Component
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <SessionAuth>
      {children}
    </SessionAuth>
  );
}
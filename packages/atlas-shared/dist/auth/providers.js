/**
 * Consolidated SuperTokens Auth Provider
 * Eliminates duplication between apps/platform and apps/web
 */
'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import SuperTokens from 'supertokens-auth-react';
import { SuperTokensWrapper } from 'supertokens-auth-react';
import Session from 'supertokens-auth-react/recipe/session';
import EmailPassword from 'supertokens-auth-react/recipe/emailpassword';
import { SessionAuth, redirectToAuth } from 'supertokens-auth-react/recipe/session';
import { createLogger } from '../monitoring';
const logger = createLogger('auth-provider');
// Create Auth Context
const AuthContext = createContext(undefined);
// SuperTokens initialization function
const initializeSuperTokens = (config) => {
    if (typeof window !== 'undefined') {
        SuperTokens.init({
            appInfo: {
                appName: 'Atlas Financial Platform',
                apiDomain: config.apiDomain,
                websiteDomain: config.websiteDomain,
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
                    sessionTokenFrontendDomain: config.sessionDomain,
                    cookieDomain: config.cookieDomain,
                    cookieSecure: config.cookieSecure,
                    cookieSameSite: config.cookieSecure ? 'strict' : 'lax',
                    sessionExpiredStatusCode: 401,
                    invalidClaimStatusCode: 403,
                    override: {
                        functions: (originalImplementation) => ({
                            ...originalImplementation,
                            // Custom session validation with user data enrichment
                            getSessionInformation: async function (input) {
                                const sessionInfo = await originalImplementation.getSessionInformation(input);
                                if (sessionInfo) {
                                    try {
                                        // Fetch additional user data from backend
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
                                    }
                                    catch (error) {
                                        logger.warn('Failed to fetch user profile', { error });
                                    }
                                }
                                return sessionInfo;
                            },
                        }),
                    },
                }),
            ],
            // Atlas branding and styling
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
        logger.info('SuperTokens initialized successfully');
    }
};
export function AuthProvider({ children, config }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState();
    const [sessionId, setSessionId] = useState();
    // Initialize SuperTokens on mount
    useEffect(() => {
        initializeSuperTokens(config);
    }, [config]);
    // Load session on mount
    useEffect(() => {
        const loadSession = async () => {
            try {
                const hasSession = await Session.doesSessionExist();
                if (hasSession) {
                    const sessionInfo = await Session.getSessionInformation();
                    // Extract user data from session
                    const atlasUser = {
                        id: sessionInfo.userId,
                        email: sessionInfo.customUserData?.email || '',
                        firstName: sessionInfo.customUserData?.firstName,
                        lastName: sessionInfo.customUserData?.lastName,
                        emailVerified: sessionInfo.customUserData?.emailVerified || false,
                        roles: sessionInfo.customUserData?.roles || ['user'],
                        permissions: sessionInfo.customUserData?.permissions || [],
                        createdAt: sessionInfo.customUserData?.createdAt || new Date().toISOString(),
                        lastLoginAt: new Date().toISOString(),
                        metadata: sessionInfo.customUserData?.metadata,
                    };
                    setUser(atlasUser);
                    setIsAuthenticated(true);
                    setToken(sessionInfo.accessToken);
                    setSessionId(sessionInfo.sessionId);
                    logger.info('Session loaded successfully', { userId: sessionInfo.userId });
                }
            }
            catch (error) {
                logger.error('Failed to load session', { error });
                setIsAuthenticated(false);
                setUser(null);
                setToken(undefined);
                setSessionId(undefined);
            }
            finally {
                setIsLoading(false);
            }
        };
        loadSession();
    }, []);
    // Session event listeners
    useEffect(() => {
        const handleSessionChange = (event) => {
            logger.debug('Session change event', { action: event.action });
            if (event.action === 'SESSION_CREATED' || event.action === 'REFRESH_SESSION') {
                // Reload user data when session changes
                const loadUserData = async () => {
                    try {
                        const sessionInfo = await Session.getSessionInformation();
                        const atlasUser = {
                            id: sessionInfo.userId,
                            email: sessionInfo.customUserData?.email || '',
                            firstName: sessionInfo.customUserData?.firstName,
                            lastName: sessionInfo.customUserData?.lastName,
                            emailVerified: sessionInfo.customUserData?.emailVerified || false,
                            roles: sessionInfo.customUserData?.roles || ['user'],
                            permissions: sessionInfo.customUserData?.permissions || [],
                            createdAt: sessionInfo.customUserData?.createdAt || new Date().toISOString(),
                            lastLoginAt: new Date().toISOString(),
                            metadata: sessionInfo.customUserData?.metadata,
                        };
                        setUser(atlasUser);
                        setIsAuthenticated(true);
                        setToken(sessionInfo.accessToken);
                        setSessionId(sessionInfo.sessionId);
                    }
                    catch (error) {
                        logger.error('Failed to load user data after session change', { error });
                    }
                };
                loadUserData();
            }
            else if (event.action === 'SIGN_OUT') {
                setUser(null);
                setIsAuthenticated(false);
                setToken(undefined);
                setSessionId(undefined);
                logger.info('User signed out');
            }
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('supertokensSessionChange', handleSessionChange);
            return () => {
                window.removeEventListener('supertokensSessionChange', handleSessionChange);
            };
        }
    }, []);
    const contextValue = {
        user,
        isLoading,
        isAuthenticated,
        token,
        sessionId,
        expiresAt: undefined, // Could be extracted from token
    };
    return (<AuthContext.Provider value={contextValue}>
      <SuperTokensWrapper>
        {children}
      </SuperTokensWrapper>
    </AuthContext.Provider>);
}
// Auth Hook
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
// Auth utility functions
export const authUtils = {
    signOut: async () => {
        try {
            await Session.signOut();
            logger.info('User signed out successfully');
            redirectToAuth();
        }
        catch (error) {
            logger.error('Failed to sign out', { error });
            throw error;
        }
    },
    refreshSession: async () => {
        try {
            await Session.attemptRefreshingSession();
            logger.debug('Session refreshed successfully');
        }
        catch (error) {
            logger.error('Failed to refresh session', { error });
            redirectToAuth();
            throw error;
        }
    },
    hasRole: (user, role) => {
        return user?.roles.includes(role) || false;
    },
    hasPermission: (user, resource, action) => {
        if (!user)
            return false;
        return user.permissions.some(permission => permission.resource === resource &&
            permission.action === action);
    },
    getUserDisplayName: (user) => {
        if (!user)
            return 'Unknown User';
        if (user.firstName && user.lastName) {
            return `${user.firstName} ${user.lastName}`;
        }
        if (user.firstName) {
            return user.firstName;
        }
        return user.email || 'Unknown User';
    }
};
export function ProtectedRoute({ children, requiredRole, requiredPermission, fallback }) {
    return (<SessionAuth fallback={fallback}>
      <PermissionGate requiredRole={requiredRole} requiredPermission={requiredPermission} fallback={fallback}>
        {children}
      </PermissionGate>
    </SessionAuth>);
}
function PermissionGate({ children, requiredRole, requiredPermission, fallback }) {
    const { user } = useAuth();
    // Check role requirement
    if (requiredRole && !authUtils.hasRole(user, requiredRole)) {
        return fallback || <div>Access Denied: Insufficient Role</div>;
    }
    // Check permission requirement
    if (requiredPermission &&
        !authUtils.hasPermission(user, requiredPermission.resource, requiredPermission.action)) {
        return fallback || <div>Access Denied: Insufficient Permissions</div>;
    }
    return <>{children}</>;
}
//# sourceMappingURL=providers.js.map

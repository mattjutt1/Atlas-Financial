/**
 * Consolidated Authentication Hooks
 * Eliminates duplicate auth hook patterns across applications
 */
import type { AtlasUser } from '../types';
/**
 * Enhanced authentication hook that combines SuperTokens session with backend user data
 * Consolidates useAuthentication patterns from apps/web
 */
export declare function useAuthentication(): {
    session: {
        user: AtlasUser | null;
        userId: any;
        accessToken: any;
        accessTokenPayload: any;
    } | null;
    status: string;
    isLoading: boolean;
    isAuthenticated: any;
    isUnauthenticated: boolean;
    user: AtlasUser | null;
    backendUser: any;
    userError: import("@apollo/client").ApolloError | undefined;
};
/**
 * Hook for checking user roles
 */
export declare function useRole(requiredRole: string): {
    hasRole: boolean;
    roles: import("../types").UserRole[];
    user: AtlasUser | null;
};
/**
 * Hook for checking user permissions
 */
export declare function usePermission(resource: string, action: string): {
    hasPermission: boolean;
    permissions: import("../types").Permission[];
    user: AtlasUser | null;
};
/**
 * Hook for managing auth state with local storage persistence
 */
export declare function useAuthState(): {
    lastActivity: Date;
    isSessionExpired: boolean;
    timeoutMinutes: number;
    session: {
        user: AtlasUser | null;
        userId: any;
        accessToken: any;
        accessTokenPayload: any;
    } | null;
    status: string;
    isLoading: boolean;
    isAuthenticated: any;
    isUnauthenticated: boolean;
    user: AtlasUser | null;
    backendUser: any;
    userError: import("@apollo/client").ApolloError | undefined;
};
/**
 * Hook for user profile management
 */
export declare function useUserProfile(): {
    user: AtlasUser | null;
    isUpdating: boolean;
    updateProfile: (updates: Partial<AtlasUser>) => Promise<any>;
    profileCompleteness: number;
    isComplete: boolean;
};
//# sourceMappingURL=hooks.d.ts.map

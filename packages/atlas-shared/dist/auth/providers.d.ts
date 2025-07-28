/**
 * Consolidated SuperTokens Auth Provider
 * Eliminates duplication between apps/platform and apps/web
 */
import React, { ReactNode } from 'react';
import type { AtlasUser, AuthContext as IAuthContext, AuthConfig } from '../types';
interface AuthProviderProps {
    children: ReactNode;
    config: AuthConfig;
}
export declare function AuthProvider({ children, config }: AuthProviderProps): React.JSX.Element;
export declare function useAuth(): IAuthContext;
export declare const authUtils: {
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
    hasRole: (user: AtlasUser | null, role: string) => boolean;
    hasPermission: (user: AtlasUser | null, resource: string, action: string) => boolean;
    getUserDisplayName: (user: AtlasUser | null) => string;
};
interface ProtectedRouteProps {
    children: ReactNode;
    requiredRole?: string;
    requiredPermission?: {
        resource: string;
        action: string;
    };
    fallback?: ReactNode;
}
export declare function ProtectedRoute({ children, requiredRole, requiredPermission, fallback }: ProtectedRouteProps): React.JSX.Element;
export {};
//# sourceMappingURL=providers.d.ts.map

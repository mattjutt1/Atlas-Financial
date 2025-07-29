import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User, UserSession, LoginCredentials } from '../types';
import { invoke } from '@tauri-apps/api/core';

interface AuthState {
  user: User | null;
  session: UserSession | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGIN_SUCCESS'; payload: { session: UserSession; sessionToken: string } }
  | { type: 'LOGOUT' }
  | { type: 'SESSION_VERIFIED'; payload: UserSession };

const initialState: AuthState = {
  user: null,
  session: null,
  sessionToken: localStorage.getItem('sessionToken'),
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'LOGIN_SUCCESS':
      localStorage.setItem('sessionToken', action.payload.sessionToken);
      return {
        ...state,
        session: action.payload.session,
        sessionToken: action.payload.sessionToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGOUT':
      localStorage.removeItem('sessionToken');
      return {
        ...state,
        user: null,
        session: null,
        sessionToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'SESSION_VERIFIED':
      return {
        ...state,
        session: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    default:
      return state;
  }
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  verifySession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await invoke<{ session: UserSession; session_token: string }>('login', {
        request: credentials,
      });

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          session: response.session,
          sessionToken: response.session_token,
        },
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as string });
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (state.sessionToken) {
        await invoke('logout', { sessionToken: state.sessionToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const verifySession = async () => {
    if (!state.sessionToken) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    try {
      const session = await invoke<UserSession>('verify_session', {
        sessionToken: state.sessionToken,
      });

      dispatch({ type: 'SESSION_VERIFIED', payload: session });
    } catch (error) {
      console.error('Session verification failed:', error);
      dispatch({ type: 'LOGOUT' });
    }
  };

  useEffect(() => {
    verifySession();
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    verifySession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

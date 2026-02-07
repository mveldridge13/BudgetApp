'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '@/services/auth.service';
import { tokenStorage } from '@/lib/storage';
import {
  User,
  UserProfile,
  LoginCredentials,
  RegisterData,
  UpdateProfileData,
} from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      if (tokenStorage.hasToken()) {
        // Trust the token if it exists (matching mobile app behavior)
        // The token will be validated on actual API calls
        // If invalid, the API will return 401 and we'll redirect to login
        setState({
          user: null, // Will be populated on first profile fetch
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        // Try to fetch profile in background (non-blocking)
        try {
          const profile = await authService.getProfile();
          setState((prev) => ({
            ...prev,
            user: profile as User,
          }));
        } catch (err) {
          // Profile fetch failed, but keep user authenticated
          // They'll be logged out if API returns 401 on other calls
        }
      } else {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authService.login(credentials);
      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw error;
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authService.register(data);
      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await authService.logout();
    } finally {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  const updateProfile = useCallback(async (data: UpdateProfileData) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const updatedProfile = await authService.updateProfile(data);

      setState((prev) => ({
        ...prev,
        user: { ...prev.user!, ...updatedProfile },
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw error;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.isAuthenticated) {
      return;
    }

    try {
      const profile = await authService.getProfile();
      setState((prev) => ({
        ...prev,
        user: profile as User,
      }));
    } catch (error) {
      // Profile refresh failed silently
    }
  }, [state.isAuthenticated]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    refreshProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

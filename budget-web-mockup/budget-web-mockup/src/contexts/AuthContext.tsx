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
  // Background profile mutations (currency, name, module toggles, etc.). Kept
  // separate from `isLoading` so they don't trip the ProtectedRoute auth gate,
  // which would unmount/remount the page and lose local UI state.
  isUpdatingProfile?: boolean;
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
      // The login response's `user` omits profile-only fields like
      // `moduleSettings` (the poker toggle), so settings would reset to their
      // defaults after a fresh credential login. Fetch the full profile — same
      // as the saved-token reload path in initAuth — so `user` is complete.
      let user = response.user;
      try {
        user = (await authService.getProfile()) as User;
      } catch {
        // Fall back to the login user if the profile fetch fails.
      }
      setState({
        user,
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
      // Match login: enrich with the full profile so profile-only fields
      // (e.g. moduleSettings) are present from the start.
      let user = response.user;
      try {
        user = (await authService.getProfile()) as User;
      } catch {
        // Fall back to the register user if the profile fetch fails.
      }
      setState({
        user,
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
    // Use a dedicated flag, not `isLoading`, so a background profile update
    // doesn't trigger the full-screen auth gate (which remounts the page).
    setState((prev) => ({ ...prev, isUpdatingProfile: true, error: null }));

    try {
      const updatedProfile = await authService.updateProfile(data);

      setState((prev) => ({
        ...prev,
        user: { ...prev.user!, ...updatedProfile },
        isUpdatingProfile: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed';
      setState((prev) => ({
        ...prev,
        isUpdatingProfile: false,
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

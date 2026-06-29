import { api } from './api';
import { tokenStorage, storage } from '@/lib/storage';
import { API_CONFIG } from '@/config/api.config';
import {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  UserProfile,
  UpdateProfileData,
  ChangePasswordData,
  OnboardingStatus,
} from '@/types';
import { getTimezone, getCurrencyFromTimezone } from '@/lib/utils';

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);

    // API returns access_token, not token
    const token = response.access_token || response.token;
    if (token) {
      tokenStorage.setToken(token);
      // Update API client's expiry tracking for proactive refresh
      api.updateTokenExpiry(token);
    }

    // Store refresh token if provided
    if (response.refresh_token) {
      tokenStorage.setRefreshToken(response.refresh_token);
    }

    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    // Auto-detect timezone and currency if not provided
    const timezone = data.timezone || getTimezone();
    const currency = data.currency || getCurrencyFromTimezone(timezone);

    const response = await api.post<AuthResponse>('/auth/register', {
      ...data,
      timezone,
      currency,
    });

    // API returns access_token, not token (same as login)
    const token = response.access_token || response.token;
    if (token) {
      tokenStorage.setToken(token);
      // Update API client's expiry tracking for proactive refresh
      api.updateTokenExpiry(token);
    }

    // Store refresh token if provided
    if (response.refresh_token) {
      tokenStorage.setRefreshToken(response.refresh_token);
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } finally {
      this.clearSession();
    }
  }

  clearSession(): void {
    tokenStorage.clearAll();
    storage.remove(API_CONFIG.storageKeys.userProfile);
    storage.remove(API_CONFIG.storageKeys.appSettings);
    // Clear API client's expiry tracking and cancel scheduled refresh
    api.clearTokenExpiry();
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        this.clearSession();
        return false;
      }

      const data = await response.json();
      const newToken = data.access_token || data.token;
      if (newToken) {
        tokenStorage.setToken(newToken);
        // Update API client's expiry tracking for proactive refresh
        api.updateTokenExpiry(newToken);
      }

      // Token rotation: store new refresh token if provided
      if (data.refresh_token) {
        tokenStorage.setRefreshToken(data.refresh_token);
      }

      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  async getProfile(): Promise<UserProfile> {
    return api.get<UserProfile>('/auth/profile');
  }

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    const response = await api.put<UserProfile>('/auth/profile', data);
    return response;
  }

  // Income-specific endpoints (matching mobile app)
  async getIncomeProfile(): Promise<UserProfile> {
    return api.get<UserProfile>('/users/income');
  }

  async updateIncomeProfile(incomeData: UpdateProfileData): Promise<UserProfile> {
    const response = await api.put<UserProfile>('/users/income', incomeData);
    return response;
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    await api.post('/auth/change-password', data);
  }

  async getOnboardingStatus(): Promise<OnboardingStatus> {
    return api.get<OnboardingStatus>('/auth/onboarding-status');
  }

  async updateOnboarding(data: Partial<OnboardingStatus>): Promise<void> {
    await api.patch('/users/onboarding', data);
  }

  isAuthenticated(): boolean {
    return tokenStorage.hasToken();
  }

  getToken(): string | null {
    return tokenStorage.getToken();
  }

  // Extract user ID from JWT token
  getUserIdFromToken(): string | null {
    const token = tokenStorage.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.id || payload.userId || null;
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();

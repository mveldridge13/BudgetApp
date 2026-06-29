export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  timezone?: string;
  currency?: string;
}

export interface AuthResponse {
  token?: string;
  access_token?: string; // API returns access_token
  refresh_token?: string; // Refresh token for token renewal
  user: User;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  timezone: string;
  currency: string;
  hasSeenBalanceCardTour: boolean;
  hasSeenAddTransactionTour: boolean;
  hasSeenTransactionSwipeTour: boolean;
  setupComplete: boolean;
  hasSeenWelcome: boolean;
  income?: number;
  incomeFrequency?: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';
  nextPayDate?: string;
  createdAt?: string;
  updatedAt?: string;
  // Per-user feature module toggles (backend `moduleSettings` JSON column).
  moduleSettings?: Record<string, boolean>;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  timezone: string;
  currency: string;
  balance?: number;
  leftToSpend?: number;
  username?: string | null;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  timezone?: string;
  currency?: string;
  income?: number;
  incomeFrequency?: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';
  nextPayDate?: string;
  setupComplete?: boolean;
  hasSeenWelcome?: boolean;
  // Partial module toggles; backend merges last-write-wins per module.
  moduleSettings?: Record<string, boolean>;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface OnboardingStatus {
  hasSeenWelcome: boolean;
  hasSeenBalanceCardTour: boolean;
  hasSeenAddTransactionTour: boolean;
  hasSeenTransactionSwipeTour: boolean;
  setupComplete: boolean;
}

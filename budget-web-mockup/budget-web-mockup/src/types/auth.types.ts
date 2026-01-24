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
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  timezone: string;
  currency: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  timezone?: string;
  currency?: string;
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

// src/services/auth/AuthenticationManager.ts
import {
  signUp,
  signIn,
  signOut,
  confirmSignUp,
  resendSignUpCode,
  getCurrentUser,
  updateUserAttributes,
  resetPassword,
  confirmResetPassword,
  signInWithRedirect,
} from 'aws-amplify/auth';
import {StorageCoordinator} from '../storage';

export interface UserAuthData {
  userId: string;
  email: string;
  displayName?: string;
  emailVerified: boolean;
  createdAt: number;
  lastLoginAt: number;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notificationsEnabled: boolean;
  syncEnabled: boolean;
  [key: string]: any;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName?: string;
}

export interface FederatedSignInOptions {
  provider: 'Google' | 'Facebook' | 'Apple';
}

export class AuthenticationManager {
  private storage: StorageCoordinator;
  private currentUser: UserAuthData | null = null;

  constructor(storage: StorageCoordinator) {
    this.storage = storage;
  }

  async initialize(): Promise<void> {
    console.log('🔍 Initializing AuthenticationManager...');

    try {
      console.log('📝 Checking for existing Cognito user...');
      const cognitoUser = await getCurrentUser();
      console.log('✅ Found Cognito user:', cognitoUser);

      if (cognitoUser) {
        let userData = await this.storage.getItem<UserAuthData>(
          'auth.currentUser',
        );
        console.log('💾 Stored user data:', userData);

        if (!userData) {
          console.log('🔄 Creating user data from Cognito user...');
          userData = this.mapCognitoToUserData(cognitoUser);
          await this.storage.setItem('auth.currentUser', userData);
        }

        this.currentUser = userData;
        console.log('✅ User authenticated:', userData.email);
      }
    } catch (error) {
      console.log('❌ No authenticated user found:', error);
      await this.storage.removeItem('auth.currentUser');
    }
  }

  async register(registerData: RegisterData): Promise<void> {
    try {
      const {email, password, displayName} = registerData;

      const signUpResult = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            ...(displayName && {name: displayName}),
          },
        },
      });

      console.log(
        'Registration successful, verification required:',
        signUpResult.userId,
      );
    } catch (error) {
      console.error('Registration failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async confirmRegistration(
    email: string,
    confirmationCode: string,
  ): Promise<void> {
    try {
      await confirmSignUp({
        username: email,
        confirmationCode,
      });
      console.log('Email verification successful');
    } catch (error) {
      console.error('Email confirmation failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async resendConfirmationCode(email: string): Promise<void> {
    try {
      await resendSignUpCode({
        username: email,
      });
      console.log('Confirmation code resent');
    } catch (error) {
      console.error('Resend confirmation failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async login(credentials: LoginCredentials): Promise<UserAuthData> {
    try {
      const {email, password} = credentials;

      const signInResult = await signIn({
        username: email,
        password,
      });

      if (signInResult.isSignedIn) {
        const cognitoUser = await getCurrentUser();
        const userData = this.mapCognitoToUserData(cognitoUser);

        await this.storage.setItem('auth.currentUser', userData);
        this.currentUser = userData;

        console.log('Login successful:', userData.email);
        return userData;
      } else {
        throw new Error('Sign-in not completed');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async federatedSignIn(options: FederatedSignInOptions): Promise<void> {
    try {
      console.log(`Starting ${options.provider} sign-in...`);

      await signInWithRedirect({
        provider: {
          custom: options.provider,
        },
      });

      // Note: After redirect, the user will be automatically authenticated
      // when they return to the app. The app should check authentication
      // status in the initialize() method or App component
    } catch (error) {
      console.error(`${options.provider} sign-in failed:`, error);
      throw this.handleAuthError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut();
      await this.storage.removeMultiple(['auth.currentUser', 'auth.tempData']);
      this.currentUser = null;
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout failed:', error);
      await this.storage.removeMultiple(['auth.currentUser', 'auth.tempData']);
      this.currentUser = null;
    }
  }

  async updateProfile(
    updates: Partial<Pick<UserAuthData, 'displayName'>>,
  ): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    try {
      if (updates.displayName) {
        await updateUserAttributes({
          userAttributes: {
            name: updates.displayName,
          },
        });
      }

      this.currentUser = {...this.currentUser, ...updates};
      await this.storage.setItem('auth.currentUser', this.currentUser);
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Profile update failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async updatePreferences(
    preferences: Partial<UserPreferences>,
  ): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    try {
      const updatedPreferences = {
        ...this.currentUser.preferences,
        ...preferences,
      };
      this.currentUser.preferences = updatedPreferences;
      await this.storage.setItem('auth.currentUser', this.currentUser);
      console.log('Preferences updated successfully');
    } catch (error) {
      console.error('Preferences update failed:', error);
      throw new Error('Failed to update preferences');
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await resetPassword({
        username: email,
      });
      console.log('Password reset code sent');
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async confirmPasswordReset(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      });
      console.log('Password reset successful');
    } catch (error) {
      console.error('Password reset confirmation failed:', error);
      throw this.handleAuthError(error);
    }
  }

  // Getters
  get isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  get user(): UserAuthData | null {
    return this.currentUser;
  }

  get userEmail(): string | null {
    return this.currentUser?.email || null;
  }

  get isEmailVerified(): boolean {
    return this.currentUser?.emailVerified ?? false;
  }

  // Private helper methods
  private mapCognitoToUserData(cognitoUser: any): UserAuthData {
    const attributes = cognitoUser.userAttributes || {};

    return {
      userId: cognitoUser.userId || attributes.sub,
      email: attributes.email,
      displayName: attributes.name || attributes.email?.split('@')[0],
      emailVerified: attributes.email_verified === 'true',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      preferences: this.getDefaultPreferences(),
    };
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'system',
      language: 'en',
      notificationsEnabled: true,
      syncEnabled: true,
    };
  }

  private handleAuthError(error: any): Error {
    const errorName = error.name || error.code;

    switch (errorName) {
      case 'UserNotConfirmedException':
        return new Error('Please verify your email address before signing in');
      case 'NotAuthorizedException':
        return new Error('Invalid email or password');
      case 'UserNotFoundException':
        return new Error('No account found with this email address');
      case 'InvalidPasswordException':
        return new Error('Password does not meet requirements');
      case 'UsernameExistsException':
        return new Error('An account with this email already exists');
      case 'CodeMismatchException':
        return new Error('Invalid verification code');
      case 'ExpiredCodeException':
        return new Error('Verification code has expired');
      case 'LimitExceededException':
        return new Error('Too many attempts. Please try again later');
      default:
        return new Error(error.message || 'Authentication failed');
    }
  }
}

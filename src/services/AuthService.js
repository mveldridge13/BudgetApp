import TrendAPI from './TrendAPIService';

/**
 * Authentication Service
 * Manages user login, registration, and authentication state
 */
class AuthService {
  constructor() {
    this.currentUser = null;
    this.isInitialized = false;
  }

  // Initialize authentication service
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize the API service
      await TrendAPI.initialize();

      // Check if user has a stored token
      if (TrendAPI.isAuthenticated()) {
        // For now, we'll assume the token is valid if it exists
        // TODO: Add profile endpoint to verify token
        this.currentUser = {authenticated: true};
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
      this.isInitialized = true;
      return false;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser && TrendAPI.isAuthenticated();
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Login user
  async login(email, password) {
    try {
      const result = await TrendAPI.login(email, password);

      if (result.success) {
        this.currentUser = result.user;
        return {
          success: true,
          user: result.user,
          message: 'Login successful',
        };
      } else {
        return {
          success: false,
          error: result.error,
          message: result.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Login failed. Please try again.',
      };
    }
  }

  // Register new user
  async register(userData) {
    try {
      const result = await TrendAPI.register({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
      });

      if (result.success) {
        this.currentUser = result.user;
        return {
          success: true,
          user: result.user,
          message: 'Account created successfully',
        };
      } else {
        return {
          success: false,
          error: result.error,
          message: result.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Registration failed. Please try again.',
      };
    }
  }

  // Logout user
  async logout() {
    try {
      // Call backend logout (if endpoint exists)
      try {
        await TrendAPI.logout();
      } catch (error) {
        // Ignore logout endpoint errors
      }

      // Clear local user data
      this.currentUser = null;

      return {success: true};
    } catch (error) {
      // Even if backend call fails, clear local data
      this.currentUser = null;
      await TrendAPI.clearToken();
      return {success: true};
    }
  }

  // Refresh user profile (when profile endpoint is available)
  async refreshProfile() {
    if (!this.isAuthenticated()) {
      return {success: false, error: 'Not authenticated'};
    }

    try {
      // TODO: Implement when profile endpoint is available
      // const userProfile = await TrendAPI.getUserProfile();
      // this.currentUser = userProfile;
      return {success: true, user: this.currentUser};
    } catch (error) {
      // If token is invalid, logout
      if (error.message.includes('Authentication')) {
        await this.logout();
      }
      return {success: false, error: error.message};
    }
  }

  // Validate email format
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength
  validatePassword(password) {
    const errors = [];

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Validate registration data
  validateRegistration(userData) {
    const errors = [];

    if (!userData.firstName || userData.firstName.trim().length === 0) {
      errors.push('First name is required');
    }

    if (!userData.lastName || userData.lastName.trim().length === 0) {
      errors.push('Last name is required');
    }

    if (!userData.email || !this.validateEmail(userData.email)) {
      errors.push('Valid email is required');
    }

    const passwordValidation = this.validatePassword(userData.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    if (userData.password !== userData.confirmPassword) {
      errors.push('Passwords do not match');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Get authentication status for debugging
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      hasCurrentUser: !!this.currentUser,
      currentUserEmail: this.currentUser?.email || 'None',
      hasToken: TrendAPI.isAuthenticated(),
    };
  }
}

// Export singleton instance
export default new AuthService();

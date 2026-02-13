// services/TrendAPIService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import sanitizeInput from '../utils/sanitizer';

const API_CONFIG = {
  baseURL: 'http://trend-alb-1755058843.ap-southeast-2.elb.amazonaws.com/api/v1', // AWS Production Backend
  timeout: 30000, // Increased timeout for mobile devices
};

class TrendAPIService {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.token = null;
    this.refreshToken = null;
    // Token refresh state (prevents concurrent refresh requests)
    this.isRefreshing = false;
    this.refreshPromise = null;
    // Proactive token refresh
    this.tokenExpiry = null; // Timestamp when access token expires
    this.refreshTimer = null; // Timer for proactive refresh
    this.REFRESH_BUFFER = 2 * 60 * 1000; // Refresh 2 minutes before expiry
    // Login rate limiting (client-side backup - server enforces stricter limits)
    this.loginAttempts = 0;
    this.lastFailedAttempt = 0;
    this.lockoutDuration = 5 * 60 * 1000; // 5 minutes
    this.maxAttempts = 3; // Maximum login attempts before lockout
  }

  async initialize() {
    try {
      // 🔐 SECURE: Try loading access token from Keychain
      const credentials = await Keychain.getGenericPassword({
        service: 'com.trendbudget.auth',
      });

      if (credentials) {
        this.token = credentials.password;
        // Extract expiry from loaded token for proactive refresh
        this.tokenExpiry = this.decodeTokenExpiry(this.token);
        console.log('🔐 Access token loaded from secure Keychain');
      }

      // 🔐 SECURE: Try loading refresh token from Keychain
      const refreshCredentials = await Keychain.getGenericPassword({
        service: 'com.trendbudget.refresh',
      });

      if (refreshCredentials) {
        this.refreshToken = refreshCredentials.password;
        console.log('🔐 Refresh token loaded from secure Keychain');
      }

      // 🔄 MIGRATION: Check old AsyncStorage location for existing users
      if (!this.token) {
        const oldToken = await AsyncStorage.getItem('trend_auth_token');
        if (oldToken) {
          console.log('🔄 Migrating token from AsyncStorage to secure Keychain');

          // Save to Keychain
          await this.saveToken(oldToken);

          // Remove from old insecure location
          await AsyncStorage.removeItem('trend_auth_token');

          this.token = oldToken;
          console.log('✅ Token migration completed successfully');
        }
      }

      if (!this.token) {
        console.log('No authentication token found');
      } else {
        // Schedule proactive refresh for loaded token
        this.scheduleProactiveRefresh();
      }
      return true;
    } catch (error) {
      console.error('Failed to initialize API service:', error);
      return false;
    }
  }

  async saveToken(token) {
    try {
      this.token = token;

      // Extract and store token expiry for proactive refresh
      this.tokenExpiry = this.decodeTokenExpiry(token);
      if (this.tokenExpiry) {
        console.log(`🔐 Token expires at: ${new Date(this.tokenExpiry).toISOString()}`);
      }

      // Schedule proactive refresh before token expires
      this.scheduleProactiveRefresh();

      // 🔐 SECURE: Save access token to iOS Keychain (hardware-encrypted)
      await Keychain.setGenericPassword('trend_user', token, {
        service: 'com.trendbudget.auth',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
      });

      console.log('🔐 Access token saved to secure Keychain');
      return true;
    } catch (error) {
      console.error('Failed to save access token:', error);
      return false;
    }
  }

  async saveRefreshToken(refreshToken) {
    try {
      this.refreshToken = refreshToken;

      // 🔐 SECURE: Save refresh token to iOS Keychain (separate entry)
      await Keychain.setGenericPassword('trend_refresh', refreshToken, {
        service: 'com.trendbudget.refresh',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
      });

      console.log('🔐 Refresh token saved to secure Keychain');
      return true;
    } catch (error) {
      console.error('Failed to save refresh token:', error);
      return false;
    }
  }

  async clearToken() {
    try {
      this.token = null;
      this.refreshToken = null;
      this.tokenExpiry = null;

      // Cancel any scheduled proactive refresh
      this.cancelScheduledRefresh();

      // 🔐 SECURE: Remove access token from Keychain
      await Keychain.resetGenericPassword({
        service: 'com.trendbudget.auth',
      });

      // 🔐 SECURE: Remove refresh token from Keychain
      await Keychain.resetGenericPassword({
        service: 'com.trendbudget.refresh',
      });

      // 🔄 CLEANUP: Also remove from old AsyncStorage location (if it exists)
      await AsyncStorage.removeItem('trend_auth_token');

      console.log('🔐 All tokens cleared from secure storage');
      return true;
    } catch (error) {
      console.error('Failed to clear tokens:', error);
      return false;
    }
  }

  isAuthenticated() {
    return !!this.token;
  }

  // ============================================================================
  // PROACTIVE TOKEN REFRESH METHODS
  // ============================================================================

  /**
   * Decode JWT token to extract expiry timestamp
   * @param {string} token - JWT access token
   * @returns {number|null} - Expiry timestamp in milliseconds, or null if invalid
   */
  decodeTokenExpiry(token) {
    try {
      if (!token) {
        return null;
      }
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      const payload = parts[1];
      // Add padding if needed for base64 decoding
      const paddedPayload = payload + '='.repeat((4 - (payload.length % 4)) % 4);
      // eslint-disable-next-line no-undef
      const decoded = JSON.parse(atob(paddedPayload));
      return decoded.exp ? decoded.exp * 1000 : null; // Convert to milliseconds
    } catch (error) {
      console.error('🔄 Failed to decode token expiry:', error);
      return null;
    }
  }

  /**
   * Schedule a proactive token refresh before the token expires
   * This prevents 401 errors by refreshing ahead of time
   */
  scheduleProactiveRefresh() {
    // Clear any existing timer
    this.cancelScheduledRefresh();

    if (!this.tokenExpiry || !this.token) {
      return;
    }

    const now = Date.now();
    const refreshTime = this.tokenExpiry - this.REFRESH_BUFFER;
    const delay = refreshTime - now;

    if (delay <= 0) {
      // Token already expired or about to expire, refresh immediately
      console.log('🔄 Token expired or expiring soon, refreshing immediately');
      this.tryRefreshToken();
      return;
    }

    console.log(`🔄 Scheduling proactive refresh in ${Math.round(delay / 1000)}s (token expires at ${new Date(this.tokenExpiry).toISOString()})`);
    this.refreshTimer = setTimeout(() => {
      console.log('🔄 Proactive token refresh triggered');
      this.tryRefreshToken();
    }, delay);
  }

  /**
   * Cancel any scheduled proactive refresh
   */
  cancelScheduledRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Check and refresh token when app comes to foreground
   * Called by BiometricAuth when app state changes to 'active'
   */
  async checkAndRefreshOnForeground() {
    if (!this.token || !this.tokenExpiry) {
      return;
    }

    const now = Date.now();
    const timeUntilExpiry = this.tokenExpiry - now;

    // If token expires in less than 5 minutes, refresh now
    if (timeUntilExpiry < 5 * 60 * 1000) {
      console.log('🔄 Token expiring soon, refreshing on foreground');
      await this.tryRefreshToken();
    } else {
      // Re-schedule proactive refresh (timer may have been cleared while in background)
      console.log('🔄 App foregrounded, re-scheduling proactive refresh');
      this.scheduleProactiveRefresh();
    }
  }

  // Helper method to build query string
  buildQueryString(params) {
    const cleanParams = {};

    // Clean up parameters - remove null/undefined values
    Object.keys(params).forEach(key => {
      if (
        params[key] !== null &&
        params[key] !== undefined &&
        params[key] !== ''
      ) {
        cleanParams[key] = params[key];
      }
    });

    return new URLSearchParams(cleanParams).toString();
  }

  async makeRequest(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      requiresAuth = true,
      headers = {},
      skipAuthRefresh = false, // Skip refresh on retry to prevent infinite loop
    } = options;

    const url = `${this.baseURL}${endpoint}`;

    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (requiresAuth && this.token) {
      requestHeaders.Authorization = `Bearer ${this.token}`;
    }

    // Create timeout signal
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    const requestConfig = {
      method,
      headers: requestHeaders,
      signal: controller.signal,
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      requestConfig.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, requestConfig);
      clearTimeout(timeoutId);

      // Handle 401 Unauthorized - attempt token refresh
      if (response.status === 401 && !skipAuthRefresh) {
        console.log('🔄 Received 401, attempting token refresh...');
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // Retry original request with new token
          console.log('🔄 Token refreshed, retrying original request...');
          return this.makeRequest(endpoint, {...options, skipAuthRefresh: true});
        }
        // Refresh failed - clear tokens and throw auth error
        await this.clearToken();
        throw new Error('Session expired. Please login again.');
      }

      // Handle 429 Too Many Requests (rate limiting)
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        const retryAfter = response.headers.get('Retry-After') || '60';
        throw new Error(
          errorData.message ||
            `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        // Try to parse as JSON for better error messages (e.g., account lockout)
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `API Error ${response.status}: ${errorText}`);
        } catch {
          throw new Error(`API Error ${response.status}: ${errorText}`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        // Parse JSON response
        const data = await response.json();
        return data;
      } else {
        return null;
      }
    } catch (error) {
      clearTimeout(timeoutId);

      // Enhance error message for better debugging
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(
          `Network request failed - unable to connect to ${url}. Check server availability and network connection.`,
        );
      } else if (
        error.name === 'AbortError' ||
        error.message.includes('timeout')
      ) {
        throw new Error(
          `Request timeout - server at ${url} did not respond within ${API_CONFIG.timeout}ms`,
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * Attempt to refresh the access token using the refresh token
   * Handles concurrent refresh requests by waiting for the first one to complete
   */
  async tryRefreshToken() {
    // If no refresh token, can't refresh
    if (!this.refreshToken) {
      console.log('🔄 No refresh token available');
      return false;
    }

    // If already refreshing, wait for that to complete
    if (this.isRefreshing) {
      console.log('🔄 Refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._doRefreshToken();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  async _doRefreshToken() {
    try {
      console.log('🔄 Calling /auth/refresh endpoint...');
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        console.log('🔄 Refresh token request failed:', response.status);
        return false;
      }

      const data = await response.json();

      // Save new access token
      if (data.access_token) {
        await this.saveToken(data.access_token);
        console.log('🔄 New access token saved');
      }

      // Handle token rotation - save new refresh token if provided
      if (data.refresh_token) {
        await this.saveRefreshToken(data.refresh_token);
        console.log('🔄 Refresh token rotated and saved');
      }

      return true;
    } catch (error) {
      console.error('🔄 Token refresh failed:', error);
      return false;
    }
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  async login(email, password) {
    try {
      // Check if user is locked out due to too many failed attempts
      const now = Date.now();
      const timeSinceLastAttempt = now - this.lastFailedAttempt;

      if (this.loginAttempts >= this.maxAttempts && timeSinceLastAttempt < this.lockoutDuration) {
        const remainingTime = Math.ceil((this.lockoutDuration - timeSinceLastAttempt) / 60000);
        throw new Error(`Too many login attempts. Please try again in ${remainingTime} minute(s).`);
      }

      // Reset attempts if lockout period has passed
      if (timeSinceLastAttempt >= this.lockoutDuration) {
        this.loginAttempts = 0;
      }

      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: {
          email: email.trim(),
          password: password,
        },
        requiresAuth: false,
      });

      if (response && response.access_token) {
        await this.saveToken(response.access_token);

        // 🔐 Save refresh token for automatic session renewal
        if (response.refresh_token) {
          await this.saveRefreshToken(response.refresh_token);
        }

        // Reset login attempts on successful login
        this.loginAttempts = 0;
        return {
          success: true,
          user: response.user,
          token: response.access_token,
        };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      // Provide more user-friendly error messages
      let userMessage = error.message;
      if (
        error.message.includes('fetch') ||
        error.message.includes('Network')
      ) {
        userMessage =
          'Unable to connect to server. Please check your internet connection and try again.';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Connection timeout. The server may be unavailable.';
      } else if (
        error.message.includes('401') ||
        error.message.includes('Unauthorized')
      ) {
        userMessage = 'Invalid email or password.';
      } else if (error.message.includes('locked') || error.message.includes('attempts remaining')) {
        // Account lockout - pass through the server's message
        userMessage = error.message;
      } else if (error.message.includes('Too many requests')) {
        // Rate limiting - pass through the server's message
        userMessage = error.message;
      }

      // Increment login attempts on failed login (except for rate limit/lockout errors)
      if (!error.message.includes('Too many') && !error.message.includes('locked')) {
        this.loginAttempts++;
        this.lastFailedAttempt = Date.now();
      }

      return {
        success: false,
        error: userMessage,
      };
    }
  }

  async register(userData) {
    try {
      const response = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: {
          firstName: sanitizeInput.name(userData.firstName),
          lastName: sanitizeInput.name(userData.lastName),
          email: sanitizeInput.email(userData.email),
          password: userData.password, // Don't sanitize password
          username: userData.username ? sanitizeInput.text(userData.username) : undefined,
          currency: userData.currency || 'USD',
          timezone: userData.timezone || 'UTC',
        },
        requiresAuth: false,
      });

      if (response && response.access_token) {
        await this.saveToken(response.access_token);

        // 🔐 Save refresh token for automatic session renewal
        if (response.refresh_token) {
          await this.saveRefreshToken(response.refresh_token);
        }

        return {
          success: true,
          user: response.user,
          token: response.access_token,
        };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      let userMessage = error.message;
      // Handle rate limiting for registration
      if (error.message.includes('Too many requests')) {
        userMessage = error.message;
      }
      return {
        success: false,
        error: userMessage,
      };
    }
  }

  async logout() {
    try {
      // 🔐 Send refresh token to backend to revoke it
      if (this.refreshToken) {
        await this.makeRequest('/auth/logout', {
          method: 'POST',
          body: {
            refresh_token: this.refreshToken,
          },
          skipAuthRefresh: true, // Don't try to refresh during logout
        });
        console.log('🔐 Refresh token revoked on server');
      }
    } catch (error) {
      // Logout endpoint may fail, but still clear local state
      console.log('🔐 Backend logout failed (continuing with local cleanup):', error.message);
    } finally {
      await this.clearToken();
    }
  }

  async getUserProfile() {
    return this.makeRequest('/auth/profile');
  }

  async updateUserProfile(profileData) {
    // Create a sanitized copy
    const sanitizedData = {...profileData};

    // Sanitize text fields if present
    if (sanitizedData.firstName) {
      sanitizedData.firstName = sanitizeInput.name(sanitizedData.firstName);
    }
    if (sanitizedData.lastName) {
      sanitizedData.lastName = sanitizeInput.name(sanitizedData.lastName);
    }
    if (sanitizedData.email) {
      sanitizedData.email = sanitizeInput.email(sanitizedData.email);
    }

    return this.makeRequest('/auth/profile', {
      method: 'PUT',
      body: sanitizedData,
    });
  }

  // ============================================================================
  // USER MANAGEMENT METHODS
  // ============================================================================

  async updateOnboardingStatus(onboardingData) {
    return this.makeRequest('/users/onboarding', {
      method: 'PATCH',
      body: onboardingData,
    });
  }

  async updateIncomeProfile(incomeData) {
    return this.makeRequest('/users/income', {
      method: 'PUT',
      body: incomeData,
    });
  }

  async getIncomeProfile() {
    return this.makeRequest('/users/income');
  }

  async deactivateAccount() {
    return this.makeRequest('/users/profile', {
      method: 'DELETE',
    });
  }

  async deleteAccount() {
    return this.makeRequest('/users/account', {
      method: 'DELETE',
    });
  }

  async changePassword(passwordData) {
    return this.makeRequest('/auth/change-password', {
      method: 'POST',
      body: passwordData,
    });
  }

  async exportUserData() {
    return this.makeRequest('/users/export-data', {
      method: 'POST',
    });
  }

  // ============================================================================
  // TRANSACTION METHODS
  // ============================================================================

  async getTransactions(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/transactions?${queryString}`
      : '/transactions';
    return this.makeRequest(endpoint);
  }

  async createTransaction(transactionData) {
    const {category, ...cleanedData} = transactionData;

    // Sanitize text fields
    if (cleanedData.description) {
      cleanedData.description = sanitizeInput.text(cleanedData.description);
    }
    if (cleanedData.notes) {
      cleanedData.notes = sanitizeInput.description(cleanedData.notes);
    }

    const response = await this.makeRequest('/transactions', {
      method: 'POST',
      body: cleanedData,
    });

    // Handle different possible response formats
    if (response?.transaction) {
      return response.transaction;
    } else if (response?.data) {
      return response.data;
    } else if (response && typeof response === 'object' && response.id) {
      return response;
    } else {
      return response;
    }
  }

  async updateTransaction(id, transactionData) {
    const {category, ...cleanedData} = transactionData;

    // Sanitize text fields
    if (cleanedData.description) {
      cleanedData.description = sanitizeInput.text(cleanedData.description);
    }
    if (cleanedData.notes) {
      cleanedData.notes = sanitizeInput.description(cleanedData.notes);
    }

    const response = await this.makeRequest(`/transactions/${id}`, {
      method: 'PATCH',
      body: cleanedData,
    });

    if (response?.transaction) {
      return response.transaction;
    } else if (response?.data) {
      return response.data;
    } else if (response && typeof response === 'object' && response.id) {
      return response;
    } else {
      console.warn(
        'Update response missing transaction data, returning partial response',
      );
      return response || {id, ...cleanedData};
    }
  }

  async getTransactionById(id) {
    const response = await this.makeRequest(`/transactions/${id}`);

    if (response?.transaction) {
      return response.transaction;
    } else if (response?.data) {
      return response.data;
    } else if (response && typeof response === 'object' && response.id) {
      return response;
    } else {
      return response;
    }
  }

  async deleteTransaction(id) {
    return this.makeRequest(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // ANALYTICS METHODS - ENHANCED WITH DISCRETIONARY BREAKDOWN
  // ============================================================================

  async getTransactionAnalytics(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/transactions/analytics?${queryString}`
      : '/transactions/analytics';

    return this.makeRequest(endpoint);
  }

  // ✅ NEW: Get bills analytics - backend-calculated bills data
  async getBillsAnalytics(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/transactions/bills-analytics?${queryString}`
      : '/transactions/bills-analytics';
    return this.makeRequest(endpoint);
  }

  // ✅ NEW: Get income analytics - backend-calculated income data
  async getIncomeAnalytics(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/transactions/income-analytics?${queryString}`
      : '/transactions/income-analytics';
    return this.makeRequest(endpoint);
  }

  // ✅ NEW: Get discretionary breakdown for daily spending analysis
  async getDiscretionaryBreakdown(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/transactions/discretionary-breakdown?${queryString}`
      : '/transactions/discretionary-breakdown';

    return this.makeRequest(endpoint);
  }

  // ✅ NEW: Get day/time spending patterns analysis
  async getDayTimePatterns(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/transactions/day-time-patterns?${queryString}`
      : '/transactions/day-time-patterns';

    return this.makeRequest(endpoint);
  }

  async getTransactionSummary(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/transactions/summary?${queryString}`
      : '/transactions/summary';

    return this.makeRequest(endpoint);
  }

  async getRecentTransactions() {
    return this.makeRequest('/transactions/recent');
  }

  async getTransactionsByCategory(categoryId, filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/transactions/by-category/${categoryId}?${queryString}`
      : `/transactions/by-category/${categoryId}`;

    return this.makeRequest(endpoint);
  }

  async getTransactionsByBudget(budgetId, filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/transactions/by-budget/${budgetId}?${queryString}`
      : `/transactions/by-budget/${budgetId}`;

    return this.makeRequest(endpoint);
  }

  async searchTransactions(searchData) {
    return this.makeRequest('/transactions/search', {
      method: 'POST',
      body: searchData,
    });
  }

  // ============================================================================
  // BUDGET METHODS
  // ============================================================================

  async getBudgets(pagination = {}) {
    const queryString = this.buildQueryString(pagination);
    const endpoint = queryString ? `/budgets?${queryString}` : '/budgets';
    return this.makeRequest(endpoint);
  }

  async createBudget(budgetData) {
    return this.makeRequest('/budgets', {
      method: 'POST',
      body: budgetData,
    });
  }

  async getBudgetById(id) {
    return this.makeRequest(`/budgets/${id}`);
  }

  async updateBudget(id, budgetData) {
    return this.makeRequest(`/budgets/${id}`, {
      method: 'PUT',
      body: budgetData,
    });
  }

  async deleteBudget(id) {
    return this.makeRequest(`/budgets/${id}`, {
      method: 'DELETE',
    });
  }

  async getBudgetAnalytics(id) {
    return this.makeRequest(`/budgets/${id}/analytics`);
  }

  // ============================================================================
  // GOALS METHODS - NEW SECTION
  // ============================================================================

  async getGoals(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString ? `/goals?${queryString}` : '/goals';
    return this.makeRequest(endpoint);
  }

  async createGoal(goalData) {
    // Create a clean copy to avoid mutating the input
    const cleanGoalData = {...goalData};

    // Sanitize text fields
    if (cleanGoalData.name) {
      cleanGoalData.name = sanitizeInput.text(cleanGoalData.name);
    }
    if (cleanGoalData.description) {
      cleanGoalData.description = sanitizeInput.description(cleanGoalData.description);
    }
    if (cleanGoalData.notes) {
      cleanGoalData.notes = sanitizeInput.description(cleanGoalData.notes);
    }

    // Convert string targetAmount to number if needed
    if (typeof cleanGoalData.targetAmount === 'string') {
      cleanGoalData.targetAmount = parseFloat(cleanGoalData.targetAmount);
    }

    // Ensure targetAmount is a valid number
    if (
      !cleanGoalData.targetAmount ||
      typeof cleanGoalData.targetAmount !== 'number' ||
      isNaN(cleanGoalData.targetAmount) ||
      cleanGoalData.targetAmount <= 0
    ) {
      throw new Error(
        'Invalid targetAmount: must be a valid number greater than 0',
      );
    }

    // Convert string currentAmount to number if needed
    if (typeof cleanGoalData.currentAmount === 'string') {
      cleanGoalData.currentAmount = parseFloat(cleanGoalData.currentAmount);
    }
    if (
      cleanGoalData.currentAmount &&
      typeof cleanGoalData.currentAmount !== 'number'
    ) {
      cleanGoalData.currentAmount = 0;
    }

    try {
      // Add a custom timeout for goal creation (shorter than default)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 5000); // 5 second timeout

      const response = await this.makeRequest('/goals', {
        method: 'POST',
        body: cleanGoalData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle different possible response formats
      if (response?.goal) {
        return response.goal;
      } else if (response?.data) {
        return response.data;
      } else if (response && typeof response === 'object' && response.id) {
        return response;
      } else {
        return response;
      }
    } catch (error) {
      throw error;
    }
  }

  async getGoalById(id) {
    const response = await this.makeRequest(`/goals/${id}`);

    if (response?.goal) {
      return response.goal;
    } else if (response?.data) {
      return response.data;
    } else if (response && typeof response === 'object' && response.id) {
      return response;
    } else {
      return response;
    }
  }

  async updateGoal(id, goalData) {
    // FIXED: Better validation with proper error handling
    // Create a clean copy to avoid mutating the input
    const cleanGoalData = {...goalData};

    // Sanitize text fields
    if (cleanGoalData.name) {
      cleanGoalData.name = sanitizeInput.text(cleanGoalData.name);
    }
    if (cleanGoalData.description) {
      cleanGoalData.description = sanitizeInput.description(cleanGoalData.description);
    }
    if (cleanGoalData.notes) {
      cleanGoalData.notes = sanitizeInput.description(cleanGoalData.notes);
    }

    // FIXED: Convert and validate targetAmount
    if (cleanGoalData.targetAmount !== undefined) {
      if (typeof cleanGoalData.targetAmount === 'string') {
        cleanGoalData.targetAmount = parseFloat(cleanGoalData.targetAmount);
      }
      cleanGoalData.targetAmount = Number(cleanGoalData.targetAmount);

      if (
        isNaN(cleanGoalData.targetAmount) ||
        !isFinite(cleanGoalData.targetAmount) ||
        cleanGoalData.targetAmount <= 0
      ) {
        throw new Error(
          'Invalid targetAmount: must be a valid number greater than 0',
        );
      }
    }

    // FIXED: Convert and validate currentAmount (allow 0 and positive numbers)
    if (cleanGoalData.currentAmount !== undefined) {
      if (typeof cleanGoalData.currentAmount === 'string') {
        cleanGoalData.currentAmount = parseFloat(cleanGoalData.currentAmount);
      }
      cleanGoalData.currentAmount = Number(cleanGoalData.currentAmount);

      if (
        isNaN(cleanGoalData.currentAmount) ||
        !isFinite(cleanGoalData.currentAmount) ||
        cleanGoalData.currentAmount < 0
      ) {
        cleanGoalData.currentAmount = 0;
      }
    }

    const response = await this.makeRequest(`/goals/${id}`, {
      method: 'PUT',
      body: cleanGoalData,
    });

    if (response?.goal) {
      return response.goal;
    } else if (response?.data) {
      return response.data;
    } else if (response && typeof response === 'object' && response.id) {
      return response;
    } else {
      return response || {id, ...cleanGoalData};
    }
  }

  async deleteGoal(id) {
    return this.makeRequest(`/goals/${id}`, {
      method: 'DELETE',
    });
  }

  async addGoalContribution(goalId, contributionData) {
    const response = await this.makeRequest(`/goals/${goalId}/contributions`, {
      method: 'POST',
      body: contributionData,
    });

    if (response?.contribution) {
      return response.contribution;
    } else if (response?.data) {
      return response.data;
    } else {
      return response;
    }
  }

  async getGoalContributions(goalId, filters = {}) {
    try {
      const queryString = this.buildQueryString(filters);
      const endpoint = queryString
        ? `/goals/${goalId}/contributions?${queryString}`
        : `/goals/${goalId}/contributions`;
      return this.makeRequest(endpoint);
    } catch (error) {
      // Handle 404 errors gracefully for deleted/non-existent goals
      if (
        error.message?.includes('404') ||
        error.message?.includes('Goal not found')
      ) {
        return []; // Return empty array instead of throwing error
      }
      // Re-throw other errors
      throw error;
    }
  }

  async getGoalAnalytics(goalId) {
    return this.makeRequest(`/goals/${goalId}/analytics`);
  }

  async getGoalsAnalytics(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/goals/analytics?${queryString}`
      : '/goals/analytics';
    return this.makeRequest(endpoint);
  }

  // ============================================================================
  // CATEGORY METHODS - ENHANCED
  // ============================================================================

  async getCategories(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString ? `/categories?${queryString}` : '/categories';
    return this.makeRequest(endpoint);
  }

  async createCategory(categoryData) {
    return this.makeRequest('/categories', {
      method: 'POST',
      body: categoryData,
    });
  }

  async getCategoryById(id) {
    return this.makeRequest(`/categories/${id}`);
  }

  async updateCategory(id, categoryData) {
    return this.makeRequest(`/categories/${id}`, {
      method: 'PATCH',
      body: categoryData,
    });
  }

  async deleteCategory(id, options = {}) {
    const queryString = this.buildQueryString(options);
    const endpoint = queryString
      ? `/categories/${id}?${queryString}`
      : `/categories/${id}`;

    return this.makeRequest(endpoint, {
      method: 'DELETE',
    });
  }

  async getCategoryAnalytics(id, filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/categories/${id}/analytics?${queryString}`
      : `/categories/${id}/analytics`;

    return this.makeRequest(endpoint);
  }

  async getSystemCategories() {
    return this.makeRequest('/categories/system');
  }

  async getPopularCategories(limit = 10) {
    return this.makeRequest(`/categories/popular?limit=${limit}`);
  }

  async getArchivedCategories() {
    return this.makeRequest('/categories/archived');
  }

  async restoreCategory(id) {
    return this.makeRequest(`/categories/${id}/restore`, {
      method: 'POST',
    });
  }

  // ============================================================================
  // ONBOARDING METHODS - ENHANCED
  // ============================================================================

  async getOnboardingStatus() {
    // Get from user profile since onboarding is part of user data
    const userProfile = await this.getUserProfile();

    return {
      hasSeenBalanceCardTour: userProfile.hasSeenBalanceCardTour ?? false,
      hasSeenAddTransactionTour: userProfile.hasSeenAddTransactionTour ?? false,
      hasSeenTransactionSwipeTour:
        userProfile.hasSeenTransactionSwipeTour ?? false,
      setupComplete: userProfile.setupComplete ?? false,
      hasSeenWelcome: userProfile.hasSeenWelcome ?? false,
    };
  }

  async markOnboardingTourComplete(tourType) {
    try {
      // Convert tourType to the field name
      const fieldName = `hasSeen${tourType}Tour`;

      // Update via user profile endpoint
      const updateData = {
        [fieldName]: true,
      };

      await this.updateUserProfile(updateData);

      return {
        success: true,
        tourType: tourType,
        completedAt: new Date().toISOString(),
        [fieldName]: true,
      };
    } catch (error) {
      console.error(`Failed to mark ${tourType} tour complete:`, error);
      throw error;
    }
  }

  // ============================================================================
  // HEALTH CHECK METHODS
  // ============================================================================

  async checkHealth() {
    return this.makeRequest('/health', {
      requiresAuth: false,
    });
  }

  async ping() {
    return this.makeRequest('/health/ping', {
      requiresAuth: false,
    });
  }

  // Test basic connectivity to server
  async testConnection() {
    try {
      console.log('🔍 Testing connection to:', this.baseURL);
      const startTime = Date.now();

      const response = await this.makeRequest('/health', {
        requiresAuth: false,
      });

      const duration = Date.now() - startTime;
      console.log('🔍 Connection test successful:', {
        duration: `${duration}ms`,
        response: response,
      });

      return {
        success: true,
        duration,
        response,
      };
    } catch (error) {
      console.error('🔍 Connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ============================================================================
  // POKER TOURNAMENT METHODS
  // ============================================================================

  async createTournament(tournamentData) {
    // Create a clean copy to avoid mutating the input
    const cleanTournamentData = {...tournamentData};

    // Map frontend field names to backend expected names
    const mappedData = {
      name: sanitizeInput.text(cleanTournamentData.name),
      location: sanitizeInput.text(cleanTournamentData.location),
      venue: cleanTournamentData.venue ? sanitizeInput.text(cleanTournamentData.venue) : null,
      dateStart: cleanTournamentData.dateStart || cleanTournamentData.startDate,
      dateEnd:
        cleanTournamentData.dateEnd || cleanTournamentData.endDate || null,
      accommodationCost: parseFloat(
        cleanTournamentData.accommodationCost ||
          cleanTournamentData.accommodation ||
          0,
      ),
      foodBudget: parseFloat(
        cleanTournamentData.foodBudget || cleanTournamentData.food || 0,
      ),
      otherExpenses: parseFloat(cleanTournamentData.otherExpenses || 0),
      notes: cleanTournamentData.notes ? sanitizeInput.description(cleanTournamentData.notes) : null,
    };

    // Validate required fields
    if (!mappedData.name || !mappedData.location || !mappedData.dateStart) {
      throw new Error('Tournament name, location, and start date are required');
    }

    // Ensure dateStart is a valid Date object
    if (!(mappedData.dateStart instanceof Date)) {
      mappedData.dateStart = new Date(mappedData.dateStart);
    }

    // Ensure dateEnd is a valid Date object if provided
    if (mappedData.dateEnd && !(mappedData.dateEnd instanceof Date)) {
      mappedData.dateEnd = new Date(mappedData.dateEnd);
    }

    // Validate date range
    if (mappedData.dateEnd && mappedData.dateEnd < mappedData.dateStart) {
      throw new Error('End date cannot be before start date');
    }

    try {
      const response = await this.makeRequest('/poker/tournaments', {
        method: 'POST',
        body: mappedData,
      });

      // Handle different possible response formats
      if (response?.tournament) {
        return response.tournament;
      } else if (response?.data) {
        return response.data;
      } else if (response && typeof response === 'object' && response.id) {
        return response;
      } else {
        return response;
      }
    } catch (error) {
      console.error('CreateTournament API error:', error.message);
      throw error;
    }
  }

  async getTournaments(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/poker/tournaments?${queryString}`
      : '/poker/tournaments';
    return this.makeRequest(endpoint);
  }

  async getTournamentById(id) {
    const response = await this.makeRequest(`/poker/tournaments/${id}`);

    if (response?.tournament) {
      return response.tournament;
    } else if (response?.data) {
      return response.data;
    } else if (response && typeof response === 'object' && response.id) {
      return response;
    } else {
      return response;
    }
  }

  async updateTournament(id, tournamentData) {
    const cleanTournamentData = {...tournamentData};

    // Map frontend field names to backend expected names
    const mappedData = {};

    if (cleanTournamentData.name !== undefined) {
      mappedData.name = sanitizeInput.text(cleanTournamentData.name);
    }
    if (cleanTournamentData.location !== undefined) {
      mappedData.location = sanitizeInput.text(cleanTournamentData.location);
    }
    if (cleanTournamentData.venue !== undefined) {
      mappedData.venue = sanitizeInput.text(cleanTournamentData.venue);
    }
    if (cleanTournamentData.dateStart || cleanTournamentData.startDate) {
      mappedData.dateStart =
        cleanTournamentData.dateStart || cleanTournamentData.startDate;
    }

    if (cleanTournamentData.dateEnd || cleanTournamentData.endDate) {
      mappedData.dateEnd =
        cleanTournamentData.dateEnd || cleanTournamentData.endDate;
    }
    if (
      cleanTournamentData.accommodationCost !== undefined ||
      cleanTournamentData.accommodation !== undefined
    ) {
      mappedData.accommodationCost = parseFloat(
        cleanTournamentData.accommodationCost ||
          cleanTournamentData.accommodation ||
          0,
      );
    }
    if (
      cleanTournamentData.foodBudget !== undefined ||
      cleanTournamentData.food !== undefined
    ) {
      mappedData.foodBudget = parseFloat(
        cleanTournamentData.foodBudget || cleanTournamentData.food || 0,
      );
    }
    if (cleanTournamentData.otherExpenses !== undefined) {
      mappedData.otherExpenses = parseFloat(
        cleanTournamentData.otherExpenses || 0,
      );
    }
    if (cleanTournamentData.notes !== undefined) {
      mappedData.notes = sanitizeInput.description(cleanTournamentData.notes);
    }

    const response = await this.makeRequest(`/poker/tournaments/${id}`, {
      method: 'PUT',
      body: mappedData,
    });

    if (response?.tournament) {
      return response.tournament;
    } else if (response?.data) {
      return response.data;
    } else if (response && typeof response === 'object' && response.id) {
      return response;
    } else {
      return response || {id, ...mappedData};
    }
  }

  async deleteTournament(id) {
    return this.makeRequest(`/poker/tournaments/${id}`, {
      method: 'DELETE',
    });
  }

  async getTournamentEvents(tournamentId) {
    try {
      const result = await this.makeRequest(
        `/poker/tournaments/${tournamentId}/events`,
      );
      return result;
    } catch (error) {
      // Handle 404 errors gracefully - the backend endpoint may not exist yet
      if (
        error.message.includes('404') ||
        error.message.includes('Not Found') ||
        error.message.includes('Cannot GET')
      ) {
        console.log(
          '🎲 Tournament events endpoint not available yet, returning empty array',
        );
        return [];
      }
      // Re-throw other errors
      throw error;
    }
  }

  async createTournamentEvent(tournamentId, eventData) {
    console.log(
      '🎲 CREATE_EVENT: startingStack value:',
      eventData.startingStack,
      'type:',
      typeof eventData.startingStack,
    );

    const cleanEventData = {...eventData};

    // Ensure eventDate is a valid Date object
    if (!(cleanEventData.eventDate instanceof Date)) {
      cleanEventData.eventDate = new Date(cleanEventData.eventDate);
    }

    // Convert numeric fields
    cleanEventData.buyIn = parseFloat(cleanEventData.buyIn || 0);
    cleanEventData.winnings = parseFloat(cleanEventData.winnings || 0);
    cleanEventData.startingStack =
      parseInt(cleanEventData.startingStack, 10) || 0;

    console.log(
      '🎲 CREATE_EVENT: After processing startingStack:',
      cleanEventData.startingStack,
    );
    if (cleanEventData.fieldSize) {
      cleanEventData.fieldSize = parseInt(cleanEventData.fieldSize, 10);
    }
    if (cleanEventData.finishPosition) {
      cleanEventData.finishPosition = parseInt(
        cleanEventData.finishPosition,
        10,
      );
    }

    try {
      const response = await this.makeRequest(
        `/poker/tournaments/${tournamentId}/events`,
        {
          method: 'POST',
          body: cleanEventData,
        },
      );

      if (response?.event) {
        return response.event;
      } else if (response?.data) {
        return response.data;
      } else if (response && typeof response === 'object' && response.id) {
        return response;
      } else {
        return response;
      }
    } catch (error) {
      console.error('CreateTournamentEvent API error:', error.message);
      throw error;
    }
  }

  async updateTournamentEvent(eventId, eventData) {
    console.log(
      '🎲 UPDATE_EVENT: startingStack value:',
      eventData.startingStack,
      'type:',
      typeof eventData.startingStack,
    );
    const cleanEventData = {...eventData};

    // Convert dates if provided
    if (
      cleanEventData.eventDate &&
      !(cleanEventData.eventDate instanceof Date)
    ) {
      cleanEventData.eventDate = new Date(cleanEventData.eventDate);
    }

    // Convert numeric fields if provided
    if (cleanEventData.buyIn !== undefined) {
      cleanEventData.buyIn = parseFloat(cleanEventData.buyIn || 0);
    }
    if (cleanEventData.winnings !== undefined) {
      cleanEventData.winnings = parseFloat(cleanEventData.winnings || 0);
    }
    if (cleanEventData.startingStack !== undefined) {
      cleanEventData.startingStack =
        parseInt(cleanEventData.startingStack, 10) || 0;
      console.log(
        '🎲 UPDATE_EVENT: After processing startingStack:',
        cleanEventData.startingStack,
      );
    }
    if (cleanEventData.fieldSize !== undefined) {
      cleanEventData.fieldSize = parseInt(cleanEventData.fieldSize, 10);
    }
    if (cleanEventData.finishPosition !== undefined) {
      cleanEventData.finishPosition = parseInt(
        cleanEventData.finishPosition,
        10,
      );
    }

    const response = await this.makeRequest(
      `/poker/tournaments/events/${eventId}`,
      {
        method: 'PUT',
        body: cleanEventData,
      },
    );

    if (response?.event) {
      return response.event;
    } else if (response?.data) {
      return response.data;
    } else if (response && typeof response === 'object' && response.id) {
      return response;
    } else {
      console.warn(
        'Unexpected updateTournamentEvent response format:',
        response,
      );
      return response || {id: eventId, ...cleanEventData};
    }
  }

  async deleteTournamentEvent(eventId) {
    return this.makeRequest(`/poker/tournaments/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  async getPokerAnalytics(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/poker/analytics?${queryString}`
      : '/poker/analytics';
    return this.makeRequest(endpoint);
  }

  async getTournamentAnalytics(tournamentId, filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/poker/tournaments/${tournamentId}/analytics?${queryString}`
      : `/poker/tournaments/${tournamentId}/analytics`;
    return this.makeRequest(endpoint);
  }

  // ============================================================================
  // ROLLOVER METHODS
  // ============================================================================

  async getRolloverAmount() {
    return this.makeRequest('/users/rollover');
  }

  async processRollover(rolloverData) {
    return this.makeRequest('/users/rollover', {
      method: 'PUT',
      body: {
        rolloverAmount: rolloverData.amount,
        lastRolloverDate: new Date().toISOString(),
      },
    });
  }

  async createRolloverEntry(rolloverEntryData) {
    return this.makeRequest('/users/rollover/entries', {
      method: 'POST',
      body: rolloverEntryData,
    });
  }

  async getRolloverHistory(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/users/rollover/history?${queryString}`
      : '/users/rollover/history';
    return this.makeRequest(endpoint);
  }

  async getRolloverEntries(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/users/rollover/history?${queryString}`
      : '/users/rollover/history';
    return this.makeRequest(endpoint);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  // Helper method to get current user info
  async getCurrentUser() {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    return this.getUserProfile();
  }

  getCurrentUserId() {
    if (!this.isAuthenticated() || !this.token) {
      return null;
    }

    try {
      // Decode JWT token to get user ID
      const tokenParts = this.token.split('.');
      if (tokenParts.length !== 3) {
        return null;
      }

      // Decode the payload (second part)
      const payload = tokenParts[1];

      // Add padding if needed
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);

      // Decode base64
      // eslint-disable-next-line no-undef
      const decoded = atob(paddedPayload);
      const payloadObj = JSON.parse(decoded);

      return payloadObj.sub || payloadObj.id || payloadObj.userId || null;
    } catch (error) {
      return null;
    }
  }

  // Helper method to refresh authentication (uses refresh token)
  async refreshAuth() {
    try {
      // First try to refresh the token if we have a refresh token
      if (this.refreshToken) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          return true;
        }
      }

      // If no refresh token or refresh failed, try to validate current token
      const profile = await this.getUserProfile();
      return !!profile;
    } catch (error) {
      await this.clearToken();
      return false;
    }
  }

  // Helper method for debugging API calls
  getApiInfo() {
    return {
      baseURL: this.baseURL,
      isAuthenticated: this.isAuthenticated(),
      hasToken: !!this.token,
      hasRefreshToken: !!this.refreshToken,
      isRefreshing: this.isRefreshing,
    };
  }
}

// Export singleton instance
export default new TrendAPIService();

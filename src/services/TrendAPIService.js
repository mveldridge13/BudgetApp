// services/TrendAPIService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_CONFIG = {
  baseURL: 'http://192.168.1.21:3001/api/v1', // Updated with your IP
  timeout: 10000,
};

class TrendAPIService {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.token = null;
  }

  async initialize() {
    try {
      this.token = await AsyncStorage.getItem('trend_auth_token');
      return true;
    } catch (error) {
      console.error('Failed to initialize API service:', error);
      return false;
    }
  }

  async saveToken(token) {
    try {
      this.token = token;
      await AsyncStorage.setItem('trend_auth_token', token);
      return true;
    } catch (error) {
      console.error('Failed to save token:', error);
      return false;
    }
  }

  async clearToken() {
    try {
      this.token = null;
      await AsyncStorage.removeItem('trend_auth_token');
      return true;
    } catch (error) {
      console.error('Failed to clear token:', error);
      return false;
    }
  }

  isAuthenticated() {
    return !!this.token;
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

      if (response.status === 401) {
        await this.clearToken();
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        return null;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`API Request failed: ${method} ${url}`, error);
      throw error;
    }
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  async login(email, password) {
    try {
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
        return {
          success: true,
          user: response.user,
          token: response.access_token,
        };
      } else {
        console.error('Invalid response format:', response);
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Login request failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async register(userData) {
    try {
      const response = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: {
          firstName: userData.firstName.trim(),
          lastName: userData.lastName.trim(),
          email: userData.email.trim(),
          password: userData.password,
          username: userData.username?.trim(),
          currency: userData.currency || 'USD',
          timezone: userData.timezone || 'UTC',
        },
        requiresAuth: false,
      });

      if (response && response.access_token) {
        await this.saveToken(response.access_token);
        return {
          success: true,
          user: response.user,
          token: response.access_token,
        };
      } else {
        console.error('Invalid registration response format:', response);
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Registration request failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async logout() {
    try {
      await this.makeRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      await this.clearToken();
    }
  }

  async getUserProfile() {
    return this.makeRequest('/auth/profile');
  }

  async updateUserProfile(profileData) {
    return this.makeRequest('/auth/profile', {
      method: 'PUT',
      body: profileData,
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

  async deactivateAccount() {
    return this.makeRequest('/users/profile', {
      method: 'DELETE',
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
      console.warn('Unexpected create response format:', response);
      return response;
    }
  }

  async updateTransaction(id, transactionData) {
    const {category, ...cleanedData} = transactionData;

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
      console.warn('Unexpected getById response format:', response);
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
    // Minimal validation
    if (!goalData.targetAmount || typeof goalData.targetAmount !== 'number') {
      goalData.targetAmount = 100;
    }
    if (goalData.currentAmount && typeof goalData.currentAmount !== 'number') {
      goalData.currentAmount = 0;
    }

    try {
      const response = await this.makeRequest('/goals', {
        method: 'POST',
        body: goalData,
      });

      // Handle different possible response formats
      if (response?.goal) {
        return response.goal;
      } else if (response?.data) {
        return response.data;
      } else if (response && typeof response === 'object' && response.id) {
        return response;
      } else {
        console.warn('Unexpected create goal response format:', response);
        return response;
      }
    } catch (error) {
      console.error('CreateGoal API error:', error.message);
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
      console.warn('Unexpected getGoalById response format:', response);
      return response;
    }
  }

  async updateGoal(id, goalData) {
    // CRITICAL: Ensure targetAmount is a valid number before sending
    if (
      goalData.targetAmount !== undefined &&
      (typeof goalData.targetAmount !== 'number' ||
        isNaN(goalData.targetAmount) ||
        !isFinite(goalData.targetAmount) ||
        goalData.targetAmount <= 0)
    ) {
      console.error('🔍 ❌ CRITICAL: targetAmount is invalid in update, fixing it');
      goalData.targetAmount = 100;
    }

    // Double-check currentAmount too
    if (
      goalData.currentAmount !== undefined &&
      (typeof goalData.currentAmount !== 'number' ||
        isNaN(goalData.currentAmount) ||
        !isFinite(goalData.currentAmount) ||
        goalData.currentAmount < 0)
    ) {
      console.error('🔍 ❌ CRITICAL: currentAmount is invalid in update, fixing it');
      goalData.currentAmount = 0;
    }

    const response = await this.makeRequest(`/goals/${id}`, {
      method: 'PUT',
      body: goalData,
    });

    if (response?.goal) {
      return response.goal;
    } else if (response?.data) {
      return response.data;
    } else if (response && typeof response === 'object' && response.id) {
      return response;
    } else {
      console.warn('Unexpected updateGoal response format:', response);
      return response || {id, ...goalData};
    }
  }

  async deleteGoal(id) {
    return this.makeRequest(`/goals/${id}`, {
      method: 'DELETE',
    });
  }

  async addGoalContribution(goalId, contributionData) {
    const response = await this.makeRequest(`/goals/${goalId}/contribute`, {
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
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/goals/${goalId}/contributions?${queryString}`
      : `/goals/${goalId}/contributions`;
    return this.makeRequest(endpoint);
  }

  async getGoalAnalytics(goalId) {
    return this.makeRequest(`/goals/${goalId}/analytics`);
  }

  async getGoalSuggestions(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = queryString
      ? `/goals/suggestions?${queryString}`
      : '/goals/suggestions';
    return this.makeRequest(endpoint);
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

      // eslint-disable-next-line no-unused-vars
      const response = await this.updateUserProfile(updateData);

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

  // Helper method to refresh authentication
  async refreshAuth() {
    try {
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
    };
  }
}

// Export singleton instance
export default new TrendAPIService();

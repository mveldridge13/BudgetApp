// services/TrendAPIService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_CONFIG = {
  baseURL: 'http://192.168.1.48:3001/api/v1', // Updated with correct IP
  timeout: 30000, // Increased timeout for mobile devices
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
      console.error(`🌐 API Request failed: ${method} ${url}`, {
        errorMessage: error.message,
        errorName: error.name,
        stack: error.stack,
        url: url,
        method: method,
        isNetworkError:
          error.name === 'TypeError' && error.message.includes('fetch'),
        isTimeoutError:
          error.name === 'AbortError' || error.message.includes('timeout'),
      });

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

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  async login(email, password) {
    try {
      console.log('🔐 Login attempt:', {
        baseURL: this.baseURL,
        email: email.trim(),
        timestamp: new Date().toISOString(),
      });

      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: {
          email: email.trim(),
          password: password,
        },
        requiresAuth: false,
      });

      console.log('🔐 Login response received:', {
        hasResponse: !!response,
        hasAccessToken: !!(response && response.access_token),
        hasUser: !!(response && response.user),
      });

      if (response && response.access_token) {
        await this.saveToken(response.access_token);
        return {
          success: true,
          user: response.user,
          token: response.access_token,
        };
      } else {
        console.error('🔐 Invalid response format:', response);
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('🔐 Login request failed:', {
        message: error.message,
        name: error.name,
        baseURL: this.baseURL,
        isNetworkError:
          error.message.includes('fetch') ||
          error.message.includes('Network') ||
          error.message.includes('timeout'),
      });

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
    console.log('🔍 CREATE_GOAL: Starting with data:', goalData);

    // Create a clean copy to avoid mutating the input
    const cleanGoalData = {...goalData};

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
      console.error('🔍 CREATE_GOAL: Invalid targetAmount:', {
        original: goalData.targetAmount,
        cleaned: cleanGoalData.targetAmount,
        type: typeof cleanGoalData.targetAmount,
      });
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

    console.log('🔍 CREATE_GOAL: Cleaned data:', {
      targetAmount: cleanGoalData.targetAmount,
      currentAmount: cleanGoalData.currentAmount,
      name: cleanGoalData.name,
    });

    try {
      console.log(
        '🔍 CREATE_GOAL: Making API request to:',
        `${this.baseURL}/goals`,
      );

      // Add a custom timeout for goal creation (shorter than default)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('🔍 CREATE_GOAL: Request timed out after 5 seconds');
        controller.abort();
      }, 5000); // 5 second timeout

      const response = await this.makeRequest('/goals', {
        method: 'POST',
        body: cleanGoalData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('🔍 CREATE_GOAL: API response received:', response);

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
    // FIXED: Better validation with proper error handling
    console.log('🔍 UPDATE_GOAL: Starting with data:', {
      id,
      targetAmount: goalData.targetAmount,
      currentAmount: goalData.currentAmount,
      types: {
        targetAmount: typeof goalData.targetAmount,
        currentAmount: typeof goalData.currentAmount,
      },
    });

    // Create a clean copy to avoid mutating the input
    const cleanGoalData = {...goalData};

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
        console.error(
          '🔍 ❌ CRITICAL: Invalid targetAmount:',
          goalData.targetAmount,
        );
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
        console.warn(
          '🔍 ⚠️ Invalid currentAmount, setting to 0:',
          goalData.currentAmount,
        );
        cleanGoalData.currentAmount = 0;
      }
    }

    console.log('🔍 UPDATE_GOAL: Cleaned data:', {
      targetAmount: cleanGoalData.targetAmount,
      currentAmount: cleanGoalData.currentAmount,
    });

    const response = await this.makeRequest(`/goals/${id}`, {
      method: 'PUT',
      body: cleanGoalData,
    });

    console.log('🔍 UPDATE_GOAL: Backend response:', response);

    if (response?.goal) {
      return response.goal;
    } else if (response?.data) {
      return response.data;
    } else if (response && typeof response === 'object' && response.id) {
      return response;
    } else {
      console.warn('Unexpected updateGoal response format:', response);
      return response || {id, ...cleanGoalData};
    }
  }

  async deleteGoal(id) {
    return this.makeRequest(`/goals/${id}`, {
      method: 'DELETE',
    });
  }

  async addGoalContribution(goalId, contributionData) {
    console.log(
      '🔍 TREND_API: Adding goal contribution for goal',
      goalId,
      'data:',
      contributionData,
    );
    const response = await this.makeRequest(`/goals/${goalId}/contributions`, {
      method: 'POST',
      body: contributionData,
    });

    console.log('🔍 TREND_API: Goal contribution response:', response);
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
        console.log(
          `🔍 TREND_API: Goal ${goalId} not found when fetching contributions (likely deleted)`,
        );
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
      name: cleanTournamentData.name,
      location: cleanTournamentData.location,
      venue: cleanTournamentData.venue || null,
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
      notes: cleanTournamentData.notes || null,
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
        console.warn('Unexpected create tournament response format:', response);
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
      console.warn('Unexpected getTournamentById response format:', response);
      return response;
    }
  }

  async updateTournament(id, tournamentData) {
    const cleanTournamentData = {...tournamentData};

    // Map frontend field names to backend expected names
    const mappedData = {};

    if (cleanTournamentData.name !== undefined) {
      mappedData.name = cleanTournamentData.name;
    }
    if (cleanTournamentData.location !== undefined) {
      mappedData.location = cleanTournamentData.location;
    }
    if (cleanTournamentData.venue !== undefined) {
      mappedData.venue = cleanTournamentData.venue;
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
      mappedData.notes = cleanTournamentData.notes;
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
      console.warn('Unexpected updateTournament response format:', response);
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
        console.warn('Unexpected create event response format:', response);
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
    console.log('🔄 TREND_API: Creating rollover entry:', rolloverEntryData);
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

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_CONFIG = {
  baseURL: 'http://127.0.0.1:3001/api/v1',
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

  // Authentication methods
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

  // Profile methods
  async getUserProfile() {
    return this.makeRequest('/auth/profile');
  }

  async updateUserProfile(profileData) {
    return this.makeRequest('/auth/profile', {
      method: 'PUT',
      body: profileData,
    });
  }

  // Onboarding methods
  async getOnboardingStatus() {
    // Since onboarding fields are part of the user profile,
    // we can extract them from the existing getUserProfile response
    const userProfile = await this.getUserProfile();

    return {
      hasSeenBalanceCardTour: userProfile.hasSeenBalanceCardTour ?? false,
      hasSeenAddTransactionTour:
        userProfile.hasSeenAddTransactionTour ?? false,
      hasSeenTransactionSwipeTour:
        userProfile.hasSeenTransactionSwipeTour ?? false,
    };
  }

  async updateOnboardingStatus(onboardingData) {
    try {
      // Update the user profile with onboarding data
      const response = await this.updateUserProfile(onboardingData);

      // Extract onboarding fields from the response
      return {
        hasSeenBalanceCardTour: response.hasSeenBalanceCardTour ?? false,
        hasSeenAddTransactionTour: response.hasSeenAddTransactionTour ?? false,
        hasSeenTransactionSwipeTour:
          response.hasSeenTransactionSwipeTour ?? false,
      };
    } catch (error) {
      console.error('Failed to update onboarding status:', error);
      throw error;
    }
  }

  async markOnboardingTourComplete(tourType) {
    try {
      // Convert tourType to the field name
      const fieldName = `hasSeen${tourType}Tour`;

      // Update just this specific onboarding field
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

  // Category methods
  async getCategories() {
    return this.makeRequest('/categories');
  }

  async createCategory(categoryData) {
    return this.makeRequest('/categories', {
      method: 'POST',
      body: categoryData,
    });
  }

  async updateCategory(id, categoryData) {
    return this.makeRequest(`/categories/${id}`, {
      method: 'PUT',
      body: categoryData,
    });
  }

  async deleteCategory(id) {
    return this.makeRequest(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Transaction methods
  async getTransactions(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams
      ? `/transactions?${queryParams}`
      : '/transactions';
    return this.makeRequest(endpoint);
  }

  async createTransaction(transactionData) {
    const {category, ...cleanedData} = transactionData;

    const response = await this.makeRequest('/transactions', {
      method: 'POST',
      body: cleanedData,
    });

    // Handle different possible response formats from backend
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

    // Handle different possible response formats from backend
    if (response?.transaction) {
      return response.transaction;
    } else if (response?.data) {
      return response.data;
    } else if (response && typeof response === 'object' && response.id) {
      return response;
    } else {
      // Fallback: If backend doesn't return full object, return what we have
      // to prevent hanging. The UI can handle partial data.
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

  async getTransactionAnalytics(budgetId, filters = {}) {
    const queryParams = new URLSearchParams({budgetId, ...filters}).toString();
    return this.makeRequest(`/transactions/analytics?${queryParams}`);
  }

  // Budget methods
  async getBudgets() {
    return this.makeRequest('/budgets');
  }

  async createBudget(budgetData) {
    return this.makeRequest('/budgets', {
      method: 'POST',
      body: budgetData,
    });
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

  // Health check
  async checkHealth() {
    return this.makeRequest('/health', {
      requiresAuth: false,
    });
  }
}

export default new TrendAPIService();

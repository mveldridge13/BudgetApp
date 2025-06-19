import AsyncStorage from '@react-native-async-storage/async-storage';

// Your trend-backend configuration
const API_CONFIG = {
  baseURL: 'http://127.0.0.1:3001/api/v1', // ✅ Add /api/v1 prefix
  timeout: 10000,
};

class TrendAPIService {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.token = null;
  }

  // Initialize and load stored token
  async initialize() {
    try {
      this.token = await AsyncStorage.getItem('trend_auth_token');
      return true;
    } catch (error) {
      console.error('Failed to initialize API service:', error);
      return false;
    }
  }

  // Save token securely
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

  // Clear token
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

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.token;
  }

  // Make authenticated API request
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

    // Add authorization header if required and token exists
    if (requiresAuth && this.token) {
      requestHeaders.Authorization = `Bearer ${this.token}`;
    }

    const requestConfig = {
      method,
      headers: requestHeaders,
    };

    // Add body for POST/PUT/PATCH requests
    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      requestConfig.body = JSON.stringify(body);
    }

    try {
      console.log(`🌐 API Request: ${method} ${url}`);
      if (body) {
        console.log('📤 Request body:', body);
      }

      const response = await fetch(url, requestConfig);

      console.log(
        `📥 Response status: ${response.status} ${response.statusText}`,
      );

      // Handle different response types
      if (response.status === 401) {
        // Token expired or invalid
        await this.clearToken();
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error ${response.status}:`, errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`✅ API Response: ${method} ${url}`, data);
        return data;
      } else {
        return null;
      }
    } catch (error) {
      console.error(`❌ API Request failed: ${method} ${url}`, error);
      throw error;
    }
  }

  // Authentication methods
  async login(email, password) {
    try {
      console.log('🔐 Attempting login for:', email);
      console.log('🔐 Request body:', {
        email: email.trim(),
        password: '[HIDDEN]',
      });

      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: {
          email: email.trim(),
          password: password,
        },
        requiresAuth: false,
      });

      console.log(
        '🔐 Login response received:',
        response ? 'Success' : 'No response',
      );

      if (response && response.access_token) {
        await this.saveToken(response.access_token);
        console.log('✅ Token saved successfully');

        return {
          success: true,
          user: response.user,
          token: response.access_token,
        };
      } else {
        console.error('❌ Invalid response format:', response);
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Login request failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async register(userData) {
    try {
      console.log('🔐 Attempting registration for:', userData.email);
      console.log('🔐 Registration body:', {
        ...userData,
        password: '[HIDDEN]',
      });

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

      console.log(
        '🔐 Registration response received:',
        response ? 'Success' : 'No response',
      );

      if (response && response.access_token) {
        await this.saveToken(response.access_token);
        console.log('✅ Registration token saved successfully');

        return {
          success: true,
          user: response.user,
          token: response.access_token,
        };
      } else {
        console.error('❌ Invalid registration response format:', response);
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Registration request failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async logout() {
    try {
      // Call backend logout endpoint
      await this.makeRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local token
      await this.clearToken();
    }
  }

  // Profile methods for AppNavigator
  async getUserProfile() {
    return this.makeRequest('/auth/profile');
  }

  // NEW: Update user profile method
  async updateUserProfile(profileData) {
    return this.makeRequest('/auth/profile', {
      method: 'PUT',
      body: profileData,
    });
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
    return this.makeRequest('/transactions', {
      method: 'POST',
      body: transactionData,
    });
  }

  async updateTransaction(id, transactionData) {
    return this.makeRequest(`/transactions/${id}`, {
      method: 'PUT',
      body: transactionData,
    });
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

// Export singleton instance
export default new TrendAPIService();

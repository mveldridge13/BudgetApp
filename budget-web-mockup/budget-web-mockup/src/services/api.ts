import { API_CONFIG } from '@/config/api.config';
import { tokenStorage } from '@/lib/storage';
import { ApiError } from '@/types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  skipAuthRefresh?: boolean; // Prevent infinite refresh loops
  skipUnwrap?: boolean; // Return the raw JSON body without auto-unwrapping (data/transactions/etc.)
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;
  // Proactive token refresh
  private tokenExpiry: number | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly REFRESH_BUFFER = 2 * 60 * 1000; // Refresh 2 minutes before expiry
  private visibilityHandler: (() => void) | null = null;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.defaultTimeout = API_CONFIG.timeout;
    // Initialize proactive refresh on construction
    this.initializeProactiveRefresh();
  }

  /**
   * Initialize proactive refresh by checking existing token and setting up visibility listener
   */
  private initializeProactiveRefresh(): void {
    if (typeof window === 'undefined') return;

    // Check existing token on init
    const token = tokenStorage.getToken();
    if (token) {
      this.tokenExpiry = this.decodeTokenExpiry(token);
      this.scheduleProactiveRefresh();
    }

    // Set up visibility change listener (similar to mobile app foreground detection)
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        console.log('[API] Tab became visible - checking token refresh');
        this.checkAndRefreshOnVisible();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Decode JWT token to extract expiry timestamp
   */
  private decodeTokenExpiry(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const paddedPayload = payload + '='.repeat((4 - (payload.length % 4)) % 4);
      const decoded = JSON.parse(atob(paddedPayload));
      return decoded.exp ? decoded.exp * 1000 : null; // Convert to milliseconds
    } catch (error) {
      console.error('[API] Failed to decode token expiry:', error);
      return null;
    }
  }

  /**
   * Schedule proactive token refresh before expiry
   */
  private scheduleProactiveRefresh(): void {
    this.cancelScheduledRefresh();

    if (!this.tokenExpiry) return;

    const now = Date.now();
    const refreshTime = this.tokenExpiry - this.REFRESH_BUFFER;
    const delay = refreshTime - now;

    if (delay <= 0) {
      console.log('[API] Token expired or expiring soon, refreshing immediately');
      this.tryRefreshToken();
      return;
    }

    console.log(`[API] Scheduling proactive refresh in ${Math.round(delay / 1000)}s`);
    this.refreshTimer = setTimeout(() => {
      console.log('[API] Proactive token refresh triggered');
      this.tryRefreshToken();
    }, delay);
  }

  /**
   * Cancel any scheduled proactive refresh
   */
  private cancelScheduledRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Check and refresh token when tab becomes visible
   */
  private async checkAndRefreshOnVisible(): Promise<void> {
    const token = tokenStorage.getToken();
    if (!token) return;

    // Re-read expiry in case token changed
    this.tokenExpiry = this.decodeTokenExpiry(token);
    if (!this.tokenExpiry) return;

    const now = Date.now();
    const timeUntilExpiry = this.tokenExpiry - now;

    // If token expires in less than 5 minutes, refresh now
    if (timeUntilExpiry < 5 * 60 * 1000) {
      console.log('[API] Token expiring soon, refreshing on visibility');
      await this.tryRefreshToken();
    } else {
      // Re-schedule proactive refresh
      this.scheduleProactiveRefresh();
    }
  }

  /**
   * Update token expiry tracking when token changes
   */
  updateTokenExpiry(token: string): void {
    this.tokenExpiry = this.decodeTokenExpiry(token);
    if (this.tokenExpiry) {
      console.log(`[API] Token expires at: ${new Date(this.tokenExpiry).toISOString()}`);
    }
    this.scheduleProactiveRefresh();
  }

  /**
   * Clear token expiry and cancel refresh on logout
   */
  clearTokenExpiry(): void {
    this.tokenExpiry = null;
    this.cancelScheduledRefresh();
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', body, headers = {}, timeout = this.defaultTimeout, skipAuthRefresh = false, skipUnwrap = false } = options;

    const token = tokenStorage.getToken();
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      console.log(`[API] ${method} ${this.baseUrl}${endpoint}`);
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`[API] Response status: ${response.status}`);

      if (!response.ok) {
        // Handle 401 Unauthorized - attempt token refresh
        if (response.status === 401 && !skipAuthRefresh) {
          console.log('[API] 401 received - attempting token refresh');

          // Attempt to refresh the token
          const refreshed = await this.tryRefreshToken();
          if (refreshed) {
            console.log('[API] Token refreshed - retrying original request');
            // Retry the original request with the new token
            return this.request<T>(endpoint, { ...options, skipAuthRefresh: true });
          }

          // Refresh failed - clear tokens and redirect
          console.log('[API] Token refresh failed - redirecting to login');
          tokenStorage.clearAll();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw new Error('Session expired. Please login again.');
        }

        // Handle 429 Rate Limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
          const errorData = await response.json().catch(() => ({}));
          const error: ApiError = {
            message: errorData.message || `Too many attempts. Please try again in ${retrySeconds} seconds.`,
            statusCode: 429,
            error: 'Too Many Requests',
          };
          throw error;
        }

        const errorData = await response.json().catch(() => ({}));
        const error: ApiError = {
          message: errorData.message || `Request failed with status ${response.status}`,
          statusCode: response.status,
          error: errorData.error,
        };
        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();

      // Some endpoints (e.g. discretionary-breakdown) return a rich object that
      // itself contains a `transactions` key — the heuristics below would wrongly
      // unwrap it. Callers can opt out to receive the full body.
      if (skipUnwrap) {
        return data as T;
      }

      // Handle different response formats (matching mobile app behavior)
      if (data.data !== undefined) {
        return data.data as T;
      }
      if (data.transaction) {
        return data.transaction as T;
      }
      if (data.transactions !== undefined) {
        return data.transactions as T;
      }
      if (data.goals !== undefined) {
        return data.goals as T;
      }
      if (data.categories !== undefined) {
        return data.categories as T;
      }
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    // If already refreshing, wait for that to complete
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh(refreshToken);

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(refreshToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const newToken = data.access_token || data.token;
      if (newToken) {
        tokenStorage.setToken(newToken);
        // Update expiry tracking and schedule next proactive refresh
        this.updateTokenExpiry(newToken);
      }

      // Token rotation: store new refresh token if provided
      if (data.refresh_token) {
        tokenStorage.setRefreshToken(data.refresh_token);
      }

      return true;
    } catch {
      return false;
    }
  }

  // HTTP method helpers
  async get<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    options?: { skipUnwrap?: boolean }
  ): Promise<T> {
    const queryString = params ? this.buildQueryString(params) : '';
    return this.request<T>(`${endpoint}${queryString}`, options);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  private buildQueryString(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }
}

// Export singleton instance
export const api = new ApiClient();

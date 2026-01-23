import { API_CONFIG } from '@/config/api.config';
import { tokenStorage } from '@/lib/storage';
import { ApiError } from '@/types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.defaultTimeout = API_CONFIG.timeout;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', body, headers = {}, timeout = this.defaultTimeout } = options;

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
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          tokenStorage.removeToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw new Error('Session expired. Please login again.');
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

      // Handle different response formats (matching mobile app behavior)
      if (data.data !== undefined) {
        return data.data as T;
      }
      if (data.transaction) {
        return data.transaction as T;
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

  // HTTP method helpers
  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const queryString = params ? this.buildQueryString(params) : '';
    return this.request<T>(`${endpoint}${queryString}`);
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

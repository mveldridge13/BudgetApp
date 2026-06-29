import { API_CONFIG } from '@/config/api.config';

interface CachedData<T> {
  data: T;
  timestamp: number;
}

export const storage = {
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  },
};

// Cached storage with TTL
export const cachedStorage = {
  get<T>(key: string, ttl: number): T | null {
    const cached = storage.get<CachedData<T>>(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > ttl;
    if (isExpired) {
      storage.remove(key);
      return null;
    }

    return cached.data;
  },

  set<T>(key: string, data: T): void {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
    };
    storage.set(key, cached);
  },

  remove(key: string): void {
    storage.remove(key);
  },

  isFresh(key: string, ttl: number): boolean {
    const cached = storage.get<CachedData<unknown>>(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp <= ttl;
  },
};

// Auth token storage
export const tokenStorage = {
  getToken(): string | null {
    return storage.get<string>(API_CONFIG.storageKeys.authToken);
  },

  setToken(token: string): void {
    storage.set(API_CONFIG.storageKeys.authToken, token);
  },

  removeToken(): void {
    storage.remove(API_CONFIG.storageKeys.authToken);
  },

  hasToken(): boolean {
    return !!this.getToken();
  },

  getRefreshToken(): string | null {
    return storage.get<string>(API_CONFIG.storageKeys.refreshToken);
  },

  setRefreshToken(token: string): void {
    storage.set(API_CONFIG.storageKeys.refreshToken, token);
  },

  removeRefreshToken(): void {
    storage.remove(API_CONFIG.storageKeys.refreshToken);
  },

  clearAll(): void {
    this.removeToken();
    this.removeRefreshToken();
  },
};

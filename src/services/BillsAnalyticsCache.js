// services/BillsAnalyticsCache.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'bills_analytics_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour (more frequent than UserProfile due to bills changing)

class BillsAnalyticsCache {
  /**
   * Get cached bills analytics data
   * @returns {Promise<{data: object, timestamp: number, age: number, isStale: boolean} | null>}
   */
  async get() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) {
        return null;
      }

      const {data, timestamp} = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const isStale = age > CACHE_TTL;

      console.log('📋 BillsAnalyticsCache: Retrieved cache', {
        age: Math.round(age / 1000 / 60), // minutes
        isStale,
        dataKeys: Object.keys(data || {}),
      });

      return {
        data,
        timestamp,
        age,
        isStale,
      };
    } catch (error) {
      console.error('📋 BillsAnalyticsCache: Get error:', error);
      return null;
    }
  }

  /**
   * Set bills analytics data in cache
   * @param {object} data - Bills analytics data to cache
   * @returns {Promise<boolean>}
   */
  async set(data) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('📋 BillsAnalyticsCache: Data cached successfully', {
        timestamp: cacheData.timestamp,
        dataSize: JSON.stringify(data).length,
      });
      return true;
    } catch (error) {
      console.error('📋 BillsAnalyticsCache: Set error:', error);
      return false;
    }
  }

  /**
   * Clear bills analytics cache
   * @returns {Promise<boolean>}
   */
  async clear() {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      console.log('📋 BillsAnalyticsCache: Cache cleared');
      return true;
    } catch (error) {
      console.error('📋 BillsAnalyticsCache: Clear error:', error);
      return false;
    }
  }

  /**
   * Check if cached data exists and is fresh
   * @returns {Promise<boolean>}
   */
  async isFresh() {
    const cached = await this.get();
    return cached && !cached.isStale;
  }

  /**
   * Get cache age in minutes
   * @returns {Promise<number | null>}
   */
  async getAge() {
    const cached = await this.get();
    return cached ? Math.round(cached.age / 1000 / 60) : null;
  }

  /**
   * Invalidate cache by setting timestamp to 0
   * This keeps the data but marks it as stale for background refresh
   * @returns {Promise<boolean>}
   */
  async invalidate() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const {data} = JSON.parse(cached);
        const cacheData = {
          data,
          timestamp: 0, // Mark as stale but keep data
        };

        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        console.log('📋 BillsAnalyticsCache: Cache invalidated');
        return true;
      }
      return false;
    } catch (error) {
      console.error('📋 BillsAnalyticsCache: Invalidate error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics for debugging
   * @returns {Promise<object>}
   */
  async getStats() {
    try {
      const cached = await this.get();
      if (!cached) {
        return {
          exists: false,
          age: null,
          isStale: null,
          size: null,
        };
      }

      const size = JSON.stringify(cached.data).length;

      return {
        exists: true,
        age: Math.round(cached.age / 1000 / 60), // minutes
        isStale: cached.isStale,
        size,
        ttlMinutes: CACHE_TTL / 1000 / 60,
        lastUpdated: new Date(cached.timestamp).toISOString(),
      };
    } catch (error) {
      console.error('📋 BillsAnalyticsCache: Stats error:', error);
      return {
        exists: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance (following UserProfileCache pattern)
const billsAnalyticsCache = new BillsAnalyticsCache();
export default billsAnalyticsCache;

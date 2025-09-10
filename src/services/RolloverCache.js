// services/RolloverCache.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrendAPIService from './TrendAPIService';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (shorter TTL for financial data)
const BANNER_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days (longer TTL for banner visibility)

// Generate user-specific cache keys
const getUserCacheKey = async baseKey => {
  try {
    if (!TrendAPIService.isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    const profile = await TrendAPIService.getUserProfile();
    if (!profile?.id) {
      throw new Error('User profile ID not available');
    }
    return `${baseKey}_user_${profile.id}`;
  } catch (error) {
    console.error(
      '🔄 RolloverCache: Failed to get user-specific cache key:',
      error,
    );
    throw error;
  }
};

class RolloverCache {
  /**
   * Get cached rollover amount data
   * @returns {Promise<{data: object, timestamp: number, age: number, isStale: boolean} | null>}
   */
  async getRolloverAmount() {
    try {
      const cacheKey = await getUserCacheKey('rollover_cache');
      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) {
        return null;
      }

      const {data, timestamp} = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const isStale = age > CACHE_TTL;

      console.log('🔄 RolloverCache: Retrieved rollover amount cache', {
        age: Math.round(age / 1000 / 60), // minutes
        isStale,
        rolloverAmount: data?.rolloverAmount || 0,
        lastRolloverDate: data?.lastRolloverDate,
      });

      return {
        data: data || {rolloverAmount: 0, lastRolloverDate: null},
        timestamp,
        age,
        isStale,
      };
    } catch (error) {
      console.error('🔄 RolloverCache: Get rollover amount error:', error);
      return null;
    }
  }

  /**
   * Set rollover amount data in cache
   * @param {object} data - Rollover amount data to cache
   * @returns {Promise<boolean>}
   */
  async setRolloverAmount(data) {
    try {
      const cacheKey = await getUserCacheKey('rollover_cache');
      const cacheData = {
        data: data || {rolloverAmount: 0, lastRolloverDate: null},
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('🔄 RolloverCache: Rollover amount cached successfully', {
        timestamp: cacheData.timestamp,
        rolloverAmount: data?.rolloverAmount || 0,
        lastRolloverDate: data?.lastRolloverDate,
      });
      return true;
    } catch (error) {
      console.error('🔄 RolloverCache: Set rollover amount error:', error);
      return false;
    }
  }

  /**
   * Get cached rollover entries data
   * @returns {Promise<{data: array, timestamp: number, age: number, isStale: boolean} | null>}
   */
  async getRolloverEntries() {
    try {
      const cacheKey = await getUserCacheKey('rollover_entries_cache');
      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) {
        return null;
      }

      const {data, timestamp} = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const isStale = age > CACHE_TTL;

      console.log('🔄 RolloverCache: Retrieved rollover entries cache', {
        age: Math.round(age / 1000 / 60), // minutes
        isStale,
        entriesCount: data?.length || 0,
      });

      return {
        data: data || [],
        timestamp,
        age,
        isStale,
      };
    } catch (error) {
      console.error('🔄 RolloverCache: Get rollover entries error:', error);
      return null;
    }
  }

  /**
   * Set rollover entries data in cache
   * @param {array} data - Rollover entries data to cache
   * @returns {Promise<boolean>}
   */
  async setRolloverEntries(data) {
    try {
      const cacheKey = await getUserCacheKey('rollover_entries_cache');
      const cacheData = {
        data: data || [],
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('🔄 RolloverCache: Rollover entries cached successfully', {
        timestamp: cacheData.timestamp,
        entriesCount: data?.length || 0,
      });
      return true;
    } catch (error) {
      console.error('🔄 RolloverCache: Set rollover entries error:', error);
      return false;
    }
  }

  /**
   * Clear rollover amount cache
   * @returns {Promise<boolean>}
   */
  async clearRolloverAmount() {
    try {
      const cacheKey = await getUserCacheKey('rollover_cache');
      await AsyncStorage.removeItem(cacheKey);
      console.log('🔄 RolloverCache: Rollover amount cache cleared');
      return true;
    } catch (error) {
      console.error('🔄 RolloverCache: Clear rollover amount error:', error);
      return false;
    }
  }

  /**
   * Clear rollover entries cache
   * @returns {Promise<boolean>}
   */
  async clearRolloverEntries() {
    try {
      const cacheKey = await getUserCacheKey('rollover_entries_cache');
      await AsyncStorage.removeItem(cacheKey);
      console.log('🔄 RolloverCache: Rollover entries cache cleared');
      return true;
    } catch (error) {
      console.error('🔄 RolloverCache: Clear rollover entries error:', error);
      return false;
    }
  }

  /**
   * Clear all rollover caches
   * @returns {Promise<boolean>}
   */
  async clearAll() {
    try {
      const results = await Promise.all([
        this.clearRolloverAmount(),
        this.clearRolloverEntries(),
      ]);
      return results.every(result => result === true);
    } catch (error) {
      console.error('🔄 RolloverCache: Clear all error:', error);
      return false;
    }
  }

  /**
   * Clear all rollover caches for a specific user
   * Useful when switching users or logging out
   * @param {string} userId - User ID to clear cache for
   * @returns {Promise<boolean>}
   */
  async clearUserCache(userId) {
    try {
      const rolloverCacheKey = `rollover_cache_user_${userId}`;
      const entriesCacheKey = `rollover_entries_cache_user_${userId}`;

      await Promise.all([
        AsyncStorage.removeItem(rolloverCacheKey),
        AsyncStorage.removeItem(entriesCacheKey),
      ]);

      console.log(`🔄 RolloverCache: Cleared all cache for user ${userId}`);
      return true;
    } catch (error) {
      console.error('🔄 RolloverCache: Clear user cache error:', error);
      return false;
    }
  }

  /**
   * Clear all rollover caches for all users
   * WARNING: This clears cache for ALL users on the device
   * @returns {Promise<boolean>}
   */
  async clearAllUsersCache() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const rolloverKeys = allKeys.filter(
        key =>
          key.startsWith('rollover_cache_user_') ||
          key.startsWith('rollover_entries_cache_user_'),
      );

      if (rolloverKeys.length > 0) {
        await AsyncStorage.multiRemove(rolloverKeys);
        console.log(
          `🔄 RolloverCache: Cleared cache for ${rolloverKeys.length} keys across all users`,
        );
      }

      return true;
    } catch (error) {
      console.error('🔄 RolloverCache: Clear all users cache error:', error);
      return false;
    }
  }

  /**
   * Check if rollover amount cache is fresh
   * @returns {Promise<boolean>}
   */
  async isRolloverAmountFresh() {
    const cached = await this.getRolloverAmount();
    return cached && !cached.isStale;
  }

  /**
   * Check if rollover entries cache is fresh
   * @returns {Promise<boolean>}
   */
  async isRolloverEntriesFresh() {
    const cached = await this.getRolloverEntries();
    return cached && !cached.isStale;
  }

  /**
   * Invalidate rollover amount cache by setting timestamp to 0
   * This keeps the data but marks it as stale for background refresh
   * @returns {Promise<boolean>}
   */
  async invalidateRolloverAmount() {
    try {
      const cacheKey = await getUserCacheKey('rollover_cache');
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const {data} = JSON.parse(cached);
        const cacheData = {
          data: data || {rolloverAmount: 0, lastRolloverDate: null},
          timestamp: 0, // Mark as stale but keep data
        };

        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('🔄 RolloverCache: Rollover amount cache invalidated');
        return true;
      }
      return false;
    } catch (error) {
      console.error(
        '🔄 RolloverCache: Invalidate rollover amount error:',
        error,
      );
      return false;
    }
  }

  /**
   * Invalidate rollover entries cache by setting timestamp to 0
   * This keeps the data but marks it as stale for background refresh
   * @returns {Promise<boolean>}
   */
  async invalidateRolloverEntries() {
    try {
      const cacheKey = await getUserCacheKey('rollover_entries_cache');
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const {data} = JSON.parse(cached);
        const cacheData = {
          data: data || [],
          timestamp: 0, // Mark as stale but keep data
        };

        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('🔄 RolloverCache: Rollover entries cache invalidated');
        return true;
      }
      return false;
    } catch (error) {
      console.error(
        '🔄 RolloverCache: Invalidate rollover entries error:',
        error,
      );
      return false;
    }
  }

  /**
   * Add or update a rollover entry in cache
   * Useful for optimistic updates after creation
   * @param {object} entry - Rollover entry data to add/update
   * @returns {Promise<boolean>}
   */
  async upsertRolloverEntry(entry) {
    try {
      const cached = await this.getRolloverEntries();
      let entries = cached?.data || [];

      // Find existing entry by ID
      const existingIndex = entries.findIndex(e => e.id === entry.id);

      if (existingIndex >= 0) {
        // Update existing entry
        entries[existingIndex] = {
          ...entries[existingIndex],
          ...entry,
        };
        console.log(
          '🔄 RolloverCache: Rollover entry updated in cache:',
          entry.id,
        );
      } else {
        // Add new entry (prepend to show most recent first)
        entries.unshift(entry);
        console.log(
          '🔄 RolloverCache: Rollover entry added to cache:',
          entry.id,
        );
      }

      return await this.setRolloverEntries(entries);
    } catch (error) {
      console.error('🔄 RolloverCache: Upsert rollover entry error:', error);
      return false;
    }
  }

  /**
   * Update rollover amount optimistically
   * @param {number} newAmount - New rollover amount
   * @param {string} lastRolloverDate - Last rollover date (optional)
   * @returns {Promise<boolean>}
   */
  async updateRolloverAmount(newAmount, lastRolloverDate = null) {
    try {
      const cached = await this.getRolloverAmount();
      const currentData = cached?.data || {
        rolloverAmount: 0,
        lastRolloverDate: null,
      };

      const updatedData = {
        ...currentData,
        rolloverAmount: newAmount,
        lastRolloverDate: lastRolloverDate || currentData.lastRolloverDate,
      };

      const success = await this.setRolloverAmount(updatedData);
      if (success) {
        console.log(
          '🔄 RolloverCache: Rollover amount updated optimistically:',
          newAmount,
        );
      }
      return success;
    } catch (error) {
      console.error('🔄 RolloverCache: Update rollover amount error:', error);
      return false;
    }
  }

  /**
   * Get cached rollover banner data
   * @returns {Promise<{data: object, timestamp: number, age: number, isStale: boolean} | null>}
   */
  async getRolloverBanner() {
    try {
      const cacheKey = await getUserCacheKey('rollover_banner_cache');
      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) {
        return null;
      }

      const {data, timestamp} = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const isStale = age > BANNER_TTL; // Use 3-day TTL for banner

      console.log('🔄 RolloverCache: Retrieved rollover banner cache', {
        age: Math.round(age / 1000 / 60 / 60), // hours
        ageInDays: Math.round(age / 1000 / 60 / 60 / 24), // days
        isStale,
        banner: data,
      });

      return {
        data: data || null,
        timestamp,
        age,
        isStale,
      };
    } catch (error) {
      console.error('🔄 RolloverCache: Get rollover banner error:', error);
      return null;
    }
  }

  /**
   * Set rollover banner data in cache
   * @param {object} data - Rollover banner data to cache
   * @returns {Promise<boolean>}
   */
  async setRolloverBanner(data) {
    try {
      const cacheKey = await getUserCacheKey('rollover_banner_cache');
      const cacheData = {
        data: data || null,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('🔄 RolloverCache: Rollover banner cached successfully', {
        timestamp: cacheData.timestamp,
        banner: data,
      });
      return true;
    } catch (error) {
      console.error('🔄 RolloverCache: Set rollover banner error:', error);
      return false;
    }
  }

  /**
   * Clear rollover banner cache
   * @returns {Promise<boolean>}
   */
  async clearRolloverBanner() {
    try {
      const cacheKey = await getUserCacheKey('rollover_banner_cache');
      await AsyncStorage.removeItem(cacheKey);
      console.log('🔄 RolloverCache: Rollover banner cache cleared');
      return true;
    } catch (error) {
      console.error('🔄 RolloverCache: Clear rollover banner error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics for debugging
   * @returns {Promise<object>}
   */
  async getStats() {
    try {
      const [rolloverCache, entriesCache] = await Promise.all([
        this.getRolloverAmount(),
        this.getRolloverEntries(),
      ]);

      return {
        rolloverAmount: {
          exists: !!rolloverCache,
          age: rolloverCache ? Math.round(rolloverCache.age / 1000 / 60) : null,
          isStale: rolloverCache?.isStale || null,
          amount: rolloverCache?.data?.rolloverAmount || 0,
          lastRolloverDate: rolloverCache?.data?.lastRolloverDate,
        },
        rolloverEntries: {
          exists: !!entriesCache,
          age: entriesCache ? Math.round(entriesCache.age / 1000 / 60) : null,
          isStale: entriesCache?.isStale || null,
          count: entriesCache?.data?.length || 0,
        },
        ttlMinutes: CACHE_TTL / 1000 / 60,
      };
    } catch (error) {
      console.error('🔄 RolloverCache: Stats error:', error);
      return {
        rolloverAmount: {exists: false, error: error.message},
        rolloverEntries: {exists: false, error: error.message},
      };
    }
  }
}

// Export singleton instance
const rolloverCache = new RolloverCache();
export default rolloverCache;

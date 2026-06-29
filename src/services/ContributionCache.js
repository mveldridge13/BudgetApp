// services/ContributionCache.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = 'goal_contributions_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (shorter TTL since contributions change frequently)

class ContributionCache {
  getCacheKey(goalId) {
    if (!goalId) {
      throw new Error(
        'ContributionCache: goalId is required for goal-specific cache',
      );
    }
    return `${CACHE_KEY_PREFIX}${goalId}`;
  }

  /**
   * Get cached contribution data for a specific goal
   * @param {string} goalId - ID of the goal
   * @returns {Promise<{data: array, timestamp: number, age: number, isStale: boolean} | null>}
   */
  async get(goalId) {
    try {
      const cacheKey = this.getCacheKey(goalId);
      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) {
        return null;
      }

      const {data, timestamp} = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const isStale = age > CACHE_TTL;

      console.log('📊 ContributionCache: Retrieved cache', {
        goalId,
        age: Math.round(age / 1000), // seconds
        isStale,
        contributionCount: data?.length || 0,
      });

      return {
        data: data || [],
        timestamp,
        age,
        isStale,
      };
    } catch (error) {
      console.error('📊 ContributionCache: Get error:', error);
      return null;
    }
  }

  /**
   * Set contribution data in cache for a specific goal
   * @param {string} goalId - ID of the goal
   * @param {array} data - Contribution data to cache
   * @returns {Promise<boolean>}
   */
  async set(goalId, data) {
    try {
      const cacheKey = this.getCacheKey(goalId);
      const cacheData = {
        data: data || [],
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('📊 ContributionCache: Data cached successfully', {
        goalId,
        timestamp: cacheData.timestamp,
        contributionCount: data?.length || 0,
        dataSize: JSON.stringify(data).length,
      });
      return true;
    } catch (error) {
      console.error('📊 ContributionCache: Set error:', error);
      return false;
    }
  }

  /**
   * Clear contribution cache for a specific goal
   * @param {string} goalId - ID of the goal
   * @returns {Promise<boolean>}
   */
  async clear(goalId) {
    try {
      const cacheKey = this.getCacheKey(goalId);
      await AsyncStorage.removeItem(cacheKey);
      console.log('📊 ContributionCache: Cache cleared for goal', goalId);
      return true;
    } catch (error) {
      console.error('📊 ContributionCache: Clear error:', error);
      return false;
    }
  }

  /**
   * Check if cached data exists and is fresh for a specific goal
   * @param {string} goalId - ID of the goal
   * @returns {Promise<boolean>}
   */
  async isFresh(goalId) {
    const cached = await this.get(goalId);
    return cached && !cached.isStale;
  }

  /**
   * Get cache age in seconds
   * @param {string} goalId - ID of the goal
   * @returns {Promise<number | null>}
   */
  async getAge(goalId) {
    const cached = await this.get(goalId);
    return cached ? Math.round(cached.age / 1000) : null;
  }

  /**
   * Invalidate cache by setting timestamp to 0
   * This keeps the data but marks it as stale for background refresh
   * @param {string} goalId - ID of the goal
   * @returns {Promise<boolean>}
   */
  async invalidate(goalId) {
    try {
      const cacheKey = this.getCacheKey(goalId);
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const {data} = JSON.parse(cached);
        const cacheData = {
          data: data || [],
          timestamp: 0, // Mark as stale but keep data
        };

        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('📊 ContributionCache: Cache invalidated for goal', goalId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('📊 ContributionCache: Invalidate error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics for debugging
   * @param {string} goalId - ID of the goal
   * @returns {Promise<object>}
   */
  async getStats(goalId) {
    try {
      const cached = await this.get(goalId);
      if (!cached) {
        return {
          exists: false,
          age: null,
          isStale: null,
          size: null,
          contributionCount: 0,
        };
      }

      const size = JSON.stringify(cached.data).length;

      return {
        exists: true,
        age: Math.round(cached.age / 1000), // seconds
        isStale: cached.isStale,
        size,
        ttlMinutes: CACHE_TTL / 1000 / 60,
        lastUpdated: new Date(cached.timestamp).toISOString(),
        contributionCount: cached.data?.length || 0,
        contributions:
          cached.data?.map(c => ({
            id: c.id,
            amount: c.amount,
            date: c.date,
            source: c.source,
          })) || [],
      };
    } catch (error) {
      console.error('📊 ContributionCache: Stats error:', error);
      return {
        exists: false,
        error: error.message,
        contributionCount: 0,
      };
    }
  }

  /**
   * Add a new contribution to the cache
   * Useful for optimistic updates after adding a contribution
   * @param {string} goalId - ID of the goal
   * @param {object} contribution - Contribution data to add
   * @returns {Promise<boolean>}
   */
  async addContribution(goalId, contribution) {
    try {
      const cached = await this.get(goalId);
      let contributions = cached?.data || [];

      // Add new contribution at the beginning (most recent first)
      contributions.unshift(contribution);

      console.log(
        '📊 ContributionCache: Contribution added to cache:',
        contribution.amount,
      );

      return await this.set(goalId, contributions);
    } catch (error) {
      console.error('📊 ContributionCache: Add contribution error:', error);
      return false;
    }
  }

  /**
   * Remove a contribution from cache
   * @param {string} goalId - ID of the goal
   * @param {string|number} contributionId - ID of contribution to remove
   * @returns {Promise<boolean>}
   */
  async removeContribution(goalId, contributionId) {
    try {
      const cached = await this.get(goalId);
      let contributions = cached?.data || [];

      const filteredContributions = contributions.filter(
        c => c.id !== contributionId,
      );

      if (filteredContributions.length !== contributions.length) {
        console.log(
          '📊 ContributionCache: Contribution removed from cache:',
          contributionId,
        );
        return await this.set(goalId, filteredContributions);
      }

      console.log(
        '📊 ContributionCache: Contribution not found in cache:',
        contributionId,
      );
      return true;
    } catch (error) {
      console.error('📊 ContributionCache: Remove contribution error:', error);
      return false;
    }
  }

  /**
   * Clear all contribution caches (useful for logout)
   * @returns {Promise<boolean>}
   */
  async clearAll() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const contributionKeys = allKeys.filter(key =>
        key.startsWith(CACHE_KEY_PREFIX),
      );

      if (contributionKeys.length > 0) {
        await AsyncStorage.multiRemove(contributionKeys);
        console.log(
          '📊 ContributionCache: All contribution caches cleared',
          contributionKeys.length,
        );
      }
      return true;
    } catch (error) {
      console.error('📊 ContributionCache: Clear all error:', error);
      return false;
    }
  }
}

// Export singleton instance (following existing cache pattern)
const contributionCache = new ContributionCache();
export default contributionCache;

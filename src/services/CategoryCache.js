// services/CategoryCache.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = 'categories_cache_';
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes (longer TTL since categories change less frequently)

class CategoryCache {
  getCacheKey(userId) {
    if (!userId) {
      throw new Error('CategoryCache: userId is required for user-specific cache');
    }
    return `${CACHE_KEY_PREFIX}${userId}`;
  }

  /**
   * Get cached category data
   * @returns {Promise<{data: array, timestamp: number, age: number, isStale: boolean} | null>}
   */
  async get(userId) {
    try {
      const cacheKey = this.getCacheKey(userId);
      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) {
        return null;
      }

      const {data, timestamp} = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const isStale = age > CACHE_TTL;


      return {
        data: data || [],
        timestamp,
        age,
        isStale,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Set category data in cache
   * @param {array} data - Category data to cache
   * @returns {Promise<boolean>}
   */
  async set(data, userId) {
    try {
      const cacheKey = this.getCacheKey(userId);
      const cacheData = {
        data: data || [],
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear category cache
   * @returns {Promise<boolean>}
   */
  async clear(userId) {
    try {
      const cacheKey = this.getCacheKey(userId);
      await AsyncStorage.removeItem(cacheKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if cached data exists and is fresh
   * @returns {Promise<boolean>}
   */
  async isFresh(userId) {
    const cached = await this.get(userId);
    return cached && !cached.isStale;
  }

  /**
   * Get cache age in minutes
   * @returns {Promise<number | null>}
   */
  async getAge(userId) {
    const cached = await this.get(userId);
    return cached ? Math.round(cached.age / 1000 / 60) : null;
  }

  /**
   * Invalidate cache by setting timestamp to 0
   * This keeps the data but marks it as stale for background refresh
   * @returns {Promise<boolean>}
   */
  async invalidate(userId) {
    try {
      const cacheKey = this.getCacheKey(userId);
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const {data} = JSON.parse(cached);
        const cacheData = {
          data: data || [],
          timestamp: 0, // Mark as stale but keep data
        };

        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache statistics for debugging
   * @returns {Promise<object>}
   */
  async getStats(userId) {
    try {
      const cached = await this.get(userId);
      if (!cached) {
        return {
          exists: false,
          age: null,
          isStale: null,
          size: null,
          categoryCount: 0,
          mainCategories: 0,
          subcategories: 0,
        };
      }

      const size = JSON.stringify(cached.data).length;
      const mainCategories = cached.data?.filter(c => !c.parentId) || [];
      const subcategories = cached.data?.filter(c => c.parentId) || [];

      return {
        exists: true,
        age: Math.round(cached.age / 1000 / 60), // minutes
        isStale: cached.isStale,
        size,
        ttlMinutes: CACHE_TTL / 1000 / 60,
        lastUpdated: new Date(cached.timestamp).toISOString(),
        categoryCount: cached.data?.length || 0,
        mainCategories: mainCategories.length,
        subcategories: subcategories.length,
        categories: mainCategories.map(c => ({
          id: c.id,
          name: c.name,
          subcategoryCount: subcategories.filter(s => s.parentId === c.id)
            .length,
        })),
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message,
        categoryCount: 0,
        mainCategories: 0,
        subcategories: 0,
      };
    }
  }

  /**
   * Add or update a category in cache
   * Useful for optimistic updates after creation/editing
   * @param {object} category - Category data to add/update
   * @returns {Promise<boolean>}
   */
  async upsertCategory(category, userId) {
    try {
      const cached = await this.get(userId);
      let categories = cached?.data || [];

      // Find existing category by ID
      const existingIndex = categories.findIndex(c => c.id === category.id);

      if (existingIndex >= 0) {
        // Update existing category
        categories[existingIndex] = {
          ...categories[existingIndex],
          ...category,
        };
      } else {
        // Add new category
        categories.push(category);
      }

      return await this.set(categories, userId);
    } catch (error) {
      return false;
    }
  }

  /**
   * Remove a category from cache
   * @param {string|number} categoryId - ID of category to remove
   * @returns {Promise<boolean>}
   */
  async removeCategory(categoryId, userId) {
    try {
      const cached = await this.get(userId);
      let categories = cached?.data || [];

      const filteredCategories = categories.filter(c => c.id !== categoryId);

      if (filteredCategories.length !== categories.length) {
        return await this.set(filteredCategories, userId);
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
const categoryCache = new CategoryCache();
export default categoryCache;

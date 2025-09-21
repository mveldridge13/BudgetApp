// services/UserProfileCache.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = 'user_profile_cache_v1_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

class UserProfileCache {
  getCacheKey(userId) {
    if (!userId) {
      throw new Error('UserProfileCache: userId is required for user-specific cache');
    }
    return `${CACHE_KEY_PREFIX}${userId}`;
  }

  async get(userId) {
    try {
      const cacheKey = this.getCacheKey(userId);
      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) {
        return null;
      }

      const {profile, timestamp} = JSON.parse(cached);

      // Return cached data regardless of age (stale data is better than no data)
      // But include metadata about freshness
      const age = Date.now() - timestamp;
      const isStale = age > CACHE_TTL;

      return {
        profile,
        timestamp,
        age,
        isStale,
      };
    } catch (error) {
      console.warn('UserProfileCache: Error reading cache:', error);
      return null;
    }
  }

  async set(profile, userId) {
    try {
      const cacheKey = this.getCacheKey(userId);
      const cacheData = {
        profile,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('UserProfileCache: Profile cached successfully');
      return true;
    } catch (error) {
      console.error('UserProfileCache: Error writing cache:', error);
      return false;
    }
  }

  async clear(userId) {
    try {
      const cacheKey = this.getCacheKey(userId);
      await AsyncStorage.removeItem(cacheKey);
      console.log('UserProfileCache: Cache cleared');
      return true;
    } catch (error) {
      console.error('UserProfileCache: Error clearing cache:', error);
      return false;
    }
  }

  async isValid() {
    const cached = await this.get();
    return cached && !cached.isStale;
  }
}

export default new UserProfileCache();

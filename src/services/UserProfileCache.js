// services/UserProfileCache.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'user_profile_cache_v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

class UserProfileCache {
  async get() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
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

  async set(profile) {
    try {
      const cacheData = {
        profile,
        timestamp: Date.now(),
      };
      
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('UserProfileCache: Profile cached successfully');
      return true;
    } catch (error) {
      console.error('UserProfileCache: Error writing cache:', error);
      return false;
    }
  }

  async clear() {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
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
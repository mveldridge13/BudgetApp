// Debug script to check category cache and API
const AsyncStorage =
  require('@react-native-async-storage/async-storage').default;

async function debugCategories() {
  try {
    console.log('=== DEBUGGING CATEGORY CACHE ===');

    // Check what's in cache
    const cached = await AsyncStorage.getItem('categories_cache');
    if (cached) {
      const parsedCache = JSON.parse(cached);
      console.log('📂 Cache exists:', {
        timestamp: new Date(parsedCache.timestamp).toISOString(),
        age:
          Math.round((Date.now() - parsedCache.timestamp) / 1000 / 60) +
          ' minutes',
        categoryCount: parsedCache.data?.length || 0,
        categories:
          parsedCache.data?.slice(0, 3).map(c => ({id: c.id, name: c.name})) ||
          [],
      });
    } else {
      console.log('📂 No cache found');
    }

    // Clear the cache
    await AsyncStorage.removeItem('categories_cache');
    console.log('✅ Cache cleared');

    // Also clear any other related caches
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.includes('cache'));
    console.log('🧹 Found cache keys:', cacheKeys);

    for (const key of cacheKeys) {
      await AsyncStorage.removeItem(key);
      console.log(`✅ Cleared ${key}`);
    }
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Export for use in app
if (typeof module !== 'undefined') {
  module.exports = debugCategories;
}

// Run if executed directly
if (typeof window === 'undefined') {
  debugCategories();
}

import TrendAPI from './services/TrendAPIService';

export const testConnection = async () => {
  try {
    console.log('Testing backend connection...');

    // Initialize the API service
    await TrendAPI.initialize();

    // Test health endpoint (no auth required)
    const health = await TrendAPI.checkHealth();
    console.log('✅ Backend health check successful:', health);

    // Test categories endpoint (requires auth, but let's see what happens)
    try {
      const categories = await TrendAPI.getCategories();
      console.log('✅ Categories loaded:', categories?.length || 0);
    } catch (error) {
      console.log(
        '⚠️ Categories require authentication (expected):',
        error.message,
      );
    }

    return true;
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    return false;
  }
};

import TrendAPI from './services/TrendAPIService';

export const testConnection = async () => {
  try {

    // Initialize the API service
    await TrendAPI.initialize();

    // Test health endpoint (no auth required)
    const health = await TrendAPI.checkHealth();

    // Test categories endpoint (requires auth, but let's see what happens)
    try {
      const categories = await TrendAPI.getCategories();
    } catch (error) {
    }

    return true;
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    return false;
  }
};

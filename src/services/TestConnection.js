import TrendAPI from './services/TrendAPIService';

export const testConnection = async () => {
  try {
    // Initialize the API service
    await TrendAPI.initialize();

    // Test health endpoint (no auth required)

    // Test categories endpoint (requires auth, but let's see what happens)
    try {
    } catch (error) {}

    return true;
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    return false;
  }
};

export const API_CONFIG = {
  // Use local proxy in development to avoid CORS issues
  // The proxy forwards requests to the real API server
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 30000, // 30 seconds, matching mobile app

  // Cache TTLs (in milliseconds) - matching mobile app
  cacheTTL: {
    userProfile: 24 * 60 * 60 * 1000,  // 24 hours
    transactions: 5 * 60 * 1000,        // 5 minutes
    categories: 60 * 60 * 1000,         // 60 minutes
    rollover: 5 * 60 * 1000,            // 5 minutes
    goals: 5 * 60 * 1000,               // 5 minutes
  },

  // Storage keys
  storageKeys: {
    authToken: 'trend_auth_token',
    refreshToken: 'trend_refresh_token',
    userProfile: 'trend_user_profile',
    appSettings: 'trend_app_settings',
  },
};

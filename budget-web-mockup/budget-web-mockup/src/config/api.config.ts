export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://trend-alb-1755058843.ap-southeast-2.elb.amazonaws.com/api/v1',
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
    userProfile: 'trend_user_profile',
    appSettings: 'trend_app_settings',
  },
};

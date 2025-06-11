/* eslint-disable no-unused-vars */
/* eslint-disable react-native/no-inline-styles */
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {View, Text, ActivityIndicator} from 'react-native';
import {Amplify} from 'aws-amplify';
import awsconfig from './src/aws-exports';
import AppNavigator from './src/navigation/AppNavigator';
import WelcomeFlow from './src/components/WelcomeFlow';
import AuthFlow from './src/components/auth/AuthFlow';
import {AuthenticationManager} from './src/services/auth/AuthenticationManager';
import {StorageCoordinator} from './src/services/storage/StorageCoordinator';

// Configure Amplify
Amplify.configure(awsconfig);

// Helper function to wait for AWS credentials
const waitForAWSCredentials = async (maxRetries = 5, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const {fetchAuthSession} = await import('aws-amplify/auth');
      const session = await fetchAuthSession();

      if (session.credentials && session.identityId) {
        console.log('✅ AWS credentials validated:', {
          hasCredentials: !!session.credentials,
          identityId: session.identityId,
          region: session.credentials.sessionToken
            ? 'Has session'
            : 'No session',
        });
        return session;
      }
    } catch (error) {
      console.log(
        `⏳ Waiting for AWS credentials... attempt ${i + 1}/${maxRetries}`,
      );
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error(
    'Failed to obtain valid AWS credentials after multiple attempts',
  );
};

// Helper function to create fallback storage
const createFallbackStorage = async () => {
  const AsyncStorage =
    require('@react-native-async-storage/async-storage').default;

  return {
    getItem: async key => {
      try {
        const value = await AsyncStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.warn(`Fallback storage getItem failed for ${key}:`, error);
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn(`Fallback storage setItem failed for ${key}:`, error);
      }
    },
    removeItem: async key => {
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        console.warn(`Fallback storage removeItem failed for ${key}:`, error);
      }
    },
    getAllKeys: async () => {
      try {
        return await AsyncStorage.getAllKeys();
      } catch (error) {
        console.warn('Fallback storage getAllKeys failed:', error);
        return [];
      }
    },
    // Add methods needed for compatibility
    getUserStorageManager: () => null,
    isUserStorageInitialized: () => false,
    initializeUserStorage: async () => null,
  };
};

// Separated cloud sync logic with user-specific keys
const attemptCloudSync = async (storage, userStorage = null) => {
  try {
    console.log('🔄 Attempting cloud sync operations...');

    // Wait for valid AWS credentials
    const session = await waitForAWSCredentials();
    console.log('✅ AWS credentials ready for sync');

    // Check sync queue status
    if (storage.getSyncQueueStatus) {
      const queueStatus = storage.getSyncQueueStatus();
      console.log('🔍 Sync queue status:', queueStatus);
    }

    // Force sync existing data
    const allKeys = await storage.getAllKeys();
    console.log('📋 Found local keys for sync:', allKeys.length);

    // Sync important app data - prioritize user-specific keys
    if (userStorage) {
      // Use user-specific storage keys
      const userSpecificData = ['user_setup', 'transactions', 'categories'];
      for (const dataType of userSpecificData) {
        try {
          const data = await userStorage.getUserData(dataType);
          if (data !== null) {
            console.log(`🔄 Queueing user-specific ${dataType} for sync...`);
            await userStorage.setUserData(dataType, data); // This queues it for sync
          }
        } catch (syncError) {
          console.warn(
            `⚠️ Failed to sync user ${dataType}:`,
            syncError.message,
          );
        }
      }
    } else {
      // Fallback to legacy keys
      const keysToSync = [
        '@fintech_app_user_setup',
        '@fintech_app_transactions',
        '@fintech_app_categories',
        'app.hasSeenWelcome',
      ];

      for (const key of keysToSync) {
        try {
          const value = await storage.getItem(key);
          if (value !== null) {
            console.log(`🔄 Queueing ${key} for sync...`);
            await storage.setItem(key, value); // This queues it for sync
          }
        } catch (syncError) {
          console.warn(`⚠️ Failed to sync ${key}:`, syncError.message);
        }
      }
    }

    // Check final queue status
    setTimeout(async () => {
      if (storage.getSyncQueueStatus) {
        const finalQueue = storage.getSyncQueueStatus();
        console.log('🔍 Final sync queue status:', finalQueue);
      }
    }, 2000);
  } catch (syncError) {
    console.warn(
      '⚠️ Cloud sync failed, continuing in local-only mode:',
      syncError.message,
    );
  }
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [authManager, setAuthManager] = useState(null);
  const [storageCoordinator, setStorageCoordinator] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Starting app initialization...');
        setInitError(null);

        // Step 1: Initialize storage with minimal cloud sync initially
        console.log('📦 Initializing StorageCoordinator...');
        const storage = StorageCoordinator.getInstance();

        // Test local storage first
        try {
          const localStorage = storage.localStorage || storage;
          await localStorage.setItem('__app_init_test__', {
            timestamp: Date.now(),
          });
          const testResult = await localStorage.getItem('__app_init_test__');
          await localStorage.removeItem('__app_init_test__');

          if (!testResult) {
            throw new Error('Local storage test failed');
          }
          console.log('✅ Local storage working correctly');
        } catch (storageError) {
          console.error('❌ Local storage test failed:', storageError);
          throw new Error(
            `Storage initialization failed: ${storageError.message}`,
          );
        }

        // Step 2: Initialize AuthenticationManager
        console.log('🔐 Initializing AuthenticationManager...');
        const auth = new AuthenticationManager(storage);
        await auth.initialize();

        setAuthManager(auth);
        setStorageCoordinator(storage);
        setIsAuthenticated(auth.isLoggedIn);

        // Step 3: Handle welcome state for authenticated users
        if (auth.isLoggedIn) {
          console.log('👤 User is authenticated, initializing user storage...');

          try {
            // Wait for AWS credentials before attempting user operations
            await waitForAWSCredentials();

            // Initialize user-specific storage
            const {getCurrentUser} = await import('aws-amplify/auth');
            const user = await getCurrentUser();

            console.log('🔑 Initializing user storage for:', user.userId);

            if (storage.initializeUserStorage) {
              const userStorage = await storage.initializeUserStorage(
                user.userId,
              );

              // Wait a moment for any cloud sync to complete
              console.log('⏳ Waiting for potential cloud sync...');
              await new Promise(resolve => setTimeout(resolve, 2000));

              // Check for existing user data
              const profile = await userStorage.getUserProfile();

              if (profile) {
                console.log('📊 User profile loaded:', {
                  hasCompletedSetup: profile.hasCompletedSetup,
                  transactionCount: profile.transactionCount,
                  hasSeenWelcome: profile.hasSeenWelcome,
                  lastActivity: profile.lastActivity,
                });

                if (profile.hasCompletedSetup) {
                  console.log('🎯 Existing user detected - skipping setup');
                  setHasSeenWelcome(true); // Skip welcome for returning users

                  // Optional: Show welcome back message
                  console.log(
                    `👋 Welcome back! Found ${profile.transactionCount} transactions`,
                  );
                } else {
                  console.log('👤 New user or no existing data found');
                  setHasSeenWelcome(profile.hasSeenWelcome);
                }
              } else {
                console.log('⚠️ Failed to load user profile, using fallback');
                const welcomeSeen = await storage.getItem('app.hasSeenWelcome');
                setHasSeenWelcome(welcomeSeen === true);
              }
            } else {
              // Fallback to legacy welcome check
              console.log(
                '⚠️ UserStorageManager not available, using legacy welcome check',
              );
              const welcomeSeen = await storage.getItem('app.hasSeenWelcome');
              setHasSeenWelcome(welcomeSeen === true);
            }
          } catch (credError) {
            console.warn(
              '⚠️ AWS credentials or user setup failed, using local-only mode:',
              credError.message,
            );

            // Fallback to local storage only for welcome check
            const localStorage = storage.localStorage || storage;
            const welcomeSeen = await localStorage.getItem(
              'app.hasSeenWelcome',
            );
            setHasSeenWelcome(welcomeSeen === true);
          }
        }

        // Step 4: Perform health check
        try {
          const healthCheck = await storage.healthCheck();
          console.log(
            '🏥 Storage health check:',
            healthCheck.overall,
            healthCheck.details || healthCheck,
          );
        } catch (healthError) {
          console.warn('⚠️ Health check failed:', healthError.message);
        }

        // Step 5: Delayed sync operations (only if authenticated)
        if (auth.isLoggedIn) {
          setTimeout(() => {
            const userStorage = storage.getUserStorageManager
              ? storage.getUserStorageManager()
              : null;
            attemptCloudSync(storage, userStorage);
          }, 3000);
        }

        console.log('✅ App initialization completed successfully');
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setInitError(error.message);

        // Fallback initialization
        try {
          console.log('🆘 Attempting fallback initialization...');
          const fallbackStorage = await createFallbackStorage();

          const fallbackAuth = new AuthenticationManager(fallbackStorage);
          await fallbackAuth.initialize();

          setAuthManager(fallbackAuth);
          setStorageCoordinator(fallbackStorage);
          setIsAuthenticated(fallbackAuth.isLoggedIn);

          console.log('✅ Fallback initialization successful');
          setInitError(null);
        } catch (fallbackError) {
          console.error('❌ Fallback initialization failed:', fallbackError);
          setInitError(`Initialization failed: ${fallbackError.message}`);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []); // Empty dependency array is intentional - we only want this to run once on mount

  const handleAuthComplete = async () => {
    console.log('🔐 Auth completed - refreshing state...');

    try {
      if (authManager) {
        await authManager.initialize();
        setIsAuthenticated(authManager.isLoggedIn);

        if (authManager.isLoggedIn && storageCoordinator) {
          // Wait a bit for AWS credentials to be ready after auth
          setTimeout(async () => {
            try {
              await waitForAWSCredentials();

              // Initialize user-specific storage after authentication
              const {getCurrentUser} = await import('aws-amplify/auth');
              const user = await getCurrentUser();

              console.log(
                '👤 Post-auth: Initializing storage for user:',
                user.userId,
              );

              if (storageCoordinator.initializeUserStorage) {
                try {
                  const userStorage =
                    await storageCoordinator.initializeUserStorage(user.userId);

                  // Wait a moment for any cloud sync to complete
                  console.log(
                    '⏳ Post-auth: Waiting for potential cloud sync...',
                  );
                  await new Promise(resolve => setTimeout(resolve, 2000));

                  // Check for existing user data
                  const profile = await userStorage.getUserProfile();

                  if (profile) {
                    console.log('📊 Post-auth user profile:', {
                      hasCompletedSetup: profile.hasCompletedSetup,
                      transactionCount: profile.transactionCount,
                      hasSeenWelcome: profile.hasSeenWelcome,
                      lastActivity: profile.lastActivity,
                    });

                    if (profile.hasCompletedSetup) {
                      console.log(
                        '🎯 Existing user detected after auth - skipping setup',
                      );
                      setHasSeenWelcome(true); // Skip welcome for returning users

                      // Optional: Show welcome back message
                      console.log(
                        `👋 Welcome back! Found ${profile.transactionCount} transactions`,
                      );
                    } else {
                      console.log(
                        '👤 New user or no existing data found after auth',
                      );
                      setHasSeenWelcome(profile.hasSeenWelcome);
                    }
                  } else {
                    console.log(
                      '⚠️ Failed to load user profile after auth, using fallback',
                    );
                    const welcomeSeen = await storageCoordinator.getItem(
                      'app.hasSeenWelcome',
                    );
                    setHasSeenWelcome(welcomeSeen === true);
                  }

                  // Start cloud sync with user storage
                  attemptCloudSync(storageCoordinator, userStorage);
                } catch (userStorageError) {
                  console.warn(
                    '⚠️ Post-auth UserStorage failed:',
                    userStorageError.message,
                  );
                  // Fallback to legacy behavior
                  const welcomeSeen = await storageCoordinator.getItem(
                    'app.hasSeenWelcome',
                  );
                  setHasSeenWelcome(welcomeSeen === true);

                  // Start cloud sync without user storage
                  attemptCloudSync(storageCoordinator);
                }
              } else {
                // Fallback to legacy behavior
                console.log(
                  '⚠️ UserStorageManager not available, using legacy post-auth flow',
                );
                const welcomeSeen = await storageCoordinator.getItem(
                  'app.hasSeenWelcome',
                );
                setHasSeenWelcome(welcomeSeen === true);

                // Start cloud sync without user storage
                attemptCloudSync(storageCoordinator);
              }
            } catch (error) {
              console.warn('⚠️ Post-auth setup failed:', error.message);
              // Fallback to local storage
              const localStorage =
                storageCoordinator.localStorage || storageCoordinator;
              const welcomeSeen = await localStorage.getItem(
                'app.hasSeenWelcome',
              );
              setHasSeenWelcome(welcomeSeen === true);
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error('❌ Auth completion handling failed:', error);
    }
  };

  const handleWelcomeComplete = async () => {
    console.log('🎉 Welcome flow completed');
    try {
      if (storageCoordinator) {
        // Use user-specific storage if available
        const userStorage = storageCoordinator.getUserStorageManager
          ? storageCoordinator.getUserStorageManager()
          : null;

        if (userStorage) {
          console.log('💾 Saving welcome completion via UserStorageManager...');
          await userStorage.setWelcomeComplete();
        } else {
          console.log(
            '💾 Saving welcome completion via StorageCoordinator (fallback)...',
          );
          await storageCoordinator.setItem('app.hasSeenWelcome', true);
        }

        console.log('✅ Welcome completion saved');
      }
      setHasSeenWelcome(true);
    } catch (error) {
      console.warn('⚠️ Failed to save welcome completion:', error.message);
      setHasSeenWelcome(true); // Continue anyway
    }
  };

  console.log('📱 App render state:', {
    isInitializing,
    isAuthenticated,
    hasSeenWelcome,
    hasStorageCoordinator: !!storageCoordinator,
    hasError: !!initError,
    userStorageReady: storageCoordinator?.isUserStorageInitialized?.() || false,
  });

  // Show loading screen with error state if needed
  if (isInitializing) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f8f9fa',
            paddingHorizontal: 32,
          }}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text
            style={{
              marginTop: 16,
              fontSize: 16,
              color: '#6b7280',
              fontWeight: '500',
            }}>
            {initError ? 'Initialization Error' : 'Initializing Trend...'}
          </Text>
          <Text
            style={{
              marginTop: 8,
              fontSize: 14,
              color: '#9ca3af',
              textAlign: 'center',
            }}>
            {initError || 'Setting up storage & sync systems'}
          </Text>
          {initError && (
            <Text
              style={{
                marginTop: 16,
                fontSize: 12,
                color: '#ef4444',
                textAlign: 'center',
              }}>
              The app will continue in offline mode
            </Text>
          )}
        </View>
      </SafeAreaProvider>
    );
  }

  // Show auth flow if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <AuthFlow
          onAuthComplete={handleAuthComplete}
          authManager={authManager}
        />
      </SafeAreaProvider>
    );
  }

  // Show welcome flow if authenticated but hasn't seen welcome
  if (!hasSeenWelcome) {
    return (
      <SafeAreaProvider>
        <WelcomeFlow
          onComplete={handleWelcomeComplete}
          storageCoordinator={storageCoordinator}
        />
      </SafeAreaProvider>
    );
  }

  // Show main app
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;

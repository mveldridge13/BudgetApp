/* eslint-disable no-unused-vars */
/* eslint-disable react-native/no-inline-styles */
// App.js (Migrated to UserStorageManager)
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

              // Simple cloud data check - no complex recovery chains
              console.log('☁️ Checking for existing user data...');
              
              // Wait a moment for cloud sync to complete
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Just check what's already in user storage
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
              const localStorage = storage.localStorage || storage;
              const welcomeSeen = await localStorage.getItem('app.hasSeenWelcome');
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

                  // Simple post-auth data check
                  console.log('☁️ Post-auth: Checking for existing user data...');
                  
                  // Wait for cloud sync to complete
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // Just check what's in user storage
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
                    const localStorage = storageCoordinator.localStorage || storageCoordinator;
                    const welcomeSeen = await localStorage.getItem(
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
                  const localStorage = storageCoordinator.localStorage || storageCoordinator;
                  const welcomeSeen = await localStorage.getItem(
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
                const localStorage = storageCoordinator.localStorage || storageCoordinator;
                const welcomeSeen = await localStorage.getItem(
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
          const localStorage = storageCoordinator.localStorage || storageCoordinator;
          await localStorage.setItem('app.hasSeenWelcome', true);
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

// IMMEDIATE backup creation function - runs right after transactions are added
const createImmediateBackup = async (storage, userStorage, userId) => {
  try {
    console.log('🔥 IMMEDIATE: Creating backup of current session data...');
    
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // Get current data from UserStorageManager
    const dataTypes = ['transactions', 'goals', 'user_setup', 'categories', 'appSettings', 'isPro'];
    const backupData = {
      timestamp: new Date().toISOString(),
      userId: userId,
      sessionId: Date.now(),
      data: {}
    };
    
    for (const dataType of dataTypes) {
      try {
        const data = await userStorage.getUserData(dataType);
        if (data) {
          backupData.data[dataType] = data;
          console.log(`📋 Backing up ${dataType}:`, Array.isArray(data) ? `${data.length} items` : 'object');
        }
      } catch (error) {
        console.warn(`⚠️ Could not backup ${dataType}:`, error.message);
      }
    }
    
    // Store in multiple redundant locations
    const backupKeys = [
      `session_backup_${userId}`,
      `emergency_backup_${userId}`,
      `immediate_backup_${Date.now()}`,
      'last_session_data'
    ];
    
    for (const key of backupKeys) {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(backupData));
      } catch (error) {
        console.warn(`Failed to create backup with key ${key}:`, error.message);
      }
    }
    
    // Also store session info
    await AsyncStorage.setItem('session_info', JSON.stringify({
      userId,
      lastBackup: backupData.timestamp,
      sessionId: backupData.sessionId,
      dataCount: Object.keys(backupData.data).length
    }));
    
    console.log('✅ IMMEDIATE backup created successfully with multiple redundancy');
    return true;
  } catch (error) {
    console.error('❌ IMMEDIATE backup failed:', error);
    return false;
  }
};

// Enhanced cloud recovery function to pull data from AWS
const attemptCloudDataRecovery = async (userStorage, userId) => {
  try {
    console.log('☁️ Attempting to recover data from cloud storage...');
    
    // Try to download data from cloud storage
    const dataTypes = ['transactions', 'goals', 'user_setup', 'categories', 'appSettings'];
    let recoveredCount = 0;
    
    for (const dataType of dataTypes) {
      try {
        // Check if we already have this data locally
        const existingData = await userStorage.getUserData(dataType);
        
        if (!existingData) {
          // Try to download from cloud
          const cloudKey = `user_${userId}_${dataType}`;
          console.log(`☁️ Attempting to download ${cloudKey} from cloud...`);
          
          try {
            const {downloadData} = await import('aws-amplify/storage');
            const downloadResult = await downloadData({
              key: cloudKey,
            }).result;
            
            const cloudData = await downloadResult.body.json();
            
            if (cloudData) {
              console.log(`☁️ Found ${dataType} in cloud storage!`);
              await userStorage.setUserData(dataType, cloudData);
              recoveredCount++;
              
              if (dataType === 'transactions' && Array.isArray(cloudData)) {
                console.log(`📊 Recovered ${cloudData.length} transactions from cloud!`);
              }
            }
          } catch (downloadError) {
            // Silent fail for individual downloads
            console.log(`ℹ️ No ${dataType} found in cloud storage`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error recovering ${dataType} from cloud:`, error.message);
      }
    }
    
    if (recoveredCount > 0) {
      console.log(`✅ Successfully recovered ${recoveredCount} data items from cloud!`);
      return await userStorage.getUserProfile();
    } else {
      console.log('ℹ️ No data recovered from cloud storage');
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️ Cloud data recovery failed:', error.message);
    return null;
  }
};

// Enhanced migration function to handle all possible legacy keys
const migrateLegacyDataToUser = async (storage, userStorage) => {
  try {
    console.log('🔄 Starting comprehensive legacy data migration...');

    // Extended list of possible legacy keys based on the app's history
    const legacyKeys = [
      // Direct AsyncStorage keys (most likely your transactions are here)
      'transactions',
      'goals', 
      'userSetup',
      'user_setup',
      'appSettings',
      'categories',
      'hasSeenWelcome',
      'hasSeenBalanceCardTour',
      'hasSeenAddTransactionTour', 
      'hasSeenTransactionSwipeTour',
      'isPro',
      'lastBackup',
      
      // Prefixed keys
      '@fintech_app_transactions',
      '@fintech_app_goals',
      '@fintech_app_user_setup', 
      '@fintech_app_categories',
      '@fintech_app_settings',
      
      // Alternative prefix patterns
      'fintech_app_transactions',
      'fintech_app_goals',
      'fintech_app_user_setup',
      'fintech_app_categories',
      
      // App-specific patterns
      'app.transactions',
      'app.goals', 
      'app.userSetup',
      'app.hasSeenWelcome',
    ];

    const migrationMapping = {
      // Transaction mappings
      'transactions': 'transactions',
      '@fintech_app_transactions': 'transactions', 
      'fintech_app_transactions': 'transactions',
      'app.transactions': 'transactions',
      
      // Goals mappings
      'goals': 'goals',
      '@fintech_app_goals': 'goals',
      'fintech_app_goals': 'goals', 
      'app.goals': 'goals',
      
      // User setup mappings
      'userSetup': 'user_setup',
      'user_setup': 'user_setup',
      '@fintech_app_user_setup': 'user_setup',
      'fintech_app_user_setup': 'user_setup',
      'app.userSetup': 'user_setup',
      
      // Categories mappings
      'categories': 'categories',
      '@fintech_app_categories': 'categories',
      'fintech_app_categories': 'categories',
      
      // Settings mappings
      'appSettings': 'appSettings',
      '@fintech_app_settings': 'appSettings',
      
      // Welcome/tour mappings
      'hasSeenWelcome': 'hasSeenWelcome',
      'app.hasSeenWelcome': 'hasSeenWelcome',
      'hasSeenBalanceCardTour': 'tours.balanceCard',
      'hasSeenAddTransactionTour': 'tours.addTransaction', 
      'hasSeenTransactionSwipeTour': 'tours.transactionSwipe',
      
      // Other mappings
      'isPro': 'isPro',
      'lastBackup': 'lastBackup',
    };

    let migratedCount = 0;
    const migrationResults = {};

    // Check all possible legacy storage locations
    for (const legacyKey of legacyKeys) {
      try {
        // Try different storage locations
        let legacyData = null;
        
        // First try the main storage
        try {
          legacyData = await storage.getItem(legacyKey);
        } catch (e) {
          // If main storage fails, try localStorage
          if (storage.localStorage) {
            try {
              legacyData = await storage.localStorage.getItem(legacyKey);
            } catch (e2) {
              // Also try direct AsyncStorage as a last resort
              try {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                const rawData = await AsyncStorage.getItem(legacyKey);
                if (rawData) {
                  legacyData = JSON.parse(rawData);
                }
              } catch (e3) {
                // Silent fail for each attempt
              }
            }
          }
        }

        if (legacyData !== null && legacyData !== undefined) {
          const newKey = migrationMapping[legacyKey] || legacyKey;
          
          // Check if we already have this data in the new format
          const existingData = await userStorage.getUserData(newKey);
          
          if (!existingData) {
            console.log(`🔄 Migrating ${legacyKey} -> ${newKey}`);
            
            // Migrate the data
            const success = await userStorage.setUserData(newKey, legacyData);
            
            if (success) {
              migratedCount++;
              migrationResults[legacyKey] = true;
              console.log(`✅ Successfully migrated ${legacyKey} (${Array.isArray(legacyData) ? legacyData.length + ' items' : typeof legacyData})`);
              
              // Special handling for transactions to show count
              if (newKey === 'transactions' && Array.isArray(legacyData)) {
                console.log(`📊 Found ${legacyData.length} transactions to migrate!`);
              }
            } else {
              migrationResults[legacyKey] = false;
              console.warn(`⚠️ Failed to migrate ${legacyKey}`);
            }
          } else {
            console.log(`ℹ️ ${newKey} already exists in new format, skipping ${legacyKey}`);
            migrationResults[legacyKey] = 'skipped';
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error checking legacy key ${legacyKey}:`, error.message);
        migrationResults[legacyKey] = false;
      }
    }

    console.log(`📊 Migration summary: ${migratedCount} items migrated`);
    console.log('📊 Migration results:', migrationResults);
    
    if (migratedCount > 0) {
      console.log('✅ Legacy data migration completed successfully!');
      
      // Force immediate sync to cloud to persist the migrated data
      try {
        console.log('🔄 Forcing immediate cloud sync of migrated data...');
        if (storage.forceSyncNow) {
          await storage.forceSyncNow();
          console.log('✅ Migrated data synced to cloud!');
        }
      } catch (syncError) {
        console.warn('⚠️ Failed to sync migrated data to cloud:', syncError.message);
      }
      
      // Trigger a profile refresh to pick up the migrated data
      try {
        const updatedProfile = await userStorage.getUserProfile();
        console.log('📋 Updated profile after migration:', {
          hasCompletedSetup: updatedProfile.hasCompletedSetup,
          transactionCount: updatedProfile.transactionCount,
          hasSeenWelcome: updatedProfile.hasSeenWelcome,
        });
        return updatedProfile;
      } catch (error) {
        console.warn('⚠️ Could not refresh profile after migration:', error);
      }
    } else {
      console.log('ℹ️ No legacy data found to migrate');
    }
    
    return null;
  } catch (error) {
    console.error('❌ Legacy data migration failed:', error);
    return null;
  }
};

// Manual backup creation for testing
const createManualTestBackup = async () => {
  try {
    console.log('🚨 Creating manual test backup...');
    
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // Create a simple test backup
    const testBackup = {
      timestamp: new Date().toISOString(),
      sessionId: Date.now(),
      source: 'manual_test',
      data: {
        transactions: [
          {
            id: 'test_transaction_1',
            amount: 25.50,
            description: 'Test Transaction 1',
            category: 'food',
            date: new Date().toISOString(),
            createdAt: new Date().toISOString()
          },
          {
            id: 'test_transaction_2', 
            amount: 12.75,
            description: 'Test Transaction 2',
            category: 'transport',
            date: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }
        ]
      }
    };
    
    // Store in multiple locations
    const keys = [
      'manual_test_backup',
      'transaction_backup_latest',
      'emergency_session_data'
    ];
    
    for (const key of keys) {
      await AsyncStorage.setItem(key, JSON.stringify(testBackup));
      console.log(`✅ Created manual backup in: ${key}`);
    }
    
    console.log('✅ Manual test backup created successfully!');
    return testBackup;
  } catch (error) {
    console.error('❌ Manual backup creation failed:', error);
    return null;
  }
};

// Debug function to check all storage keys
const debugStorageContents = async () => {
  try {
    console.log('🔍 DEBUG: Checking all storage contents...');
    
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const allKeys = await AsyncStorage.getAllKeys();
    
    console.log('📋 All AsyncStorage keys:', allKeys);
    
    // Check for transaction-related keys
    const transactionKeys = allKeys.filter(key => 
      key.includes('transaction') || 
      key.includes('user_') || 
      key.includes('backup') ||
      key === 'transactions' ||
      key === 'goals' ||
      key === 'userSetup'
    );
    
    console.log('🔍 Transaction-related keys found:', transactionKeys);
    
    // Check contents of each relevant key
    for (const key of transactionKeys) {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              console.log(`📊 ${key}: Array with ${parsed.length} items`);
            } else if (typeof parsed === 'object') {
              console.log(`📦 ${key}:`, Object.keys(parsed));
            } else {
              console.log(`📄 ${key}: ${typeof parsed}`);
            }
          } catch (e) {
            console.log(`📄 ${key}: Raw string (${value.length} chars)`);
          }
        }
      } catch (error) {
        console.warn(`❌ Error reading ${key}:`, error.message);
      }
    }
    
    return transactionKeys;
  } catch (error) {
    console.error('🔍 DEBUG: Storage debug failed:', error);
    return [];
  }
};

// Emergency data backup function - creates local backup that survives rebuilds
const createEmergencyBackup = async (userStorage) => {
  try {
    console.log('🚨 Creating emergency backup of user data...');
    
    const dataTypes = ['transactions', 'goals', 'user_setup', 'categories', 'appSettings', 'isPro'];
    const backupData = {
      timestamp: new Date().toISOString(),
      userId: userStorage.userId,
      data: {}
    };
    
    for (const dataType of dataTypes) {
      try {
        const data = await userStorage.getUserData(dataType);
        if (data) {
          backupData.data[dataType] = data;
        }
      } catch (error) {
        console.warn(`⚠️ Could not backup ${dataType}:`, error.message);
      }
    }
    
    // Store in multiple locations for redundancy
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const backupKey = `emergency_backup_${userStorage.userId}`;
    
    await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));
    await AsyncStorage.setItem('last_emergency_backup', JSON.stringify({
      userId: userStorage.userId,
      timestamp: backupData.timestamp,
      key: backupKey
    }));
    
    console.log('✅ Emergency backup created successfully');
    return backupData;
  } catch (error) {
    console.error('❌ Emergency backup failed:', error);
    return null;
  }
};

// Enhanced emergency data recovery function with multiple backup sources
const attemptEmergencyRecovery = async (userStorage, userId) => {
  try {
    console.log('🚨 Attempting emergency data recovery...');
    
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // Try multiple backup keys in order of preference
    const backupKeys = [
      `session_backup_${userId}`,
      `emergency_backup_${userId}`,
      'last_session_data',
      `immediate_backup_${userId}`,
      // Transaction-specific backups
      'transaction_backup_latest',
      'emergency_session_data',
      'last_transaction_state'
    ];
    
    // Also check for any recent immediate backups and transaction backups
    const allKeys = await AsyncStorage.getAllKeys();
    const immediateBackups = allKeys.filter(key => 
      key.startsWith('immediate_backup_') || 
      key.startsWith('transaction_backup_')
    );
    backupKeys.push(...immediateBackups);
    
    console.log('🔍 Looking for backups in keys:', backupKeys);
    
    let backupData = null;
    let foundKey = null;
    
    for (const key of backupKeys) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          backupData = data;
          foundKey = key;
          console.log(`📋 Found backup data in: ${key}`);
          break;
        }
      } catch (error) {
        console.warn(`Could not read backup key ${key}:`, error.message);
      }
    }
    
    if (!backupData) {
      console.log('❌ No backup data found in any location');
      return null;
    }
    
    let backup;
    try {
      backup = JSON.parse(backupData);
      if (!backup || typeof backup !== 'object') {
        console.log('❌ Invalid backup data format');
        return null;
      }
    } catch (parseError) {
      console.log('❌ Failed to parse backup data:', parseError.message);
      return null;
    }
    
    console.log('📋 Found backup from:', backup.timestamp || 'unknown', 'in key:', foundKey);
    
    // Handle different backup formats safely
    if (backup.data && typeof backup.data === 'object') {
      console.log('📊 Full backup contains:', Object.keys(backup.data));
    } else if (backup.transactions) {
      console.log('📊 Transaction-only backup contains:', backup.transactions.length, 'transactions');
    } else {
      console.log('📊 Backup format:', Object.keys(backup));
    }
    
    let recoveredCount = 0;
    
    // Handle different backup formats safely
    if (backup.data && typeof backup.data === 'object') {
      // Full data backup format
      console.log('🔄 Processing full data backup...');
      for (const [dataType, data] of Object.entries(backup.data)) {
        try {
          if (data === null || data === undefined) {
            console.log(`⚠️ Skipping ${dataType} - no data`);
            continue;
          }
          
          // Check if we already have this data
          const existing = await userStorage.getUserData(dataType);
          if (!existing && data) {
            await userStorage.setUserData(dataType, data);
            recoveredCount++;
            
            if (dataType === 'transactions' && Array.isArray(data)) {
              console.log(`📊 Recovered ${data.length} transactions from backup!`);
            } else {
              console.log(`📋 Recovered ${dataType}`);
            }
          } else if (existing) {
            console.log(`ℹ️ ${dataType} already exists, skipping restore`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to restore ${dataType}:`, error.message);
        }
      }
    } else if (backup.transactions && Array.isArray(backup.transactions)) {
      // Transaction-only backup format
      console.log('🔄 Processing transaction-only backup...');
      try {
        const existing = await userStorage.getUserData('transactions');
        if (!existing && backup.transactions.length > 0) {
          await userStorage.setUserData('transactions', backup.transactions);
          recoveredCount++;
          console.log(`📊 Recovered ${backup.transactions.length} transactions from transaction backup!`);
        } else if (existing) {
          console.log('ℹ️ Transactions already exist, skipping restore');
        } else {
          console.log('⚠️ Transaction backup exists but is empty');
        }
      } catch (error) {
        console.warn(`⚠️ Failed to restore transactions:`, error.message);
      }
    } else {
      console.log('⚠️ Unknown backup format, cannot restore');
      console.log('Backup structure:', JSON.stringify(backup, null, 2));
    }
    
    if (recoveredCount > 0) {
      console.log(`✅ Emergency recovery successful! Restored ${recoveredCount} data items`);
      return await userStorage.getUserProfile();
    }
    
    return null;
  } catch (error) {
    console.error('❌ Emergency recovery failed:', error);
    return null;
  }
};

export default App;

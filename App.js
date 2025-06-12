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

Amplify.configure(awsconfig);

const waitForAWSCredentials = async (maxRetries = 5, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const {fetchAuthSession} = await import('aws-amplify/auth');
      const session = await fetchAuthSession();

      if (session.credentials && session.identityId) {
        return session;
      }
    } catch (error) {
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error(
    'Failed to obtain valid AWS credentials after multiple attempts',
  );
};

const createFallbackStorage = async () => {
  const AsyncStorage =
    require('@react-native-async-storage/async-storage').default;

  return {
    getItem: async key => {
      try {
        const value = await AsyncStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      } catch (error) {}
    },
    removeItem: async key => {
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {}
    },
    getAllKeys: async () => {
      try {
        return await AsyncStorage.getAllKeys();
      } catch (error) {
        return [];
      }
    },
    getUserStorageManager: () => null,
    isUserStorageInitialized: () => false,
    initializeUserStorage: async () => null,
  };
};

const attemptCloudSync = async (storage, userStorage = null) => {
  try {
    const session = await waitForAWSCredentials();

    if (storage.getSyncQueueStatus) {
      const queueStatus = storage.getSyncQueueStatus();
    }

    const allKeys = await storage.getAllKeys();

    if (userStorage) {
      const userSpecificData = ['user_setup', 'transactions', 'categories'];
      for (const dataType of userSpecificData) {
        try {
          const data = await userStorage.getUserData(dataType);
          if (data !== null) {
            await userStorage.setUserData(dataType, data);
          }
        } catch (syncError) {}
      }
    } else {
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
            await storage.setItem(key, value);
          }
        } catch (syncError) {}
      }
    }

    setTimeout(async () => {
      if (storage.getSyncQueueStatus) {
        const finalQueue = storage.getSyncQueueStatus();
      }
    }, 2000);
  } catch (syncError) {}
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
        setInitError(null);

        const storage = StorageCoordinator.getInstance();

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
        } catch (storageError) {
          throw new Error(
            `Storage initialization failed: ${storageError.message}`,
          );
        }

        const auth = new AuthenticationManager(storage);
        await auth.initialize();

        setAuthManager(auth);
        setStorageCoordinator(storage);
        setIsAuthenticated(auth.isLoggedIn);

        if (auth.isLoggedIn) {
          try {
            await waitForAWSCredentials();

            const {getCurrentUser} = await import('aws-amplify/auth');
            const user = await getCurrentUser();

            if (storage.initializeUserStorage) {
              const userStorage = await storage.initializeUserStorage(
                user.userId,
              );

              await new Promise(resolve => setTimeout(resolve, 1000));

              const profile = await userStorage.getUserProfile();

              if (profile) {
                if (profile.hasCompletedSetup) {
                  setHasSeenWelcome(true);
                } else {
                  setHasSeenWelcome(profile.hasSeenWelcome);
                }
              } else {
                const welcomeSeen = await storage.getItem('app.hasSeenWelcome');
                setHasSeenWelcome(welcomeSeen === true);
              }
            } else {
              const localStorage = storage.localStorage || storage;
              const welcomeSeen = await localStorage.getItem(
                'app.hasSeenWelcome',
              );
              setHasSeenWelcome(welcomeSeen === true);
            }
          } catch (credError) {
            const localStorage = storage.localStorage || storage;
            const welcomeSeen = await localStorage.getItem(
              'app.hasSeenWelcome',
            );
            setHasSeenWelcome(welcomeSeen === true);
          }
        }

        try {
          const healthCheck = await storage.healthCheck();
        } catch (healthError) {}

        if (auth.isLoggedIn) {
          setTimeout(() => {
            const userStorage = storage.getUserStorageManager
              ? storage.getUserStorageManager()
              : null;
            attemptCloudSync(storage, userStorage);
          }, 3000);
        }
      } catch (error) {
        setInitError(error.message);

        try {
          const fallbackStorage = await createFallbackStorage();

          const fallbackAuth = new AuthenticationManager(fallbackStorage);
          await fallbackAuth.initialize();

          setAuthManager(fallbackAuth);
          setStorageCoordinator(fallbackStorage);
          setIsAuthenticated(fallbackAuth.isLoggedIn);

          setInitError(null);
        } catch (fallbackError) {
          setInitError(`Initialization failed: ${fallbackError.message}`);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  const handleAuthComplete = async () => {
    try {
      if (authManager) {
        await authManager.initialize();
        setIsAuthenticated(authManager.isLoggedIn);

        if (authManager.isLoggedIn && storageCoordinator) {
          setTimeout(async () => {
            try {
              await waitForAWSCredentials();

              const {getCurrentUser} = await import('aws-amplify/auth');
              const user = await getCurrentUser();

              if (storageCoordinator.initializeUserStorage) {
                try {
                  const userStorage =
                    await storageCoordinator.initializeUserStorage(user.userId);

                  await new Promise(resolve => setTimeout(resolve, 1000));

                  const profile = await userStorage.getUserProfile();

                  if (profile) {
                    if (profile.hasCompletedSetup) {
                      setHasSeenWelcome(true);
                    } else {
                      setHasSeenWelcome(profile.hasSeenWelcome);
                    }
                  } else {
                    const localStorage =
                      storageCoordinator.localStorage || storageCoordinator;
                    const welcomeSeen = await localStorage.getItem(
                      'app.hasSeenWelcome',
                    );
                    setHasSeenWelcome(welcomeSeen === true);
                  }

                  attemptCloudSync(storageCoordinator, userStorage);
                } catch (userStorageError) {
                  const localStorage =
                    storageCoordinator.localStorage || storageCoordinator;
                  const welcomeSeen = await localStorage.getItem(
                    'app.hasSeenWelcome',
                  );
                  setHasSeenWelcome(welcomeSeen === true);

                  attemptCloudSync(storageCoordinator);
                }
              } else {
                const localStorage =
                  storageCoordinator.localStorage || storageCoordinator;
                const welcomeSeen = await localStorage.getItem(
                  'app.hasSeenWelcome',
                );
                setHasSeenWelcome(welcomeSeen === true);

                attemptCloudSync(storageCoordinator);
              }
            } catch (error) {
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
    } catch (error) {}
  };

  const handleWelcomeComplete = async () => {
    try {
      if (storageCoordinator) {
        const userStorage = storageCoordinator.getUserStorageManager
          ? storageCoordinator.getUserStorageManager()
          : null;

        if (userStorage) {
          await userStorage.setWelcomeComplete();
        } else {
          const localStorage =
            storageCoordinator.localStorage || storageCoordinator;
          await localStorage.setItem('app.hasSeenWelcome', true);
        }
      }
      setHasSeenWelcome(true);
    } catch (error) {
      setHasSeenWelcome(true);
    }
  };

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

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserProfileCache from '../services/UserProfileCache';
import TrendAPIService from '../services/TrendAPIService';
import DateService from '../services/DateService';

const AppSettingsContext = createContext();

// Default settings - moved outside component to prevent recreation
const defaultAppSettings = {
  notifications: true,
  biometricAuth: false,
  currency: 'AUD',
  budgetPeriod: 'monthly',
  dataBackup: true,
};

const defaultModuleSettings = {
  pokerTracker: false,
};

export const AppSettingsProvider = ({children}) => {
  // Settings state
  const [appSettings, setAppSettings] = useState(null);
  const [moduleSettings, setModuleSettings] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isPro, setIsPro] = useState(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs for component lifecycle
  const isMountedRef = useRef(true);

  // ==============================================
  // LOADING FUNCTIONS
  // ==============================================

  const loadCachedData = useCallback(async () => {
    try {
      // Batch all AsyncStorage operations to prevent conflicts
      const [
        cachedProfile,
        storedAppSettings,
        storedModuleSettings,
        proStatus,
      ] = await Promise.all([
        UserProfileCache.get(),
        AsyncStorage.getItem('appSettings'),
        AsyncStorage.getItem('moduleSettings'),
        AsyncStorage.getItem('isPro'),
      ]);

      if (!isMountedRef.current) {
        return;
      }

      // Process user profile
      if (cachedProfile && cachedProfile.profile) {
        setUserProfile(cachedProfile.profile);
        // Initialize DateService with user's timezone
        DateService.initializeFromProfile(cachedProfile.profile);
      }

      // Process app settings
      if (storedAppSettings) {
        setAppSettings({
          ...defaultAppSettings,
          ...JSON.parse(storedAppSettings),
        });
      } else {
        setAppSettings(defaultAppSettings);
      }

      // Process module settings
      if (storedModuleSettings) {
        setModuleSettings({
          ...defaultModuleSettings,
          ...JSON.parse(storedModuleSettings),
        });
      } else {
        setModuleSettings(defaultModuleSettings);
      }

      // Process pro status
      setIsPro(proStatus === 'true');
    } catch (error) {
      console.error('Error loading cached app settings:', error);
      // Set defaults on error
      if (isMountedRef.current) {
        setAppSettings(defaultAppSettings);
        setModuleSettings(defaultModuleSettings);
        setIsPro(false);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refreshUserProfile = useCallback(async () => {
    if (!TrendAPIService.isAuthenticated()) {
      return;
    }

    try {
      setIsRefreshing(true);
      const freshProfile = await TrendAPIService.getUserProfile();

      if (freshProfile && isMountedRef.current) {
        setUserProfile(freshProfile);
        await UserProfileCache.set(freshProfile);
        // Update DateService with fresh timezone
        DateService.initializeFromProfile(freshProfile);
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  // ==============================================
  // UPDATE FUNCTIONS
  // ==============================================

  const updateAppSettings = useCallback(
    async newSettings => {
      try {
        const updatedSettings = {...appSettings, ...newSettings};
        await AsyncStorage.setItem(
          'appSettings',
          JSON.stringify(updatedSettings),
        );
        setAppSettings(updatedSettings);
      } catch (error) {
        console.error('Error updating app settings:', error);
        throw error;
      }
    },
    [appSettings],
  );

  const updateModuleSettings = useCallback(
    async newModuleSettings => {
      try {
        const updatedSettings = {...moduleSettings, ...newModuleSettings};
        await AsyncStorage.setItem(
          'moduleSettings',
          JSON.stringify(updatedSettings),
        );
        setModuleSettings(updatedSettings);
      } catch (error) {
        console.error('Error updating module settings:', error);
        throw error;
      }
    },
    [moduleSettings],
  );

  const updateProStatus = useCallback(async newProStatus => {
    try {
      await AsyncStorage.setItem('isPro', newProStatus.toString());
      setIsPro(newProStatus);
    } catch (error) {
      console.error('Error updating pro status:', error);
      throw error;
    }
  }, []);

  // ==============================================
  // HELPER FUNCTIONS
  // ==============================================

  const toggleAppSetting = useCallback(
    async settingKey => {
      if (!appSettings) {
        return;
      }

      const newValue = !appSettings[settingKey];
      await updateAppSettings({[settingKey]: newValue});
    },
    [appSettings, updateAppSettings],
  );

  const toggleModuleSetting = useCallback(
    async moduleKey => {
      if (!moduleSettings) {
        return;
      }

      const newValue = !moduleSettings[moduleKey];
      await updateModuleSettings({[moduleKey]: newValue});
    },
    [moduleSettings, updateModuleSettings],
  );

  // ==============================================
  // LIFECYCLE
  // ==============================================

  useEffect(() => {
    isMountedRef.current = true;
    loadCachedData();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadCachedData]);

  // ==============================================
  // CONTEXT VALUE
  // ==============================================

  const contextValue = {
    // State
    appSettings,
    moduleSettings,
    userProfile,
    isPro,

    // Loading states
    isLoading,
    isRefreshing,

    // Update functions
    updateAppSettings,
    updateModuleSettings,
    updateProStatus,
    refreshUserProfile,

    // Helper functions
    toggleAppSetting,
    toggleModuleSetting,

    // Computed values
    isReady: !isLoading && appSettings !== null && moduleSettings !== null,
  };

  return (
    <AppSettingsContext.Provider value={contextValue}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error(
      'useAppSettings must be used within an AppSettingsProvider',
    );
  }
  return context;
};

export default AppSettingsContext;

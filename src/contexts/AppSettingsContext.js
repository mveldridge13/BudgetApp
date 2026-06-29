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
import CurrencyService from '../services/CurrencyService';

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

// Default Pro features (all disabled)
const defaultProFeatures = {
  spendingVelocityDetails: false,
  advancedAnalytics: false,
  exportData: false,
  aiAssistant: false,
};

export const AppSettingsProvider = ({children}) => {
  // Settings state
  const [appSettings, setAppSettings] = useState(null);
  const [moduleSettings, setModuleSettings] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Pro/Subscription state (synced from backend via home summary)
  const [isPro, setIsPro] = useState(false);
  const [proExpiresAt, setProExpiresAt] = useState(null);
  const [proFeatures, setProFeatures] = useState(defaultProFeatures);

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
      // Get current user ID first - cache is user-specific
      const currentUserId = TrendAPIService.getCurrentUserId();

      // Batch all AsyncStorage operations to prevent conflicts
      const [
        cachedProfile,
        storedAppSettings,
        storedModuleSettings,
      ] = await Promise.all([
        currentUserId ? UserProfileCache.get(currentUserId) : Promise.resolve(null),
        AsyncStorage.getItem('appSettings'),
        AsyncStorage.getItem('moduleSettings'),
      ]);

      if (!isMountedRef.current) {
        return;
      }

      // Process user profile
      if (cachedProfile && cachedProfile.profile) {
        setUserProfile(cachedProfile.profile);
        // Initialize DateService with user's timezone
        DateService.initializeFromProfile(cachedProfile.profile);
        // Initialize CurrencyService with user's currency
        CurrencyService.initializeFromProfile(cachedProfile.profile);
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

      // Process module settings. Precedence: backend profile (source of truth,
      // so toggles sync across devices/platforms) > local cache > defaults.
      const cachedModules = storedModuleSettings
        ? JSON.parse(storedModuleSettings)
        : {};
      const profileModules =
        (cachedProfile && cachedProfile.profile && cachedProfile.profile.moduleSettings) || {};
      setModuleSettings({
        ...defaultModuleSettings,
        ...cachedModules,
        ...profileModules,
      });

      // Note: isPro and proFeatures are synced from backend via updateSubscriptionStatus
      // They will be updated when HomeContainer loads the home summary
    } catch (error) {
      console.error('Error loading cached app settings:', error);
      // Set defaults on error
      if (isMountedRef.current) {
        setAppSettings(defaultAppSettings);
        setModuleSettings(defaultModuleSettings);
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
        const currentUserId = TrendAPIService.getCurrentUserId();
        if (currentUserId) {
          await UserProfileCache.set(freshProfile, currentUserId);
        }
        // Update DateService with fresh timezone
        DateService.initializeFromProfile(freshProfile);
        // Update CurrencyService with fresh currency
        CurrencyService.initializeFromProfile(freshProfile);
        // Hydrate module toggles from the backend (source of truth) so changes
        // made on another device/platform are reflected here.
        if (freshProfile.moduleSettings) {
          const mergedModules = {
            ...defaultModuleSettings,
            ...freshProfile.moduleSettings,
          };
          setModuleSettings(mergedModules);
          await AsyncStorage.setItem(
            'moduleSettings',
            JSON.stringify(mergedModules),
          );
        }
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
        // Optimistically persist locally (works offline and is instant).
        await AsyncStorage.setItem(
          'moduleSettings',
          JSON.stringify(updatedSettings),
        );
        setModuleSettings(updatedSettings);

        // Sync to the backend so module toggles carry across devices and
        // platforms. Send only the changed keys; the backend merges
        // last-write-wins so other modules are never clobbered.
        if (TrendAPIService.isAuthenticated()) {
          try {
            await TrendAPIService.updateUserProfile({
              moduleSettings: newModuleSettings,
            });
          } catch (syncError) {
            console.error(
              'Error syncing module settings to backend:',
              syncError,
            );
          }
        }
      } catch (error) {
        console.error('Error updating module settings:', error);
        throw error;
      }
    },
    [moduleSettings],
  );

  /**
   * Update subscription status from backend home summary
   * Called by HomeContainer when it loads the home summary
   *
   * @param {Object} userData - user object from home summary { isPro, proExpiresAt }
   * @param {Object} features - features object from home summary
   */
  const updateSubscriptionStatus = useCallback((userData, features) => {
    if (!isMountedRef.current) return;

    // Update Pro status
    setIsPro(userData?.isPro ?? false);
    setProExpiresAt(userData?.proExpiresAt ?? null);

    // Update feature flags
    if (features) {
      setProFeatures({
        ...defaultProFeatures,
        ...features,
      });
    } else {
      setProFeatures(defaultProFeatures);
    }

    console.log('🔐 AppSettings: Subscription status updated', {
      isPro: userData?.isPro,
      proExpiresAt: userData?.proExpiresAt,
      features,
    });
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

  // ⚠️ TEMP (testing): force Pro on so all gated features are accessible.
  // Remove this override to restore the real backend-driven subscription state.
  const PRO_OVERRIDE = true;
  const effectiveIsPro = PRO_OVERRIDE ? true : isPro;
  const effectiveProFeatures = PRO_OVERRIDE
    ? {
        spendingVelocityDetails: true,
        advancedAnalytics: true,
        exportData: true,
        aiAssistant: true,
      }
    : proFeatures;

  const contextValue = {
    // State
    appSettings,
    moduleSettings,
    userProfile,

    // Subscription state (synced from backend)
    isPro: effectiveIsPro,
    proExpiresAt,
    proFeatures: effectiveProFeatures,

    // Loading states
    isLoading,
    isRefreshing,

    // Update functions
    updateAppSettings,
    updateModuleSettings,
    updateSubscriptionStatus,
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

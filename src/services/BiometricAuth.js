// services/BiometricAuth.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState} from 'react-native';

// Note: Will need to install react-native-biometrics
// For now, creating the service structure
let ReactNativeBiometrics = null;
try {
  ReactNativeBiometrics = require('react-native-biometrics').default;
} catch (error) {
  console.warn('react-native-biometrics not installed yet');
}

class BiometricAuthService {
  constructor() {
    this.isLocked = false;
    this.lastActiveTime = null; // Don't set this until we load from cache
    this.lockTimeout = 5 * 60 * 1000; // 5 minutes (production value)
    this.appStateSubscription = null;
    this.biometricsInstance = null;
    this.isInitialized = false;

    // Initialize biometrics instance when available
    if (ReactNativeBiometrics) {
      this.biometricsInstance = new ReactNativeBiometrics({
        allowDeviceCredentials: true,
      });
    }

    // Don't auto-initialize in constructor - let wrapper control this
    // this.init();
  }

  // Storage keys
  static STORAGE_KEYS = {
    BIOMETRIC_ENABLED: 'biometricEnabled',
    LAST_ACTIVE_TIME: 'lastActiveTime',
    BIOMETRIC_SETUP_COMPLETE: 'biometricSetupComplete',
  };

  async init() {
    if (this.isInitialized) {
      console.log('🔐 BiometricAuth: Already initialized');
      return;
    }

    try {
      console.log('🔐 BiometricAuth: Starting initialization...');

      // Load cached state
      await this.loadCachedState();

      // Set up app state monitoring
      this.setupAppStateMonitoring();

      // Check if app should be locked on startup
      await this.checkAppStartupLockState();

      this.isInitialized = true;
      console.log('🔐 BiometricAuth: Service initialized successfully');
    } catch (error) {
      console.error('🔐 BiometricAuth: Initialization failed:', error);
    }
  }

  // Public method to ensure initialization
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
    return this.isInitialized;
  }

  // Load cached authentication state
  async loadCachedState() {
    try {
      const [lastActiveTimeStr] = await Promise.all([
        AsyncStorage.getItem(BiometricAuthService.STORAGE_KEYS.LAST_ACTIVE_TIME),
      ]);

      if (lastActiveTimeStr) {
        this.lastActiveTime = parseInt(lastActiveTimeStr, 10);
        console.log('🔐 BiometricAuth: Loaded cached last active time:', new Date(this.lastActiveTime).toISOString());
      } else {
        console.log('🔐 BiometricAuth: No cached last active time found');
        this.lastActiveTime = Date.now(); // Set to now only if no cached time exists
      }

      console.log('🔐 BiometricAuth: Cached state loaded', {
        lastActiveTime: this.lastActiveTime ? new Date(this.lastActiveTime).toISOString() : 'null',
      });
    } catch (error) {
      console.error('🔐 BiometricAuth: Failed to load cached state:', error);
      this.lastActiveTime = Date.now(); // Fallback to current time
    }
  }

  // Set up app state monitoring for background/foreground detection
  setupAppStateMonitoring() {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  // Handle app state changes (background/foreground)
  handleAppStateChange(nextAppState) {
    console.log('🔐 BiometricAuth: App state changed to:', nextAppState);

    if (nextAppState === 'active') {
      // App came to foreground - check if should be locked
      this.checkShouldLock();
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App went to background - save timestamp immediately
      console.log('🔐 BiometricAuth: App going to background, saving timestamp');
      this.updateLastActiveTime();
    }
  }

  // Check if app should be locked based on time elapsed
  async checkShouldLock() {
    try {
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return;
      }

      const now = Date.now();
      const timeSinceLastActive = now - this.lastActiveTime;

      console.log('🔐 BiometricAuth: Checking lock state', {
        timeSinceLastActive: Math.round(timeSinceLastActive / 1000),
        lockTimeoutSeconds: Math.round(this.lockTimeout / 1000),
        shouldLock: timeSinceLastActive > this.lockTimeout,
      });

      if (timeSinceLastActive > this.lockTimeout) {
        this.lockApp();
      }
    } catch (error) {
      console.error('🔐 BiometricAuth: Error checking lock state:', error);
    }
  }

  // Check if app should be locked on startup (handles app close, phone restart, etc.)
  async checkAppStartupLockState() {
    try {
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        console.log('🔐 BiometricAuth: Biometric auth disabled, not locking');
        return;
      }

      // Use the already loaded lastActiveTime from loadCachedState
      if (this.lastActiveTime) {
        const now = Date.now();
        const timeSinceLastActive = now - this.lastActiveTime;

        console.log('🔐 BiometricAuth: Startup lock check', {
          lastActiveTime: new Date(this.lastActiveTime).toISOString(),
          now: new Date(now).toISOString(),
          timeSinceLastActive: Math.round(timeSinceLastActive / 1000),
          lockTimeoutSeconds: Math.round(this.lockTimeout / 1000),
          shouldLock: timeSinceLastActive > this.lockTimeout,
        });

        if (timeSinceLastActive > this.lockTimeout) {
          console.log('🔐 BiometricAuth: Time exceeded, locking app');
          this.lockApp();
        } else {
          console.log('🔐 BiometricAuth: Time within limit, not locking');
        }
      } else {
        // This should not happen since loadCachedState sets it, but handle it
        console.log('🔐 BiometricAuth: No lastActiveTime available, locking for security');
        await this.updateLastActiveTime();
        this.lockApp();
      }
    } catch (error) {
      console.error('🔐 BiometricAuth: Error checking startup lock state:', error);
      // On error, err on the side of security and lock
      const isEnabled = await this.isBiometricEnabled().catch(() => false);
      if (isEnabled) {
        this.lockApp();
      }
    }
  }

  // Update last active timestamp
  async updateLastActiveTime() {
    try {
      this.lastActiveTime = Date.now();
      await AsyncStorage.setItem(
        BiometricAuthService.STORAGE_KEYS.LAST_ACTIVE_TIME,
        this.lastActiveTime.toString()
      );
      console.log('🔐 BiometricAuth: Updated last active time:', new Date(this.lastActiveTime).toISOString());
    } catch (error) {
      console.error('🔐 BiometricAuth: Failed to update last active time:', error);
    }
  }

  // Call this method to indicate user activity (extends the timeout)
  recordUserActivity() {
    this.updateLastActiveTime();
  }

  // Lock the app
  lockApp() {
    console.log('🔐 BiometricAuth: Locking app');
    this.isLocked = true;

    // Emit lock event for UI to respond
    if (this.onLockStateChange) {
      this.onLockStateChange(true);
    }
  }

  // Unlock the app
  unlockApp() {
    console.log('🔐 BiometricAuth: Unlocking app');
    this.isLocked = false;
    this.updateLastActiveTime();

    // Emit unlock event for UI to respond
    if (this.onLockStateChange) {
      this.onLockStateChange(false);
    }
  }

  // Check if device supports biometrics
  async isBiometricSupported() {
    try {
      if (!this.biometricsInstance) {
        return false;
      }

      const {available, biometryType} = await this.biometricsInstance.isSensorAvailable();

      console.log('🔐 BiometricAuth: Biometric support check', {
        available,
        biometryType,
      });

      return available;
    } catch (error) {
      console.error('🔐 BiometricAuth: Error checking biometric support:', error);
      return false;
    }
  }

  // Get available biometry type
  async getBiometryType() {
    try {
      if (!this.biometricsInstance) {
        return null;
      }

      const {biometryType} = await this.biometricsInstance.isSensorAvailable();
      return biometryType;
    } catch (error) {
      console.error('🔐 BiometricAuth: Error getting biometry type:', error);
      return null;
    }
  }

  // Check if biometric authentication is enabled by user
  async isBiometricEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(BiometricAuthService.STORAGE_KEYS.BIOMETRIC_ENABLED);
      return enabled === 'true';
    } catch (error) {
      console.error('🔐 BiometricAuth: Error checking if biometric enabled:', error);
      return false;
    }
  }

  // Enable/disable biometric authentication
  async setBiometricEnabled(enabled) {
    try {
      await AsyncStorage.setItem(
        BiometricAuthService.STORAGE_KEYS.BIOMETRIC_ENABLED,
        enabled.toString()
      );

      console.log('🔐 BiometricAuth: Biometric authentication', enabled ? 'enabled' : 'disabled');

      // If disabling, unlock the app
      if (!enabled && this.isLocked) {
        this.unlockApp();
      }

      return true;
    } catch (error) {
      console.error('🔐 BiometricAuth: Error setting biometric enabled:', error);
      return false;
    }
  }

  // Prompt for biometric authentication
  async promptBiometricAuth(reason = 'Unlock Budget App') {
    try {
      if (!this.biometricsInstance) {
        throw new Error('Biometric authentication not available');
      }

      const {success, error} = await this.biometricsInstance.simplePrompt({
        promptMessage: reason,
        cancelButtonText: 'Cancel',
      });

      console.log('🔐 BiometricAuth: Authentication result', {success, error});

      if (success) {
        this.unlockApp();
        return {success: true};
      } else {
        return {success: false, error: error || 'Authentication failed'};
      }
    } catch (error) {
      console.error('🔐 BiometricAuth: Authentication error:', error);
      return {success: false, error: error.message || 'Authentication failed'};
    }
  }

  // Get current lock state
  getIsLocked() {
    return this.isLocked;
  }

  // Set lock state change listener
  setOnLockStateChange(callback) {
    this.onLockStateChange = callback;
  }

  // Clean up
  destroy() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }

  // Manual lock (for testing or user action)
  async manualLock() {
    const isEnabled = await this.isBiometricEnabled();
    if (isEnabled) {
      this.lockApp();
    }
  }

  // Reset authentication state (for testing)
  async reset() {
    try {
      await AsyncStorage.multiRemove([
        BiometricAuthService.STORAGE_KEYS.BIOMETRIC_ENABLED,
        BiometricAuthService.STORAGE_KEYS.LAST_ACTIVE_TIME,
        BiometricAuthService.STORAGE_KEYS.BIOMETRIC_SETUP_COMPLETE,
      ]);

      this.isLocked = false;
      this.lastActiveTime = Date.now();

      console.log('🔐 BiometricAuth: Authentication state reset');
    } catch (error) {
      console.error('🔐 BiometricAuth: Error resetting authentication state:', error);
    }
  }
}

// Create singleton instance
const biometricAuthService = new BiometricAuthService();

export default biometricAuthService;

// components/BiometricWrapper.js
import React, {useState, useEffect} from 'react';
import BiometricAuth from '../services/BiometricAuth';
import BiometricUnlockScreen from '../screens/BiometricUnlockScreen';
import TrendAPIService from '../services/TrendAPIService';
import UserProfileCache from '../services/UserProfileCache';

const BiometricWrapper = ({children}) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeBiometric = async () => {
      try {
        console.log('🔐 BiometricWrapper: Starting initialization');
        
        // Ensure the BiometricAuth service is fully initialized
        await BiometricAuth.ensureInitialized();
        console.log('🔐 BiometricWrapper: BiometricAuth service initialized');
        
        // Check if biometric is enabled
        const isEnabled = await BiometricAuth.isBiometricEnabled();
        console.log('🔐 BiometricWrapper: Biometric enabled:', isEnabled);
        
        // Get the current lock state after service initialization
        const locked = BiometricAuth.getIsLocked();
        console.log('🔐 BiometricWrapper: Current lock state after init:', locked);
        
        if (isMounted) {
          setIsLocked(locked);
        }

        // Set up lock state change listener
        BiometricAuth.setOnLockStateChange((locked) => {
          if (isMounted) {
            console.log('🔐 BiometricWrapper: Lock state changed to:', locked);
            setIsLocked(locked);
          }
        });

        if (isMounted) {
          setIsInitialized(true);
        }

        console.log('🔐 BiometricWrapper: Wrapper initialized', {
          isEnabled,
          isLocked: locked,
        });
      } catch (error) {
        console.error('🔐 BiometricWrapper: Initialization error:', error);
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    };

    // Initialize immediately - service will handle its own initialization
    initializeBiometric();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUnlock = async () => {
    console.log('🔐 BiometricWrapper: App unlocked, pre-loading data...');
    
    // Pre-load critical data in background while unlock animation plays
    try {
      // Start data loading in parallel (don't await - let it load in background)
      const dataPromises = [
        TrendAPIService.getUserProfile().then(profile => {
          if (profile) {
            UserProfileCache.set(profile);
            console.log('🔐 BiometricWrapper: User profile pre-loaded');
          }
        }).catch(err => console.warn('🔐 BiometricWrapper: Profile pre-load failed:', err)),
        
        TrendAPIService.getTransactions().then(() => {
          console.log('🔐 BiometricWrapper: Transactions pre-loaded');
        }).catch(err => console.warn('🔐 BiometricWrapper: Transactions pre-load failed:', err)),
        
        TrendAPIService.getCategories().then(() => {
          console.log('🔐 BiometricWrapper: Categories pre-loaded');
        }).catch(err => console.warn('🔐 BiometricWrapper: Categories pre-load failed:', err))
      ];
      
      // Don't wait for all to complete - let them finish in background
      Promise.all(dataPromises).then(() => {
        console.log('🔐 BiometricWrapper: All data pre-loading completed');
      });
      
    } catch (error) {
      console.warn('🔐 BiometricWrapper: Pre-loading error:', error);
    }
    
    // Unlock immediately - data will load in background
    setIsLocked(false);
  };

  // Show loading state until initialized
  if (!isInitialized) {
    return null; // or a loading spinner
  }

  // Show unlock screen if locked
  if (isLocked) {
    return <BiometricUnlockScreen onUnlock={handleUnlock} />;
  }

  // Show normal app content
  return children;
};

export default BiometricWrapper;
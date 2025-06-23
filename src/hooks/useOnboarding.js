// hooks/useOnboarding.js
import {useState, useEffect, useCallback, useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrendAPIService from '../services/TrendAPIService';
import AuthService from '../services/AuthService';

const useOnboarding = () => {
  // ==============================================
  // STATE MANAGEMENT
  // ==============================================
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Spotlight visibility states
  const [showBalanceCardSpotlight, setShowBalanceCardSpotlight] =
    useState(false);
  const [showAddTransactionSpotlight, setShowAddTransactionSpotlight] =
    useState(false);
  const [showTransactionSwipeSpotlight, setShowTransactionSwipeSpotlight] =
    useState(false);

  // Layout states for spotlight positioning
  const [balanceCardLayout, setBalanceCardLayout] = useState(null);
  const [floatingButtonLayout, setFloatingButtonLayout] = useState(null);
  const [transactionLayout, setTransactionLayout] = useState(null);

  // Transaction swipe tutorial state
  const [transactionSwipeStep, setTransactionSwipeStep] = useState(0);

  // Prevent multiple triggering
  const [tutorialInProgress, setTutorialInProgress] = useState(false);

  // Component refs for measurements
  const balanceCardRef = useRef(null);
  const floatingButtonRef = useRef(null);
  const transactionRef = useRef(null);

  // ==============================================
  // DATA LOADING
  // ==============================================
  const loadOnboardingStatus = useCallback(async () => {
    try {
      console.log('Onboarding: Loading status...');
      setLoading(true);

      if (!AuthService.isAuthenticated()) {
        // Load from local storage for unauthenticated users
        const [balanceCard, addTransaction, transactionSwipe] =
          await Promise.all([
            AsyncStorage.getItem('hasSeenBalanceCardTour'),
            AsyncStorage.getItem('hasSeenAddTransactionTour'),
            AsyncStorage.getItem('hasSeenTransactionSwipeTour'),
          ]);

        const localStatus = {
          hasSeenBalanceCardTour: balanceCard === 'true',
          hasSeenAddTransactionTour: addTransaction === 'true',
          hasSeenTransactionSwipeTour: transactionSwipe === 'true',
        };

        console.log('Onboarding: Loaded local status:', localStatus);
        setOnboardingStatus(localStatus);
        return;
      }

      // Try to get from server first - using the dedicated getOnboardingStatus method
      try {
        const serverStatus = await TrendAPIService.getOnboardingStatus();

        // Sync local storage with server
        await Promise.all([
          AsyncStorage.setItem(
            'hasSeenBalanceCardTour',
            String(serverStatus.hasSeenBalanceCardTour),
          ),
          AsyncStorage.setItem(
            'hasSeenAddTransactionTour',
            String(serverStatus.hasSeenAddTransactionTour),
          ),
          AsyncStorage.setItem(
            'hasSeenTransactionSwipeTour',
            String(serverStatus.hasSeenTransactionSwipeTour),
          ),
        ]);

        console.log('Onboarding: Loaded server status:', serverStatus);
        console.log('Onboarding: Tutorial eligibility:', {
          hasSeenBalanceCardTour: serverStatus.hasSeenBalanceCardTour,
          hasSeenAddTransactionTour: serverStatus.hasSeenAddTransactionTour,
          hasSeenTransactionSwipeTour: serverStatus.hasSeenTransactionSwipeTour,
          shouldShowAnyTutorial:
            !serverStatus.hasSeenBalanceCardTour ||
            !serverStatus.hasSeenAddTransactionTour ||
            !serverStatus.hasSeenTransactionSwipeTour,
        });

        setOnboardingStatus(serverStatus);
      } catch (serverError) {
        console.warn(
          'Onboarding: Server failed, using local storage:',
          serverError,
        );

        // Fallback to local storage
        const [balanceCard, addTransaction, transactionSwipe] =
          await Promise.all([
            AsyncStorage.getItem('hasSeenBalanceCardTour'),
            AsyncStorage.getItem('hasSeenAddTransactionTour'),
            AsyncStorage.getItem('hasSeenTransactionSwipeTour'),
          ]);

        const localStatus = {
          hasSeenBalanceCardTour: balanceCard === 'true',
          hasSeenAddTransactionTour: addTransaction === 'true',
          hasSeenTransactionSwipeTour: transactionSwipe === 'true',
        };

        setOnboardingStatus(localStatus);

        // Sync to server if we have meaningful data
        const hasCompletedTours =
          localStatus.hasSeenBalanceCardTour ||
          localStatus.hasSeenAddTransactionTour ||
          localStatus.hasSeenTransactionSwipeTour;

        if (hasCompletedTours) {
          try {
            await TrendAPIService.updateOnboardingStatus(localStatus);
          } catch (syncError) {
            console.warn('Onboarding: Failed to sync to server:', syncError);
          }
        }
      }
    } catch (error) {
      console.error('Onboarding: Error loading status:', error);

      // Set defaults on complete failure
      setOnboardingStatus({
        hasSeenBalanceCardTour: false,
        hasSeenAddTransactionTour: false,
        hasSeenTransactionSwipeTour: false,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // ==============================================
  // MEASUREMENT FUNCTIONS
  // ==============================================
  const measureBalanceCard = useCallback(() => {
    if (balanceCardRef.current && !tutorialInProgress) {
      setTutorialInProgress(true);
      balanceCardRef.current.measure((x, y, width, height, pageX, pageY) => {
        setBalanceCardLayout({x: pageX, y: pageY, width, height});
        setShowBalanceCardSpotlight(true);
      });
    }
  }, [tutorialInProgress]);

  const measureFloatingButton = useCallback(() => {
    if (floatingButtonRef.current && !tutorialInProgress) {
      setTutorialInProgress(true);
      floatingButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
        setFloatingButtonLayout({x: pageX, y: pageY, width, height});
        setShowAddTransactionSpotlight(true);
      });
    }
  }, [tutorialInProgress]);

  const measureFirstTransaction = useCallback(() => {
    if (transactionRef.current && !tutorialInProgress) {
      setTutorialInProgress(true);
      transactionRef.current.measure((x, y, width, height, pageX, pageY) => {
        setTransactionLayout({x: pageX, y: pageY, width, height});
        setTransactionSwipeStep(0);
        setShowTransactionSwipeSpotlight(true);
      });
    }
  }, [tutorialInProgress]);

  // ==============================================
  // TOUR LOGIC
  // ==============================================
  const checkAndShowOnboarding = useCallback(
    (incomeData, transactions) => {
      if (!onboardingStatus || tutorialInProgress) {
        console.log(
          'Onboarding: Skipping check - status not loaded or tutorial in progress',
        );
        return;
      }

      console.log('Onboarding: Checking what to show:', onboardingStatus);

      const {
        hasSeenBalanceCardTour,
        hasSeenAddTransactionTour,
        hasSeenTransactionSwipeTour,
      } = onboardingStatus;

      // Show balance card tutorial first (if user has income data)
      if (incomeData && !hasSeenBalanceCardTour) {
        console.log('Onboarding: Triggering balance card tour');
        setTimeout(() => measureBalanceCard(), 500);
      }
      // Show add transaction tutorial second
      else if (hasSeenBalanceCardTour && !hasSeenAddTransactionTour) {
        console.log('Onboarding: Triggering add transaction tour');
        setTimeout(() => measureFloatingButton(), 500);
      }
      // Show transaction swipe tutorial third (only if they have transactions)
      else if (
        hasSeenBalanceCardTour &&
        hasSeenAddTransactionTour &&
        !hasSeenTransactionSwipeTour &&
        transactions &&
        transactions.length > 0
      ) {
        console.log('Onboarding: Triggering transaction swipe tour');
        setTimeout(() => measureFirstTransaction(), 500);
      }
    },
    [
      onboardingStatus,
      tutorialInProgress,
      measureBalanceCard,
      measureFloatingButton,
      measureFirstTransaction,
    ],
  );

  const shouldShowTransactionTutorial = useCallback(
    (isNewTransaction, hasTransactions) => {
      if (!onboardingStatus) {
        return false;
      }

      const shouldShow =
        isNewTransaction &&
        !hasTransactions &&
        onboardingStatus.hasSeenBalanceCardTour &&
        onboardingStatus.hasSeenAddTransactionTour &&
        !onboardingStatus.hasSeenTransactionSwipeTour;

      console.log('Onboarding: Should show transaction tutorial?', {
        isNewTransaction,
        hasTransactions,
        onboardingStatus,
        result: shouldShow,
      });

      return shouldShow;
    },
    [onboardingStatus],
  );

  const triggerTransactionTutorial = useCallback(() => {
    if (!tutorialInProgress) {
      console.log('Onboarding: Manually triggering transaction tutorial');
      setTimeout(() => measureFirstTransaction(), 1000);
    }
  }, [tutorialInProgress, measureFirstTransaction]);

  // ==============================================
  // COMPLETION HANDLERS
  // ==============================================
  const completeTour = useCallback(
    async tourType => {
      try {
        const tourKey = `hasSeen${tourType}Tour`;
        console.log(`Onboarding: Completing tour ${tourType}`);

        // Update local state immediately (optimistic update)
        setOnboardingStatus(prev => {
          const newStatus = {...prev, [tourKey]: true};
          console.log('Onboarding: Updated status:', newStatus);
          return newStatus;
        });

        // Update local storage
        await AsyncStorage.setItem(tourKey, 'true');

        // Update server if authenticated using the dedicated method
        if (AuthService.isAuthenticated()) {
          try {
            await TrendAPIService.markOnboardingTourComplete(tourType);
            console.log(
              `Onboarding: Successfully synced ${tourType} tour completion to server`,
            );
          } catch (serverError) {
            console.warn(
              `Onboarding: Failed to sync ${tourType} to server:`,
              serverError,
            );
            // Don't revert - local state is more important for UX
          }
        }

        // Reset tutorial state
        setTutorialInProgress(false);

        // Hide current spotlight and potentially trigger next
        switch (tourType) {
          case 'BalanceCard':
            setShowBalanceCardSpotlight(false);
            setTimeout(() => measureFloatingButton(), 300);
            break;
          case 'AddTransaction':
            setShowAddTransactionSpotlight(false);
            break;
          case 'TransactionSwipe':
            setShowTransactionSwipeSpotlight(false);
            setTransactionSwipeStep(0);
            break;
        }
      } catch (error) {
        console.error('Onboarding: Error completing tour:', error);

        // Revert on failure
        setOnboardingStatus(prev => ({
          ...prev,
          [`hasSeen${tourType}Tour`]: false,
        }));

        try {
          await AsyncStorage.setItem(`hasSeen${tourType}Tour`, 'false');
        } catch (storageError) {
          console.error(
            'Onboarding: Failed to revert local storage:',
            storageError,
          );
        }

        setTutorialInProgress(false);
      }
    },
    [measureFloatingButton],
  );

  const skipTour = useCallback(
    async tourType => {
      console.log(`Onboarding: Skipping tour ${tourType}`);
      await completeTour(tourType);
    },
    [completeTour],
  );

  // ==============================================
  // UTILITY FUNCTIONS
  // ==============================================
  const hideActiveSpotlights = useCallback(() => {
    console.log('Onboarding: Hiding all active spotlights');
    setShowBalanceCardSpotlight(false);
    setShowAddTransactionSpotlight(false);
    setShowTransactionSwipeSpotlight(false);
    setTutorialInProgress(false);
  }, []);

  const resetTutorialState = useCallback(() => {
    console.log('Onboarding: Resetting tutorial state');
    setTutorialInProgress(false);
    setTransactionSwipeStep(0);
  }, []);

  // ==============================================
  // LIFECYCLE
  // ==============================================
  useEffect(() => {
    loadOnboardingStatus();
  }, [loadOnboardingStatus]);

  // ==============================================
  // PUBLIC API
  // ==============================================
  return {
    // Status
    onboardingStatus,
    loading,

    // Spotlight states
    showBalanceCardSpotlight,
    showAddTransactionSpotlight,
    showTransactionSwipeSpotlight,

    // Layout data
    balanceCardLayout,
    floatingButtonLayout,
    transactionLayout,
    transactionSwipeStep,

    // Refs for components to use
    balanceCardRef,
    floatingButtonRef,
    transactionRef,

    // Actions
    checkAndShowOnboarding,
    shouldShowTransactionTutorial,
    triggerTransactionTutorial,
    completeTour,
    skipTour,
    hideActiveSpotlights,
    resetTutorialState,

    // Reload function
    loadOnboardingStatus,
  };
};

export default useOnboarding;

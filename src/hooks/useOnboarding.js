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
      setLoading(true);
      console.log('🎯 useOnboarding: CACHE-FIRST: Loading onboarding status');

      // 🔄 CACHE-FIRST: Load from AsyncStorage immediately
      const [balanceCard, addTransaction, transactionSwipe] = await Promise.all(
        [
          AsyncStorage.getItem('hasSeenBalanceCardTour'),
          AsyncStorage.getItem('hasSeenAddTransactionTour'),
          AsyncStorage.getItem('hasSeenTransactionSwipeTour'),
        ],
      );

      const cachedStatus = {
        hasSeenBalanceCardTour: balanceCard === 'true',
        hasSeenAddTransactionTour: addTransaction === 'true',
        hasSeenTransactionSwipeTour: transactionSwipe === 'true',
      };

      console.log(
        '🎯 useOnboarding: CACHE-FIRST: Loaded from cache:',
        cachedStatus,
      );

      // Set cached status immediately to show tutorials without delay
      setOnboardingStatus(cachedStatus);
      setLoading(false); // Stop loading immediately

      // 🌐 BACKGROUND SYNC: Update from server if authenticated
      if (AuthService.isAuthenticated()) {
        setTimeout(async () => {
          try {
            console.log(
              '🎯 useOnboarding: BACKGROUND SYNC: Fetching from server',
            );
            const serverStatus = await TrendAPIService.getOnboardingStatus();

            console.log(
              '🎯 useOnboarding: BACKGROUND SYNC: Server response:',
              serverStatus,
            );

            // Update cache with server data
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

            // Update state only if different from cache
            const hasChanges =
              cachedStatus.hasSeenBalanceCardTour !==
                serverStatus.hasSeenBalanceCardTour ||
              cachedStatus.hasSeenAddTransactionTour !==
                serverStatus.hasSeenAddTransactionTour ||
              cachedStatus.hasSeenTransactionSwipeTour !==
                serverStatus.hasSeenTransactionSwipeTour;

            if (hasChanges) {
              console.log(
                '🎯 useOnboarding: BACKGROUND SYNC: Server data differs, updating state',
              );
              setOnboardingStatus(serverStatus);
            } else {
              console.log(
                '🎯 useOnboarding: BACKGROUND SYNC: Server data matches cache',
              );
            }
          } catch (syncError) {
            console.warn(
              '🎯 useOnboarding: BACKGROUND SYNC: Failed, keeping cached data:',
              syncError,
            );

            // Sync cached data to server if we have meaningful progress
            const hasCompletedTours =
              cachedStatus.hasSeenBalanceCardTour ||
              cachedStatus.hasSeenAddTransactionTour ||
              cachedStatus.hasSeenTransactionSwipeTour;

            if (hasCompletedTours) {
              try {
                await TrendAPIService.updateOnboardingStatus(cachedStatus);
                console.log(
                  '🎯 useOnboarding: BACKGROUND SYNC: Uploaded cached progress to server',
                );
              } catch (uploadError) {
                console.warn(
                  '🎯 useOnboarding: BACKGROUND SYNC: Failed to upload to server:',
                  uploadError,
                );
              }
            }
          }
        }, 0); // Background sync with no delay
      }
    } catch (error) {
      console.error('🎯 useOnboarding: Critical error loading status:', error);

      // Set defaults on complete failure
      setOnboardingStatus({
        hasSeenBalanceCardTour: false,
        hasSeenAddTransactionTour: false,
        hasSeenTransactionSwipeTour: false,
      });
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

  const measureFloatingButton = useCallback(
    (forceRun = false) => {
      console.log('🎯 useOnboarding: measureFloatingButton called:', {
        hasFloatingButtonRef: !!floatingButtonRef.current,
        tutorialInProgress,
        forceRun,
      });

      if (floatingButtonRef.current && (!tutorialInProgress || forceRun)) {
        console.log(
          '🎯 useOnboarding: Measuring floating button and setting tutorial in progress',
        );
        setTutorialInProgress(true);
        floatingButtonRef.current.measure(
          (x, y, width, height, pageX, pageY) => {
            console.log(
              '🎯 useOnboarding: Floating button measured, showing spotlight:',
              {
                x: pageX,
                y: pageY,
                width,
                height,
              },
            );
            setFloatingButtonLayout({x: pageX, y: pageY, width, height});
            setShowAddTransactionSpotlight(true);
          },
        );
      } else {
        console.log('🎯 useOnboarding: Cannot measure floating button:', {
          hasRef: !!floatingButtonRef.current,
          tutorialInProgress,
          forceRun,
        });
      }
    },
    [tutorialInProgress],
  );

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
      console.log('🎯 useOnboarding: checkAndShowOnboarding called:', {
        hasOnboardingStatus: !!onboardingStatus,
        tutorialInProgress,
        hasIncomeData: !!incomeData,
        transactionCount: transactions?.length || 0,
      });

      if (!onboardingStatus || tutorialInProgress) {
        console.log(
          '🎯 useOnboarding: Early return - missing status or tutorial in progress',
        );
        return;
      }

      const {
        hasSeenBalanceCardTour,
        hasSeenAddTransactionTour,
        hasSeenTransactionSwipeTour,
      } = onboardingStatus;

      console.log('🎯 useOnboarding: Tour status check:', {
        hasSeenBalanceCardTour,
        hasSeenAddTransactionTour,
        hasSeenTransactionSwipeTour,
        hasIncomeData: !!incomeData,
        transactionCount: transactions?.length || 0,
      });

      // Show balance card tutorial first (if user has income data)
      if (incomeData && !hasSeenBalanceCardTour) {
        console.log('🎯 useOnboarding: Triggering balance card tutorial');
        setTimeout(() => measureBalanceCard(), 500);
      }
      // Show add transaction tutorial second
      else if (hasSeenBalanceCardTour && !hasSeenAddTransactionTour) {
        console.log('🎯 useOnboarding: Triggering add transaction tutorial');
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
        console.log('🎯 useOnboarding: Triggering transaction swipe tutorial');
        setTimeout(() => measureFirstTransaction(), 500);
      } else {
        console.log(
          '🎯 useOnboarding: No tutorial to show based on current status',
        );
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

      return shouldShow;
    },
    [onboardingStatus],
  );

  const triggerTransactionTutorial = useCallback(() => {
    if (!tutorialInProgress) {
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
        console.log(
          `🎯 useOnboarding: CACHE-FIRST: Completing ${tourType} tour`,
        );

        // 🔄 CACHE-FIRST: Update local state and storage immediately
        const newStatus = {
          ...onboardingStatus,
          [tourKey]: true,
        };

        setOnboardingStatus(newStatus);
        await AsyncStorage.setItem(tourKey, 'true');
        console.log(
          `🎯 useOnboarding: CACHE-FIRST: ${tourType} tour saved to cache`,
        );

        // 🌐 BACKGROUND SYNC: Update server in background
        if (AuthService.isAuthenticated()) {
          setTimeout(async () => {
            try {
              await TrendAPIService.markOnboardingTourComplete(tourType);
              console.log(
                `🎯 useOnboarding: BACKGROUND SYNC: ${tourType} tour synced to server`,
              );
            } catch (serverError) {
              console.warn(
                `🎯 useOnboarding: BACKGROUND SYNC: Failed to sync ${tourType} tour:`,
                serverError,
              );
              // Don't revert - local state is more important for UX
            }
          }, 0);
        }

        // Reset tutorial state
        setTutorialInProgress(false);

        // Hide current spotlight and potentially trigger next
        switch (tourType) {
          case 'BalanceCard':
            console.log(
              '🎯 useOnboarding: Balance card tour completed, triggering next tutorial',
            );
            setShowBalanceCardSpotlight(false);

            // Trigger next tutorial with robust ref checking
            setTimeout(() => {
              console.log(
                '🎯 useOnboarding: Triggering floating button measurement',
              );
              setTutorialInProgress(false);

              // Robust polling for floating button ref
              const waitForFloatingButtonRef = (attempts = 0) => {
                console.log(
                  `🎯 useOnboarding: Attempt ${
                    attempts + 1
                  } - Checking for floating button ref`,
                );

                if (floatingButtonRef.current) {
                  console.log(
                    '🎯 useOnboarding: Floating button ref found, measuring now with force=true',
                  );
                  measureFloatingButton(true); // Force run to bypass tutorialInProgress check
                } else if (attempts < 10) {
                  console.log(
                    '🎯 useOnboarding: Floating button ref not ready, retrying in 200ms',
                  );
                  setTimeout(() => waitForFloatingButtonRef(attempts + 1), 200);
                } else {
                  console.error(
                    '🎯 useOnboarding: Failed to find floating button ref after 10 attempts',
                  );
                }
              };

              waitForFloatingButtonRef();
            }, 200);
            return; // Early return to avoid setting tutorialInProgress to false twice

          case 'AddTransaction':
            setShowAddTransactionSpotlight(false);
            break;
          case 'TransactionSwipe':
            setShowTransactionSwipeSpotlight(false);
            setTransactionSwipeStep(0);
            break;
        }
      } catch (error) {
        console.error(
          `🎯 useOnboarding: Error completing ${tourType} tour:`,
          error,
        );

        // Revert on failure
        setOnboardingStatus(prev => ({
          ...prev,
          [`hasSeen${tourType}Tour`]: false,
        }));

        try {
          await AsyncStorage.setItem(`hasSeen${tourType}Tour`, 'false');
        } catch (storageError) {
          console.error(
            '🎯 useOnboarding: Failed to revert local storage:',
            storageError,
          );
        }

        setTutorialInProgress(false);
      }
    },
    [onboardingStatus, measureFloatingButton],
  );

  const skipTour = useCallback(
    async tourType => {
      await completeTour(tourType);
    },
    [completeTour],
  );

  // ==============================================
  // UTILITY FUNCTIONS
  // ==============================================
  const hideActiveSpotlights = useCallback(() => {
    setShowBalanceCardSpotlight(false);
    setShowAddTransactionSpotlight(false);
    setShowTransactionSwipeSpotlight(false);
    setTutorialInProgress(false);
  }, []);

  const debugShowAddTransactionSpotlight = useCallback(() => {
    console.log('🎯 DEBUG: Manually triggering AddTransactionSpotlight');
    setTutorialInProgress(false);
    setTimeout(() => measureFloatingButton(), 100);
  }, [measureFloatingButton]);

  const debugResetOnboarding = useCallback(async () => {
    console.log('🎯 DEBUG: Resetting all onboarding progress');

    // Clear cache
    await Promise.all([
      AsyncStorage.removeItem('hasSeenBalanceCardTour'),
      AsyncStorage.removeItem('hasSeenAddTransactionTour'),
      AsyncStorage.removeItem('hasSeenTransactionSwipeTour'),
    ]);

    // Reset state
    setOnboardingStatus({
      hasSeenBalanceCardTour: false,
      hasSeenAddTransactionTour: false,
      hasSeenTransactionSwipeTour: false,
    });

    // Hide any active spotlights
    setShowBalanceCardSpotlight(false);
    setShowAddTransactionSpotlight(false);
    setShowTransactionSwipeSpotlight(false);
    setTutorialInProgress(false);

    console.log('🎯 DEBUG: Onboarding reset complete');
  }, []);

  const resetTutorialState = useCallback(() => {
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
    debugShowAddTransactionSpotlight,
    debugResetOnboarding,

    // Reload function
    loadOnboardingStatus,
  };
};

export default useOnboarding;

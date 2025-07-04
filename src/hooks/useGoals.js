// hooks/useGoals.js - Refactored main orchestrator
import {useState, useRef, useLayoutEffect, useCallback} from 'react';
import NetInfo from '@react-native-community/netinfo';
import TrendAPIService from '../services/TrendAPIService';

// Import all the specialized modules
import useGoalCache from './goal-services/useGoalCache';
import useGoalData from './goal-services/useGoalData';
import useGoalCalculations from './goal-services/useGoalCalculations';
import useGoalSync from './goal-services/useGoalSync';

// Constants
const LOADING_TIMEOUT = 10000; // 10 second timeout for operations

const useGoals = () => {
  // State
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  // Refs
  const loadingTimeoutRef = useRef(null);
  const isLoadingRef = useRef(false);
  const hasInitiallyLoaded = useRef(false);
  const lastSyncTime = useRef(null);

  // Initialize all the specialized hooks
  const {saveGoalsToCache, loadGoalsFromCache, clearCache} = useGoalCache();
  const {
    getGoalProgress,
    isGoalOverdue,
    getBalanceCardGoals,
    calculateTotalGoalContributions,
    getGoalAnalytics,
  } = useGoalCalculations();
  const {syncGoalsWithBackend, refreshFromBackend, needsSync, getLastSyncTime} =
    useGoalSync();

  // Network connectivity check
  const checkNetworkConnectivity = useCallback(async () => {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected && state.isInternetReachable;
    } catch (error) {
      console.error('Error checking network connectivity:', error);
      return false;
    }
  }, []);

  // Loading state management
  const setLoadingWithTimeout = useCallback(shouldLoad => {
    if (shouldLoad) {
      setLoading(true);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('Loading timeout reached, clearing loading state');
        setLoading(false);
      }, LOADING_TIMEOUT);
    } else {
      setLoading(false);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  }, []);

  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  // Initialize goal data module with dependencies
  const goalDataModule = useGoalData(checkNetworkConnectivity);

  // Core CRUD operations (delegated to modules)
  const loadGoals = useCallback(
    async (forceLoading = false, forceAPI = false) => {
      return goalDataModule.loadGoals(
        goals,
        setGoals,
        hasInitiallyLoaded,
        lastSyncTime,
        setLoadingWithTimeout,
        clearLoadingTimeout,
        setLoading,
        isLoadingRef,
        forceLoading,
        forceAPI,
      );
    },
    [goalDataModule, goals, setLoadingWithTimeout, clearLoadingTimeout],
  );

  const saveGoal = useCallback(
    async goalData => {
      return goalDataModule.saveGoal(goalData, goals, editingGoal, setGoals);
    },
    [goalDataModule, goals, editingGoal],
  );

  const deleteGoal = useCallback(
    async goalId => {
      return goalDataModule.deleteGoal(goalId, goals, setGoals);
    },
    [goalDataModule, goals],
  );

  // Goal management operations
  const toggleGoalBalanceDisplay = useCallback(
    async goalId => {
      try {
        if (!goalId) {
          throw new Error('Goal ID is required');
        }

        const goalIndex = goals.findIndex(goal => goal.id === goalId);
        if (goalIndex === -1) {
          throw new Error('Goal not found');
        }

        // Optimistically update UI first for immediate feedback
        const updatedGoals = goals.map(goal =>
          goal.id === goalId
            ? {
                ...goal,
                showOnBalanceCard: !goal.showOnBalanceCard,
                updatedAt: new Date().toISOString(),
              }
            : goal,
        );

        setGoals(updatedGoals);

        // Save to cache only (backend doesn't support showOnBalanceCard)
        const saveResult = await saveGoalsToCache(updatedGoals, false);

        if (saveResult.success) {
          return {success: true};
        } else {
          // Revert the optimistic update on failure
          setGoals(goals);
          throw new Error(saveResult.error || 'Failed to update goal');
        }
      } catch (error) {
        console.error('Error toggling goal display:', error);
        return {success: false, error: error.message};
      }
    },
    [goals, saveGoalsToCache],
  );

  const updateGoalProgress = useCallback(
    async (goalId, amount, paymentSource = 'income') => {
      console.log(
        '🔍 USE_GOALS: Delegating to goalDataModule.updateGoalProgress',
      );
      return goalDataModule.updateGoalProgress(goalId, amount, paymentSource, goals, setGoals);
    },
    [goalDataModule, goals],
  );

  const updateSpendingGoals = useCallback(
    async (newTransaction = null, originalTransaction = null) => {
      try {
        console.log('🔍 UPDATE_SPENDING_GOALS: Called with:', {
          newTransaction: newTransaction?.id,
          newCategory: newTransaction?.categoryId,
          newAmount: newTransaction?.amount,
          originalTransaction: originalTransaction?.id,
          currentGoalsCount: goals.length,
        });

        // If neither transaction is provided, nothing to do
        if (!newTransaction && !originalTransaction) {
          console.log(
            '🔍 UPDATE_SPENDING_GOALS: No transactions provided, returning',
          );
          return {success: true};
        }

        // Get categories using TrendAPIService
        let categories;
        try {
          console.log('🔍 UPDATE_SPENDING_GOALS: Checking authentication...');
          if (!TrendAPIService.isAuthenticated()) {
            console.log(
              '🔍 UPDATE_SPENDING_GOALS: Not authenticated, returning early',
            );
            return {success: true};
          }

          console.log(
            '🔍 UPDATE_SPENDING_GOALS: Getting categories from API...',
          );
          const response = await TrendAPIService.getCategories();
          categories = response?.categories || [];
          console.log(
            '🔍 UPDATE_SPENDING_GOALS: Got categories:',
            categories.length,
          );
        } catch (error) {
          console.log(
            '🔍 UPDATE_SPENDING_GOALS: Categories API failed, returning early:',
            error.message,
          );
          return {success: true}; // Gracefully handle missing service
        }

        if (!Array.isArray(categories)) {
          console.error('🔍 UPDATE_SPENDING_GOALS: Invalid categories data');
          throw new Error('Invalid categories data');
        }

        // Get FRESH goals data from cache to avoid stale state
        console.log('🔍 UPDATE_SPENDING_GOALS: Loading goals from cache...');
        const cacheResult = await loadGoalsFromCache();
        let updatedGoals = [...cacheResult.goals];
        console.log('🔍 UPDATE_SPENDING_GOALS: Loaded goals from cache:', {
          totalGoals: updatedGoals.length,
          spendingGoals: updatedGoals.filter(g => g.type === 'spending').length,
        });

        // STEP 1: Remove impact of original transaction (for edits and deletes)
        if (
          originalTransaction &&
          (originalTransaction.categoryId || originalTransaction.category)
        ) {
          const originalCategoryIdToSearch =
            originalTransaction.categoryId ||
            (typeof originalTransaction.category === 'string'
              ? originalTransaction.category
              : null);

          const originalCategory = categories.find(
            cat => cat.id === originalCategoryIdToSearch,
          );
          const originalCategoryName = originalCategory?.name?.toLowerCase();

          if (originalCategoryName) {
            const originalAmount = Number(originalTransaction.amount);
            if (!isNaN(originalAmount) && originalAmount > 0) {
              updatedGoals = updatedGoals.map(goal => {
                if (goal.type !== 'spending' || !goal.category) {
                  return goal;
                }

                // Remove original transaction amount if category matches
                if (goal.category.toLowerCase() === originalCategoryName) {
                  const newCurrent = Math.max(
                    0,
                    (goal.current || 0) - originalAmount,
                  );

                  return {
                    ...goal,
                    current: newCurrent,
                    lastUpdated: new Date().toISOString(),
                  };
                }
                return goal;
              });
            }
          }
        }

        // STEP 2: Add impact of new transaction (for new transactions and edits)
        if (
          newTransaction &&
          (newTransaction.categoryId || newTransaction.category)
        ) {
          console.log('🔍 UPDATE_SPENDING_GOALS: Processing new transaction:', {
            category: newTransaction.category,
            categoryId: newTransaction.categoryId,
            amount: newTransaction.amount,
          });

          const newTransactionAmount = Number(newTransaction.amount);
          if (!isNaN(newTransactionAmount) && newTransactionAmount > 0) {
            // Use categoryId first, fallback to category if it's a string
            const categoryIdToSearch =
              newTransaction.categoryId ||
              (typeof newTransaction.category === 'string'
                ? newTransaction.category
                : null);

            const transactionCategory = categories.find(
              cat => cat.id === categoryIdToSearch,
            );
            const transactionCategoryName =
              transactionCategory?.name?.toLowerCase();

            console.log(
              '🔍 UPDATE_SPENDING_GOALS: Transaction category lookup:',
              {
                searchingForId: categoryIdToSearch,
                foundCategory: transactionCategory?.name,
                normalizedName: transactionCategoryName,
              },
            );

            if (transactionCategoryName) {
              // Check if any spending goals need updating
              console.log(
                '🔍 UPDATE_SPENDING_GOALS: Looking for spending goals with category:',
                transactionCategoryName,
              );
              console.log(
                '🔍 UPDATE_SPENDING_GOALS: Available spending goals:',
                updatedGoals
                  .filter(g => g.type === 'spending')
                  .map(g => ({
                    id: g.id,
                    title: g.title,
                    category: g.category,
                    categoryLower: g.category?.toLowerCase(),
                  })),
              );

              const relevantGoals = updatedGoals.filter(
                goal =>
                  goal.type === 'spending' &&
                  goal.category?.toLowerCase() === transactionCategoryName,
              );

              console.log(
                '🔍 UPDATE_SPENDING_GOALS: Found relevant goals:',
                relevantGoals.length,
              );

              if (relevantGoals.length > 0) {
                // Update existing spending goals
                updatedGoals = updatedGoals.map(goal => {
                  if (
                    goal.type === 'spending' &&
                    goal.category?.toLowerCase() === transactionCategoryName
                  ) {
                    const newCurrent =
                      (goal.current || 0) + newTransactionAmount;

                    return {
                      ...goal,
                      current: newCurrent,
                      lastUpdated: new Date().toISOString(),
                    };
                  }
                  return goal;
                });
              } else {
                // Skip auto-creation - goals are only manually created
                console.log(
                  '🔍 UPDATE_SPENDING_GOALS: No spending goal found for category, skipping auto-creation:',
                  transactionCategoryName,
                );
              }
            }
          }
        }

        // STEP 3: Save the updated goals
        const saveResult = await saveGoalsToCache(updatedGoals, false);

        if (saveResult.success) {
          // Update state immediately and synchronously
          setGoals(saveResult.goals);
          return {success: true};
        } else {
          throw new Error(
            saveResult.error || 'Failed to update spending goals',
          );
        }
      } catch (error) {
        console.error('Error updating spending goals:', error);
        return {success: false, error: error.message};
      }
    },
    [loadGoalsFromCache, saveGoalsToCache, goals.length],
  );

  const completeGoal = useCallback(
    async goalId => {
      try {
        if (!goalId) {
          throw new Error('Goal ID is required');
        }

        const goalIndex = goals.findIndex(goal => goal.id === goalId);
        if (goalIndex === -1) {
          throw new Error('Goal not found');
        }

        const isConnected = await checkNetworkConnectivity();

        if (
          isConnected &&
          TrendAPIService.isAuthenticated() &&
          !goalId.startsWith('local_')
        ) {
          // TEMPORARILY DISABLED: Try API completion first
          try {
            console.log(
              '🔍 TEMPORARILY DISABLED: TrendAPIService.updateGoal for completion',
            );
            // await TrendAPIService.updateGoal(goalId, {isCompleted: true});
          } catch (apiError) {
            console.warn('API completion failed, updating locally:', apiError);
          }
        }

        // Update locally regardless of API result
        const updatedGoals = goals.map(goal =>
          goal.id === goalId
            ? {
                ...goal,
                isActive: false,
                completedDate: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : goal,
        );

        const saveResult = await saveGoalsToCache(updatedGoals, false);

        if (saveResult.success) {
          setGoals(saveResult.goals);
          return {success: true};
        } else {
          throw new Error(saveResult.error || 'Failed to complete goal');
        }
      } catch (error) {
        console.error('Error completing goal:', error);
        return {success: false, error: error.message};
      }
    },
    [goals, checkNetworkConnectivity, saveGoalsToCache],
  );

  const addGoalContribution = useCallback(
    async (goalId, amount) => {
      try {
        if (!goalId) {
          throw new Error('Goal ID is required');
        }

        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw new Error('Amount must be a positive number');
        }

        const goal = goals.find(g => g.id === goalId);
        if (!goal) {
          throw new Error('Goal not found');
        }

        const isConnected = await checkNetworkConnectivity();

        if (
          isConnected &&
          TrendAPIService.isAuthenticated() &&
          !goalId.startsWith('local_')
        ) {
          // Try API contribution first (if endpoint exists)
          try {
            // This would be an API call if the endpoint existed
            // await TrendAPIService.addGoalContribution(goalId, {amount, description});
          } catch (apiError) {
            console.warn(
              'API contribution failed, updating locally:',
              apiError,
            );
          }
        }

        // Update progress locally
        return await updateGoalProgress(goalId, parsedAmount);
      } catch (error) {
        console.error('Error adding goal contribution:', error);
        return {success: false, error: error.message};
      }
    },
    [goals, checkNetworkConnectivity, updateGoalProgress],
  );

  // Editing operations
  const prepareEditGoal = useCallback(
    async goalId => {
      try {
        if (!goalId) {
          throw new Error('Goal ID is required');
        }

        const goal = goals.find(g => g.id === goalId);
        if (!goal) {
          throw new Error('Goal not found');
        }

        setEditingGoal(goal);
        return {success: true, goal};
      } catch (error) {
        console.error('Error preparing goal for edit:', error);
        return {success: false, error: error.message};
      }
    },
    [goals],
  );

  const clearEditingGoal = useCallback(() => {
    setEditingGoal(null);
  }, []);

  // Wrapper functions for module methods that need goals passed
  const getBalanceCardGoalsWrapper = useCallback(() => {
    return getBalanceCardGoals(goals);
  }, [getBalanceCardGoals, goals]);

  const calculateTotalGoalContributionsWrapper = useCallback(() => {
    return calculateTotalGoalContributions(goals);
  }, [calculateTotalGoalContributions, goals]);

  const getGoalAnalyticsWrapper = useCallback(
    async goalId => {
      return getGoalAnalytics(goalId, goals, checkNetworkConnectivity);
    },
    [getGoalAnalytics, goals, checkNetworkConnectivity],
  );

  const syncGoalsWithBackendWrapper = useCallback(async () => {
    return syncGoalsWithBackend(goals, setGoals, checkNetworkConnectivity);
  }, [syncGoalsWithBackend, goals, checkNetworkConnectivity]);

  const refreshFromBackendWrapper = useCallback(async () => {
    return refreshFromBackend(loadGoals);
  }, [refreshFromBackend, loadGoals]);

  const needsSyncWrapper = useCallback(() => {
    return needsSync(goals);
  }, [needsSync, goals]);

  const getLastSyncTimeWrapper = useCallback(() => {
    return getLastSyncTime(lastSyncTime);
  }, [getLastSyncTime, lastSyncTime]);

  // Utility functions
  const isInitiallyLoaded = useCallback(() => {
    return hasInitiallyLoaded.current;
  }, []);

  // Clean up timeouts on unmount
  useLayoutEffect(() => {
    return () => {
      clearLoadingTimeout();
    };
  }, [clearLoadingTimeout]);

  // Monitor network connectivity
  useLayoutEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsOnline(connected);

      // Auto-sync when coming back online - DISABLED FOR TESTING
      // if (connected && needsSyncWrapper()) {
      //   setTimeout(() => {
      //     syncGoalsWithBackendWrapper();
      //   }, 2000); // Small delay to ensure connection is stable
      // }
    });

    return unsubscribe;
  }, [needsSyncWrapper, syncGoalsWithBackendWrapper]);

  return {
    // State
    goals,
    loading,
    editingGoal,
    isOnline,

    // Core CRUD operations
    loadGoals,
    saveGoal,
    deleteGoal,
    prepareEditGoal,
    clearEditingGoal,

    // Goal management
    toggleGoalBalanceDisplay,
    updateGoalProgress,
    updateSpendingGoals,
    completeGoal,
    addGoalContribution,

    // Backend integration
    syncGoalsWithBackend: syncGoalsWithBackendWrapper,
    getGoalAnalytics: getGoalAnalyticsWrapper,
    refreshFromBackend: refreshFromBackendWrapper,

    // Calculated values
    getBalanceCardGoals: getBalanceCardGoalsWrapper,
    calculateTotalGoalContributions: calculateTotalGoalContributionsWrapper,
    getGoalProgress,
    isGoalOverdue,

    // Utilities
    isInitiallyLoaded,
    needsSync: needsSyncWrapper,
    getLastSyncTime: getLastSyncTimeWrapper,
    clearCache,
  };
};

export default useGoals;

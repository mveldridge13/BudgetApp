// hooks/useGoals.js
import {useState, useCallback, useRef, useLayoutEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import TrendAPIService from '../services/TrendAPIService';

const GOALS_STORAGE_KEY = 'goals';
const SUGGESTIONS_CACHE_KEY = 'goalSuggestions';
const LOADING_TIMEOUT = 10000; // 10 second timeout for operations
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

const useGoals = () => {
  // State
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [suggestions, setSuggestions] = useState([]);

  // Refs for managing load state
  const hasInitiallyLoaded = useRef(false);
  const isLoadingRef = useRef(false);
  const loadingTimeoutRef = useRef(null);
  const lastSyncTime = useRef(null);

  // Helper: Clear loading timeout
  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  // Helper: Set loading with timeout protection
  const setLoadingWithTimeout = useCallback(
    isLoading => {
      clearLoadingTimeout();
      setLoading(isLoading);

      if (isLoading) {
        loadingTimeoutRef.current = setTimeout(() => {
          console.warn('Goals loading timeout reached');
          setLoading(false);
          isLoadingRef.current = false;
        }, LOADING_TIMEOUT);
      }
    },
    [clearLoadingTimeout],
  );

  // Helper: Transform backend goal to frontend format
  const transformBackendGoal = useCallback(backendGoal => {
    // Map backend categories to frontend display names
    const categoryMapping = {
      EMERGENCY_FUND: 'Security',
      VACATION: 'Travel',
      HOME_PURCHASE: 'Property',
      CAR_PURCHASE: 'Transport',
      DEBT_PAYOFF: 'Debt',
      EDUCATION: 'Education',
      RETIREMENT: 'Retirement',
      INVESTMENT: 'Investment',
      GENERAL_SAVINGS: 'Savings',
      OTHER: 'Other',
    };

    // Map backend types to frontend values
    const typeMapping = {
      SAVINGS: 'savings',
      SPENDING_LIMIT: 'spending',
      DEBT_PAYOFF: 'debt',
      INVESTMENT: 'savings',
    };

    // Map backend priorities to frontend values
    const priorityMapping = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'high',
    };

    return {
      id: backendGoal.id,
      title: backendGoal.name || backendGoal.title,
      type: typeMapping[backendGoal.type] || 'savings',
      target: Number(backendGoal.targetAmount) || 0,
      current: Number(backendGoal.currentAmount) || 0,
      originalAmount:
        Number(backendGoal.originalAmount || backendGoal.targetAmount) || 0,
      deadline: backendGoal.targetDate,
      category: categoryMapping[backendGoal.category] || 'Other',
      priority: priorityMapping[backendGoal.priority] || 'medium',
      autoContribute: Number(backendGoal.monthlyTarget) || 0,
      showOnBalanceCard: false, // Default to false since backend doesn't support this field
      isActive: !backendGoal.isCompleted && backendGoal.isActive !== false,
      createdAt: backendGoal.createdAt,
      updatedAt: backendGoal.updatedAt,
      completedDate: backendGoal.isCompleted ? backendGoal.updatedAt : null,
      description: backendGoal.description || '',
      currency: backendGoal.currency || 'AUD',
    };
  }, []);

  // Helper: Transform frontend goal to backend format
  const transformFrontendGoal = useCallback(frontendGoal => {
    // Map frontend categories to backend enum values
    const categoryMapping = {
      Security: 'EMERGENCY_FUND',
      'Emergency Fund': 'EMERGENCY_FUND',
      Travel: 'VACATION',
      Vacation: 'VACATION',
      Property: 'HOME_PURCHASE',
      Home: 'HOME_PURCHASE',
      Transport: 'CAR_PURCHASE',
      Car: 'CAR_PURCHASE',
      Debt: 'DEBT_PAYOFF',
      'Debt Repayment': 'DEBT_PAYOFF',
      Education: 'EDUCATION',
      Retirement: 'RETIREMENT',
      Investment: 'INVESTMENT',
      Savings: 'GENERAL_SAVINGS',
      General: 'GENERAL_SAVINGS',
      Food: 'GENERAL_SAVINGS',
      Entertainment: 'GENERAL_SAVINGS',
      Health: 'GENERAL_SAVINGS',
      Shopping: 'GENERAL_SAVINGS',
      Utilities: 'GENERAL_SAVINGS',
      Bills: 'GENERAL_SAVINGS',
      Other: 'GENERAL_SAVINGS',
    };

    // Map frontend types to backend enum values
    const typeMapping = {
      savings: 'SAVINGS',
      debt: 'DEBT_PAYOFF',
      spending: 'SPENDING_LIMIT',
      investment: 'INVESTMENT',
    };

    // Map frontend priority to backend enum values
    const priorityMapping = {
      low: 'LOW',
      medium: 'MEDIUM',
      high: 'HIGH',
      critical: 'CRITICAL',
    };

    // SIMPLIFIED number validation
    const ensureValidNumber = (
      value,
      defaultValue = 100,
      fieldName = 'unknown',
    ) => {
      // If already a valid number, return it
      if (
        typeof value === 'number' &&
        !isNaN(value) &&
        isFinite(value) &&
        value >= 0
      ) {
        return Math.round(value * 100) / 100;
      }

      // Handle null, undefined, empty string
      if (value == null || value === '') {
        return defaultValue;
      }

      // Try to parse as number
      const num = Number(value);
      if (!isNaN(num) && isFinite(num) && num >= 0) {
        return Math.round(num * 100) / 100;
      }

      // Fallback to default
      return defaultValue;
    };

    // Calculate targetAmount based on goal type
    let targetAmount;

    if (frontendGoal.type === 'debt') {
      // For debt goals, use originalAmount first, then fallback to target
      const debtAmount = frontendGoal.originalAmount || frontendGoal.target;
      targetAmount = ensureValidNumber(debtAmount, 100, 'debt_targetAmount');
    } else {
      // For savings/spending goals, use target (which should always be present)
      targetAmount = ensureValidNumber(
        frontendGoal.target,
        100,
        'targetAmount',
      );
    }

    // Send targetAmount as a decimal string (some APIs expect this format)
    const safeTargetAmount = targetAmount.toFixed(2);

    // Create the backend goal object - MINIMAL APPROACH
    const backendGoal = {
      name: String(frontendGoal.title || 'Untitled Goal').trim(),
      targetAmount: safeTargetAmount,
      currentAmount: ensureValidNumber(
        frontendGoal.current,
        0,
        'currentAmount',
      ).toFixed(2),
      currency: 'AUD',
      category: categoryMapping[frontendGoal.category] || 'GENERAL_SAVINGS',
      type: typeMapping[frontendGoal.type] || 'SAVINGS',
      priority: priorityMapping[frontendGoal.priority] || 'MEDIUM',
      isActive: true,
      isCompleted: false,
      showOnBalanceCard: frontendGoal.showOnBalanceCard || false,
    };

    // Add optional fields only if they exist
    if (frontendGoal.description && frontendGoal.description.trim()) {
      backendGoal.description = String(frontendGoal.description).trim();
    }

    // Add optional fields
    if (frontendGoal.deadline) {
      try {
        const deadlineDate = new Date(frontendGoal.deadline);
        if (!isNaN(deadlineDate.getTime()) && deadlineDate > new Date()) {
          backendGoal.targetDate = deadlineDate.toISOString();
          console.log('🔍 Added targetDate:', backendGoal.targetDate);
        }
      } catch (error) {
        console.warn('🔍 Invalid deadline date:', frontendGoal.deadline);
      }
    }

    if (frontendGoal.autoContribute) {
      const monthlyTarget = ensureValidNumber(
        frontendGoal.autoContribute,
        0,
        'monthlyTarget',
      );
      if (monthlyTarget > 0) {
        backendGoal.monthlyTarget = monthlyTarget;
        console.log('🔍 Added monthlyTarget:', backendGoal.monthlyTarget);
      }
    }

    // Final validation
    ['targetAmount', 'currentAmount', 'monthlyTarget'].forEach(field => {
      if (backendGoal[field] !== undefined) {
        const value = backendGoal[field];
        if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
          delete backendGoal[field];
        } else {
          backendGoal[field] = Math.round(value * 100) / 100;
        }
      }
    });

    // Ensure targetAmount exists and is valid
    if (
      !backendGoal.targetAmount ||
      typeof backendGoal.targetAmount !== 'number' ||
      backendGoal.targetAmount < 1
    ) {
      backendGoal.targetAmount = 100;
    }

    return backendGoal;
  }, []);

  // Helper: Validate goal data structure
  const validateGoalData = useCallback(goal => {
    if (!goal || typeof goal !== 'object') {
      return false;
    }

    // Required fields
    if (!goal.title || typeof goal.title !== 'string' || !goal.title.trim()) {
      return false;
    }
    if (!goal.type || !['savings', 'spending', 'debt'].includes(goal.type)) {
      return false;
    }

    // Type-specific validation
    if (goal.type === 'debt') {
      // For debt goals, check originalAmount or target as fallback
      const debtAmount = goal.originalAmount || goal.target;
      if (!debtAmount || Number(debtAmount) <= 0) {
        return false;
      }
    } else if (goal.type !== 'spending') {
      // For savings goals, target is required
      if (!goal.target || Number(goal.target) <= 0) {
        return false;
      }
    }

    return true;
  }, []);

  // Helper: Sanitize goal data
  const sanitizeGoalData = useCallback(goal => {
    const sanitized = {
      priority: 'medium',
      current: 0,
      autoContribute: 0,
      isActive: true,
      category: 'Other',
      currency: 'AUD',
      ...goal,
      // Explicitly preserve showOnBalanceCard if it exists
      showOnBalanceCard: goal?.showOnBalanceCard ?? false,
    };

    // Ensure numeric fields are numbers
    sanitized.current = Number(sanitized.current) || 0;
    if (sanitized.target) {
      sanitized.target = Number(sanitized.target);
    }
    if (sanitized.originalAmount) {
      sanitized.originalAmount = Number(sanitized.originalAmount);
    }
    sanitized.autoContribute = Number(sanitized.autoContribute) || 0;

    // Ensure strings are trimmed
    if (typeof sanitized.title === 'string') {
      sanitized.title = sanitized.title.trim();
    }
    if (typeof sanitized.category === 'string') {
      sanitized.category = sanitized.category.trim();
    }
    if (typeof sanitized.description === 'string') {
      sanitized.description = sanitized.description.trim();
    }

    return sanitized;
  }, []);

  // Helper: Check network connectivity
  const checkNetworkConnectivity = useCallback(async () => {
    try {
      const networkState = await NetInfo.fetch();
      const connected =
        networkState.isConnected && networkState.isInternetReachable;
      setIsOnline(connected);
      return connected;
    } catch (error) {
      console.warn('Network check failed:', error);
      setIsOnline(false);
      return false;
    }
  }, []);

  // Save goals to AsyncStorage (cache)
  const saveGoalsToCache = useCallback(
    async (updatedGoals, withTimestamp = true) => {
      try {
        if (!Array.isArray(updatedGoals)) {
          throw new Error('Goals must be an array');
        }

        const validGoals = updatedGoals.filter(goal => validateGoalData(goal));
        const cacheData = {
          goals: validGoals,
          timestamp: withTimestamp ? Date.now() : null,
        };

        await AsyncStorage.setItem(
          GOALS_STORAGE_KEY,
          JSON.stringify(cacheData),
        );
        return {success: true, goals: validGoals};
      } catch (error) {
        console.error('Error saving goals to cache:', error);
        return {success: false, error: error.message};
      }
    },
    [validateGoalData],
  );

  // Load goals from cache
  const loadGoalsFromCache = useCallback(async () => {
    try {
      const cachedData = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
      if (!cachedData) {
        return {success: true, goals: [], fromCache: true};
      }

      const parsed = JSON.parse(cachedData);

      // Handle both old format (array) and new format (object with timestamp)
      const cachedGoals = Array.isArray(parsed) ? parsed : parsed.goals || [];
      const timestamp = parsed.timestamp || null;

      const validatedGoals = cachedGoals
        .map(goal => sanitizeGoalData(goal))
        .filter(goal => validateGoalData(goal));

      return {
        success: true,
        goals: validatedGoals,
        fromCache: true,
        cacheTimestamp: timestamp,
      };
    } catch (error) {
      console.error('Error loading goals from cache:', error);
      return {success: true, goals: [], fromCache: true};
    }
  }, [sanitizeGoalData, validateGoalData]);

  // Load goals from backend API
  const loadGoalsFromAPI = useCallback(async () => {
    try {
      if (!TrendAPIService.isAuthenticated()) {
        throw new Error('Not authenticated');
      }

      const response = await TrendAPIService.getGoals();

      if (response?.goals && Array.isArray(response.goals)) {
        const transformedGoals = response.goals.map(transformBackendGoal);
        return {success: true, goals: transformedGoals, fromAPI: true};
      } else if (response && Array.isArray(response)) {
        // Handle case where response is directly an array
        const transformedGoals = response.map(transformBackendGoal);
        return {success: true, goals: transformedGoals, fromAPI: true};
      } else {
        return {success: true, goals: [], fromAPI: true};
      }
    } catch (error) {
      console.error('Error loading goals from API:', error);
      return {success: false, error: error.message, fromAPI: true};
    }
  }, [transformBackendGoal]);

  // Main load goals function - tries API first, falls back to cache
  const loadGoals = useCallback(
    async (forceLoading = false, forceAPI = false) => {
      // Prevent multiple simultaneous loads
      if (isLoadingRef.current && !forceAPI) {
        return {success: true, goals};
      }

      try {
        isLoadingRef.current = true;

        // Show loading state appropriately
        if (
          (!hasInitiallyLoaded.current || forceLoading) &&
          goals.length === 0
        ) {
          setLoadingWithTimeout(true);
        }

        const isConnected = await checkNetworkConnectivity();

        let result;

        if (isConnected && TrendAPIService.isAuthenticated()) {
          // Try to load from API first
          result = await loadGoalsFromAPI();

          if (result.success) {
            // Merge with cached showOnBalanceCard preferences
            const cachedResult = await loadGoalsFromCache();
            const cachedPrefs = {};

            if (cachedResult.success) {
              cachedResult.goals.forEach(cachedGoal => {
                if (cachedGoal.showOnBalanceCard) {
                  cachedPrefs[cachedGoal.id] = true;
                }
              });
            }

            // Apply cached preferences to API goals
            const mergedGoals = result.goals.map(goal => ({
              ...goal,
              showOnBalanceCard: cachedPrefs[goal.id] || false,
            }));

            // Save merged results and update state
            await saveGoalsToCache(mergedGoals);
            setGoals(mergedGoals);
            lastSyncTime.current = Date.now();
            hasInitiallyLoaded.current = true;
            return {success: true, goals: mergedGoals, source: 'api'};
          } else {
            // API failed, try cache
            console.warn('API failed, falling back to cache');
          }
        }

        // Load from cache (either offline or API failed)
        const cacheResult = await loadGoalsFromCache();
        setGoals(cacheResult.goals);
        hasInitiallyLoaded.current = true;

        return {
          success: true,
          goals: cacheResult.goals,
          source: 'cache',
          cacheTimestamp: cacheResult.cacheTimestamp,
        };
      } catch (error) {
        console.error('Error loading goals:', error);
        // Even on error, try to return cached data
        const cacheResult = await loadGoalsFromCache();
        setGoals(cacheResult.goals);
        hasInitiallyLoaded.current = true;

        return {success: false, error: error.message, goals: cacheResult.goals};
      } finally {
        isLoadingRef.current = false;
        clearLoadingTimeout();
        setLoading(false);
      }
    },
    [
      goals,
      checkNetworkConnectivity,
      loadGoalsFromAPI,
      loadGoalsFromCache,
      saveGoalsToCache,
      setLoadingWithTimeout,
      clearLoadingTimeout,
    ],
  );

  // Save or update a goal
  const saveGoal = useCallback(
    async goalData => {
      try {

        if (!goalData || typeof goalData !== 'object') {
          throw new Error('Invalid goal data provided');
        }

        const sanitizedData = sanitizeGoalData(goalData);

        if (!validateGoalData(sanitizedData)) {
          throw new Error('Goal data validation failed');
        }

        const isConnected = await checkNetworkConnectivity();
        const isEdit = editingGoal && editingGoal.id;
        let result;

        if (isConnected && TrendAPIService.isAuthenticated()) {
          // Try API first
          try {
            const backendGoalData = transformFrontendGoal(sanitizedData);

            if (isEdit) {
              result = await TrendAPIService.updateGoal(
                editingGoal.id,
                backendGoalData,
              );
            } else {
              result = await TrendAPIService.createGoal(backendGoalData);
            }

            if (result) {
              // Transform back from backend format
              const transformedGoal = transformBackendGoal(result);

              // Update local state
              const updatedGoals = isEdit
                ? goals.map(goal =>
                    goal.id === editingGoal.id ? transformedGoal : goal,
                  )
                : [...goals, transformedGoal];

              await saveGoalsToCache(updatedGoals);
              setGoals(updatedGoals);
              setEditingGoal(null);

              return {
                success: true,
                goal: transformedGoal,
                isNewGoal: !isEdit,
                source: 'api',
              };
            }
          } catch (apiError) {
            console.error('❌ API save failed:', apiError);
            console.error('❌ API Error Details:', apiError.message);
            console.error(
              '❌ Full API Error:',
              JSON.stringify(apiError, null, 2),
            );

            // If it's a validation error, don't fall back to local save
            if (apiError.message && apiError.message.includes('targetAmount')) {
              throw new Error(`Backend validation error: ${apiError.message}`);
            }

            console.warn('API save failed, falling back to local:', apiError);
            // Continue to local save below
          }
        }

        // Offline mode or API failed - save locally
        const currentGoals = [...goals];
        let updatedGoals;
        let newGoal;

        if (isEdit) {
          // Update existing goal
          updatedGoals = currentGoals.map(goal =>
            goal.id === editingGoal.id
              ? {...goal, ...sanitizedData, updatedAt: new Date().toISOString()}
              : goal,
          );
          newGoal = updatedGoals.find(g => g.id === editingGoal.id);
        } else {
          // Create new goal with local ID
          newGoal = {
            id: `local_goal_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 11)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            needsSync: true,
            ...sanitizedData,
          };
          updatedGoals = [...currentGoals, newGoal];
        }

        const saveResult = await saveGoalsToCache(updatedGoals, false);

        if (saveResult.success) {
          setGoals(saveResult.goals);
          setEditingGoal(null);
          return {
            success: true,
            goal: newGoal,
            isNewGoal: !isEdit,
            source: 'local',
          };
        } else {
          throw new Error(saveResult.error || 'Failed to save goal');
        }
      } catch (error) {
        console.error('❌ Error saving goal:', error);
        console.error(
          '❌ Goal data that failed:',
          JSON.stringify(goalData, null, 2),
        );
        console.error('❌ Error stack:', error.stack);
        return {success: false, error: error.message};
      }
    },
    [
      goals,
      editingGoal,
      sanitizeGoalData,
      validateGoalData,
      checkNetworkConnectivity,
      transformFrontendGoal,
      transformBackendGoal,
      saveGoalsToCache,
    ],
  );

  // Delete a goal
  const deleteGoal = useCallback(
    async goalId => {
      try {
        if (!goalId) {
          throw new Error('Goal ID is required');
        }

        const goalToDelete = goals.find(goal => goal.id === goalId);
        if (!goalToDelete) {
          throw new Error('Goal not found');
        }

        const isConnected = await checkNetworkConnectivity();

        if (
          isConnected &&
          TrendAPIService.isAuthenticated() &&
          !goalId.startsWith('local_')
        ) {
          // Try API delete first
          try {
            await TrendAPIService.deleteGoal(goalId);
          } catch (apiError) {
            console.warn(
              'API delete failed, continuing with local delete:',
              apiError,
            );
          }
        }

        // Remove from local state
        const updatedGoals = goals.filter(goal => goal.id !== goalId);
        const saveResult = await saveGoalsToCache(updatedGoals, false);

        if (saveResult.success) {
          setGoals(saveResult.goals);
          return {success: true, deletedGoal: goalToDelete};
        } else {
          throw new Error(saveResult.error || 'Failed to delete goal');
        }
      } catch (error) {
        console.error('Error deleting goal:', error);
        return {success: false, error: error.message};
      }
    },
    [goals, checkNetworkConnectivity, saveGoalsToCache],
  );

  // Add contribution to goal
  const addGoalContribution = useCallback(
    async (goalId, amount, description = '') => {
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
          // Try API contribution first
          try {
            await TrendAPIService.addGoalContribution(goalId, {
              amount: parsedAmount,
              description: description,
              type: 'MANUAL',
            });
          } catch (apiError) {
            console.warn(
              'API contribution failed, updating locally:',
              apiError,
            );
          }
        }

        // Update local progress
        return await updateGoalProgress(goalId, parsedAmount);
      } catch (error) {
        console.error('Error adding goal contribution:', error);
        return {success: false, error: error.message};
      }
    },
    [goals, checkNetworkConnectivity, updateGoalProgress],
  );

  // Toggle goal display on balance card (local only)
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

  // Update goal progress (for savings/debt goals)
  const updateGoalProgress = useCallback(
    async (goalId, amount) => {
      try {
        if (!goalId) {
          throw new Error('Goal ID is required');
        }

        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw new Error('Amount must be a positive number');
        }

        const goalIndex = goals.findIndex(goal => goal.id === goalId);
        if (goalIndex === -1) {
          throw new Error('Goal not found');
        }

        const updatedGoals = goals.map(currentGoal => {
          if (currentGoal.id !== goalId) {
            return currentGoal;
          }

          let newCurrent = currentGoal.current || 0;

          if (currentGoal.type === 'debt') {
            // For debt, subtract the payment amount
            newCurrent = Math.max(0, newCurrent - parsedAmount);
          } else {
            // For savings, add the contribution
            newCurrent = newCurrent + parsedAmount;
          }

          return {
            ...currentGoal,
            current: newCurrent,
            lastUpdated: new Date().toISOString(),
          };
        });

        const saveResult = await saveGoalsToCache(updatedGoals, false);

        if (saveResult.success) {
          setGoals(saveResult.goals);
          return {success: true};
        } else {
          throw new Error(saveResult.error || 'Failed to update goal progress');
        }
      } catch (error) {
        console.error('Error updating goal progress:', error);
        return {success: false, error: error.message};
      }
    },
    [goals, saveGoalsToCache],
  );

  // Update spending goals based on transactions
  const updateSpendingGoals = useCallback(
    async (newTransaction = null, originalTransaction = null) => {
      try {
        // If neither transaction is provided, nothing to do
        if (!newTransaction && !originalTransaction) {
          return {success: true};
        }

        // Get categories using TrendAPIService
        let categories;
        try {
          if (!TrendAPIService.isAuthenticated()) {
            return {success: true};
          }

          const response = await TrendAPIService.getCategories();
          categories = response?.categories || [];
        } catch (error) {
          return {success: true}; // Gracefully handle missing service
        }

        if (!Array.isArray(categories)) {
          throw new Error('Invalid categories data');
        }

        // Get FRESH goals data from cache to avoid stale state
        const cacheResult = await loadGoalsFromCache();
        let updatedGoals = [...cacheResult.goals];

        // STEP 1: Remove impact of original transaction (for edits and deletes)
        if (originalTransaction && originalTransaction.category) {
          const originalCategory = categories.find(
            cat => cat.id === originalTransaction.category,
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
        if (newTransaction && newTransaction.category) {
          const newTransactionAmount = Number(newTransaction.amount);
          if (!isNaN(newTransactionAmount) && newTransactionAmount > 0) {
            const transactionCategory = categories.find(
              cat => cat.id === newTransaction.category,
            );
            const transactionCategoryName =
              transactionCategory?.name?.toLowerCase();

            if (transactionCategoryName) {
              // Check if any spending goals need updating
              const relevantGoals = updatedGoals.filter(
                goal =>
                  goal.type === 'spending' &&
                  goal.category?.toLowerCase() === transactionCategoryName,
              );

              if (relevantGoals.length > 0) {
                updatedGoals = updatedGoals.map(goal => {
                  if (goal.type !== 'spending' || !goal.category) {
                    return goal;
                  }

                  // Add new transaction amount if category matches
                  if (goal.category.toLowerCase() === transactionCategoryName) {
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
    [loadGoalsFromCache, saveGoalsToCache],
  );

  // Mark goal as completed
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
          // Try API completion first
          try {
            await TrendAPIService.updateGoal(goalId, {isCompleted: true});
          } catch (apiError) {
            console.warn('API completion failed, updating locally:', apiError);
          }
        }

        const updatedGoals = goals.map(goal =>
          goal.id === goalId
            ? {
                ...goal,
                isActive: false,
                completedDate: new Date().toISOString(),
                showOnBalanceCard: false,
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

  // Get smart goal suggestions (from backend API)
  const getSmartSuggestions = useCallback(
    async (transactions = [], incomeData = null, forceRefresh = false) => {
      try {
        const isConnected = await checkNetworkConnectivity();

        if (isConnected && TrendAPIService.isAuthenticated()) {
          try {
            // Check cache first unless forced refresh
            if (!forceRefresh) {
              const cachedSuggestions = await AsyncStorage.getItem(
                SUGGESTIONS_CACHE_KEY,
              );
              if (cachedSuggestions) {
                const parsed = JSON.parse(cachedSuggestions);
                if (
                  parsed.timestamp &&
                  Date.now() - parsed.timestamp < CACHE_DURATION
                ) {
                  setSuggestions(parsed.suggestions || []);
                  return parsed.suggestions || [];
                }
              }
            }

            // Fetch from backend
            const response = await TrendAPIService.getGoalSuggestions({
              includeEmergencyFund: true,
              analyzePeriodMonths: 6,
            });

            if (response?.suggestions && Array.isArray(response.suggestions)) {
              // Transform backend suggestions to frontend format
              const transformedSuggestions = response.suggestions.map(
                suggestion => ({
                  type: suggestion.type?.toLowerCase() || 'savings',
                  title: suggestion.name || suggestion.title,
                  target: suggestion.suggestedAmount || suggestion.targetAmount,
                  reason: suggestion.reasoning || suggestion.description,
                  priority: suggestion.priority?.toLowerCase() || 'medium',
                  category: suggestion.category || 'Other',
                  suggestedContribution:
                    suggestion.suggestedMonthlyContribution || 0,
                  amount: suggestion.suggestedAmount || suggestion.targetAmount,
                  confidence: suggestion.confidence || 0.5,
                }),
              );

              // Cache the suggestions
              await AsyncStorage.setItem(
                SUGGESTIONS_CACHE_KEY,
                JSON.stringify({
                  suggestions: transformedSuggestions,
                  timestamp: Date.now(),
                }),
              );

              setSuggestions(transformedSuggestions);
              return transformedSuggestions;
            }
          } catch (apiError) {
            console.warn(
              'API suggestions failed, falling back to local:',
              apiError,
            );
          }
        }

        // Fallback to local suggestions algorithm
        return getLocalSmartSuggestions(transactions, incomeData);
      } catch (error) {
        console.error('Error getting smart suggestions:', error);
        return getLocalSmartSuggestions(transactions, incomeData);
      }
    },
    [getLocalSmartSuggestions, checkNetworkConnectivity],
  );

  // Local smart suggestions (fallback)
  const getLocalSmartSuggestions = useCallback(
    (transactions = [], incomeData = null) => {
      try {
        if (
          !incomeData ||
          !Array.isArray(transactions) ||
          transactions.length === 0
        ) {
          return [];
        }

        const monthlyIncome = Number(incomeData.income) || 0;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);

        const last30DaysTransactions = transactions.filter(t => {
          try {
            const transactionDate = new Date(t.date);
            return (
              !isNaN(transactionDate.getTime()) && transactionDate >= cutoffDate
            );
          } catch {
            return false;
          }
        });

        const monthlySpending = last30DaysTransactions.reduce(
          (sum, t) => sum + (Math.abs(Number(t.amount)) || 0),
          0,
        );

        const availableForGoals = Math.max(0, monthlyIncome - monthlySpending);
        const localSuggestions = [];

        // Emergency fund suggestion (3 months of expenses)
        if (monthlySpending > 0) {
          const emergencyTarget = Math.round(monthlySpending * 3);
          const existingEmergencyGoal = goals.find(
            goal =>
              goal &&
              goal.type === 'savings' &&
              (goal.title?.toLowerCase().includes('emergency') ||
                goal.category?.toLowerCase().includes('emergency')),
          );

          if (
            !existingEmergencyGoal ||
            (existingEmergencyGoal.current || 0) < emergencyTarget
          ) {
            localSuggestions.push({
              type: 'savings',
              title: '3-Month Emergency Fund',
              target: emergencyTarget,
              reason: 'Recommended based on your monthly spending',
              priority: 'high',
              category: 'Security',
              suggestedContribution: Math.min(
                availableForGoals * 0.2,
                monthlySpending * 0.1,
              ),
              amount: emergencyTarget,
              confidence: 0.8,
            });
          }
        }

        // Vacation fund suggestion
        if (availableForGoals > 200) {
          const existingVacationGoal = goals.find(
            goal =>
              goal &&
              (goal.category?.toLowerCase().includes('travel') ||
                goal.title?.toLowerCase().includes('vacation')),
          );

          if (!existingVacationGoal) {
            localSuggestions.push({
              type: 'savings',
              title: 'Vacation Fund',
              target: 2000,
              reason: 'Build memories with a getaway',
              priority: 'medium',
              category: 'Travel',
              suggestedContribution: Math.min(availableForGoals * 0.15, 300),
              amount: 2000,
              confidence: 0.6,
            });
          }
        }

        return localSuggestions;
      } catch (error) {
        console.error('Error generating local smart suggestions:', error);
        return [];
      }
    },
    [goals],
  );

  // Prepare goal for editing
  const prepareEditGoal = useCallback(goal => {
    try {
      if (!goal || !goal.id) {
        throw new Error('Invalid goal provided for editing');
      }

      setEditingGoal(goal);
      return {success: true, goal};
    } catch (error) {
      console.error('Error preparing goal for edit:', error);
      return {success: false, error: error.message};
    }
  }, []);

  // Clear editing state
  const clearEditingGoal = useCallback(() => {
    setEditingGoal(null);
  }, []);

  // Get goals for balance card display
  const getBalanceCardGoals = useCallback(() => {
    try {
      return goals.filter(
        goal =>
          goal && goal.showOnBalanceCard === true && goal.isActive !== false,
      );
    } catch (error) {
      console.error('Error getting balance card goals:', error);
      return [];
    }
  }, [goals]);

  // Calculate total monthly goal contributions
  const calculateTotalGoalContributions = useCallback(() => {
    try {
      return goals
        .filter(
          goal =>
            goal &&
            goal.showOnBalanceCard === true &&
            goal.autoContribute &&
            goal.isActive !== false,
        )
        .reduce((sum, goal) => sum + (Number(goal.autoContribute) || 0), 0);
    } catch (error) {
      console.error('Error calculating goal contributions:', error);
      return 0;
    }
  }, [goals]);

  // Get goal progress for a specific goal
  const getGoalProgress = useCallback(goal => {
    try {
      if (!goal || typeof goal !== 'object') {
        return 0;
      }

      const current = Number(goal.current) || 0;
      let progress = 0;

      if (goal.type === 'debt') {
        const originalAmount =
          Number(goal.originalAmount) || Number(goal.target) || 0;
        if (originalAmount > 0) {
          const paid = originalAmount - current;
          progress = Math.min((paid / originalAmount) * 100, 100);
        }
      } else {
        const target = Number(goal.target) || 0;
        if (target > 0) {
          progress = Math.min((current / target) * 100, 100);
        }
      }

      return Math.max(0, progress); // Ensure no negative progress
    } catch (error) {
      console.error('Error calculating goal progress:', error);
      return 0;
    }
  }, []);

  // Check if goal is overdue
  const isGoalOverdue = useCallback(
    goal => {
      try {
        if (!goal || !goal.deadline) {
          return false;
        }

        const today = new Date();
        const deadline = new Date(goal.deadline);

        if (isNaN(deadline.getTime())) {
          return false; // Invalid date
        }

        return today > deadline && getGoalProgress(goal) < 100;
      } catch (error) {
        console.error('Error checking if goal is overdue:', error);
        return false;
      }
    },
    [getGoalProgress],
  );

  // Sync local goals with backend (for when coming back online)
  const syncGoalsWithBackend = useCallback(async () => {
    try {
      const isConnected = await checkNetworkConnectivity();

      if (!isConnected || !TrendAPIService.isAuthenticated()) {
        return {success: false, error: 'Not connected or authenticated'};
      }

      // Load local goals that need syncing
      const localGoals = goals.filter(goal => goal.id.startsWith('local_'));

      if (localGoals.length === 0) {
        return {success: true, syncedCount: 0};
      }

      let syncedCount = 0;
      const updatedGoals = [...goals];

      for (const localGoal of localGoals) {
        try {
          const backendGoalData = transformFrontendGoal(localGoal);
          const result = await TrendAPIService.createGoal(backendGoalData);

          if (result) {
            // Replace local goal with backend goal
            const transformedGoal = transformBackendGoal(result);
            const goalIndex = updatedGoals.findIndex(
              g => g.id === localGoal.id,
            );

            if (goalIndex !== -1) {
              updatedGoals[goalIndex] = {
                ...transformedGoal,
                showOnBalanceCard: localGoal.showOnBalanceCard, // Preserve local settings
              };
              syncedCount++;
            }
          }
        } catch (error) {
          console.warn(`Failed to sync goal ${localGoal.id}:`, error);
        }
      }

      if (syncedCount > 0) {
        await saveGoalsToCache(updatedGoals);
        setGoals(updatedGoals);
      }

      return {success: true, syncedCount};
    } catch (error) {
      console.error('Error syncing goals with backend:', error);
      return {success: false, error: error.message};
    }
  }, [
    goals,
    checkNetworkConnectivity,
    transformFrontendGoal,
    transformBackendGoal,
    saveGoalsToCache,
  ]);

  // Get analytics data for a specific goal
  const getGoalAnalytics = useCallback(
    async goalId => {
      try {
        const isConnected = await checkNetworkConnectivity();

        if (
          isConnected &&
          TrendAPIService.isAuthenticated() &&
          !goalId.startsWith('local_')
        ) {
          try {
            const analytics = await TrendAPIService.getGoalAnalytics(goalId);
            return {success: true, analytics, source: 'api'};
          } catch (apiError) {
            console.warn('API analytics failed:', apiError);
          }
        }

        // Fallback to local analytics calculation
        const goal = goals.find(g => g.id === goalId);
        if (!goal) {
          throw new Error('Goal not found');
        }

        const localAnalytics = {
          goalId: goal.id,
          goalName: goal.title,
          targetAmount: goal.target || goal.originalAmount,
          currentAmount: goal.current,
          progressPercentage: getGoalProgress(goal),
          isOnTrack: !isGoalOverdue(goal),
          daysToTarget: goal.deadline
            ? Math.ceil(
                (new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24),
              )
            : null,
        };

        return {success: true, analytics: localAnalytics, source: 'local'};
      } catch (error) {
        console.error('Error getting goal analytics:', error);
        return {success: false, error: error.message};
      }
    },
    [goals, checkNetworkConnectivity, getGoalProgress, isGoalOverdue],
  );

  // Utility to check if goals are loaded
  const isInitiallyLoaded = useCallback(() => {
    return hasInitiallyLoaded.current;
  }, []);

  // Check if sync is needed
  const needsSync = useCallback(() => {
    return goals.some(goal => goal.id.startsWith('local_'));
  }, [goals]);

  // Get last sync time
  const getLastSyncTime = useCallback(() => {
    return lastSyncTime.current;
  }, []);

  // Force refresh from backend
  const refreshFromBackend = useCallback(async () => {
    return await loadGoals(true, true);
  }, [loadGoals]);

  // Clear all cached data
  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        GOALS_STORAGE_KEY,
        SUGGESTIONS_CACHE_KEY,
      ]);
      setGoals([]);
      setSuggestions([]);
      hasInitiallyLoaded.current = false;
      lastSyncTime.current = null;
      return {success: true};
    } catch (error) {
      console.error('Error clearing cache:', error);
      return {success: false, error: error.message};
    }
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

      // Auto-sync when coming back online
      if (connected && needsSync()) {
        setTimeout(() => {
          syncGoalsWithBackend();
        }, 2000); // Small delay to ensure connection is stable
      }
    });

    return unsubscribe;
  }, [needsSync, syncGoalsWithBackend]);

  return {
    // State
    goals,
    loading,
    editingGoal,
    isOnline,
    suggestions,

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
    getSmartSuggestions,
    syncGoalsWithBackend,
    getGoalAnalytics,
    refreshFromBackend,

    // Calculated values
    getBalanceCardGoals,
    calculateTotalGoalContributions,
    getGoalProgress,
    isGoalOverdue,

    // Utilities
    isInitiallyLoaded,
    needsSync,
    getLastSyncTime,
    clearCache,
  };
};

export default useGoals;

// hooks/useGoals.js
import {useState, useCallback, useRef, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GOALS_STORAGE_KEY = 'goals';
const LOADING_TIMEOUT = 10000; // 10 second timeout for operations

const useGoals = () => {
  // State
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  // Refs for managing load state
  const hasInitiallyLoaded = useRef(false);
  const isLoadingRef = useRef(false);
  const loadingTimeoutRef = useRef(null);

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

  // Helper: Validate goal data structure
  const validateGoalData = useCallback(goal => {
    if (!goal || typeof goal !== 'object') {
      return false;
    }

    // Required fields
    if (!goal.title || typeof goal.title !== 'string') {
      return false;
    }
    if (!goal.type || !['savings', 'spending', 'debt'].includes(goal.type)) {
      return false;
    }

    // Type-specific validation
    if (goal.type === 'debt') {
      if (!goal.originalAmount || goal.originalAmount <= 0) {
        return false;
      }
    } else if (goal.type !== 'spending') {
      if (!goal.target || goal.target <= 0) {
        return false;
      }
    }

    return true;
  }, []);

  // Helper: Sanitize goal data
  const sanitizeGoalData = useCallback(goal => {
    const sanitized = {
      showOnBalanceCard: false,
      priority: 'medium',
      current: 0,
      autoContribute: 0,
      isActive: true,
      ...goal,
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
    } else {
      sanitized.category = 'Other';
    }

    return sanitized;
  }, []);

  // Save goals to AsyncStorage with error handling
  const saveGoalsToStorage = useCallback(
    async updatedGoals => {
      try {
        if (!Array.isArray(updatedGoals)) {
          throw new Error('Goals must be an array');
        }

        // Validate all goals before saving
        const validGoals = updatedGoals.filter(goal => validateGoalData(goal));

        if (validGoals.length !== updatedGoals.length) {
          console.warn(
            `Filtered out ${
              updatedGoals.length - validGoals.length
            } invalid goals`,
          );
        }

        const jsonString = JSON.stringify(validGoals);
        await AsyncStorage.setItem(GOALS_STORAGE_KEY, jsonString);
        return {success: true, goals: validGoals};
      } catch (error) {
        console.error('Error saving goals to AsyncStorage:', error);
        return {success: false, error: error.message};
      }
    },
    [validateGoalData],
  );

  // Load goals from AsyncStorage
  const loadGoals = useCallback(
    async (forceLoading = false) => {
      // Prevent multiple simultaneous loads
      if (isLoadingRef.current) {
        return {success: true, goals};
      }

      try {
        isLoadingRef.current = true;

        // Only show loading state on initial load or forced reload with no existing data
        if (
          (!hasInitiallyLoaded.current || forceLoading) &&
          goals.length === 0
        ) {
          setLoadingWithTimeout(true);
        }

        const storedGoals = await AsyncStorage.getItem(GOALS_STORAGE_KEY);

        if (storedGoals) {
          const parsedGoals = JSON.parse(storedGoals);

          if (!Array.isArray(parsedGoals)) {
            throw new Error('Stored goals data is not an array');
          }

          // Sanitize and validate all goals
          const validatedGoals = parsedGoals
            .map(goal => sanitizeGoalData(goal))
            .filter(goal => validateGoalData(goal));

          setGoals(validatedGoals);
          hasInitiallyLoaded.current = true;

          return {success: true, goals: validatedGoals};
        } else {
          setGoals([]);
          hasInitiallyLoaded.current = true;
          return {success: true, goals: []};
        }
      } catch (error) {
        console.error('Error loading goals:', error);
        setGoals([]);
        hasInitiallyLoaded.current = true;
        return {success: false, error: error.message};
      } finally {
        isLoadingRef.current = false;
        clearLoadingTimeout();
        setLoading(false);
      }
    },
    [
      goals,
      sanitizeGoalData,
      validateGoalData,
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

        const currentGoals = [...goals];
        let updatedGoals;
        let isNewGoal = false;

        if (editingGoal && editingGoal.id) {
          // Update existing goal
          const goalIndex = currentGoals.findIndex(
            goal => goal.id === editingGoal.id,
          );

          if (goalIndex === -1) {
            throw new Error('Goal to edit not found');
          }

          updatedGoals = currentGoals.map(goal =>
            goal.id === editingGoal.id
              ? {...goal, ...sanitizedData, updatedAt: new Date().toISOString()}
              : goal,
          );
        } else {
          // Create new goal
          isNewGoal = true;
          const newGoal = {
            id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            ...sanitizedData,
          };
          updatedGoals = [...currentGoals, newGoal];
        }

        const saveResult = await saveGoalsToStorage(updatedGoals);

        if (saveResult.success) {
          setGoals(saveResult.goals);
          setEditingGoal(null);
          return {
            success: true,
            updatedGoals: saveResult.goals,
            isNewGoal,
            goal: isNewGoal
              ? updatedGoals[updatedGoals.length - 1]
              : updatedGoals.find(g => g.id === editingGoal?.id),
          };
        } else {
          throw new Error(saveResult.error || 'Failed to save goal to storage');
        }
      } catch (error) {
        console.error('Error saving goal:', error);
        return {success: false, error: error.message};
      }
    },
    [
      goals,
      editingGoal,
      sanitizeGoalData,
      validateGoalData,
      saveGoalsToStorage,
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

        const updatedGoals = goals.filter(goal => goal.id !== goalId);
        const saveResult = await saveGoalsToStorage(updatedGoals);

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
    [goals, saveGoalsToStorage],
  );

  // Toggle goal display on balance card
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

        const updatedGoals = goals.map(goal =>
          goal.id === goalId
            ? {
                ...goal,
                showOnBalanceCard: !goal.showOnBalanceCard,
                updatedAt: new Date().toISOString(),
              }
            : goal,
        );

        const saveResult = await saveGoalsToStorage(updatedGoals);

        if (saveResult.success) {
          setGoals(saveResult.goals);
          return {success: true};
        } else {
          throw new Error(saveResult.error || 'Failed to update goal');
        }
      } catch (error) {
        console.error('Error toggling goal display:', error);
        return {success: false, error: error.message};
      }
    },
    [goals, saveGoalsToStorage],
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

        const saveResult = await saveGoalsToStorage(updatedGoals);

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
    [goals, saveGoalsToStorage],
  );

  // Update spending goals based on transactions
  const updateSpendingGoals = useCallback(
    async (transaction, originalTransaction = null) => {
      try {
        if (!transaction || typeof transaction !== 'object') {
          throw new Error('Invalid transaction data');
        }

        if (!transaction.category) {
          // If no category, nothing to update
          return {success: true};
        }

        const transactionAmount = Number(transaction.amount);
        if (isNaN(transactionAmount)) {
          throw new Error('Invalid transaction amount');
        }

        // Get category name from category service
        let categoryService;
        try {
          categoryService = require('../services/categoryService').default;
        } catch (error) {
          console.warn('Category service not available:', error);
          return {success: true}; // Gracefully handle missing service
        }

        const categories = await categoryService.getCategories();
        if (!Array.isArray(categories)) {
          throw new Error('Invalid categories data');
        }

        // Get FRESH goals data from storage to avoid stale state
        const storedGoals = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
        const freshGoals = storedGoals ? JSON.parse(storedGoals) : [];

        if (!Array.isArray(freshGoals)) {
          throw new Error('Invalid stored goals data');
        }

        let updatedGoals = [...freshGoals];

        // If this is an update (originalTransaction exists), first subtract the original amount
        if (originalTransaction && originalTransaction.category) {
          const originalCategory = categories.find(
            cat => cat.id === originalTransaction.category,
          );
          const originalCategoryName = originalCategory?.name?.toLowerCase();

          if (originalCategoryName) {
            const originalAmount = Number(originalTransaction.amount);
            if (!isNaN(originalAmount)) {
              updatedGoals = updatedGoals.map(goal => {
                if (goal.type !== 'spending' || !goal.category) {
                  return goal;
                }

                // Subtract original transaction amount if category matches
                if (goal.category.toLowerCase() === originalCategoryName) {
                  return {
                    ...goal,
                    current: Math.max(0, (goal.current || 0) - originalAmount),
                    lastUpdated: new Date().toISOString(),
                  };
                }
                return goal;
              });
            }
          }
        }

        // Now add the new/updated transaction amount
        const transactionCategory = categories.find(
          cat => cat.id === transaction.category,
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
                return {
                  ...goal,
                  current: (goal.current || 0) + transactionAmount,
                  lastUpdated: new Date().toISOString(),
                };
              }
              return goal;
            });
          }
        }

        const saveResult = await saveGoalsToStorage(updatedGoals);

        if (saveResult.success) {
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
    [saveGoalsToStorage],
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

        const saveResult = await saveGoalsToStorage(updatedGoals);

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
    [goals, saveGoalsToStorage],
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

  // Get smart goal suggestions based on spending patterns
  const getSmartSuggestions = useCallback(
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
        const suggestions = [];

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
            suggestions.push({
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
            suggestions.push({
              type: 'savings',
              title: 'Vacation Fund',
              target: 2000,
              reason: 'Build memories with a getaway',
              priority: 'medium',
              category: 'Travel',
              suggestedContribution: Math.min(availableForGoals * 0.15, 300),
            });
          }
        }

        return suggestions;
      } catch (error) {
        console.error('Error generating smart suggestions:', error);
        return [];
      }
    },
    [goals],
  );

  // Utility to check if goals are loaded
  const isInitiallyLoaded = useCallback(() => {
    return hasInitiallyLoaded.current;
  }, []);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      clearLoadingTimeout();
    };
  }, [clearLoadingTimeout]);

  return {
    // State
    goals,
    loading,
    editingGoal,

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

    // Calculated values
    getBalanceCardGoals,
    calculateTotalGoalContributions,
    getGoalProgress,
    isGoalOverdue,
    getSmartSuggestions,

    // Utilities
    isInitiallyLoaded,
  };
};

export default useGoals;

import {useState, useCallback, useRef, useLayoutEffect, useEffect} from 'react';
import {StorageCoordinator} from '../services/storage/StorageCoordinator';

const LOADING_TIMEOUT = 10000;

const useGoals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isStorageReady, setIsStorageReady] = useState(false);

  const hasInitiallyLoaded = useRef(false);
  const isLoadingRef = useRef(false);
  const loadingTimeoutRef = useRef(null);

  const storageCoordinator = StorageCoordinator.getInstance();
  const userStorageManager = storageCoordinator.getUserStorageManager();

  useEffect(() => {
    const checkStorageReady = () => {
      const isReady =
        storageCoordinator.isUserStorageInitialized() && userStorageManager;
      setIsStorageReady(isReady);
    };

    checkStorageReady();
    const interval = setInterval(checkStorageReady, 1000);

    return () => clearInterval(interval);
  }, [storageCoordinator, userStorageManager]);

  useEffect(() => {
    if (isStorageReady) {
      loadGoals();
    }
  }, [isStorageReady, loadGoals]);

  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  const setLoadingWithTimeout = useCallback(
    isLoading => {
      clearLoadingTimeout();
      setLoading(isLoading);

      if (isLoading) {
        loadingTimeoutRef.current = setTimeout(() => {
          setLoading(false);
          isLoadingRef.current = false;
        }, LOADING_TIMEOUT);
      }
    },
    [clearLoadingTimeout],
  );

  const validateGoalData = useCallback(goal => {
    if (!goal || typeof goal !== 'object') {
      return false;
    }

    if (!goal.title || typeof goal.title !== 'string') {
      return false;
    }
    if (!goal.type || !['savings', 'spending', 'debt'].includes(goal.type)) {
      return false;
    }

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

  const sanitizeGoalData = useCallback(goal => {
    const sanitized = {
      showOnBalanceCard: false,
      priority: 'medium',
      current: 0,
      autoContribute: 0,
      isActive: true,
      ...goal,
    };

    sanitized.current = Number(sanitized.current) || 0;
    if (sanitized.target) {
      sanitized.target = Number(sanitized.target);
    }
    if (sanitized.originalAmount) {
      sanitized.originalAmount = Number(sanitized.originalAmount);
    }
    sanitized.autoContribute = Number(sanitized.autoContribute) || 0;

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

  const saveGoalsToStorage = useCallback(
    async updatedGoals => {
      if (!isStorageReady || !userStorageManager) {
        return {success: false, error: 'User storage not ready'};
      }

      try {
        if (!Array.isArray(updatedGoals)) {
          throw new Error('Goals must be an array');
        }

        const validGoals = updatedGoals.filter(goal => validateGoalData(goal));

        const success = await userStorageManager.setUserData(
          'goals',
          validGoals,
        );
        if (!success) {
          throw new Error('Failed to save goals to user storage');
        }

        return {success: true, goals: validGoals};
      } catch (error) {
        return {success: false, error: error.message};
      }
    },
    [validateGoalData, isStorageReady, userStorageManager],
  );

  const loadGoals = useCallback(
    async (forceLoading = false) => {
      if (isLoadingRef.current) {
        return {success: true, goals};
      }

      if (!isStorageReady || !userStorageManager) {
        setGoals([]);
        return {success: false, error: 'Storage not ready'};
      }

      try {
        isLoadingRef.current = true;

        if (
          (!hasInitiallyLoaded.current || forceLoading) &&
          goals.length === 0
        ) {
          setLoadingWithTimeout(true);
        }

        const storedGoals = await userStorageManager.getUserData('goals');

        if (storedGoals && Array.isArray(storedGoals)) {
          const validatedGoals = storedGoals
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
      isStorageReady,
      userStorageManager,
    ],
  );

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
        return {success: false, error: error.message};
      }
    },
    [goals, saveGoalsToStorage],
  );

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
        return {success: false, error: error.message};
      }
    },
    [goals, saveGoalsToStorage],
  );

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
            newCurrent = Math.max(0, newCurrent - parsedAmount);
          } else {
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
        return {success: false, error: error.message};
      }
    },
    [goals, saveGoalsToStorage],
  );

  const updateSpendingGoals = useCallback(
    async (newTransaction = null, originalTransaction = null) => {
      if (!isStorageReady || !userStorageManager) {
        return {success: false, error: 'Storage not ready'};
      }

      try {
        if (!newTransaction && !originalTransaction) {
          return {success: true};
        }

        let categoryService;
        try {
          categoryService = require('../services/categoryService').default;
        } catch (error) {
          return {success: true};
        }

        const categories = await categoryService.getCategories();
        if (!Array.isArray(categories)) {
          throw new Error('Invalid categories data');
        }

        const storedGoals = await userStorageManager.getUserData('goals');
        const freshGoals =
          storedGoals && Array.isArray(storedGoals) ? storedGoals : [];

        if (!Array.isArray(freshGoals)) {
          throw new Error('Invalid stored goals data');
        }

        let updatedGoals = [...freshGoals];

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

        if (newTransaction && newTransaction.category) {
          const newTransactionAmount = Number(newTransaction.amount);
          if (isNaN(newTransactionAmount) || newTransactionAmount <= 0) {
          } else {
            const transactionCategory = categories.find(
              cat => cat.id === newTransaction.category,
            );
            const transactionCategoryName =
              transactionCategory?.name?.toLowerCase();

            if (transactionCategoryName) {
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
        return {success: false, error: error.message};
      }
    },
    [saveGoalsToStorage, isStorageReady, userStorageManager],
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
        return {success: false, error: error.message};
      }
    },
    [goals, saveGoalsToStorage],
  );

  const prepareEditGoal = useCallback(goal => {
    try {
      if (!goal || !goal.id) {
        throw new Error('Invalid goal provided for editing');
      }

      setEditingGoal(goal);
      return {success: true, goal};
    } catch (error) {
      return {success: false, error: error.message};
    }
  }, []);

  const clearEditingGoal = useCallback(() => {
    setEditingGoal(null);
  }, []);

  const getBalanceCardGoals = useCallback(() => {
    try {
      return goals.filter(
        goal =>
          goal && goal.showOnBalanceCard === true && goal.isActive !== false,
      );
    } catch (error) {
      return [];
    }
  }, [goals]);

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
      return 0;
    }
  }, [goals]);

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

      return Math.max(0, progress);
    } catch (error) {
      return 0;
    }
  }, []);

  const isGoalOverdue = useCallback(
    goal => {
      try {
        if (!goal || !goal.deadline) {
          return false;
        }

        const today = new Date();
        const deadline = new Date(goal.deadline);

        if (isNaN(deadline.getTime())) {
          return false;
        }

        return today > deadline && getGoalProgress(goal) < 100;
      } catch (error) {
        return false;
      }
    },
    [getGoalProgress],
  );

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
        return [];
      }
    },
    [goals],
  );

  const isInitiallyLoaded = useCallback(() => {
    return hasInitiallyLoaded.current;
  }, []);

  useLayoutEffect(() => {
    return () => {
      clearLoadingTimeout();
    };
  }, [clearLoadingTimeout]);

  return {
    goals,
    loading,
    editingGoal,
    isStorageReady,
    loadGoals,
    saveGoal,
    deleteGoal,
    prepareEditGoal,
    clearEditingGoal,
    toggleGoalBalanceDisplay,
    updateGoalProgress,
    updateSpendingGoals,
    completeGoal,
    getBalanceCardGoals,
    calculateTotalGoalContributions,
    getGoalProgress,
    isGoalOverdue,
    getSmartSuggestions,
    isInitiallyLoaded,
  };
};

export default useGoals;

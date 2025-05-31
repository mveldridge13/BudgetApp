// hooks/useGoals.js
import {useState, useCallback, useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useGoals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false); // Start as false
  const [editingGoal, setEditingGoal] = useState(null);
  const [processedTransactions, setProcessedTransactions] = useState(new Set());

  // Track if we've done the initial load
  const hasInitiallyLoaded = useRef(false);
  const isLoadingRef = useRef(false);

  // Load goals from AsyncStorage
  const loadGoals = useCallback(
    async (forceLoading = false) => {
      // Prevent multiple simultaneous loads
      if (isLoadingRef.current) {
        return;
      }

      try {
        isLoadingRef.current = true;

        // Only show loading state on initial load when forced AND we have no existing data
        if (
          (!hasInitiallyLoaded.current || forceLoading) &&
          goals.length === 0
        ) {
          setLoading(true);
        }

        const storedGoals = await AsyncStorage.getItem('goals');

        if (storedGoals) {
          const parsedGoals = JSON.parse(storedGoals);
          // Ensure all goals have required properties
          const validatedGoals = parsedGoals.map(goal => ({
            showOnBalanceCard: false,
            priority: 'medium',
            ...goal,
          }));
          setGoals(validatedGoals);
        } else {
          setGoals([]);
        }

        hasInitiallyLoaded.current = true;
      } catch (error) {
        console.error('Error loading goals:', error);
        setGoals([]);
      } finally {
        isLoadingRef.current = false;
        if (hasInitiallyLoaded.current) {
          setLoading(false);
        }
      }
    },
    [goals.length],
  );

  // Save goals to AsyncStorage
  const saveGoalsToStorage = useCallback(async updatedGoals => {
    try {
      const jsonString = JSON.stringify(updatedGoals);
      await AsyncStorage.setItem('goals', jsonString);
      return true;
    } catch (error) {
      console.error('Error saving goals to AsyncStorage:', error);
      return false;
    }
  }, []);

  // Save or update a goal
  const saveGoal = useCallback(
    async goalData => {
      try {
        const currentGoals = [...goals];
        let updatedGoals;
        let isNewGoal = false;

        if (editingGoal) {
          // Update existing goal
          updatedGoals = currentGoals.map(goal =>
            goal.id === editingGoal.id ? {...goal, ...goalData} : goal,
          );
        } else {
          // Create new goal
          isNewGoal = true;
          const newGoal = {
            id: Date.now().toString(),
            createdDate: new Date().toISOString(),
            showOnBalanceCard: false,
            priority: 'medium',
            ...goalData,
          };
          updatedGoals = [...currentGoals, newGoal];
        }

        const saved = await saveGoalsToStorage(updatedGoals);

        if (saved) {
          setGoals(updatedGoals);
          setEditingGoal(null);
          return {success: true, updatedGoals, isNewGoal};
        } else {
          return {success: false, error: 'Failed to save goal to storage'};
        }
      } catch (error) {
        console.error('Error saving goal:', error);
        return {success: false, error: error.message};
      }
    },
    [goals, editingGoal, saveGoalsToStorage],
  );

  // Delete a goal
  const deleteGoal = useCallback(
    async goalId => {
      try {
        const updatedGoals = goals.filter(goal => goal.id !== goalId);
        const saved = await saveGoalsToStorage(updatedGoals);

        if (saved) {
          setGoals(updatedGoals);
          return {success: true};
        }
        return {success: false, error: 'Failed to delete goal'};
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
        const updatedGoals = goals.map(goal =>
          goal.id === goalId
            ? {...goal, showOnBalanceCard: !goal.showOnBalanceCard}
            : goal,
        );
        const saved = await saveGoalsToStorage(updatedGoals);

        if (saved) {
          setGoals(updatedGoals);
          return {success: true};
        }
        return {success: false, error: 'Failed to update goal'};
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
        const updatedGoals = goals.map(goal => {
          if (goal.id !== goalId) {
            return goal;
          }

          let newCurrent = goal.current;
          if (goal.type === 'debt') {
            // For debt, subtract the payment amount
            newCurrent = Math.max(0, goal.current - amount);
          } else {
            // For savings, add the contribution
            newCurrent = goal.current + amount;
          }

          return {
            ...goal,
            current: newCurrent,
            lastUpdated: new Date().toISOString(),
          };
        });

        const saved = await saveGoalsToStorage(updatedGoals);
        if (saved) {
          setGoals(updatedGoals);
          return {success: true};
        }
        return {success: false, error: 'Failed to update goal progress'};
      } catch (error) {
        console.error('Error updating goal progress:', error);
        return {success: false, error: error.message};
      }
    },
    [goals, saveGoalsToStorage],
  );

  // Update spending goals based on transactions
  const updateSpendingGoals = useCallback(
    async transaction => {
      try {
        // Prevent processing the same transaction multiple times
        const transactionKey = `${transaction.id}_${transaction.date}_${transaction.amount}`;

        if (processedTransactions.has(transactionKey)) {
          return {success: true};
        }

        const currentDate = new Date();
        const transactionDate = new Date(transaction.date);

        // Only update if transaction is in current month
        if (
          currentDate.getMonth() !== transactionDate.getMonth() ||
          currentDate.getFullYear() !== transactionDate.getFullYear()
        ) {
          return {success: true}; // Not current month, no update needed
        }

        // Check if any spending goals need updating
        const relevantGoals = goals.filter(
          goal =>
            goal.type === 'spending' &&
            goal.isMonthly &&
            goal.category.toLowerCase() === transaction.category?.toLowerCase(),
        );

        if (relevantGoals.length === 0) {
          return {success: true};
        }

        const updatedGoals = goals.map(goal => {
          if (goal.type !== 'spending' || !goal.isMonthly) {
            return goal;
          }

          // Check if transaction category matches goal category
          if (
            goal.category.toLowerCase() === transaction.category?.toLowerCase()
          ) {
            return {
              ...goal,
              current: goal.current + transaction.amount,
              lastUpdated: new Date().toISOString(),
            };
          }
          return goal;
        });

        const saved = await saveGoalsToStorage(updatedGoals);
        if (saved) {
          setGoals(updatedGoals);
          // Mark transaction as processed
          setProcessedTransactions(prev => new Set([...prev, transactionKey]));
          return {success: true};
        }
        return {success: false, error: 'Failed to update spending goals'};
      } catch (error) {
        console.error('Error updating spending goals:', error);
        return {success: false, error: error.message};
      }
    },
    [goals, processedTransactions, saveGoalsToStorage],
  );

  // Prepare goal for editing
  const prepareEditGoal = useCallback(async goal => {
    try {
      setEditingGoal(goal);
      return goal;
    } catch (error) {
      console.error('Error preparing goal for edit:', error);
      return null;
    }
  }, []);

  // Clear editing state
  const clearEditingGoal = useCallback(() => {
    setEditingGoal(null);
  }, []);

  // Get goals for balance card display - memoized calculation
  const getBalanceCardGoals = useCallback(() => {
    return goals.filter(
      goal => goal.showOnBalanceCard && goal.isActive !== false,
    );
  }, [goals]);

  // Calculate total monthly goal contributions - memoized calculation
  const calculateTotalGoalContributions = useCallback(() => {
    return goals
      .filter(goal => goal.showOnBalanceCard && goal.autoContribute)
      .reduce((sum, goal) => sum + (goal.autoContribute || 0), 0);
  }, [goals]);

  // Get goal progress for a specific goal - pure function, no dependencies needed
  const getGoalProgress = useCallback(goal => {
    if (!goal) {
      return 0;
    }

    let progress;
    if (goal.type === 'debt') {
      const paid = (goal.originalAmount || goal.target) - goal.current;
      progress = Math.min(
        (paid / (goal.originalAmount || goal.target)) * 100,
        100,
      );
    } else {
      progress = Math.min((goal.current / goal.target) * 100, 100);
    }
    return Math.max(0, progress); // Ensure no negative progress
  }, []);

  // Check if goal is overdue
  const isGoalOverdue = useCallback(
    goal => {
      if (!goal || !goal.deadline) {
        return false;
      }
      const today = new Date();
      const deadline = new Date(goal.deadline);
      return today > deadline && getGoalProgress(goal) < 100;
    },
    [getGoalProgress],
  );

  // Get smart goal suggestions based on spending patterns - memoized
  const getSmartSuggestions = useCallback(
    (transactions = [], incomeData = null) => {
      if (!incomeData || transactions.length === 0) {
        return [];
      }

      const monthlyIncome = incomeData.income || 0;
      const last30DaysTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        return transactionDate >= cutoffDate;
      });

      const monthlySpending = last30DaysTransactions.reduce(
        (sum, t) => sum + Math.abs(t.amount || 0),
        0,
      );
      const availableForGoals = monthlyIncome - monthlySpending;

      const suggestions = [];

      // Emergency fund suggestion (3 months of expenses)
      if (monthlySpending > 0) {
        const emergencyTarget = Math.round(monthlySpending * 3);
        const existingEmergencyGoal = goals.find(
          goal =>
            goal.type === 'savings' &&
            (goal.title?.toLowerCase().includes('emergency') ||
              goal.category?.toLowerCase().includes('emergency')),
        );

        if (
          !existingEmergencyGoal ||
          existingEmergencyGoal.current < emergencyTarget
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
            goal.category?.toLowerCase().includes('travel') ||
            goal.title?.toLowerCase().includes('vacation'),
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
    },
    [goals],
  );

  // Mark goal as completed
  const completeGoal = useCallback(
    async goalId => {
      try {
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

        const saved = await saveGoalsToStorage(updatedGoals);
        if (saved) {
          setGoals(updatedGoals);
          return {success: true};
        }
        return {success: false, error: 'Failed to complete goal'};
      } catch (error) {
        console.error('Error completing goal:', error);
        return {success: false, error: error.message};
      }
    },
    [goals, saveGoalsToStorage],
  );

  // Clear processed transactions (call this daily/weekly to prevent memory issues)
  const clearProcessedTransactions = useCallback(() => {
    setProcessedTransactions(new Set());
  }, []);

  // Utility to check if goals are loaded
  const isInitiallyLoaded = useCallback(() => {
    return hasInitiallyLoaded.current;
  }, []);

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
    clearProcessedTransactions,
    isInitiallyLoaded,
  };
};

export default useGoals;

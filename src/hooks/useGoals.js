// hooks/useGoals.js
import {useState, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useGoals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState(null);
  const [processedTransactions, setProcessedTransactions] = useState(new Set());

  // Load goals from AsyncStorage
  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
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
    } catch (error) {
      console.error('Error loading goals:', error);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save goals to AsyncStorage
  const saveGoalsToStorage = async updatedGoals => {
    try {
      const jsonString = JSON.stringify(updatedGoals);
      await AsyncStorage.setItem('goals', jsonString);
      return true;
    } catch (error) {
      console.error('Error saving goals to AsyncStorage:', error);
      return false;
    }
  };

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
    [goals, editingGoal],
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
    [goals],
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
    [goals],
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
    [goals],
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
    [goals, processedTransactions],
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

  // Get goals for balance card display
  const getBalanceCardGoals = useCallback(() => {
    return goals.filter(
      goal => goal.showOnBalanceCard && goal.isActive !== false,
    );
  }, [goals]);

  // Calculate total monthly goal contributions
  const calculateTotalGoalContributions = useCallback(() => {
    return goals
      .filter(goal => goal.showOnBalanceCard && goal.autoContribute)
      .reduce((sum, goal) => sum + (goal.autoContribute || 0), 0);
  }, [goals]);

  // Get goal progress for a specific goal
  const getGoalProgress = useCallback(goal => {
    let progress;
    if (goal.type === 'debt') {
      const paid = goal.originalAmount - goal.current;
      progress = Math.min((paid / goal.originalAmount) * 100, 100);
    } else {
      progress = Math.min((goal.current / goal.target) * 100, 100);
    }
    return progress;
  }, []);

  // Check if goal is overdue
  const isGoalOverdue = useCallback(
    goal => {
      if (!goal.deadline) {
        return false;
      }
      const today = new Date();
      const deadline = new Date(goal.deadline);
      return today > deadline && getGoalProgress(goal) < 100;
    },
    [getGoalProgress],
  );

  // Get smart goal suggestions based on spending patterns
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
        (sum, t) => sum + t.amount,
        0,
      );
      const availableForGoals = monthlyIncome - monthlySpending;

      const suggestions = [];

      // Emergency fund suggestion (3 months of expenses)
      if (monthlySpending > 0) {
        suggestions.push({
          type: 'savings',
          title: '3-Month Emergency Fund',
          target: Math.round(monthlySpending * 3),
          reason: 'Recommended based on your monthly spending',
          priority: 'high',
          category: 'Security',
          suggestedContribution: Math.min(
            availableForGoals * 0.2,
            monthlySpending * 0.1,
          ),
        });
      }

      // Vacation fund suggestion
      if (availableForGoals > 200) {
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

      return suggestions;
    },
    [],
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
    [goals],
  );

  // Clear processed transactions (call this daily/weekly to prevent memory issues)
  const clearProcessedTransactions = useCallback(() => {
    setProcessedTransactions(new Set());
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
  };
};

export default useGoals;

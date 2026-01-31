import {useEffect, useState} from 'react';
import {goalService} from '@/services/goal.service';
import {transactionService} from '@/services/transaction.service';
import {userService} from '@/services/user.service';
import {Goal, Transaction} from '@/types';

interface DashboardData {
  balance: number;
  leftToSpend: number;
  totalExpenses: number;
  committedExpenses: number;
  discretionaryExpenses: number;
  activeGoal: Goal | null;
  totalSavings: number;
  activeGoalsCount: number;
  completedGoalsCount: number;
  goals: Goal[];
  isLoading: boolean;
  error: Error | null;
}

export function useDashboardData(): DashboardData {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [balance, setBalance] = useState(0);
  const [leftToSpend, setLeftToSpend] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [committedExpenses, setCommittedExpenses] = useState(0);
  const [discretionaryExpenses, setDiscretionaryExpenses] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch income, rollover, goals and transactions in parallel
        const [incomeData, rolloverData, goalsData, transactions] =
          await Promise.all([
            userService.getIncome(),
            userService.getRollover().catch(() => ({
              isEnabled: false,
              rolloverAmount: 0,
            })),
            goalService.getGoals(),
            transactionService.getTransactions(), // Fetch all transactions for breakdown
          ]);

        // Calculate balance: income + rollover (matching mobile app line 228)
        const income = (incomeData as {income?: number}).income || 0;
        const rollover =
          (rolloverData as {rolloverAmount?: number}).rolloverAmount || 0;
        const calculatedBalance = income + rollover;
        setBalance(calculatedBalance);

        // Handle response that wraps goals in an object
        const goalsArray = Array.isArray(goalsData)
          ? goalsData
          : (goalsData as {goals?: Goal[]}).goals || [];

        setGoals(goalsArray);

        // Calculate committed (recurring) vs discretionary (one-time) from transactions
        const {committed, discretionary} =
          calculateCommittedVsDiscretionary(transactions);

        const total = committed + discretionary;
        setCommittedExpenses(committed);
        setDiscretionaryExpenses(discretionary);
        setTotalExpenses(total);

        // Calculate left to spend: balance - total expenses (matching mobile app line 229)
        const calculatedLeftToSpend = calculatedBalance - total;
        setLeftToSpend(calculatedLeftToSpend);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to fetch dashboard data'),
        );
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Calculate total savings
  const totalSavings = calculateTotalSavings(goals);

  // Calculate active goals count
  const activeGoalsCount = calculateActiveGoalsCount(goals);

  // Calculate completed goals count
  const completedGoalsCount = calculateCompletedGoalsCount(goals);

  // Get the first active goal for display
  const activeGoal =
    goals.find(goal =>
      goal.status ? goal.status === 'ACTIVE' : goal.isActive,
    ) || null;

  return {
    balance,
    leftToSpend,
    totalExpenses,
    committedExpenses,
    discretionaryExpenses,
    activeGoal,
    totalSavings,
    activeGoalsCount,
    completedGoalsCount,
    goals,
    isLoading,
    error,
  };
}

// Business logic functions
function calculateTotalSavings(goals: Goal[]): number {
  const goalsArray = Array.isArray(goals) ? goals : [];
  return goalsArray.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);
}

function calculateActiveGoalsCount(goals: Goal[]): number {
  const goalsArray = Array.isArray(goals) ? goals : [];
  return goalsArray.filter(goal => {
    return goal.status ? goal.status === 'ACTIVE' : goal.isActive;
  }).length;
}

function calculateCompletedGoalsCount(goals: Goal[]): number {
  const goalsArray = Array.isArray(goals) ? goals : [];
  return goalsArray.filter(goal => {
    return goal.status === 'COMPLETED';
  }).length;
}

function calculateCommittedVsDiscretionary(transactions: Transaction[]): {
  committed: number;
  discretionary: number;
} {
  let committed = 0;
  let discretionary = 0;

  transactions.forEach(transaction => {
    const amount = Math.abs(transaction.amount);
    const recurrence =
      transaction.recurrence ||
      (transaction.isRecurring ? transaction.recurringPattern?.type : 'none');

    // Recurring transactions are committed, one-time are discretionary
    if (recurrence && recurrence !== 'none') {
      committed += amount;
    } else {
      discretionary += amount;
    }
  });

  return {committed, discretionary};
}

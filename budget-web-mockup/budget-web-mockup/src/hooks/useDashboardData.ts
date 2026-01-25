import {useEffect, useState} from 'react';
import {goalService} from '@/services/goal.service';
import {transactionService} from '@/services/transaction.service';
import {userService} from '@/services/user.service';
import {Goal} from '@/types';

interface DashboardData {
  balance: number;
  leftToSpend: number;
  totalExpenses: number;
  committedExpenses: number;
  discretionaryExpenses: number;
  activeGoal: Goal | null;
  totalSavings: number;
  activeGoalsCount: number;
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

        // Fetch income, rollover, goals and transaction summary in parallel
        const [incomeData, rolloverData, goalsData, summaryData] =
          await Promise.all([
            userService.getIncome(),
            userService.getRollover().catch(() => ({
              isEnabled: false,
              rolloverAmount: 0,
            })),
            goalService.getGoals(),
            transactionService.getSummary(), // Use summary endpoint instead
          ]);

        // Calculate balance: income + rollover (matching mobile app line 228)
        const income = (incomeData as {income?: number}).income || 0;
        const rollover = (rolloverData as {rolloverAmount?: number}).rolloverAmount || 0;
        const calculatedBalance = income + rollover;
        setBalance(calculatedBalance);

        // Handle response that wraps goals in an object
        const goalsArray = Array.isArray(goalsData)
          ? goalsData
          : (goalsData as {goals?: Goal[]}).goals || [];

        setGoals(goalsArray);

        // Use summary data for total expenses (should be filtered by pay period on backend)
        const total = summaryData.totalExpenses || 0;

        // For now, set committed and discretionary to 0 until backend provides breakdown
        // The mobile app calculates this client-side - we'll do the same later if needed
        setCommittedExpenses(0);
        setDiscretionaryExpenses(total); // Treat all as discretionary for now
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

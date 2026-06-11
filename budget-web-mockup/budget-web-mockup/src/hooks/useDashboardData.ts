import {useEffect, useState, useCallback} from 'react';
import {goalService} from '@/services/goal.service';
import {userService, HomeSummaryResponse} from '@/services/user.service';
import {GoalDisplay} from '@/types';

interface DashboardData {
  balance: number;
  leftToSpend: number;
  totalExpenses: number;
  committedExpenses: number;
  discretionaryExpenses: number;
  goalsExpenses: number;
  activeGoal: GoalDisplay | null;
  totalSavings: number;
  activeGoalsCount: number;
  completedGoalsCount: number;
  goals: GoalDisplay[];
  homeSummary: HomeSummaryResponse | null;
  rolloverAmount: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useDashboardData(): DashboardData {
  const [goals, setGoals] = useState<GoalDisplay[]>([]);
  const [homeSummary, setHomeSummary] = useState<HomeSummaryResponse | null>(
    null,
  );
  const [balance, setBalance] = useState(0);
  const [leftToSpend, setLeftToSpend] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [committedExpenses, setCommittedExpenses] = useState(0);
  const [discretionaryExpenses, setDiscretionaryExpenses] = useState(0);
  const [goalsExpenses, setGoalsExpenses] = useState(0);
  const [rolloverAmount, setRolloverAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch home summary and goals in parallel
      const [summary, goalsData] = await Promise.all([
        userService.getHomeSummary(),
        goalService.getGoals(),
      ]);

      setHomeSummary(summary);

      // Use backend-calculated values (single source of truth)
      setBalance(summary.income.totalInflow);
      setLeftToSpend(summary.totals.leftToSpendSafe);
      setTotalExpenses(summary.totals.totalExpensesAllocated);
      setCommittedExpenses(summary.outflows.committed.plannedTotal);
      setDiscretionaryExpenses(summary.outflows.discretionary.spentSoFar);
      setGoalsExpenses(summary.outflows.goals.paidSoFar);
      setRolloverAmount(summary.income.rolloverAvailable || 0);

      // Handle response that wraps goals in an object
      const goalsArray = Array.isArray(goalsData)
        ? goalsData
        : (goalsData as {goals?: GoalDisplay[]}).goals || [];

      setGoals(goalsArray);
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
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Calculate total savings from goals
  const totalSavings = goals.reduce(
    (sum, goal) => sum + (goal.current || 0),
    0,
  );

  // Calculate active/completed goals count
  const activeGoalsCount = goals.filter(goal => goal.isActive).length;
  const completedGoalsCount = goals.filter(goal => !goal.isActive).length;

  // Get the first active goal for display
  const activeGoal = goals.find(goal => goal.isActive) || null;

  return {
    balance,
    leftToSpend,
    totalExpenses,
    committedExpenses,
    discretionaryExpenses,
    goalsExpenses,
    activeGoal,
    totalSavings,
    activeGoalsCount,
    completedGoalsCount,
    goals,
    homeSummary,
    rolloverAmount,
    isLoading,
    error,
    refresh: fetchDashboardData,
  };
}

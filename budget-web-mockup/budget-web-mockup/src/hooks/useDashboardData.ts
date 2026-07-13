import useSWR from 'swr';
import {goalService} from '@/services/goal.service';
import {userService, HomeSummaryResponse, CommittedItem, AccountInfo} from '@/services/user.service';
import {GoalDisplay} from '@/types';

interface DashboardData {
  balance: number;
  leftToSpend: number;
  totalExpenses: number;
  committedExpenses: number;
  committedItems: CommittedItem[];
  discretionaryExpenses: number;
  goalsExpenses: number;
  activeGoal: GoalDisplay | null;
  totalSavings: number;
  activeGoalsCount: number;
  completedGoalsCount: number;
  goals: GoalDisplay[];
  homeSummary: HomeSummaryResponse | null;
  rolloverAmount: number;
  rolloverNotification: HomeSummaryResponse['rolloverNotification'];
  baseIncome: number;
  incomeSources: {id: string; name: string; amount: number}[];
  accounts: AccountInfo[];
  daysRemaining: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

interface DashboardPayload {
  summary: HomeSummaryResponse;
  goals: GoalDisplay[];
}

// Fetch home summary and goals in parallel — the backend is the single source
// of truth for all the dashboard figures.
async function fetchDashboard(): Promise<DashboardPayload> {
  const [summary, goalsData] = await Promise.all([
    userService.getHomeSummary(),
    goalService.getGoals(),
  ]);

  // Handle responses that wrap goals in an object.
  const goals = Array.isArray(goalsData)
    ? goalsData
    : (goalsData as {goals?: GoalDisplay[]}).goals || [];

  return {summary, goals};
}

export function useDashboardData(): DashboardData {
  // SWR caches by key, so navigating away and back renders instantly from
  // cache while it revalidates in the background. revalidateOnFocus (default)
  // replaces the old manual focus/visibility refetch listener, keeping the
  // backend as the single source of truth across tabs/devices.
  const {data, error, isLoading, mutate} = useSWR<DashboardPayload>(
    'dashboard-summary',
    fetchDashboard,
    {keepPreviousData: true},
  );

  const summary = data?.summary ?? null;
  const goals = data?.goals ?? [];

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
    // Use backend-calculated values (single source of truth)
    balance: summary?.income.totalInflow ?? 0,
    leftToSpend: summary?.totals.leftToSpendSafe ?? 0,
    totalExpenses: summary?.totals.totalExpensesAllocated ?? 0,
    committedExpenses: summary?.outflows.committed.plannedTotal ?? 0,
    committedItems: summary?.outflows.committed.items ?? [],
    discretionaryExpenses: summary?.outflows.discretionary.spentSoFar ?? 0,
    goalsExpenses: summary?.outflows.goals.paidSoFar ?? 0,
    activeGoal,
    totalSavings,
    activeGoalsCount,
    completedGoalsCount,
    goals,
    homeSummary: summary,
    rolloverAmount: summary?.income.rolloverAvailable ?? 0,
    rolloverNotification: summary?.rolloverNotification ?? null,
    baseIncome: summary?.income.baseIncome ?? 0,
    incomeSources: summary?.income.sources ?? [],
    accounts: summary?.accounts ?? [],
    daysRemaining: summary?.period.daysRemaining ?? 0,
    isLoading,
    error: error instanceof Error ? error : error ? new Error('Failed to fetch dashboard data') : null,
    refresh: async () => {
      await mutate();
    },
  };
}

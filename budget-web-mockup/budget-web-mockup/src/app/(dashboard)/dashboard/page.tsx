'use client';

import { BalanceCard, ActiveGoalCard, GoalDistribution, OverallProgress, DebtProgress } from '@/components/dashboard';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function DashboardPage() {
  const {
    balance,
    leftToSpend,
    totalExpenses,
    committedExpenses,
    discretionaryExpenses,
    activeGoalsCount,
    completedGoalsCount,
    goals,
    isLoading,
  } = useDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-2">Your financial overview at a glance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance Card */}
        <BalanceCard
          balance={balance}
          leftToSpend={leftToSpend}
          totalExpenses={totalExpenses}
          committedExpenses={committedExpenses}
          discretionaryExpenses={discretionaryExpenses}
          isLoading={isLoading}
        />

        {/* Goals Overview Card */}
        <ActiveGoalCard
          activeGoalsCount={activeGoalsCount}
          completedGoalsCount={completedGoalsCount}
          isLoading={isLoading}
        />
      </div>

      {/* Second Row - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Goal Distribution Card */}
        <GoalDistribution goals={goals} isLoading={isLoading} />

        {/* Overall Progress Card */}
        <OverallProgress goals={goals} isLoading={isLoading} />

        {/* Debt Progress Card */}
        <DebtProgress goals={goals} isLoading={isLoading} />
      </div>
    </div>
  );
}

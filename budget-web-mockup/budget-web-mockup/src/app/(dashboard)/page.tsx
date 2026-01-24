'use client';

import { BalanceCard, ActiveGoalCard } from '@/components/dashboard';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function DashboardPage() {
  const {
    balance,
    leftToSpend,
    totalExpenses,
    committedExpenses,
    discretionaryExpenses,
    activeGoal,
    isLoading,
  } = useDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Your financial overview at a glance</p>
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

        {/* Active Goal Card */}
        <ActiveGoalCard goal={activeGoal} isLoading={isLoading} />
      </div>
    </div>
  );
}

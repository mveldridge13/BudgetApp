'use client';

import { useState } from 'react';
import { BalanceCard, CashFlowCard, GoalDistribution, OverallProgress, DebtProgress, RecentTransactions } from '@/components/dashboard';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuth } from '@/contexts/AuthContext';
import GoalAllocationModal from '@/components/goals/GoalAllocationModal';
import { goalService } from '@/services/goal.service';
import { userService } from '@/services/user.service';

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    balance,
    leftToSpend,
    totalExpenses,
    committedExpenses,
    discretionaryExpenses,
    goalsExpenses,
    goals,
    rolloverAmount,
    rolloverNotification,
    baseIncome,
    daysRemaining,
    isLoading,
    refresh,
  } = useDashboardData();

  // Amount offered when allocating from the banner — the notification amount,
  // matching mobile (falls back to spendable rollover if no notification).
  const allocatableRollover = rolloverNotification?.amount ?? rolloverAmount;

  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const currency = user?.currency || 'AUD';

  const handleAllocateRollover = async (allocations: { goalId: string; amount: number }[]) => {
    try {
      await goalService.allocateRolloverToGoals(allocations, 'Rollover allocation');
      setShowAllocationModal(false);
      refresh();
    } catch (error) {
      console.error('Failed to allocate rollover:', error);
      alert('Failed to allocate funds. Please try again.');
    }
  };

  const handleDismissRollover = async () => {
    try {
      await userService.dismissRolloverNotification();
      refresh();
    } catch (error) {
      console.error('Failed to dismiss rollover notification:', error);
    }
  };

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
          goalsExpenses={goalsExpenses}
          isLoading={isLoading}
          currency={currency}
          rolloverAvailable={rolloverAmount}
          baseIncome={baseIncome}
          daysRemaining={daysRemaining}
          rolloverBanner={rolloverNotification}
          onAllocateRollover={() => setShowAllocationModal(true)}
          onDismissRollover={handleDismissRollover}
        />

        {/* Cash Flow Card */}
        <CashFlowCard currency={currency} />
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

      {/* Recent Transactions */}
      <RecentTransactions currency={currency} limit={5} />

      {/* Goal Allocation Modal */}
      <GoalAllocationModal
        visible={showAllocationModal}
        onClose={() => setShowAllocationModal(false)}
        onConfirm={handleAllocateRollover}
        availableAmount={allocatableRollover}
        goals={goals}
      />
    </div>
  );
}

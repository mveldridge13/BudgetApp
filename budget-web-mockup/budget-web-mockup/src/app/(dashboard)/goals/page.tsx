'use client';

import { useState, useEffect, useMemo } from 'react';
import { goalService } from '@/services/goal.service';
import { GoalDisplay } from '@/types';
import { Plus, Target, TrendingDown, DollarSign } from 'lucide-react';
import GoalCard from '@/components/goals/GoalCard';
import AddGoalModal from '@/components/goals/AddGoalModal';
import DebtSimulator from '@/components/goals/DebtSimulator';

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalDisplay | null>(null);
  const [simulatingGoal, setSimulatingGoal] = useState<GoalDisplay | null>(null);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      const data = await goalService.getGoals();
      setGoals(data);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter goals
  const activeGoals = useMemo(
    () => goals.filter((g) => g.isActive && g.type !== 'debt'),
    [goals]
  );

  const debtGoals = useMemo(
    () => goals.filter((g) => g.isActive && g.type === 'debt'),
    [goals]
  );

  const completedGoals = useMemo(
    () => goals.filter((g) => !g.isActive),
    [goals]
  );

  const balanceCardGoals = useMemo(
    () => goalService.getBalanceCardGoals(goals),
    [goals]
  );

  const currentMonthContributions = useMemo(
    () => goalService.calculateTotalGoalContributions(goals),
    [goals]
  );

  // Group active goals by type
  const groupedActiveGoals = useMemo(() => {
    const grouped = {
      spending: activeGoals.filter((g) => g.type === 'spending'),
      savings: activeGoals.filter((g) => g.type === 'savings'),
    };
    return grouped;
  }, [activeGoals]);

  const handleSaveGoal = async (goalData: Partial<GoalDisplay>) => {
    try {
      if (editingGoal) {
        await goalService.updateGoal(editingGoal.id, goalData);
      } else {
        await goalService.createGoal(goalData);
      }
      await loadGoals();
      setShowAddGoal(false);
      setEditingGoal(null);
    } catch (error) {
      console.error('Error saving goal:', error);
      throw error;
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
      try {
        await goalService.deleteGoal(goalId);
        await loadGoals();
      } catch (error) {
        console.error('Error deleting goal:', error);
        alert('Failed to delete goal. Please try again.');
      }
    }
  };

  const handleToggleBalanceDisplay = async (goalId: string) => {
    try {
      const goal = goals.find((g) => g.id === goalId);
      if (goal) {
        await goalService.updateGoal(goalId, {
          ...goal,
          showOnBalanceCard: !goal.showOnBalanceCard,
        });
        await loadGoals();
      }
    } catch (error) {
      console.error('Error toggling balance display:', error);
      alert('Failed to update goal. Please try again.');
    }
  };

  const handleUpdateProgress = async (goalId: string, amount: number, paymentSource: string) => {
    try {
      // Create contribution
      await goalService.addContribution(goalId, {
        amount: Math.abs(amount),
        type: amount < 0 ? 'WITHDRAWAL' : 'MANUAL',
        date: new Date().toISOString(),
        description:
          amount < 0
            ? `Withdrawal from goal`
            : `${paymentSource === 'income' ? 'Income' : 'Manual'} payment`,
      });
      await loadGoals();
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    if (confirm('Mark this goal as completed?')) {
      try {
        const goal = goals.find((g) => g.id === goalId);
        if (goal) {
          await goalService.updateGoal(goalId, {
            ...goal,
            isActive: false,
            completedDate: new Date().toISOString(),
          });
          await loadGoals();
        }
      } catch (error) {
        console.error('Error completing goal:', error);
        alert('Failed to complete goal. Please try again.');
      }
    }
  };

  const handleEditGoal = (goal: GoalDisplay) => {
    setEditingGoal(goal);
    setShowAddGoal(true);
  };

  const handleAddGoal = () => {
    setEditingGoal(null);
    setShowAddGoal(true);
  };

  const handleCloseModal = () => {
    setShowAddGoal(false);
    setEditingGoal(null);
  };

  const handleOpenSimulator = (goal: GoalDisplay) => {
    setSimulatingGoal(goal);
  };

  const handleCloseSimulator = () => {
    setSimulatingGoal(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Goals</h1>
          <p className="text-gray-500 mt-2">Track your financial objectives</p>
        </div>
        <button
          onClick={handleAddGoal}
          className="text-white px-5 py-2.5 rounded-xl font-medium flex items-center space-x-2 transition-all hover:shadow-lg"
          style={{ backgroundColor: '#6366f1', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)' }}
        >
          <Plus className="w-5 h-5" />
          <span>Add Goal</span>
        </button>
      </div>


      {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <p className="text-sm font-medium text-gray-500 mb-1">Active Goals</p>
              <p className="text-3xl font-bold text-gray-900">{activeGoals.length + debtGoals.length}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <p className="text-sm font-medium text-gray-500 mb-1">On Balance Card</p>
              <p className="text-3xl font-bold text-gray-900">{balanceCardGoals.length}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <p className="text-sm font-medium text-gray-500 mb-1">This Month</p>
              <p className="text-3xl font-bold text-gray-900">
                ${currentMonthContributions.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Active Goals - Grouped by Type */}
          {(activeGoals.length > 0 || debtGoals.length > 0) ? (
            <div className="space-y-8">
              {/* Spending Budgets */}
              {groupedActiveGoals.spending.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Spending Budgets</h2>
                    <span className="bg-blue-100 text-blue-600 text-xs font-medium px-2 py-1 rounded-full">
                      {groupedActiveGoals.spending.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedActiveGoals.spending.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onEdit={handleEditGoal}
                        onDelete={handleDeleteGoal}
                        onToggleBalanceDisplay={handleToggleBalanceDisplay}
                        onUpdateProgress={handleUpdateProgress}
                        onComplete={handleCompleteGoal}
                        onOpenSimulator={handleOpenSimulator}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Savings Goals */}
              {groupedActiveGoals.savings.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Savings Goals</h2>
                    <span className="bg-blue-100 text-blue-600 text-xs font-medium px-2 py-1 rounded-full">
                      {groupedActiveGoals.savings.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedActiveGoals.savings.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onEdit={handleEditGoal}
                        onDelete={handleDeleteGoal}
                        onToggleBalanceDisplay={handleToggleBalanceDisplay}
                        onUpdateProgress={handleUpdateProgress}
                        onComplete={handleCompleteGoal}
                        onOpenSimulator={handleOpenSimulator}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Goals Yet</h3>
              <p className="text-gray-500 mb-6">
                Set your first financial goal to start tracking your progress
              </p>
            </div>
          )}

      {/* Debt Goals Section */}
      {debtGoals.length > 0 && (
        <div>
          {debtGoals.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-gray-900">Debt Payments</h2>
                <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-1 rounded-full">
                  {debtGoals.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {debtGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={handleEditGoal}
                    onDelete={handleDeleteGoal}
                    onToggleBalanceDisplay={handleToggleBalanceDisplay}
                    onUpdateProgress={handleUpdateProgress}
                    onComplete={handleCompleteGoal}
                    onOpenSimulator={handleOpenSimulator}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <TrendingDown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Debt Goals</h3>
              <p className="text-gray-500 mb-6">
                Create a debt goal to track loan or credit card payments
              </p>
            </div>
          )}
        </div>
      )}

      {/* Completed Goals Section */}
      {completedGoals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Completed Goals</h2>
            <span className="bg-green-100 text-green-600 text-xs font-medium px-2 py-1 rounded-full">
              {completedGoals.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} isCompleted={true} />
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Goal Modal */}
      <AddGoalModal
        visible={showAddGoal}
        onClose={handleCloseModal}
        onSave={handleSaveGoal}
        editingGoal={editingGoal}
      />

      {/* Debt Simulator */}
      {simulatingGoal && (
        <DebtSimulator
          goal={simulatingGoal}
          visible={true}
          onClose={handleCloseSimulator}
        />
      )}
    </div>
  );
}

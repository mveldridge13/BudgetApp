'use client';

import { useGoals } from '@/hooks/useGoals';
import GoalProgress from '@/components/goals/GoalProgress';
import { Spinner } from '@/components/ui';

export default function GoalsPage() {
  const { goals, summary, isLoading, error, refresh, deleteGoal } = useGoals();

  const handleEdit = (goal: any) => {
    // TODO: Open edit modal
    console.log('Edit goal:', goal);
  };

  const handleDelete = async (goalId: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteGoal(goalId);
        refresh();
      } catch (err) {
        console.error('Failed to delete goal:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Goals</h1>
          <p className="text-gray-500 mt-2">
            Track your financial goals and progress.
          </p>
        </div>
        <button
          className="text-white px-5 py-2.5 rounded-xl font-medium flex items-center space-x-2 transition-all hover:shadow-lg"
          style={{ backgroundColor: '#6366f1', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span>Add Goal</span>
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
            <p className="text-sm font-medium text-gray-500 mb-1">Active Goals</p>
            <p className="text-3xl font-bold text-gray-900">{summary.activeGoals}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
            <p className="text-sm font-medium text-gray-500 mb-1">Completed</p>
            <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{summary.completedGoals}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Saved</p>
            <p className="text-3xl font-bold text-gray-900">
              ${summary.totalCurrentAmount.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
            <p className="text-sm font-medium text-gray-500 mb-1">Overall Progress</p>
            <p className="text-3xl font-bold" style={{ color: '#6366f1' }}>{summary.overallProgress}%</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
          <p>{error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-sm font-medium text-red-500 hover:text-red-400"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading && goals.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <GoalProgress goals={goals} onEdit={handleEdit} onDelete={handleDelete} />
      )}
    </div>
  );
}

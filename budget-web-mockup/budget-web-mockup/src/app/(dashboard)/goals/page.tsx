'use client';

import { useGoals } from '@/hooks/useGoals';
import GoalProgress from '@/components/goals/GoalProgress';
import { Spinner } from '@/components/ui';

export default function GoalsPage() {
  const { goals, summary, isLoading, error, refresh } = useGoals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Goals</h1>
          <p className="text-gray-600 mt-1">
            Track your financial goals and progress.
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors">
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
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Active Goals</p>
            <p className="text-2xl font-bold text-gray-900">{summary.activeGoals}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-green-600">{summary.completedGoals}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Saved</p>
            <p className="text-2xl font-bold text-gray-900">
              ${summary.totalCurrentAmount.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Overall Progress</p>
            <p className="text-2xl font-bold text-blue-600">{summary.overallProgress}%</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p>{error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
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
        <GoalProgress goals={goals} />
      )}
    </div>
  );
}

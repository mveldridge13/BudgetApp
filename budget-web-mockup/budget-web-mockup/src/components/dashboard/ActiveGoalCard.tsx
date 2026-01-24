'use client';

import { formatCurrency } from '@/lib/formatters';
import { Goal } from '@/types';

interface ActiveGoalCardProps {
  goal: Goal | null;
  isLoading: boolean;
}

export default function ActiveGoalCard({ goal, isLoading }: ActiveGoalCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 transition-shadow duration-200 hover:shadow-md">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 transition-shadow duration-200 hover:shadow-md">
        <p className="text-sm font-medium text-gray-500 mb-2">Active Goal</p>
        <p className="text-gray-400">No active goals</p>
      </div>
    );
  }

  const progress = goal.targetAmount > 0
    ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
    : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 transition-shadow duration-200 hover:shadow-md cursor-pointer">
      <p className="text-sm font-medium text-gray-500 mb-1">Active Goal</p>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{goal.name}</h3>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>{formatCurrency(goal.currentAmount)}</span>
          <span>{formatCurrency(goal.targetAmount)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Progress</span>
        <span className="text-sm font-semibold text-gray-900">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

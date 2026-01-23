'use client';

import { Goal } from '@/types';
import { formatCurrency } from '@/lib/formatters';
import { ProgressBar, Badge } from '@/components/ui';

interface GoalProgressProps {
  goals: Goal[];
  onEdit?: (goal: Goal) => void;
  onContribute?: (goal: Goal) => void;
}

export default function GoalProgress({ goals, onEdit, onContribute }: GoalProgressProps) {
  const getProgressPercentage = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getDaysRemaining = (targetDate: string) => {
    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatus = (goal: Goal) => {
    const daysRemaining = getDaysRemaining(goal.targetDate);
    if (daysRemaining < 0) return 'Overdue';
    if (daysRemaining <= 7) return 'Due Soon';
    return 'On Track';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return { bg: 'bg-red-50', text: 'text-red-600' };
      case 'MEDIUM':
        return { bg: 'bg-orange-50', text: 'text-orange-600' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-600' };
    }
  };

  const getProgressColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return '#EF4444';
      case 'MEDIUM':
        return '#F59E0B';
      default:
        return '#10B981';
    }
  };

  if (goals.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <svg
          className="w-12 h-12 text-gray-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
        <p className="text-gray-500">
          Create your first financial goal to start tracking your progress.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {goals.map((goal) => {
        const progress = getProgressPercentage(goal.currentAmount, goal.targetAmount);
        const daysRemaining = getDaysRemaining(goal.targetDate);
        const status = getStatus(goal);
        const priorityColors = getPriorityColor(goal.priority);

        return (
          <div
            key={goal.id}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{goal.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-sm text-gray-600">{goal.category || 'General'}</span>
                  <span className="text-gray-400">•</span>
                  <span
                    className={`text-sm ${
                      status === 'Overdue' ? 'text-red-600' : 'text-gray-600'
                    }`}
                  >
                    {status}
                  </span>
                </div>
              </div>
              <Badge
                variant={goal.priority === 'HIGH' ? 'error' : goal.priority === 'MEDIUM' ? 'warning' : 'default'}
              >
                {goal.priority}
              </Badge>
            </div>

            {goal.description && (
              <p className="text-sm text-gray-500 mb-4">{goal.description}</p>
            )}

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm font-semibold text-gray-900">{progress}%</span>
              </div>

              <ProgressBar
                value={goal.currentAmount}
                max={goal.targetAmount}
                color={getProgressColor(goal.priority)}
              />

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">
                  Current: {formatCurrency(goal.currentAmount)}
                </span>
                <span className="text-gray-600">
                  Target: {formatCurrency(goal.targetAmount)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">
                  {daysRemaining > 0
                    ? `${daysRemaining} days remaining`
                    : `${Math.abs(daysRemaining)} days overdue`}
                </span>
                <span className="text-gray-500">
                  {formatCurrency(goal.targetAmount - goal.currentAmount)} to go
                </span>
              </div>
            </div>

            {/* Actions */}
            {(onEdit || onContribute) && (
              <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-100">
                {onContribute && (
                  <button
                    onClick={() => onContribute(goal)}
                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Add Contribution
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => onEdit(goal)}
                    className="py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

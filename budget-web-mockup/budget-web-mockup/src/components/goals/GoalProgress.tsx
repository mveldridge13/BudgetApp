'use client';

import { Goal } from '@/types';
import { formatCurrency } from '@/lib/formatters';
import { ProgressBar, Badge } from '@/components/ui';

interface GoalProgressProps {
  goals: Goal[];
  onEdit?: (goal: Goal) => void;
  onDelete?: (goalId: string) => void;
}

export default function GoalProgress({ goals, onEdit, onDelete }: GoalProgressProps) {
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

  const getProgressColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return '#F87171';
      case 'MEDIUM':
        return '#F59E0B';
      default:
        return '#10B981';
    }
  };

  if (goals.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
        <svg
          className="w-14 h-14 text-gray-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 tracking-tight">No goals yet</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          Create your first financial goal to start tracking your progress.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {goals.map((goal) => {
        const progress = getProgressPercentage(goal.currentAmount, goal.targetAmount);
        const daysRemaining = getDaysRemaining(goal.targetDate);
        const status = getStatus(goal);

        return (
          <div
            key={goal.id}
            className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-200"
            style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg tracking-tight">{goal.name}</h3>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-sm text-gray-500">{goal.category || 'General'}</span>
                  <span className="text-gray-300">•</span>
                  <span
                    className={`text-sm font-medium ${
                      status === 'Overdue' ? 'text-red-400' : 'text-gray-500'
                    }`}
                  >
                    {status}
                  </span>
                </div>
              </div>
              <Badge
                variant={goal.priority === 'HIGH' ? 'error' : goal.priority === 'MEDIUM' ? 'warning' : 'default'}
              >
                {goal.priority === 'HIGH' ? 'High' : goal.priority === 'MEDIUM' ? 'Medium' : 'Low'}
              </Badge>
            </div>

            {goal.description && (
              <p className="text-sm text-gray-500 mb-5 leading-relaxed">{goal.description}</p>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Progress</span>
                <span className="text-sm font-semibold text-gray-900">{progress}%</span>
              </div>

              <ProgressBar
                value={goal.currentAmount}
                max={goal.targetAmount}
                color={getProgressColor(goal.priority)}
              />

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">
                  Current: <span className="font-semibold text-gray-900">{formatCurrency(goal.currentAmount)}</span>
                </span>
                <span className="text-gray-500">
                  Target: <span className="font-semibold text-gray-900">{formatCurrency(goal.targetAmount)}</span>
                </span>
              </div>

              <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-50">
                <span className="text-gray-500">
                  {daysRemaining > 0
                    ? `${daysRemaining} days remaining`
                    : `${Math.abs(daysRemaining)} days overdue`}
                </span>
                <span className="text-gray-600 font-medium">
                  {formatCurrency(goal.targetAmount - goal.currentAmount)} to go
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 mt-5 pt-5 border-t border-gray-100">
              {onEdit && (
                <button
                  onClick={() => onEdit(goal)}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg transition-all hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(goal.id)}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-red-100 rounded-lg transition-all hover:border-red-200 hover:bg-red-50 text-red-400"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { GoalDisplay } from '@/types';
import { formatCurrency } from '@/lib/formatters';

interface OverallProgressProps {
  goals: GoalDisplay[];
  isLoading: boolean;
}

export default function OverallProgress({ goals, isLoading }: OverallProgressProps) {
  // Only count active savings goals
  const savingsGoals = goals.filter((g) => g.isActive && g.type === 'savings');

  // Calculate total current and total target across all active savings goals
  const totalCurrent = savingsGoals.reduce((sum, goal) => sum + (goal.current || 0), 0);
  const totalTarget = savingsGoals.reduce((sum, goal) => sum + (goal.target || 0), 0);

  const progressPercentage = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

  // SVG circle parameters
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (progressPercentage / 100) * circumference;

  if (isLoading) {
    return (
      <div
        className="rounded-xl border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg"
        style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}
      >
        <div className="animate-pulse">
          <div className="h-6 bg-blue-100 rounded w-1/2 mb-6"></div>
          <div className="h-32 bg-blue-100 rounded-full w-32 mx-auto mb-4"></div>
          <div className="h-4 bg-blue-100 rounded w-3/4 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg"
      style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Overall Progress</h3>

      {/* Circular Progress */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#D1D5DB"
              strokeWidth={strokeWidth}
              opacity={0.3}
            />

            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#6366f1"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-4xl font-bold" style={{ color: '#6366f1' }}>
              {progressPercentage}%
            </p>
          </div>
        </div>
      </div>

      {/* Progress text */}
      <p className="text-center text-sm text-gray-700">
        You&apos;ve achieved <span className="font-semibold">{formatCurrency(totalCurrent)}</span> of
        your <span className="font-semibold">{formatCurrency(totalTarget)}</span> goal
      </p>
    </div>
  );
}

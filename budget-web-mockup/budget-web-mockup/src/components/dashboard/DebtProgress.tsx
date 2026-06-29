'use client';

import { GoalDisplay } from '@/types';
import { formatCurrency } from '@/lib/formatters';

interface DebtProgressProps {
  goals: GoalDisplay[];
  isLoading: boolean;
}

export default function DebtProgress({ goals, isLoading }: DebtProgressProps) {
  // Only count active debt goals
  const debtGoals = goals.filter((g) => g.isActive && g.type === 'debt');

  // Calculate total current debt and total original debt
  const totalCurrentDebt = debtGoals.reduce((sum, goal) => sum + (goal.current || 0), 0);
  const totalOriginalDebt = debtGoals.reduce((sum, goal) => sum + (goal.originalAmount || 0), 0);

  // Calculate how much has been paid off
  const totalPaidOff = totalOriginalDebt - totalCurrentDebt;
  const progressPercentage = totalOriginalDebt > 0 ? Math.round((totalPaidOff / totalOriginalDebt) * 100) : 0;

  // Determine progress color based on percentage paid off (inverted for motivation)
  const getProgressColor = () => {
    if (progressPercentage < 20) {
      return '#FF6B6B'; // Red: < 20% paid off
    }
    if (progressPercentage < 50) {
      return '#FFB366'; // Orange: 20-50% paid off
    }
    return '#14B8A6'; // Teal: > 50% paid off
  };

  const progressColor = getProgressColor();

  // SVG circle parameters
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (progressPercentage / 100) * circumference;

  if (isLoading) {
    return (
      <div
        className="bg-white rounded-xl border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg"
        style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-100 rounded w-1/2 mb-6"></div>
          <div className="h-32 bg-gray-100 rounded-full w-32 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg"
      style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Debt Progress</h3>

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
              stroke={progressColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-4xl font-bold" style={{ color: progressColor }}>
              {progressPercentage}%
            </p>
          </div>
        </div>
      </div>

      {/* Progress text */}
      <p className="text-center text-sm text-gray-700">
        You have <span className="font-semibold">{formatCurrency(totalCurrentDebt)}</span> remaining of
        your <span className="font-semibold">{formatCurrency(totalOriginalDebt)}</span> debt
      </p>
    </div>
  );
}

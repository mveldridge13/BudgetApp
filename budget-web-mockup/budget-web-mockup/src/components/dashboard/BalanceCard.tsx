'use client';

import { formatCurrency } from '@/lib/formatters';

interface BalanceCardProps {
  balance: number;
  leftToSpend: number;
  totalExpenses: number;
  committedExpenses: number;
  discretionaryExpenses: number;
  isLoading: boolean;
}

export default function BalanceCard({
  balance,
  leftToSpend,
  totalExpenses,
  committedExpenses,
  discretionaryExpenses,
  isLoading,
}: BalanceCardProps) {
  // Calculate percentage remaining (leftToSpend / balance * 100)
  const percentageRemaining = balance > 0 ? Math.round((leftToSpend / balance) * 100) : 0;
  const isOverBudget = leftToSpend < 0;
  const isCloseToLimit = percentageRemaining < 20 && percentageRemaining >= 0;

  // Determine progress bar color
  const getProgressBarColor = () => {
    if (isOverBudget || isCloseToLimit) {
      return 'bg-red-500';
    }
    return 'bg-green-500';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 transition-shadow duration-200 hover:shadow-md">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 transition-shadow duration-200 hover:shadow-md">
      {/* Main Balance */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-1">Balance</p>
        <p className="text-4xl font-bold text-gray-900">{formatCurrency(balance)}</p>
      </div>

      {/* Left to Spend and Total Expenses */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-600 mb-1">Left to Spend</p>
          <p className="text-2xl font-bold text-blue-600 mb-3">{formatCurrency(leftToSpend)}</p>

          {/* Progress Bar */}
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor()}`}
              style={{ width: `${Math.max(0, Math.min(100, percentageRemaining))}%` }}
            />
          </div>

          {/* Percentage Text */}
          <p className="text-xs text-gray-600">
            {percentageRemaining}% of income remaining
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-600 mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>

          {/* Committed vs Discretionary Breakdown */}
          <div className="mt-3 pt-3 border-t border-red-200 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div>
                <span className="text-xs text-gray-600">Committed</span>
              </div>
              <span className="text-xs font-semibold text-gray-900">
                {formatCurrency(committedExpenses)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                <span className="text-xs text-gray-600">Discretionary</span>
              </div>
              <span className="text-xs font-semibold text-gray-900">
                {formatCurrency(discretionaryExpenses)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

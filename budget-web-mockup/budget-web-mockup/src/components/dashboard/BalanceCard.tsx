'use client';

import {formatCurrency} from '@/lib/formatters';

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
  const percentageRemaining =
    balance > 0 ? Math.round((leftToSpend / balance) * 100) : 0;
  const isOverBudget = leftToSpend < 0;
  const isCloseToLimit = percentageRemaining < 20 && percentageRemaining >= 0;
  const isLowBalance = percentageRemaining < 50 && percentageRemaining >= 20;

  // Determine progress bar color (aligned with mobile app BalanceCard.js)
  const getProgressBarColor = () => {
    if (isOverBudget || isCloseToLimit) {
      return '#FF6B6B'; // Red: < 20% or over budget
    }
    if (isLowBalance) {
      return '#FFB366'; // Orange: 20-50% remaining
    }
    return '#14B8A6'; // Teal: > 50% remaining
  };

  if (isLoading) {
    return (
      <div
        className="bg-white rounded-xl border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg"
        style={{boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)'}}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-1/3"></div>
          <div className="h-12 bg-gray-100 rounded w-1/2"></div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="h-20 bg-gray-100 rounded-xl"></div>
            <div className="h-20 bg-gray-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg"
      style={{boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)'}}>
      {/* Main Balance */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-2">Balance</p>
        <p className="text-4xl font-bold text-gray-900 tracking-tight">
          {formatCurrency(balance)}
        </p>
      </div>

      {/* Left to Spend and Total Expenses */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{backgroundColor: '#EEF2FF'}}>
          <p className="text-xs font-medium text-gray-500 mb-2">
            Left to Spend
          </p>
          <p
            className="text-2xl font-bold mb-4 tracking-tight"
            style={{color: '#6366f1'}}>
            {formatCurrency(leftToSpend)}
          </p>

          {/* Progress Bar */}
          <div className="bg-white/50 rounded-full h-2 overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.max(0, Math.min(100, percentageRemaining))}%`,
                backgroundColor: getProgressBarColor(),
              }}
            />
          </div>

          {/* Percentage Text */}
          <p className="text-xs text-gray-500 font-medium">
            {percentageRemaining}% of income remaining
          </p>
        </div>
        <div className="rounded-xl p-5" style={{backgroundColor: '#FEF2F2'}}>
          <p className="text-xs font-medium text-gray-500 mb-2">
            Total Expenses
          </p>
          <p
            className="text-2xl font-bold tracking-tight"
            style={{color: '#F87171'}}>
            {formatCurrency(totalExpenses)}
          </p>

          {/* Committed vs Discretionary Breakdown */}
          <div
            className="mt-4 pt-4 space-y-2.5"
            style={{borderTop: '1px solid rgba(254, 202, 202, 0.5)'}}>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div
                  className="w-2 h-2 rounded-full mr-2.5"
                  style={{backgroundColor: '#F59E0B'}}></div>
                <span className="text-xs text-gray-500 font-medium">
                  Committed
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-900">
                {formatCurrency(committedExpenses)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div
                  className="w-2 h-2 rounded-full mr-2.5"
                  style={{backgroundColor: '#6366f1'}}></div>
                <span className="text-xs text-gray-500 font-medium">
                  Discretionary
                </span>
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

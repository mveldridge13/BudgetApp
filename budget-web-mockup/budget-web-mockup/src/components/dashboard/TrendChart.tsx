'use client';

import { useEffect } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { formatCurrency } from '@/lib/formatters';

export default function TrendChart() {
  const { spendingTrend, fetchSpendingTrend } = useAnalytics();

  useEffect(() => {
    fetchSpendingTrend();
  }, []);

  // Calculate max value for scaling
  const maxValue = Math.max(
    ...spendingTrend.flatMap(d => [d.income, d.expenses]),
    1
  );

  // Create SVG path for line chart
  const createLinePath = (data: typeof spendingTrend, key: 'income' | 'expenses') => {
    if (data.length === 0) return '';

    const width = 100;
    const height = 50;
    const padding = 5;

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - (d[key] / maxValue) * (height - 2 * padding);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const totalIncome = spendingTrend.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = spendingTrend.reduce((sum, d) => sum + d.expenses, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-sm text-gray-900">Spending Trend</h2>
          <p className="text-gray-600 text-base font-bold">
            {formatCurrency(totalExpenses)} spent
          </p>
        </div>
        <div className="flex space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600">Income</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600">Expenses</span>
          </div>
        </div>
      </div>

      {spendingTrend.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          No trend data available
        </div>
      ) : (
        <div className="relative">
          <svg viewBox="0 0 100 50" className="w-full h-48">
            {/* Grid lines */}
            <line x1="5" y1="45" x2="95" y2="45" stroke="#e5e7eb" strokeWidth="0.5" />
            <line x1="5" y1="30" x2="95" y2="30" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2" />
            <line x1="5" y1="15" x2="95" y2="15" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2" />

            {/* Income line */}
            <path
              d={createLinePath(spendingTrend, 'income')}
              fill="none"
              stroke="#22c55e"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Expenses line */}
            <path
              d={createLinePath(spendingTrend, 'expenses')}
              fill="none"
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {spendingTrend.map((d, i) => {
              const x = 5 + (i / (spendingTrend.length - 1)) * 90;
              const yIncome = 45 - (d.income / maxValue) * 35;
              const yExpenses = 45 - (d.expenses / maxValue) * 35;

              return (
                <g key={i}>
                  <circle cx={x} cy={yIncome} r="1.5" fill="#22c55e" />
                  <circle cx={x} cy={yExpenses} r="1.5" fill="#ef4444" />
                </g>
              );
            })}
          </svg>

          {/* X-axis labels */}
          <div className="flex justify-between px-2 mt-2">
            {spendingTrend.slice(0, 7).map((d, i) => (
              <span key={i} className="text-xs text-gray-500">
                {new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-100">
        <div>
          <p className="text-sm text-gray-500">Total Income</p>
          <p className="text-lg font-semibold text-green-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-lg font-semibold text-red-600">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { Transaction } from '@/types';
import { formatCurrency } from '@/lib/formatters';
import { useMonthOverMonthComparison } from '@/hooks/useMonthOverMonthComparison';
import { useRecurringVsOneOffComparison } from '@/hooks/useRecurringVsOneOffComparison';

interface CategoryObject {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface TransactionSummaryTilesProps {
  transactions: Transaction[];
}

// Helper function to create donut path (like mobile app)
const createDonutPath = (
  startAngle: number,
  endAngle: number,
  outerRadius: number,
  innerRadius: number
): string => {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);

  if (endAngle - startAngle < 0.1) return '';
  if (innerRadius <= 0 || outerRadius <= innerRadius) return '';

  // Handle full circle (or nearly full circle) case
  if (endAngle - startAngle >= 359.9) {
    return `
      M 0,${-outerRadius}
      A ${outerRadius},${outerRadius} 0 1,1 0,${outerRadius}
      A ${outerRadius},${outerRadius} 0 1,1 0,${-outerRadius}
      M 0,${-innerRadius}
      A ${innerRadius},${innerRadius} 0 1,0 0,${innerRadius}
      A ${innerRadius},${innerRadius} 0 1,0 0,${-innerRadius}
      Z`.replace(/\s+/g, ' ').trim();
  }

  const start = toRadians(startAngle - 90);
  const end = toRadians(endAngle - 90);

  const x1 = Math.cos(start) * outerRadius;
  const y1 = Math.sin(start) * outerRadius;
  const x2 = Math.cos(end) * outerRadius;
  const y2 = Math.sin(end) * outerRadius;

  const x3 = Math.cos(end) * innerRadius;
  const y3 = Math.sin(end) * innerRadius;
  const x4 = Math.cos(start) * innerRadius;
  const y4 = Math.sin(start) * innerRadius;

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${x1.toFixed(2)},${y1.toFixed(2)} A ${outerRadius},${outerRadius} 0 ${largeArc},1 ${x2.toFixed(2)},${y2.toFixed(2)} L ${x3.toFixed(2)},${y3.toFixed(2)} A ${innerRadius},${innerRadius} 0 ${largeArc},0 ${x4.toFixed(2)},${y4.toFixed(2)} Z`;
};

export default function TransactionSummaryTiles({ transactions }: TransactionSummaryTilesProps) {
  const totalAmount = transactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0,
  );

  // Use custom hook for pay period comparison
  const { currentPeriodTotal, previousPeriodTotal, percentageChange, isIncrease, isDecrease } = useMonthOverMonthComparison(transactions);

  // Use custom hook for recurring vs one-off comparison
  const { recurringPercentage, oneOffPercentage } = useRecurringVsOneOffComparison(transactions);

  // Calculate top category with color
  const categoryData = transactions.reduce((acc, transaction) => {
    let categoryName = 'Uncategorized';
    let categoryColor = '#6B7280';

    if (typeof transaction.categoryName === 'string') {
      categoryName = transaction.categoryName;
      categoryColor = transaction.categoryColor || '#6B7280';
    } else if (transaction.categoryName) {
      const categoryObj = transaction.categoryName as unknown as CategoryObject;
      categoryName = categoryObj.name || 'Uncategorized';
      categoryColor = categoryObj.color || '#6B7280';
    }

    if (!acc[categoryName]) {
      acc[categoryName] = { total: 0, color: categoryColor };
    }
    acc[categoryName].total += Math.abs(transaction.amount);
    return acc;
  }, {} as Record<string, { total: number; color: string }>);

  const topCategory = Object.entries(categoryData).sort((a, b) => b[1].total - a[1].total)[0];
  const topCategoryName = topCategory ? topCategory[0] : 'None';
  const topCategoryAmount = topCategory ? topCategory[1].total : 0;
  const topCategoryColor = topCategory ? topCategory[1].color : '#6B7280';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Transactions */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
        <p className="text-sm font-medium text-gray-500 mb-1">Total Transactions</p>
        <p className="text-3xl font-bold text-gray-900 mb-1">{transactions.length}</p>
        <p className="text-xs text-gray-400">
          {formatCurrency(totalAmount)} total
        </p>
      </div>

      {/* Pay Period Comparison */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
        <p className="text-sm font-medium text-gray-500 mb-1">vs Last Pay Period</p>
        <div className="flex items-baseline gap-2 mb-1">
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(currentPeriodTotal)}</p>
          {percentageChange !== 0 && previousPeriodTotal > 0 && currentPeriodTotal > 0 && (
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
                style={{
                  color: isIncrease ? '#F87171' : '#10B981',
                  transform: isIncrease ? 'rotate(0deg)' : 'rotate(180deg)'
                }}
              >
                <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span
                className="text-sm font-semibold"
                style={{ color: isIncrease ? '#F87171' : '#10B981' }}
              >
                {Math.abs(percentageChange).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400">
          {previousPeriodTotal === 0 && currentPeriodTotal === 0
            ? 'No transactions yet'
            : previousPeriodTotal === 0
            ? 'No previous period data'
            : currentPeriodTotal === 0
            ? 'No transactions this period'
            : isIncrease
            ? 'Higher than last period'
            : isDecrease
            ? 'Lower than last period'
            : 'Same as last period'}
        </p>
      </div>

      {/* Recurring vs One-Off */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
        <p className="text-sm font-medium text-gray-500 mb-4">Transaction Split</p>

        {transactions.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-400 text-xs">No data</p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            {/* Donut Chart */}
            <div className="relative" style={{ width: 80, height: 80 }}>
              <svg width={80} height={80}>
                <g transform="translate(40, 40)">
                  {/* One-Off segment */}
                  {oneOffPercentage > 0 && (
                    <path
                      d={createDonutPath(0, (oneOffPercentage / 100) * 360, 30, 14)}
                      fill="#6EE7B7"
                      stroke="white"
                      strokeWidth="2"
                    />
                  )}

                  {/* Recurring segment */}
                  {recurringPercentage > 0 && (
                    <path
                      d={createDonutPath(
                        (oneOffPercentage / 100) * 360,
                        360,
                        30,
                        14
                      )}
                      fill="#A5B4FC"
                      stroke="white"
                      strokeWidth="2"
                    />
                  )}
                </g>
              </svg>
            </div>

            {/* Legend */}
            <div className="flex-1 ml-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
                  <span className="text-xs text-gray-500">One-Off</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: '#10B981' }}>
                  {oneOffPercentage.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#6366f1' }}></div>
                  <span className="text-xs text-gray-500">Recurring</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: '#6366f1' }}>
                  {recurringPercentage.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Category */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
        <p className="text-sm font-medium text-gray-500 mb-1">Top Category</p>
        <p className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(topCategoryAmount)}</p>
        <p className="text-xs" style={{ color: topCategoryColor }}>
          {topCategoryName}
        </p>
      </div>
    </div>
  );
}

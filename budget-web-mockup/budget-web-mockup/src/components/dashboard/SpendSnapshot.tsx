'use client';

import { useEffect } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { formatCurrency } from '@/lib/formatters';
import { CHART_COLORS } from '@/lib/constants';

export default function SpendSnapshot() {
  const { spendingByCategory, fetchSpendingByCategory } = useAnalytics();

  useEffect(() => {
    fetchSpendingByCategory();
  }, []);

  const totalExpenses = spendingByCategory.reduce((sum, cat) => sum + cat.amount, 0);

  // Create SVG path for donut segments
  const createDonutPath = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = 50 + outerRadius * Math.cos(startAngleRad);
    const y1 = 50 + outerRadius * Math.sin(startAngleRad);
    const x2 = 50 + outerRadius * Math.cos(endAngleRad);
    const y2 = 50 + outerRadius * Math.sin(endAngleRad);

    const x3 = 50 + innerRadius * Math.cos(endAngleRad);
    const y3 = 50 + innerRadius * Math.sin(endAngleRad);
    const x4 = 50 + innerRadius * Math.cos(startAngleRad);
    const y4 = 50 + innerRadius * Math.sin(startAngleRad);

    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', x1, y1,
      'A', outerRadius, outerRadius, 0, largeArcFlag, 1, x2, y2,
      'L', x3, y3,
      'A', innerRadius, innerRadius, 0, largeArcFlag, 0, x4, y4,
      'Z',
    ].join(' ');
  };

  // Calculate chart data with angles
  const chartData = spendingByCategory.map((category, index) => ({
    ...category,
    percentage: totalExpenses > 0 ? (category.amount / totalExpenses) * 100 : 0,
    angle: totalExpenses > 0 ? (category.amount / totalExpenses) * 360 : 0,
    color: category.categoryColor || CHART_COLORS[index % CHART_COLORS.length],
  }));

  let currentAngle = -90; // Start from top

  // Calculate label positions
  const getLabelPosition = (startAngle: number, endAngle: number, radius: number) => {
    const midAngle = (startAngle + endAngle) / 2;
    const midAngleRad = (midAngle * Math.PI) / 180;
    const x = 50 + radius * Math.cos(midAngleRad);
    const y = 50 + radius * Math.sin(midAngleRad);
    return { x, y, midAngle };
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
      <div className="mb-16">
        <h2 className="text-sm text-gray-900">Spend Snapshot</h2>
        <p className="text-gray-600 text-base font-bold">{formatCurrency(totalExpenses)}</p>
      </div>

      {chartData.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          No spending data available
        </div>
      ) : (
        <div className="flex justify-center">
          <div className="relative">
            <svg width="380" height="380" viewBox="0 0 100 100">
              {/* Donut segments */}
              {chartData.map((category) => {
                const path = createDonutPath(currentAngle, currentAngle + category.angle, 28, 45);
                currentAngle += category.angle;

                return (
                  <g key={category.categoryId}>
                    <path
                      d={path}
                      fill={category.color}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  </g>
                );
              })}

              {/* Center circle */}
              <circle cx="50" cy="50" r="28" fill="white" stroke="#f3f4f6" strokeWidth="0.5" />
            </svg>

            {/* Center text - positioned absolutely */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">Total Spending</div>
                <div className="text-base font-bold text-gray-900">{formatCurrency(totalExpenses)}</div>
              </div>
            </div>

            {/* Positioned labels */}
            {(() => {
              let labelAngle = -90;
              return chartData.map((category) => {
                const labelPos = getLabelPosition(labelAngle, labelAngle + category.angle, 50);
                labelAngle += category.angle;

                const isLeft = labelPos.x < 50;
                const isTop = labelPos.y < 50;

                return (
                  <div
                    key={`label-${category.categoryId}`}
                    className="absolute text-xs pointer-events-none"
                    style={{
                      left: `${(labelPos.x / 100) * 380}px`,
                      top: `${(labelPos.y / 100) * 380}px`,
                      transform: `translate(${isLeft ? '-100%' : '0%'}, ${isTop ? '-100%' : '0%'})`,
                    }}
                  >
                    <div className={`${isLeft ? 'text-right' : 'text-left'} ${isTop ? 'mb-1' : 'mt-1'}`}>
                      <div className="font-medium text-gray-900">{category.categoryName}</div>
                      <div className="text-gray-600">{formatCurrency(category.amount)}</div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

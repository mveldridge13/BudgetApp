'use client';

import { formatCurrency } from '@/lib/formatters';
import { DashboardSummary } from '@/services/analytics.service';

interface StatsCardsProps {
  summary: DashboardSummary | null;
}

export default function StatsCards({ summary }: StatsCardsProps) {
  const stats = [
    {
      title: 'Starting Balance',
      value: formatCurrency(summary?.startingBalance || 0),
      change: 'This month',
      trend: 'up',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
          />
        </svg>
      ),
    },
    {
      title: 'Monthly Spending',
      value: formatCurrency(summary?.totalExpenses || 0),
      change: summary?.percentageUsed ? `${summary.percentageUsed}% of budget` : '0% of budget',
      trend: 'down',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
    {
      title: 'Active Goals',
      value: String(summary?.activeGoals || 0),
      change: `${summary?.goalProgress || 0}% overall progress`,
      trend: 'neutral',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      ),
    },
    {
      title: 'Upcoming Bills',
      value: formatCurrency(summary?.upcomingBills || 0),
      change: summary?.overdueAmount ? `${formatCurrency(summary.overdueAmount)} overdue` : 'No overdue bills',
      trend: (summary?.overdueAmount || 0) > 0 ? 'down' : 'neutral',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="rounded-lg border border-gray-200 p-6"
          style={{
            backgroundColor: '#6366f1',
            borderColor: '#6366f1',
          }}>
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-sm font-medium"
                style={{ color: 'rgba(255,255,255,0.8)' }}>
                {stat.title}
              </p>
              <p
                className="text-2xl font-bold mt-1"
                style={{ color: 'white' }}>
                {stat.value}
              </p>
              <p
                className="text-sm mt-2 font-medium"
                style={{ color: 'rgba(255,255,255,0.9)' }}>
                {stat.change}
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: '#EEF2FF',
                color: '#6366f1',
              }}>
              {stat.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

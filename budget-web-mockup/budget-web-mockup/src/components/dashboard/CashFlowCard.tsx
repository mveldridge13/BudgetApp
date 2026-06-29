'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { transactionService } from '@/services/transaction.service';
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters';

// Minimal shape of the analytics response we rely on (the backend returns more).
interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
}
interface AnalyticsResponse {
  monthlyTrends?: MonthlyTrend[];
}

// Rolling window length in days. Day-based (not month arithmetic) so it always
// covers the same span regardless of how many days the calendar months have.
const ROLLING_DAYS = 30;

const INCOME_COLOR = '#34D399';
const EXPENSE_COLOR = '#F87171';

interface CashFlowCardProps {
  currency?: string;
}

// Rolling 30-day analytics for the cash flow chart. Cached by SWR so revisiting
// the dashboard renders the chart instantly and revalidates in the background.
async function fetchCashFlow(): Promise<AnalyticsResponse> {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - ROLLING_DAYS);
  return (await transactionService.getAnalytics({
    startDate: start.toISOString(),
    endDate: now.toISOString(),
  })) as AnalyticsResponse;
}

export default function CashFlowCard({ currency = 'AUD' }: CashFlowCardProps) {
  const { data: analytics, isLoading } = useSWR<AnalyticsResponse>(
    'dashboard-cashflow-30d',
    fetchCashFlow,
    { keepPreviousData: true },
  );

  const chartData = useMemo(() => {
    return (
      analytics?.monthlyTrends?.map((trend) => ({
        label: new Date(trend.month).toLocaleDateString('en-AU', {
          day: 'numeric',
          month: 'short',
        }),
        income: trend.income || 0,
        expenses: trend.expenses || 0,
      })) || []
    );
  }, [analytics]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Cash Flow</h3>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-lg px-2.5 py-1">
          Last 30 days
        </span>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[220px]">
        {isLoading ? (
          <div className="h-full w-full bg-gray-50 rounded-lg animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-sm text-gray-500">
            No cash flow data for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cashflow-income" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={INCOME_COLOR} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={INCOME_COLOR} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cashflow-expenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={EXPENSE_COLOR} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={EXPENSE_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(value) => formatCurrencyCompact(Number(value), currency)}
              />
              <Tooltip
                formatter={(value, name) => [formatCurrency(Number(value), currency), name]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="income"
                name="Income"
                stroke={INCOME_COLOR}
                strokeWidth={2.5}
                strokeDasharray="2 4"
                strokeLinecap="round"
                fill="url(#cashflow-income)"
                activeDot={{ r: 4 }}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke={EXPENSE_COLOR}
                strokeWidth={2.5}
                strokeDasharray="2 4"
                strokeLinecap="round"
                fill="url(#cashflow-expenses)"
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: INCOME_COLOR }} />
          <span className="text-xs font-medium text-gray-600">Income</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: EXPENSE_COLOR }} />
          <span className="text-xs font-medium text-gray-600">Expenses</span>
        </div>
      </div>
    </div>
  );
}

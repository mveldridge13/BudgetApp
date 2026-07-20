'use client';

import {useMemo} from 'react';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts';
import {formatCurrency, formatCurrencyCompact} from '@/lib/formatters';
import {DailyBalance, Plan, PlanStatus} from '@/types';

interface PlanMarker {
  id: string;
  date: string;
  balance: number;
  status: PlanStatus;
}

const BALANCE_COLOR = '#6366F1';
const BUFFER_COLOR = '#F87171';
const DRAFT_COLOR = '#A5B4FC';
const PLANNED_COLOR = '#6366F1';

interface ForecastChartProps {
  dailyBalances: DailyBalance[];
  safetyBufferAmount: number | null;
  plans: Plan[];
  currency?: string;
}

export default function ForecastChart({
  dailyBalances,
  safetyBufferAmount,
  plans,
  currency = 'USD',
}: ForecastChartProps) {
  const chartData = useMemo(
    () =>
      dailyBalances.map((d) => ({
        date: d.date,
        label: new Date(d.date).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
        }),
        balance: d.balance,
      })),
    [dailyBalances],
  );

  const balanceByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of dailyBalances) map.set(d.date, d.balance);
    return map;
  }, [dailyBalances]);

  // Active plans that land on a day the forecast covers, so we can mark
  // Draft (dashed/lighter) vs Planned (solid) points on the balance line.
  const planMarkers = useMemo(() => {
    const markers: PlanMarker[] = [];
    for (const p of plans) {
      if (p.status !== 'DRAFT' && p.status !== 'PLANNED') continue;
      const date = p.plannedDate.slice(0, 10);
      const balance = balanceByDate.get(date);
      if (balance === undefined) continue;
      markers.push({id: p.id, date, balance, status: p.status});
    }
    return markers;
  }, [plans, balanceByDate]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[320px] w-full items-center justify-center text-sm text-gray-500">
        No forecast data yet.
      </div>
    );
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{top: 8, right: 8, left: 0, bottom: 0}}>
          <defs>
            <linearGradient id="planner-balance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={BALANCE_COLOR} stopOpacity={0.25} />
              <stop offset="95%" stopColor={BALANCE_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{fontSize: 12, fill: '#9CA3AF'}}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{fontSize: 12, fill: '#9CA3AF'}}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value) => formatCurrencyCompact(Number(value), currency)}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value), currency), 'Balance']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontSize: '12px',
            }}
          />
          {safetyBufferAmount !== null && (
            <ReferenceLine
              y={safetyBufferAmount}
              stroke={BUFFER_COLOR}
              strokeDasharray="4 4"
              label={{
                value: 'Safety buffer',
                position: 'insideTopLeft',
                fill: BUFFER_COLOR,
                fontSize: 11,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="balance"
            stroke={BALANCE_COLOR}
            strokeWidth={2.5}
            fill="url(#planner-balance)"
            dot={false}
            activeDot={{r: 4}}
          />
          {planMarkers.map((marker) => (
            <ReferenceDot
              key={marker.id}
              x={
                chartData.find((c) => c.date === marker.date)?.label ??
                marker.date
              }
              y={marker.balance}
              r={5}
              fill={marker.status === 'DRAFT' ? 'white' : PLANNED_COLOR}
              stroke={marker.status === 'DRAFT' ? DRAFT_COLOR : PLANNED_COLOR}
              strokeWidth={2}
              strokeDasharray={marker.status === 'DRAFT' ? '2 2' : undefined}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

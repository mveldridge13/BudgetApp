'use client';

import {useMemo} from 'react';
import {TrendingDown, TrendingUp, ShieldAlert, Sparkles} from 'lucide-react';
import {formatCurrency} from '@/lib/formatters';
import {ForecastResult, Plan} from '@/types';

interface ImpactSummaryCardProps {
  forecast?: ForecastResult;
  activePlans: Plan[];
  currency?: string;
}

function describePlanEffect(plan: Plan, currency: string): string {
  const amountStr = formatCurrency(plan.amount, currency);
  const dateStr = new Date(plan.plannedDate).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
  const label = plan.description || plan.type;

  switch (plan.type) {
    case 'BILL_CHANGE':
      return `${label}: bill payment moves to ${dateStr}`;
    case 'GOAL_CHANGE':
    case 'DEBT_PAYMENT':
      return `${label}: ${plan.direction === 'OUTFLOW' ? 'extra' : 'reduced'} contribution of ${amountStr} on ${dateStr}`;
    default:
      return `${label}: ${plan.direction === 'OUTFLOW' ? '-' : '+'}${amountStr} on ${dateStr}`;
  }
}

export default function ImpactSummaryCard({
  forecast,
  activePlans,
  currency = 'USD',
}: ImpactSummaryCardProps) {
  const impact = useMemo(() => {
    if (!forecast) return null;
    const lowestWithPlans = Math.min(...forecast.dailyBalances.map((d) => d.balance));
    const lowestBaseline = Math.min(...forecast.baselineDailyBalances.map((d) => d.balance));
    return {
      lowestWithPlans,
      lowestBaseline,
      delta: lowestWithPlans - lowestBaseline,
      breachDelta: forecast.breaches.length - forecast.baselineBreaches.length,
    };
  }, [forecast]);

  if (activePlans.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 text-gray-500">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm">
            No what-if plans yet. Add one to see how it changes your cash flow.
          </span>
        </div>
      </div>
    );
  }

  if (!impact) {
    return (
      <div className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
    );
  }

  const isWorse = impact.delta < -0.005;
  const isBetter = impact.delta > 0.005;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-medium text-gray-500">
        Impact of your {activePlans.length} what-if plan
        {activePlans.length > 1 ? 's' : ''}
      </h2>

      <div className="flex items-center gap-3">
        {isWorse && <TrendingDown className="h-5 w-5 shrink-0 text-red-500" />}
        {isBetter && <TrendingUp className="h-5 w-5 shrink-0 text-emerald-500" />}
        <div>
          <p className="text-sm text-gray-600">
            Your lowest projected balance goes from{' '}
            <span className="font-medium text-gray-900">
              {formatCurrency(impact.lowestBaseline, currency)}
            </span>{' '}
            to{' '}
            <span
              className={`font-semibold ${
                isWorse ? 'text-red-600' : isBetter ? 'text-emerald-600' : 'text-gray-900'
              }`}
            >
              {formatCurrency(impact.lowestWithPlans, currency)}
            </span>
          </p>
        </div>
      </div>

      {impact.breachDelta !== 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {impact.breachDelta > 0
            ? `This adds ${impact.breachDelta} day${impact.breachDelta > 1 ? 's' : ''} below your safety buffer.`
            : `This removes ${Math.abs(impact.breachDelta)} day${Math.abs(impact.breachDelta) > 1 ? 's' : ''} below your safety buffer.`}
        </div>
      )}

      <ul className="mt-4 space-y-1.5 border-t border-gray-100 pt-3">
        {activePlans.map((plan) => (
          <li key={plan.id} className="flex items-center gap-2 text-sm text-gray-600">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                plan.status === 'DRAFT' ? 'border border-indigo-300 bg-white' : 'bg-indigo-500'
              }`}
            />
            {describePlanEffect(plan, currency)}
          </li>
        ))}
      </ul>
    </div>
  );
}

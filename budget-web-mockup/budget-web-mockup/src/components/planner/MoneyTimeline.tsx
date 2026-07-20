'use client';

import {useMemo} from 'react';
import {formatCurrency} from '@/lib/formatters';
import {FinancialEvent, FinancialEventSourceType, Plan} from '@/types';

interface MoneyTimelineProps {
  events: FinancialEvent[];
  plans: Plan[];
  currency?: string;
}

const SOURCE_LABELS: Record<FinancialEventSourceType, string> = {
  PRIMARY_INCOME: 'Salary',
  INCOME_SOURCE: 'Income',
  RECURRING_BILL: 'Bill',
  PLAN: 'Plan',
};

export default function MoneyTimeline({
  events,
  plans,
  currency = 'USD',
}: MoneyTimelineProps) {
  const planStatusById = useMemo(
    () => new Map(plans.map((p) => [p.id, p.status])),
    [plans],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, FinancialEvent[]>();
    for (const event of events) {
      const bucket = map.get(event.date) ?? [];
      bucket.push(event);
      map.set(event.date, bucket);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No income, bills, or plans scheduled in this window.
      </p>
    );
  }

  return (
    <div className="max-h-[420px] space-y-4 overflow-y-auto">
      {grouped.map(([date, dayEvents]) => (
        <div key={date}>
          <p className="mb-1.5 text-xs font-medium text-gray-400">
            {new Date(date).toLocaleDateString('en-US', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </p>
          <ul className="space-y-1.5">
            {dayEvents.map((event, i) => {
              const isPlan = event.sourceType === 'PLAN';
              const status = isPlan ? planStatusById.get(event.sourceId) : undefined;
              const isDraft = status === 'DRAFT';
              return (
                <li
                  key={`${event.sourceId}-${i}`}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    isPlan
                      ? isDraft
                        ? 'border border-dashed border-indigo-200 bg-indigo-50/50'
                        : 'bg-indigo-50'
                      : 'bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2 text-gray-700">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        isPlan ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {SOURCE_LABELS[event.sourceType]}
                    </span>
                    {event.description}
                    {isDraft && (
                      <span className="text-xs text-indigo-400">(exploring)</span>
                    )}
                  </span>
                  <span
                    className={`font-medium ${
                      event.direction === 'INFLOW' ? 'text-emerald-600' : 'text-gray-900'
                    }`}
                  >
                    {event.direction === 'INFLOW' ? '+' : '-'}
                    {formatCurrency(event.amount, currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

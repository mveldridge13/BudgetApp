'use client';

import useSWR from 'swr';
import {transactionService} from '@/services/transaction.service';
import {userService} from '@/services/user.service';
import {getPayPeriodStatusText} from '@/utils/payPeriodService';

// Read-only, cached source for the Analytics page. Keyed by the selected
// period so each horizon (7d/30d/12m) caches separately; SWR keeps the cache
// across mounts, so revisiting Analytics shows the last data instantly while
// revalidating in the background (matches the Dashboard's SWR pattern).

export type AnalyticsPeriod = '7d' | '30d' | '12m';

export interface AnalyticsBundle {
  analytics: unknown;
  incomeAnalytics: unknown;
  billsAnalytics: unknown;
  payPeriodStatus: string | null;
}

// Date ranges intentionally match the mobile app (AnalyticsContainer) so the
// backend returns identically-grouped monthlyTrends across platforms.
function periodToFilters(period: AnalyticsPeriod): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  let startDate: string;

  switch (period) {
    case '7d': {
      // Rolling 7 days (today included) — 7 daily points.
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      startDate = start.toISOString();
      break;
    }
    case '30d': {
      // Rolling 30 days — 30 daily points (the behavioural-trend default).
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      startDate = start.toISOString();
      break;
    }
    case '12m':
    default:
      // Last 12 calendar months — 12 monthly aggregates.
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();
      break;
  }

  return {startDate, endDate: now.toISOString()};
}

async function fetchAnalytics(period: AnalyticsPeriod): Promise<AnalyticsBundle> {
  const filters = periodToFilters(period);

  // Bills analytics uses pay-period filtering on the backend (no date range).
  const [analytics, incomeAnalytics, billsAnalytics, incomeInfo] =
    await Promise.all([
      transactionService.getAnalytics(filters),
      transactionService.getIncomeAnalytics(filters).catch(() => null),
      transactionService.getBillsAnalytics().catch(() => null),
      userService.getIncome().catch(() => null),
    ]);

  const payPeriodStatus = incomeInfo?.nextPayDate
    ? getPayPeriodStatusText(incomeInfo.nextPayDate)
    : null;

  return {analytics, incomeAnalytics, billsAnalytics, payPeriodStatus};
}

export function useAnalyticsData(period: AnalyticsPeriod): {
  data: AnalyticsBundle | undefined;
  isLoading: boolean;
  refresh: () => Promise<unknown>;
} {
  const {data, isLoading, mutate} = useSWR<AnalyticsBundle>(
    ['analytics', period],
    () => fetchAnalytics(period),
    {keepPreviousData: true},
  );

  return {data, isLoading, refresh: () => mutate()};
}

'use client';

import { useState, useCallback } from 'react';
import { analyticsService, DashboardSummary, SpendingByCategory, SpendingTrend } from '@/services/analytics.service';
import { DateRangeFilter } from '@/types';

interface UseAnalyticsReturn {
  dashboardSummary: DashboardSummary | null;
  spendingByCategory: SpendingByCategory[];
  spendingTrend: SpendingTrend[];
  isLoading: boolean;
  error: string | null;
  fetchDashboardSummary: (filters?: DateRangeFilter) => Promise<void>;
  fetchSpendingByCategory: (filters?: DateRangeFilter) => Promise<void>;
  fetchSpendingTrend: (filters?: DateRangeFilter) => Promise<void>;
  fetchAll: (filters?: DateRangeFilter) => Promise<void>;
}

export function useAnalytics(): UseAnalyticsReturn {
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [spendingByCategory, setSpendingByCategory] = useState<SpendingByCategory[]>([]);
  const [spendingTrend, setSpendingTrend] = useState<SpendingTrend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardSummary = useCallback(async (filters?: DateRangeFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      const summary = await analyticsService.getDashboardSummary(filters);
      setDashboardSummary(summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dashboard summary';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSpendingByCategory = useCallback(async (filters?: DateRangeFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getSpendingByCategory(filters);
      setSpendingByCategory(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch spending by category';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSpendingTrend = useCallback(async (filters?: DateRangeFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getSpendingTrend(filters);
      setSpendingTrend(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch spending trend';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async (filters?: DateRangeFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      const [summary, byCategory, trend] = await Promise.all([
        analyticsService.getDashboardSummary(filters),
        analyticsService.getSpendingByCategory(filters),
        analyticsService.getSpendingTrend(filters),
      ]);

      setDashboardSummary(summary);
      setSpendingByCategory(byCategory);
      setSpendingTrend(trend);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    dashboardSummary,
    spendingByCategory,
    spendingTrend,
    isLoading,
    error,
    fetchDashboardSummary,
    fetchSpendingByCategory,
    fetchSpendingTrend,
    fetchAll,
  };
}

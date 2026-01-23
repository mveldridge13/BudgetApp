'use client';

import { useEffect } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import HeroSection from '@/components/dashboard/HeroSection';
import StatsCards from '@/components/dashboard/StatsCards';
import SpendSnapshot from '@/components/dashboard/SpendSnapshot';
import TrendChart from '@/components/dashboard/TrendChart';
import { Spinner } from '@/components/ui';

export default function DashboardPage() {
  const { dashboardSummary, isLoading, error, fetchAll } = useAnalytics();

  useEffect(() => {
    fetchAll();
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p>Failed to load dashboard data. Please try again.</p>
          <button
            onClick={() => fetchAll()}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {isLoading && !dashboardSummary ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <HeroSection summary={dashboardSummary} />
          <StatsCards summary={dashboardSummary} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SpendSnapshot />
            <TrendChart />
          </div>
        </>
      )}
    </div>
  );
}

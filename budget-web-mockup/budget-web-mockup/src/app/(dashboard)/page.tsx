'use client';

import TotalSavings from '@/components/dashboard/TotalSavings';
import ActiveGoals from '@/components/dashboard/ActiveGoals';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

export default function DashboardPage() {
  const { totalSavings, activeGoalsCount, isLoading } = useDashboardMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Your financial overview at a glance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 auto-rows-fr">
        <TotalSavings amount={totalSavings} isLoading={isLoading} />

        {/* Placeholder Tile 2 */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 flex flex-col justify-center transition-shadow duration-200 hover:shadow-md cursor-pointer">
          <p className="text-sm font-medium text-gray-500">Placeholder</p>
          <p className="text-2xl font-bold text-gray-300 mt-1">--</p>
        </div>

        <ActiveGoals count={activeGoalsCount} isLoading={isLoading} />

        {/* Placeholder Tile 4 */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 flex flex-col justify-center transition-shadow duration-200 hover:shadow-md cursor-pointer">
          <p className="text-sm font-medium text-gray-500">Placeholder</p>
          <p className="text-2xl font-bold text-gray-300 mt-1">--</p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { formatCurrency } from '@/lib/formatters';

interface TotalSavingsProps {
  amount: number;
  isLoading: boolean;
}

export default function TotalSavings({ amount, isLoading }: TotalSavingsProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 flex flex-col justify-center h-full transition-shadow duration-200 hover:shadow-md">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 flex flex-col justify-center h-full transition-shadow duration-200 hover:shadow-md cursor-pointer">
      <p className="text-sm font-medium text-gray-500">Total Savings</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(amount)}</p>
    </div>
  );
}

import { useMemo } from 'react';
import { Transaction } from '@/types';

interface MonthOverMonthComparison {
  thisMonthTotal: number;
  lastMonthTotal: number;
  percentageChange: number;
  isIncrease: boolean;
  isDecrease: boolean;
}

export function useMonthOverMonthComparison(transactions: Transaction[]): MonthOverMonthComparison {
  return useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const thisMonthTotal = transactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const lastMonthTotal = transactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === lastMonth && transactionDate.getFullYear() === lastMonthYear;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const percentageChange = lastMonthTotal === 0
      ? (thisMonthTotal > 0 ? 100 : 0)
      : ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;

    const isIncrease = percentageChange > 0;
    const isDecrease = percentageChange < 0;

    return {
      thisMonthTotal,
      lastMonthTotal,
      percentageChange,
      isIncrease,
      isDecrease,
    };
  }, [transactions]);
}

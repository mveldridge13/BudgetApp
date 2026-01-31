import { useMemo } from 'react';
import { Transaction } from '@/types';
import { useUser } from './useUser';

interface PayPeriodComparison {
  currentPeriodTotal: number;
  previousPeriodTotal: number;
  percentageChange: number;
  isIncrease: boolean;
  isDecrease: boolean;
}

export function useMonthOverMonthComparison(transactions: Transaction[]): PayPeriodComparison {
  const { income } = useUser();

  return useMemo(() => {
    const now = new Date();
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;

    // Use income frequency from backend, fallback to MONTHLY if not available
    const payPeriod = income?.frequency || 'MONTHLY';

    // Calculate period boundaries based on income frequency from backend
    if (payPeriod === 'WEEKLY') {
      // Current week starts from the most recent Monday
      currentPeriodEnd = new Date(now);
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      currentPeriodStart = new Date(now);
      currentPeriodStart.setDate(now.getDate() - daysToMonday);
      currentPeriodStart.setHours(0, 0, 0, 0);

      // Previous week
      previousPeriodEnd = new Date(currentPeriodStart);
      previousPeriodEnd.setMilliseconds(-1);
      previousPeriodStart = new Date(currentPeriodStart);
      previousPeriodStart.setDate(currentPeriodStart.getDate() - 7);

    } else if (payPeriod === 'FORTNIGHTLY') {
      // Current fortnight starts from the most recent Monday (2 weeks ago)
      currentPeriodEnd = new Date(now);
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const daysSinceMonday = daysToMonday;
      const weeksIntoFortnight = Math.floor(daysSinceMonday / 7) % 2;

      currentPeriodStart = new Date(now);
      currentPeriodStart.setDate(now.getDate() - daysToMonday - (weeksIntoFortnight * 7));
      currentPeriodStart.setHours(0, 0, 0, 0);

      // Previous fortnight
      previousPeriodEnd = new Date(currentPeriodStart);
      previousPeriodEnd.setMilliseconds(-1);
      previousPeriodStart = new Date(currentPeriodStart);
      previousPeriodStart.setDate(currentPeriodStart.getDate() - 14);

    } else {
      // MONTHLY - use calendar months
      currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentPeriodEnd = new Date(now);

      previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    const currentPeriodTotal = transactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= currentPeriodStart && transactionDate <= currentPeriodEnd;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const previousPeriodTotal = transactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= previousPeriodStart && transactionDate <= previousPeriodEnd;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const percentageChange = previousPeriodTotal === 0
      ? (currentPeriodTotal > 0 ? 100 : 0)
      : ((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal) * 100;

    const isIncrease = percentageChange > 0;
    const isDecrease = percentageChange < 0;

    return {
      currentPeriodTotal,
      previousPeriodTotal,
      percentageChange,
      isIncrease,
      isDecrease,
    };
  }, [transactions, income?.frequency]);
}

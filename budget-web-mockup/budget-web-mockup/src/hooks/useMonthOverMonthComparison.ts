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
    const nextPayDate = income?.nextPayDate ? new Date(income.nextPayDate) : null;

    // Calculate period boundaries based on nextPayDate and frequency
    if (nextPayDate && payPeriod === 'MONTHLY') {
      // Use nextPayDate to determine the pay period boundaries
      // If today is before nextPayDate, we're in the current period
      // Current period: last pay date to day before next pay date

      if (now < nextPayDate) {
        // We're in the current period
        currentPeriodEnd = new Date(nextPayDate);
        currentPeriodEnd.setDate(nextPayDate.getDate() - 1);
        currentPeriodEnd.setHours(23, 59, 59, 999);

        currentPeriodStart = new Date(nextPayDate);
        currentPeriodStart.setMonth(nextPayDate.getMonth() - 1);
        currentPeriodStart.setHours(0, 0, 0, 0);
      } else {
        // We're past the pay date, so current period starts from this pay date
        currentPeriodStart = new Date(nextPayDate);
        currentPeriodStart.setHours(0, 0, 0, 0);

        currentPeriodEnd = new Date(nextPayDate);
        currentPeriodEnd.setMonth(nextPayDate.getMonth() + 1);
        currentPeriodEnd.setDate(nextPayDate.getDate() - 1);
        currentPeriodEnd.setHours(23, 59, 59, 999);
      }

      // Previous period is one month before current period
      previousPeriodEnd = new Date(currentPeriodStart);
      previousPeriodEnd.setMilliseconds(-1);
      previousPeriodStart = new Date(currentPeriodStart);
      previousPeriodStart.setMonth(currentPeriodStart.getMonth() - 1);

    } else if (nextPayDate && payPeriod === 'WEEKLY') {
      // Calculate based on weekly pay date
      const daysDiff = Math.floor((now.getTime() - nextPayDate.getTime()) / (1000 * 60 * 60 * 24));
      const weeksSincePayDate = Math.floor(daysDiff / 7);

      currentPeriodStart = new Date(nextPayDate);
      currentPeriodStart.setDate(nextPayDate.getDate() + (weeksSincePayDate * 7));
      currentPeriodStart.setHours(0, 0, 0, 0);

      currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setDate(currentPeriodStart.getDate() + 6);
      currentPeriodEnd.setHours(23, 59, 59, 999);

      previousPeriodStart = new Date(currentPeriodStart);
      previousPeriodStart.setDate(currentPeriodStart.getDate() - 7);
      previousPeriodEnd = new Date(currentPeriodStart);
      previousPeriodEnd.setMilliseconds(-1);

    } else if (nextPayDate && payPeriod === 'FORTNIGHTLY') {
      // Calculate based on fortnightly pay date
      const daysDiff = Math.floor((now.getTime() - nextPayDate.getTime()) / (1000 * 60 * 60 * 24));
      const fortnightsSincePayDate = Math.floor(daysDiff / 14);

      currentPeriodStart = new Date(nextPayDate);
      currentPeriodStart.setDate(nextPayDate.getDate() + (fortnightsSincePayDate * 14));
      currentPeriodStart.setHours(0, 0, 0, 0);

      currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setDate(currentPeriodStart.getDate() + 13);
      currentPeriodEnd.setHours(23, 59, 59, 999);

      previousPeriodStart = new Date(currentPeriodStart);
      previousPeriodStart.setDate(currentPeriodStart.getDate() - 14);
      previousPeriodEnd = new Date(currentPeriodStart);
      previousPeriodEnd.setMilliseconds(-1);

    } else {
      // Fallback to calendar-based calculation if no nextPayDate
      if (payPeriod === 'WEEKLY') {
        currentPeriodEnd = new Date(now);
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        currentPeriodStart = new Date(now);
        currentPeriodStart.setDate(now.getDate() - daysToMonday);
        currentPeriodStart.setHours(0, 0, 0, 0);

        previousPeriodEnd = new Date(currentPeriodStart);
        previousPeriodEnd.setMilliseconds(-1);
        previousPeriodStart = new Date(currentPeriodStart);
        previousPeriodStart.setDate(currentPeriodStart.getDate() - 7);

      } else if (payPeriod === 'FORTNIGHTLY') {
        currentPeriodEnd = new Date(now);
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const daysSinceMonday = daysToMonday;
        const weeksIntoFortnight = Math.floor(daysSinceMonday / 7) % 2;

        currentPeriodStart = new Date(now);
        currentPeriodStart.setDate(now.getDate() - daysToMonday - (weeksIntoFortnight * 7));
        currentPeriodStart.setHours(0, 0, 0, 0);

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

import { useMemo } from 'react';
import { Transaction } from '@/types';

interface RecurringVsOneOffComparison {
  recurringTotal: number;
  oneOffTotal: number;
  recurringPercentage: number;
  oneOffPercentage: number;
  recurringCount: number;
  oneOffCount: number;
}

export function useRecurringVsOneOffComparison(transactions: Transaction[]): RecurringVsOneOffComparison {
  return useMemo(() => {
    const recurringTransactions = transactions.filter(t => {
      const recurrence = t.recurrence || (t.isRecurring ? t.recurringPattern?.type : 'none');
      return recurrence && recurrence !== 'none';
    });

    const oneOffTransactions = transactions.filter(t => {
      const recurrence = t.recurrence || (t.isRecurring ? t.recurringPattern?.type : 'none');
      return !recurrence || recurrence === 'none';
    });

    const recurringTotal = recurringTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const oneOffTotal = oneOffTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalAmount = recurringTotal + oneOffTotal;

    const recurringPercentage = totalAmount === 0 ? 0 : (recurringTotal / totalAmount) * 100;
    const oneOffPercentage = totalAmount === 0 ? 0 : (oneOffTotal / totalAmount) * 100;

    return {
      recurringTotal,
      oneOffTotal,
      recurringPercentage,
      oneOffPercentage,
      recurringCount: recurringTransactions.length,
      oneOffCount: oneOffTransactions.length,
    };
  }, [transactions]);
}

'use client';

import useSWR from 'swr';
import {transactionService} from '@/services/transaction.service';
import {categoryService} from '@/services/category.service';
import {userService} from '@/services/user.service';
import {Transaction, Category} from '@/types';

// Read-only, cached source for the dashboard "Recent Transactions" card.
// Intentionally separate from the full useTransactions CRUD hook so the
// dashboard gets SWR caching without touching the Transactions page's
// create/update/delete flows.

function enrich(txns: Transaction[], categories: Category[]): Transaction[] {
  if (categories.length === 0) return txns;
  return txns.map((txn) => {
    const txnAny = txn as unknown as Record<string, unknown>;
    const categoryId = (txnAny.categoryId || txn.category) as string;
    const subcategoryId = (txnAny.subcategoryId || txn.subcategory) as
      | string
      | undefined;
    const category = categories.find((c) => c.id === categoryId);
    const subcategory = categories.find((c) => c.id === subcategoryId);
    return {
      ...txn,
      category: categoryId,
      subcategory: subcategoryId,
      categoryName: category?.name || 'Uncategorized',
      categoryColor: category?.color || '#6B7280',
      categoryIcon: category?.icon || 'help-circle-outline',
      subcategoryName: subcategory?.name,
    };
  });
}

async function fetchRecent(): Promise<Transaction[]> {
  // Pay-period dates + categories can load in parallel; transactions need the
  // period dates, so they follow.
  const [summary, categories] = await Promise.all([
    userService.getHomeSummary(),
    categoryService.getCategories(),
  ]);
  const txns = await transactionService.getTransactions({
    startDate: summary.period.start,
    endDate: summary.period.end,
  });
  return enrich(txns, categories);
}

export function useRecentTransactions(): {
  transactions: Transaction[];
  isLoading: boolean;
} {
  const {data, isLoading} = useSWR<Transaction[]>(
    'recent-transactions',
    fetchRecent,
    {keepPreviousData: true},
  );
  return {transactions: data ?? [], isLoading};
}

'use client';

import {useCallback, useMemo} from 'react';
import useSWR from 'swr';
import {transactionService} from '@/services/transaction.service';
import {categoryService} from '@/services/category.service';
import {userService} from '@/services/user.service';
import {
  Transaction,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
  TransactionSummary,
  Category,
} from '@/types';

interface UseTransactionsOptions {
  initialFilters?: TransactionFilters;
  usePayPeriod?: boolean; // Filter by current pay period dates
}

interface UseTransactionsReturn {
  transactions: Transaction[];
  summary: TransactionSummary | null;
  isLoading: boolean;
  error: string | null;
  payPeriod: { start: string; end: string } | null;
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>;
  createTransaction: (data: CreateTransactionData) => Promise<Transaction>;
  updateTransaction: (
    id: string,
    data: UpdateTransactionData,
  ) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  searchTransactions: (query: string) => Promise<void>;
  refresh: () => Promise<void>;
}

interface TransactionsPayload {
  transactions: Transaction[];
  summary: TransactionSummary | null;
}

// Attach resolved category name/color/icon to each transaction. Derived at
// render time so the list re-enriches automatically when categories load.
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

export function useTransactions(
  options?: UseTransactionsOptions | TransactionFilters,
): UseTransactionsReturn {
  // Support both old signature (filters) and new signature (options)
  const isOptionsObject =
    options && ('usePayPeriod' in options || 'initialFilters' in options);
  const initialFilters = isOptionsObject
    ? (options as UseTransactionsOptions).initialFilters
    : (options as TransactionFilters | undefined);
  const usePayPeriod = isOptionsObject
    ? (options as UseTransactionsOptions).usePayPeriod
    : false;

  // Categories (for enrichment) — shared, cached key so other views reuse it.
  const {data: categories = []} = useSWR<Category[]>(
    'categories',
    () => categoryService.getCategories(),
    {revalidateOnFocus: false},
  );

  // Pay period dates come from the home summary; only needed when scoping to it.
  const {data: homeSummary} = useSWR(
    usePayPeriod ? 'home-summary' : null,
    () => userService.getHomeSummary(),
  );
  const payPeriod =
    usePayPeriod && homeSummary
      ? {start: homeSummary.period.start, end: homeSummary.period.end}
      : null;

  // SWR caches per scope, so revisiting a scope (or clearing a search back to
  // the pay-period view) renders instantly from cache instead of refetching.
  const filtersKey = initialFilters ? JSON.stringify(initialFilters) : '';
  const scopeKey = usePayPeriod
    ? payPeriod
      ? `pp:${payPeriod.start}:${payPeriod.end}`
      : null // wait for the pay period before fetching
    : 'all';
  const swrKey = scopeKey ? `transactions:${scopeKey}:${filtersKey}` : null;

  const {data, isLoading: swrLoading, error, mutate} =
    useSWR<TransactionsPayload>(swrKey, async () => {
      const filters: TransactionFilters = {...initialFilters};
      if (usePayPeriod && payPeriod) {
        filters.startDate = payPeriod.start;
        filters.endDate = payPeriod.end;
      }
      const [transactionsData, summaryData] = await Promise.all([
        transactionService.getTransactions(filters),
        transactionService.getSummary(filters),
      ]);
      return {transactions: transactionsData, summary: summaryData};
    });

  const rawTransactions = useMemo(() => data?.transactions ?? [], [data]);
  const summary = data?.summary ?? null;

  const transactions = useMemo(
    () => enrich(rawTransactions, categories),
    [rawTransactions, categories],
  );

  // Loading while waiting for the pay period, or while the list itself loads
  // with nothing cached yet.
  const isLoading = (usePayPeriod && !payPeriod) || swrLoading;

  const refresh = useCallback(async (): Promise<void> => {
    await mutate();
  }, [mutate]);

  const createTransaction = useCallback(
    async (input: CreateTransactionData): Promise<Transaction> => {
      const created = await transactionService.createTransaction(input);
      await mutate();
      return enrich([created], categories)[0];
    },
    [mutate, categories],
  );

  const updateTransaction = useCallback(
    async (id: string, input: UpdateTransactionData): Promise<Transaction> => {
      const updated = await transactionService.updateTransaction(id, input);
      await mutate();
      return enrich([updated], categories)[0];
    },
    [mutate, categories],
  );

  const deleteTransaction = useCallback(
    async (id: string): Promise<void> => {
      // Optimistically drop the row, roll back if the request fails.
      await mutate(
        async (current) => {
          await transactionService.deleteTransaction(id);
          if (!current) return current;
          return {
            ...current,
            transactions: current.transactions.filter((t) => t.id !== id),
          };
        },
        {
          optimisticData: (current) =>
            current
              ? {
                  ...current,
                  transactions: current.transactions.filter((t) => t.id !== id),
                }
              : ({transactions: [], summary: null} as TransactionsPayload),
          rollbackOnError: true,
          revalidate: true,
        },
      );
    },
    [mutate],
  );

  // Kept for API compatibility; the transactions page filters client-side and
  // drives reloads via refresh(), so these simply revalidate the cache.
  const fetchTransactions = useCallback(
    async (): Promise<void> => {
      await mutate();
    },
    [mutate],
  );
  const searchTransactions = useCallback(
    async (): Promise<void> => {
      await mutate();
    },
    [mutate],
  );

  return {
    transactions,
    summary,
    isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    payPeriod,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    searchTransactions,
    refresh,
  };
}

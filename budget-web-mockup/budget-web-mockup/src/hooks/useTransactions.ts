'use client';

import {useState, useCallback, useEffect} from 'react';
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

export function useTransactions(
  options?: UseTransactionsOptions | TransactionFilters,
): UseTransactionsReturn {
  // Support both old signature (filters) and new signature (options)
  const isOptionsObject = options && ('usePayPeriod' in options || 'initialFilters' in options);
  const initialFilters = isOptionsObject ? (options as UseTransactionsOptions).initialFilters : options as TransactionFilters | undefined;
  const usePayPeriod = isOptionsObject ? (options as UseTransactionsOptions).usePayPeriod : false;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<
    TransactionFilters | undefined
  >(initialFilters);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [payPeriod, setPayPeriod] = useState<{ start: string; end: string } | null>(null);
  const [payPeriodLoaded, setPayPeriodLoaded] = useState(!usePayPeriod); // Skip if not using pay period

  // Fetch categories for enrichment
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await categoryService.getCategories();
        setCategories(cats);
        setCategoriesLoaded(true);
      } catch (err) {
        console.error('Failed to load categories:', err);
        setCategoriesLoaded(true); // Still mark as loaded even on error
      }
    };
    loadCategories();
  }, []);

  // Fetch pay period dates if usePayPeriod is enabled
  useEffect(() => {
    if (!usePayPeriod) {
      setPayPeriodLoaded(true);
      return;
    }

    const loadPayPeriod = async () => {
      try {
        const homeSummary = await userService.getHomeSummary();
        setPayPeriod({
          start: homeSummary.period.start,
          end: homeSummary.period.end,
        });
        setPayPeriodLoaded(true);
      } catch (err) {
        console.error('Failed to load pay period:', err);
        setPayPeriodLoaded(true); // Still mark as loaded even on error
      }
    };
    loadPayPeriod();
  }, [usePayPeriod]);

  // Enrich transactions with category data
  const enrichTransactions = useCallback(
    (txns: Transaction[]): Transaction[] => {
      if (!categoriesLoaded || categories.length === 0) {
        // Return transactions as-is if categories aren't loaded yet
        return txns;
      }

      return txns.map(txn => {
        // Backend uses categoryId and subcategoryId, but also check category/subcategory for compatibility
        const txnAny = txn as unknown as Record<string, unknown>;
        const categoryId = (txnAny.categoryId || txn.category) as string;
        const subcategoryId = (txnAny.subcategoryId || txn.subcategory) as
          | string
          | undefined;

        const category = categories.find(c => c.id === categoryId);
        const subcategory = categories.find(c => c.id === subcategoryId);

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
    },
    [categories, categoriesLoaded],
  );

  const fetchTransactions = useCallback(
    async (filters?: TransactionFilters) => {
      setIsLoading(true);
      setError(null);
      setCurrentFilters(filters);

      try {
        // Merge pay period dates into filters if usePayPeriod is enabled
        let effectiveFilters = filters;
        if (usePayPeriod && payPeriod) {
          effectiveFilters = {
            ...filters,
            startDate: payPeriod.start,
            endDate: payPeriod.end,
          };
        }

        const [transactionsData, summaryData] = await Promise.all([
          transactionService.getTransactions(effectiveFilters),
          transactionService.getSummary(effectiveFilters),
        ]);

        const enrichedTransactions = enrichTransactions(transactionsData);
        setTransactions(enrichedTransactions);
        setSummary(summaryData);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch transactions';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [enrichTransactions, usePayPeriod, payPeriod],
  );

  const createTransaction = useCallback(
    async (data: CreateTransactionData): Promise<Transaction> => {
      setError(null);

      try {
        const newTransaction = await transactionService.createTransaction(data);
        const enrichedTransaction = enrichTransactions([newTransaction])[0];

        // Optimistic update
        setTransactions(prev => [enrichedTransaction, ...prev]);

        // Update summary
        if (summary) {
          const isIncome = data.type === 'INCOME';
          setSummary({
            ...summary,
            totalIncome: summary.totalIncome + (isIncome ? data.amount : 0),
            totalExpenses:
              summary.totalExpenses + (isIncome ? 0 : Math.abs(data.amount)),
            transactionCount: summary.transactionCount + 1,
            netAmount:
              summary.netAmount +
              (isIncome ? data.amount : -Math.abs(data.amount)),
          });
        }

        return enrichedTransaction;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create transaction';
        setError(message);
        throw err;
      }
    },
    [summary, enrichTransactions],
  );

  const updateTransaction = useCallback(
    async (id: string, data: UpdateTransactionData): Promise<Transaction> => {
      setError(null);

      try {
        const updatedTransaction = await transactionService.updateTransaction(
          id,
          data,
        );
        const enrichedTransaction = enrichTransactions([updatedTransaction])[0];

        // Optimistic update
        setTransactions(prev =>
          prev.map(t => (t.id === id ? enrichedTransaction : t)),
        );

        return enrichedTransaction;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update transaction';
        setError(message);
        throw err;
      }
    },
    [enrichTransactions],
  );

  const deleteTransaction = useCallback(
    async (id: string): Promise<void> => {
      setError(null);

      // Store for rollback
      const previousTransactions = transactions;

      // Optimistic update
      setTransactions(prev => prev.filter(t => t.id !== id));

      try {
        await transactionService.deleteTransaction(id);
      } catch (err) {
        // Rollback on error
        setTransactions(previousTransactions);
        const message =
          err instanceof Error ? err.message : 'Failed to delete transaction';
        setError(message);
        throw err;
      }
    },
    [transactions],
  );

  const searchTransactions = useCallback(
    async (query: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const results = await transactionService.searchTransactions(
          query,
          currentFilters,
        );
        const enrichedResults = enrichTransactions(results);
        setTransactions(enrichedResults);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [currentFilters, enrichTransactions],
  );

  const refresh = useCallback(async (): Promise<void> => {
    await fetchTransactions(currentFilters);
  }, [fetchTransactions, currentFilters]);

  // Re-enrich transactions when categories become available
  useEffect(() => {
    if (categoriesLoaded && categories.length > 0 && transactions.length > 0) {
      // Only re-enrich if transactions don't already have category names
      const needsEnrichment = transactions.some(
        t => !t.categoryName || t.categoryName === 'Uncategorized',
      );
      if (needsEnrichment) {
        setTransactions(prev =>
          prev.map(txn => {
            const category = categories.find(c => c.id === txn.category);
            const subcategory = categories.find(c => c.id === txn.subcategory);
            return {
              ...txn,
              categoryName: category?.name || 'Uncategorized',
              categoryColor: category?.color || '#6B7280',
              categoryIcon: category?.icon || 'help-circle-outline',
              subcategoryName: subcategory?.name,
            };
          }),
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesLoaded, categories.length]);

  // When the scope flips between the all-history search view and the
  // pay-period view, drop the previously loaded rows so the list shows a
  // loading state instead of briefly rendering the other scope's transactions.
  useEffect(() => {
    setTransactions([]);
    setIsLoading(true);
  }, [usePayPeriod]);

  // Initial fetch - wait for categories and pay period to load first
  // Include payPeriod in deps to ensure we refetch when period is available
  useEffect(() => {
    if (categoriesLoaded && payPeriodLoaded) {
      // Only fetch if payPeriod is set when usePayPeriod is enabled
      if (usePayPeriod && !payPeriod) {
        return; // Wait for payPeriod to be set
      }
      fetchTransactions(initialFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesLoaded, payPeriodLoaded, payPeriod, usePayPeriod]);

  return {
    transactions,
    summary,
    isLoading,
    error,
    payPeriod,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    searchTransactions,
    refresh,
  };
}

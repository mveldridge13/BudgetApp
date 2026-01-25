'use client';

import { useState, useCallback, useEffect } from 'react';
import { transactionService } from '@/services/transaction.service';
import { categoryService } from '@/services/category.service';
import {
  Transaction,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
  TransactionSummary,
  Category,
} from '@/types';

interface UseTransactionsReturn {
  transactions: Transaction[];
  summary: TransactionSummary | null;
  isLoading: boolean;
  error: string | null;
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>;
  createTransaction: (data: CreateTransactionData) => Promise<Transaction>;
  updateTransaction: (id: string, data: UpdateTransactionData) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  searchTransactions: (query: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useTransactions(initialFilters?: TransactionFilters): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<TransactionFilters | undefined>(initialFilters);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

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

  // Enrich transactions with category data
  const enrichTransactions = useCallback((txns: Transaction[]): Transaction[] => {
    if (!categoriesLoaded || categories.length === 0) {
      // Return transactions as-is if categories aren't loaded yet
      return txns;
    }

    return txns.map(txn => {
      // Backend uses categoryId and subcategoryId, but also check category/subcategory for compatibility
      const categoryId = (txn as any).categoryId || txn.category;
      const subcategoryId = (txn as any).subcategoryId || txn.subcategory;

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
  }, [categories, categoriesLoaded]);

  const fetchTransactions = useCallback(async (filters?: TransactionFilters) => {
    setIsLoading(true);
    setError(null);
    setCurrentFilters(filters);

    try {
      const [transactionsData, summaryData] = await Promise.all([
        transactionService.getTransactions(filters),
        transactionService.getSummary(filters),
      ]);

      const enrichedTransactions = enrichTransactions(transactionsData);
      setTransactions(enrichedTransactions);
      setSummary(summaryData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch transactions';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [enrichTransactions, categories.length]);

  const createTransaction = useCallback(async (data: CreateTransactionData): Promise<Transaction> => {
    setError(null);

    try {
      const newTransaction = await transactionService.createTransaction(data);
      const enrichedTransaction = enrichTransactions([newTransaction])[0];

      // Optimistic update
      setTransactions((prev) => [enrichedTransaction, ...prev]);

      // Update summary
      if (summary) {
        const isIncome = data.type === 'INCOME';
        setSummary({
          ...summary,
          totalIncome: summary.totalIncome + (isIncome ? data.amount : 0),
          totalExpenses: summary.totalExpenses + (isIncome ? 0 : Math.abs(data.amount)),
          transactionCount: summary.transactionCount + 1,
          netAmount: summary.netAmount + (isIncome ? data.amount : -Math.abs(data.amount)),
        });
      }

      return enrichedTransaction;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create transaction';
      setError(message);
      throw err;
    }
  }, [summary, enrichTransactions]);

  const updateTransaction = useCallback(async (id: string, data: UpdateTransactionData): Promise<Transaction> => {
    setError(null);

    try {
      const updatedTransaction = await transactionService.updateTransaction(id, data);
      const enrichedTransaction = enrichTransactions([updatedTransaction])[0];

      // Optimistic update
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? enrichedTransaction : t))
      );

      return enrichedTransaction;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update transaction';
      setError(message);
      throw err;
    }
  }, [enrichTransactions]);

  const deleteTransaction = useCallback(async (id: string): Promise<void> => {
    setError(null);

    // Store for rollback
    const previousTransactions = transactions;

    // Optimistic update
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    try {
      await transactionService.deleteTransaction(id);
    } catch (err) {
      // Rollback on error
      setTransactions(previousTransactions);
      const message = err instanceof Error ? err.message : 'Failed to delete transaction';
      setError(message);
      throw err;
    }
  }, [transactions]);

  const searchTransactions = useCallback(async (query: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await transactionService.searchTransactions(query, currentFilters);
      const enrichedResults = enrichTransactions(results);
      setTransactions(enrichedResults);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [currentFilters, enrichTransactions]);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchTransactions(currentFilters);
  }, [fetchTransactions, currentFilters]);

  // Re-enrich transactions when categories become available
  useEffect(() => {
    if (categoriesLoaded && categories.length > 0 && transactions.length > 0) {
      // Only re-enrich if transactions don't already have category names
      const needsEnrichment = transactions.some(t => !t.categoryName || t.categoryName === 'Uncategorized');
      if (needsEnrichment) {
        setTransactions(prev => prev.map(txn => {
          const category = categories.find(c => c.id === txn.category);
          const subcategory = categories.find(c => c.id === txn.subcategory);
          return {
            ...txn,
            categoryName: category?.name || 'Uncategorized',
            categoryColor: category?.color || '#6B7280',
            categoryIcon: category?.icon || 'help-circle-outline',
            subcategoryName: subcategory?.name,
          };
        }));
      }
    }
  }, [categoriesLoaded, categories.length]);

  // Initial fetch - wait for categories to load first
  useEffect(() => {
    if (categoriesLoaded) {
      fetchTransactions(initialFilters);
    }
  }, [categoriesLoaded]);

  return {
    transactions,
    summary,
    isLoading,
    error,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    searchTransactions,
    refresh,
  };
}

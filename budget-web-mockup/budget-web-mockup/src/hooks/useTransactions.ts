'use client';

import { useState, useCallback, useEffect } from 'react';
import { transactionService } from '@/services/transaction.service';
import {
  Transaction,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
  TransactionSummary,
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

  const fetchTransactions = useCallback(async (filters?: TransactionFilters) => {
    setIsLoading(true);
    setError(null);
    setCurrentFilters(filters);

    try {
      const [transactionsData, summaryData] = await Promise.all([
        transactionService.getTransactions(filters),
        transactionService.getSummary(filters),
      ]);

      setTransactions(transactionsData);
      setSummary(summaryData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch transactions';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTransaction = useCallback(async (data: CreateTransactionData): Promise<Transaction> => {
    setError(null);

    try {
      const newTransaction = await transactionService.createTransaction(data);

      // Optimistic update
      setTransactions((prev) => [newTransaction, ...prev]);

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

      return newTransaction;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create transaction';
      setError(message);
      throw err;
    }
  }, [summary]);

  const updateTransaction = useCallback(async (id: string, data: UpdateTransactionData): Promise<Transaction> => {
    setError(null);

    try {
      const updatedTransaction = await transactionService.updateTransaction(id, data);

      // Optimistic update
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? updatedTransaction : t))
      );

      return updatedTransaction;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update transaction';
      setError(message);
      throw err;
    }
  }, []);

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
      setTransactions(results);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [currentFilters]);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchTransactions(currentFilters);
  }, [fetchTransactions, currentFilters]);

  // Initial fetch
  useEffect(() => {
    fetchTransactions(initialFilters);
  }, []);

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

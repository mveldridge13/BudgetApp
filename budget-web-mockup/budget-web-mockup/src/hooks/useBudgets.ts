'use client';

import { useState, useCallback, useEffect } from 'react';
import { budgetService } from '@/services/budget.service';
import {
  Budget,
  CreateBudgetData,
  UpdateBudgetData,
  BudgetFilters,
  BudgetAnalytics,
} from '@/types';

interface UseBudgetsReturn {
  budgets: Budget[];
  isLoading: boolean;
  error: string | null;
  fetchBudgets: (filters?: BudgetFilters) => Promise<void>;
  createBudget: (data: CreateBudgetData) => Promise<Budget>;
  updateBudget: (id: string, data: UpdateBudgetData) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;
  getBudgetAnalytics: (id: string) => Promise<BudgetAnalytics>;
  refresh: () => Promise<void>;
}

export function useBudgets(initialFilters?: BudgetFilters): UseBudgetsReturn {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<BudgetFilters | undefined>(initialFilters);

  const fetchBudgets = useCallback(async (filters?: BudgetFilters) => {
    setIsLoading(true);
    setError(null);
    setCurrentFilters(filters);

    try {
      const budgetsData = await budgetService.getBudgets(filters);
      setBudgets(budgetsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch budgets';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createBudget = useCallback(async (data: CreateBudgetData): Promise<Budget> => {
    setError(null);

    try {
      const newBudget = await budgetService.createBudget(data);

      // Optimistic update
      setBudgets((prev) => [...prev, newBudget]);

      return newBudget;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create budget';
      setError(message);
      throw err;
    }
  }, []);

  const updateBudget = useCallback(async (id: string, data: UpdateBudgetData): Promise<Budget> => {
    setError(null);

    try {
      const updatedBudget = await budgetService.updateBudget(id, data);

      // Optimistic update
      setBudgets((prev) => prev.map((b) => (b.id === id ? updatedBudget : b)));

      return updatedBudget;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update budget';
      setError(message);
      throw err;
    }
  }, []);

  const deleteBudget = useCallback(async (id: string): Promise<void> => {
    setError(null);

    // Store for rollback
    const previousBudgets = budgets;

    // Optimistic update
    setBudgets((prev) => prev.filter((b) => b.id !== id));

    try {
      await budgetService.deleteBudget(id);
    } catch (err) {
      // Rollback on error
      setBudgets(previousBudgets);
      const message = err instanceof Error ? err.message : 'Failed to delete budget';
      setError(message);
      throw err;
    }
  }, [budgets]);

  const getBudgetAnalytics = useCallback(async (id: string): Promise<BudgetAnalytics> => {
    return budgetService.getBudgetAnalytics(id);
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchBudgets(currentFilters);
  }, [fetchBudgets, currentFilters]);

  // Initial fetch
  useEffect(() => {
    fetchBudgets(initialFilters);
  }, []);

  return {
    budgets,
    isLoading,
    error,
    fetchBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    getBudgetAnalytics,
    refresh,
  };
}

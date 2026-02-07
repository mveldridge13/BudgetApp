'use client';

import { useState, useCallback, useEffect } from 'react';
import { goalService } from '@/services/goal.service';
import {
  GoalDisplay,
  GoalFilters,
  GoalsSummary,
  CreateContributionData,
  GoalContribution,
} from '@/types';

interface UseGoalsReturn {
  goals: GoalDisplay[];
  summary: GoalsSummary | null;
  isLoading: boolean;
  error: string | null;
  fetchGoals: (filters?: GoalFilters) => Promise<void>;
  createGoal: (data: Partial<GoalDisplay>) => Promise<GoalDisplay>;
  updateGoal: (id: string, data: Partial<GoalDisplay>) => Promise<GoalDisplay>;
  deleteGoal: (id: string) => Promise<void>;
  addContribution: (goalId: string, data: CreateContributionData) => Promise<GoalContribution>;
  getProgress: (goal: GoalDisplay) => number;
  getDaysRemaining: (targetDate: string) => number;
  refresh: () => Promise<void>;
}

export function useGoals(initialFilters?: GoalFilters): UseGoalsReturn {
  const [goals, setGoals] = useState<GoalDisplay[]>([]);
  const [summary, setSummary] = useState<GoalsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<GoalFilters | undefined>(initialFilters);

  const fetchGoals = useCallback(async (filters?: GoalFilters) => {
    setIsLoading(true);
    setError(null);
    setCurrentFilters(filters);

    try {
      const [goalsData, summaryData] = await Promise.all([
        goalService.getGoals(filters),
        goalService.getGoalsSummary(filters),
      ]);

      setGoals(goalsData);
      setSummary(summaryData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch goals';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createGoal = useCallback(async (data: Partial<GoalDisplay>): Promise<GoalDisplay> => {
    setError(null);

    try {
      const newGoal = await goalService.createGoal(data);

      // Optimistic update
      setGoals((prev) => [newGoal, ...prev]);

      return newGoal;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create goal';
      setError(message);
      throw err;
    }
  }, []);

  const updateGoal = useCallback(async (id: string, data: Partial<GoalDisplay>): Promise<GoalDisplay> => {
    setError(null);

    try {
      const updatedGoal = await goalService.updateGoal(id, data);

      // Optimistic update
      setGoals((prev) => prev.map((g) => (g.id === id ? updatedGoal : g)));

      return updatedGoal;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update goal';
      setError(message);
      throw err;
    }
  }, []);

  const deleteGoal = useCallback(async (id: string): Promise<void> => {
    setError(null);

    // Store for rollback
    const previousGoals = goals;

    // Optimistic update
    setGoals((prev) => prev.filter((g) => g.id !== id));

    try {
      await goalService.deleteGoal(id);
    } catch (err) {
      // Rollback on error
      setGoals(previousGoals);
      const message = err instanceof Error ? err.message : 'Failed to delete goal';
      setError(message);
      throw err;
    }
  }, [goals]);

  const addContribution = useCallback(async (goalId: string, data: CreateContributionData): Promise<GoalContribution> => {
    setError(null);

    try {
      const contribution = await goalService.addContribution(goalId, data);

      // Update the goal's current amount
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goalId
            ? { ...g, current: g.current + Number(data.amount) }
            : g
        )
      );

      return contribution;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add contribution';
      setError(message);
      throw err;
    }
  }, []);

  const getProgress = useCallback((goal: GoalDisplay): number => {
    return goalService.calculateProgress(goal);
  }, []);

  const getDaysRemaining = useCallback((targetDate: string): number => {
    return goalService.calculateDaysRemaining(targetDate);
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchGoals(currentFilters);
  }, [fetchGoals, currentFilters]);

  // Initial fetch
  useEffect(() => {
    fetchGoals(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    goals,
    summary,
    isLoading,
    error,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    addContribution,
    getProgress,
    getDaysRemaining,
    refresh,
  };
}

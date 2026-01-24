import { useEffect, useState } from 'react';
import { goalService } from '@/services/goal.service';
import { Goal } from '@/types';

interface DashboardMetrics {
  totalSavings: number;
  activeGoalsCount: number;
  goals: Goal[];
  isLoading: boolean;
  error: Error | null;
}

export function useDashboardMetrics(): DashboardMetrics {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await goalService.getGoals();
        // Handle response that wraps goals in an object
        const goalsArray = Array.isArray(data)
          ? data
          : (data as any).goals
            ? (data as any).goals
            : [];
        setGoals(goalsArray);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch goals'));
        console.error('Failed to fetch goals:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoals();
  }, []);

  // Calculate total savings
  const totalSavings = calculateTotalSavings(goals);

  // Calculate active goals count
  const activeGoalsCount = calculateActiveGoalsCount(goals);

  return {
    totalSavings,
    activeGoalsCount,
    goals,
    isLoading,
    error,
  };
}

// Business logic functions
function calculateTotalSavings(goals: Goal[]): number {
  const goalsArray = Array.isArray(goals) ? goals : [];
  return goalsArray.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);
}

function calculateActiveGoalsCount(goals: Goal[]): number {
  const goalsArray = Array.isArray(goals) ? goals : [];
  return goalsArray.filter(goal => {
    return goal.status ? goal.status === 'ACTIVE' : goal.isActive;
  }).length;
}

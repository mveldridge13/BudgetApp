import { useEffect, useState } from 'react';
import { goalService } from '@/services/goal.service';
import { GoalDisplay } from '@/types';

interface DashboardMetrics {
  totalSavings: number;
  activeGoalsCount: number;
  goals: GoalDisplay[];
  isLoading: boolean;
  error: Error | null;
}

export function useDashboardMetrics(): DashboardMetrics {
  const [goals, setGoals] = useState<GoalDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await goalService.getGoals();
        setGoals(data);
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
function calculateTotalSavings(goals: GoalDisplay[]): number {
  const goalsArray = Array.isArray(goals) ? goals : [];
  return goalsArray.reduce((sum, goal) => sum + (goal.current || 0), 0);
}

function calculateActiveGoalsCount(goals: GoalDisplay[]): number {
  const goalsArray = Array.isArray(goals) ? goals : [];
  return goalsArray.filter(goal => goal.isActive).length;
}

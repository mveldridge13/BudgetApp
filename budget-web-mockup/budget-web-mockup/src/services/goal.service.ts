import { api } from './api';
import {
  Goal,
  CreateGoalData,
  UpdateGoalData,
  GoalContribution,
  CreateContributionData,
  GoalFilters,
  GoalAnalytics,
  GoalsSummary,
} from '@/types';

class GoalService {
  async getGoals(filters?: GoalFilters): Promise<Goal[]> {
    return api.get<Goal[]>('/goals', filters);
  }

  async getGoal(id: string): Promise<Goal> {
    return api.get<Goal>(`/goals/${id}`);
  }

  async createGoal(data: CreateGoalData): Promise<Goal> {
    return api.post<Goal>('/goals', data);
  }

  async updateGoal(id: string, data: UpdateGoalData): Promise<Goal> {
    return api.put<Goal>(`/goals/${id}`, data);
  }

  async deleteGoal(id: string): Promise<void> {
    await api.delete(`/goals/${id}`);
  }

  async addContribution(goalId: string, data: CreateContributionData): Promise<GoalContribution> {
    return api.post<GoalContribution>(`/goals/${goalId}/contributions`, data);
  }

  async getContributions(goalId: string, filters?: GoalFilters): Promise<GoalContribution[]> {
    return api.get<GoalContribution[]>(`/goals/${goalId}/contributions`, filters);
  }

  async getGoalAnalytics(goalId: string): Promise<GoalAnalytics> {
    return api.get<GoalAnalytics>(`/goals/${goalId}/analytics`);
  }

  async getGoalsSummary(filters?: GoalFilters): Promise<GoalsSummary> {
    return api.get<GoalsSummary>('/goals/analytics', filters);
  }

  // Helper methods
  calculateProgress(goal: Goal): number {
    if (goal.targetAmount === 0) return 0;
    return Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
  }

  calculateDaysRemaining(targetDate: string): number {
    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  calculateRequiredMonthlyContribution(goal: Goal): number {
    const remaining = goal.targetAmount - goal.currentAmount;
    if (remaining <= 0) return 0;

    const daysRemaining = this.calculateDaysRemaining(goal.targetDate);
    if (daysRemaining <= 0) return remaining;

    const monthsRemaining = daysRemaining / 30;
    return Math.ceil(remaining / monthsRemaining);
  }

  isOnTrack(goal: Goal): boolean {
    const progress = this.calculateProgress(goal);
    const daysRemaining = this.calculateDaysRemaining(goal.targetDate);
    const totalDays = Math.ceil(
      (new Date(goal.targetDate).getTime() - new Date(goal.createdAt || Date.now()).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const expectedProgress = ((totalDays - daysRemaining) / totalDays) * 100;
    return progress >= expectedProgress;
  }
}

export const goalService = new GoalService();

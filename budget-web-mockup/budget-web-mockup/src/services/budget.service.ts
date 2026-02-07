import { api } from './api';
import {
  Budget,
  CreateBudgetData,
  UpdateBudgetData,
  BudgetFilters,
  BudgetAnalytics,
  BudgetSummary,
} from '@/types';

class BudgetService {
  async getBudgets(filters?: BudgetFilters): Promise<Budget[]> {
    return api.get<Budget[]>('/budgets', filters as Record<string, unknown> | undefined);
  }

  async getBudget(id: string): Promise<Budget> {
    return api.get<Budget>(`/budgets/${id}`);
  }

  async createBudget(data: CreateBudgetData): Promise<Budget> {
    return api.post<Budget>('/budgets', data);
  }

  async updateBudget(id: string, data: UpdateBudgetData): Promise<Budget> {
    return api.put<Budget>(`/budgets/${id}`, data);
  }

  async deleteBudget(id: string): Promise<void> {
    await api.delete(`/budgets/${id}`);
  }

  async getBudgetAnalytics(id: string): Promise<BudgetAnalytics> {
    return api.get<BudgetAnalytics>(`/budgets/${id}/analytics`);
  }

  // Helper methods
  calculatePercentageUsed(spent: number, budgeted: number): number {
    if (budgeted === 0) return 0;
    return Math.round((spent / budgeted) * 100);
  }

  isOverBudget(spent: number, budgeted: number): boolean {
    return spent > budgeted;
  }

  getRemainingAmount(spent: number, budgeted: number): number {
    return Math.max(budgeted - spent, 0);
  }

  getDailyAllowance(budget: Budget, daysRemaining: number): number {
    const remaining = budget.amount; // Would need spent amount to calculate properly
    return daysRemaining > 0 ? remaining / daysRemaining : 0;
  }
}

export const budgetService = new BudgetService();

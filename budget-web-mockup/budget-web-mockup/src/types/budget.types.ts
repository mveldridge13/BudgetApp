import { DateRangeFilter, PaginationParams } from './api.types';

export type BudgetPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Budget {
  id: string;
  name: string;
  amount: number;
  period: BudgetPeriod;
  categories: string[];
  startDate: string;
  endDate?: string;
  isActive: boolean;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBudgetData {
  name: string;
  amount: number;
  period: BudgetPeriod;
  categories: string[];
  startDate: string;
  endDate?: string;
}

export interface UpdateBudgetData {
  name?: string;
  amount?: number;
  period?: BudgetPeriod;
  categories?: string[];
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface BudgetFilters extends DateRangeFilter, PaginationParams {
  isActive?: boolean;
  period?: BudgetPeriod;
}

export interface BudgetAnalytics {
  budgetId: string;
  budgetName: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  isOverBudget: boolean;
  categoryBreakdown: {
    categoryId: string;
    categoryName: string;
    spent: number;
    percentage: number;
  }[];
  dailySpending: {
    date: string;
    amount: number;
  }[];
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentageUsed: number;
  budgetsOverLimit: number;
}

import { api } from './api';
import { transactionService } from './transaction.service';
import { goalService } from './goal.service';
import { budgetService } from './budget.service';
import {
  TransactionAnalytics,
  BillsAnalytics,
  DiscretionaryBreakdown,
  GoalsSummary,
  BudgetAnalytics,
  DateRangeFilter,
} from '@/types';

export interface DashboardSummary {
  startingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  committedExpenses: number;
  discretionaryExpenses: number;
  leftToSpend: number;
  budgetLimit: number;
  percentageUsed: number;
  upcomingBills: number;
  overdueAmount: number;
  activeGoals: number;
  goalProgress: number;
}

export interface SpendingByCategory {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface SpendingTrend {
  date: string;
  income: number;
  expenses: number;
  net: number;
}

class AnalyticsService {
  async getDashboardSummary(filters?: DateRangeFilter): Promise<DashboardSummary> {
    const [transactionAnalytics, billsAnalytics, discretionaryBreakdown, goalsSummary] =
      await Promise.all([
        transactionService.getAnalytics(filters),
        transactionService.getBillsAnalytics(filters),
        transactionService.getDiscretionaryBreakdown(filters),
        goalService.getGoalsSummary(filters),
      ]);

    console.log('[Analytics] transactionAnalytics:', JSON.stringify(transactionAnalytics, null, 2));
    console.log('[Analytics] billsAnalytics:', JSON.stringify(billsAnalytics, null, 2));
    console.log('[Analytics] discretionaryBreakdown:', JSON.stringify(discretionaryBreakdown, null, 2));
    console.log('[Analytics] goalsSummary:', JSON.stringify(goalsSummary, null, 2));

    // Map API response fields to expected format
    const totalExpenses = transactionAnalytics.totalExpenses || 0;
    const discretionaryExpenses = discretionaryBreakdown.totalDiscretionaryAmount || 0;
    const committedExpenses = totalExpenses - discretionaryExpenses; // Committed = total - discretionary
    const budgetLimit = transactionAnalytics.totalIncome || 0;
    const leftToSpend = budgetLimit - totalExpenses;

    return {
      startingBalance: transactionAnalytics.totalIncome || 0,
      totalIncome: transactionAnalytics.totalIncome || 0,
      totalExpenses,
      committedExpenses,
      discretionaryExpenses,
      leftToSpend: Math.max(leftToSpend, 0),
      budgetLimit,
      percentageUsed: budgetLimit > 0 ? Math.round((totalExpenses / budgetLimit) * 100) : 0,
      upcomingBills: billsAnalytics.unpaidAmount || 0,
      overdueAmount: billsAnalytics.overdueAmount || 0,
      activeGoals: goalsSummary.activeGoals || 0,
      goalProgress: goalsSummary.overallProgress || 0,
    };
  }

  async getSpendingByCategory(filters?: DateRangeFilter): Promise<SpendingByCategory[]> {
    const analytics = await transactionService.getAnalytics(filters);

    const categoryBreakdown = analytics.categoryBreakdown || [];

    return categoryBreakdown.map((cat: { categoryId: string; categoryName: string; categoryColor?: string; amount: number; percentage: number; transactionCount?: number }) => ({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      categoryColor: cat.categoryColor || '#6366F1',
      amount: cat.amount || 0,
      percentage: cat.percentage || 0,
      transactionCount: cat.transactionCount || 0,
    }));
  }

  async getSpendingTrend(filters?: DateRangeFilter): Promise<SpendingTrend[]> {
    const analytics = await transactionService.getAnalytics(filters);

    // Use weeklyTrendWithLabels from dailyBurnRate since dailyTrend doesn't exist
    const weeklyTrend = analytics.dailyBurnRate?.weeklyTrendWithLabels || [];

    return weeklyTrend.map((day: { day: string; amount: number }) => ({
      date: day.day,
      income: 0, // API doesn't provide daily income
      expenses: day.amount || 0,
      net: -(day.amount || 0),
    }));
  }

  async getIncomeVsExpenses(filters?: DateRangeFilter): Promise<{
    totalIncome: number;
    totalExpenses: number;
    savings: number;
    savingsRate: number;
  }> {
    const analytics = await transactionService.getAnalytics(filters);
    const savings = analytics.totalIncome - analytics.totalExpenses;
    const savingsRate = analytics.totalIncome > 0
      ? Math.round((savings / analytics.totalIncome) * 100)
      : 0;

    return {
      totalIncome: analytics.totalIncome,
      totalExpenses: analytics.totalExpenses,
      savings,
      savingsRate,
    };
  }
}

export const analyticsService = new AnalyticsService();

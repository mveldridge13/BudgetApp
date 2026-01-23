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

    const totalExpenses = transactionAnalytics.totalExpenses;
    const committedExpenses = discretionaryBreakdown.totalCommitted;
    const discretionaryExpenses = discretionaryBreakdown.totalDiscretionary;
    const budgetLimit = transactionAnalytics.totalIncome; // Or from budget settings
    const leftToSpend = budgetLimit - totalExpenses;

    return {
      startingBalance: transactionAnalytics.totalIncome,
      totalIncome: transactionAnalytics.totalIncome,
      totalExpenses,
      committedExpenses,
      discretionaryExpenses,
      leftToSpend: Math.max(leftToSpend, 0),
      budgetLimit,
      percentageUsed: budgetLimit > 0 ? Math.round((totalExpenses / budgetLimit) * 100) : 0,
      upcomingBills: billsAnalytics.totalUpcoming,
      overdueAmount: billsAnalytics.totalOverdue,
      activeGoals: goalsSummary.activeGoals,
      goalProgress: goalsSummary.overallProgress,
    };
  }

  async getSpendingByCategory(filters?: DateRangeFilter): Promise<SpendingByCategory[]> {
    const analytics = await transactionService.getAnalytics(filters);

    return analytics.categoryBreakdown.map((cat) => ({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      categoryColor: '#6366F1', // Would come from category data
      amount: cat.amount,
      percentage: cat.percentage,
      transactionCount: 0, // Would need additional data
    }));
  }

  async getSpendingTrend(filters?: DateRangeFilter): Promise<SpendingTrend[]> {
    const analytics = await transactionService.getAnalytics(filters);

    return analytics.dailyTrend.map((day) => ({
      date: day.date,
      income: day.income,
      expenses: day.expenses,
      net: day.income - day.expenses,
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

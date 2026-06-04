import {api} from './api';
import {
  Goal,
  GoalDisplay,
  CreateGoalData,
  GoalContribution,
  CreateContributionData,
  GoalFilters,
  GoalAnalytics,
  GoalsSummary,
  GoalType,
  GoalTypeDisplay,
  GoalCategory,
  GoalPriority,
  GoalPriorityDisplay,
  RolloverAllocationResponse,
} from '@/types';

// Category mapping: Frontend display <-> Backend enum
const CATEGORY_TO_BACKEND: Record<string, GoalCategory> = {
  Security: 'EMERGENCY_FUND',
  'Emergency Fund': 'EMERGENCY_FUND',
  Travel: 'VACATION',
  Vacation: 'VACATION',
  Property: 'HOME_PURCHASE',
  Home: 'HOME_PURCHASE',
  Transport: 'CAR_PURCHASE',
  Car: 'CAR_PURCHASE',
  Debt: 'DEBT_PAYOFF',
  'Debt Repayment': 'DEBT_PAYOFF',
  Education: 'EDUCATION',
  Retirement: 'RETIREMENT',
  Investment: 'INVESTMENT',
  Savings: 'GENERAL_SAVINGS',
  General: 'GENERAL_SAVINGS',
  Food: 'GENERAL_SAVINGS',
  Entertainment: 'GENERAL_SAVINGS',
  Health: 'GENERAL_SAVINGS',
  Shopping: 'GENERAL_SAVINGS',
  Utilities: 'GENERAL_SAVINGS',
  Bills: 'GENERAL_SAVINGS',
  Other: 'GENERAL_SAVINGS',
};

const CATEGORY_TO_FRONTEND: Record<string, string> = {
  EMERGENCY_FUND: 'Security',
  VACATION: 'Travel',
  HOME_PURCHASE: 'Property',
  CAR_PURCHASE: 'Transport',
  DEBT_PAYOFF: 'Debt',
  EDUCATION: 'Education',
  RETIREMENT: 'Retirement',
  INVESTMENT: 'Investment',
  GENERAL_SAVINGS: 'Savings',
};

// Type mapping
const TYPE_TO_BACKEND: Record<GoalTypeDisplay, GoalType> = {
  savings: 'SAVINGS',
  debt: 'DEBT_PAYOFF',
  spending: 'SPENDING_LIMIT',
};

const TYPE_TO_FRONTEND: Record<string, GoalTypeDisplay> = {
  SAVINGS: 'savings',
  DEBT_PAYOFF: 'debt',
  SPENDING_LIMIT: 'spending',
  INVESTMENT: 'savings',
};

// Priority mapping
const PRIORITY_TO_BACKEND: Record<GoalPriorityDisplay, GoalPriority> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
};

const PRIORITY_TO_FRONTEND: Record<string, GoalPriorityDisplay> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'high',
};

// Loan Term mapping
const LOAN_TERM_TO_BACKEND: Record<string, string> = {
  '1': 'ONE_YEAR',
  '3': 'THREE_YEARS',
  '5': 'FIVE_YEARS',
  '7': 'SEVEN_YEARS',
};

const LOAN_TERM_TO_FRONTEND: Record<string, string> = {
  ONE_YEAR: '1',
  THREE_YEARS: '3',
  FIVE_YEARS: '5',
  SEVEN_YEARS: '7',
};

class GoalService {
  // Transform backend goal to frontend display format
  transformBackendGoal(backendGoal: Goal): GoalDisplay {
    return {
      id: backendGoal.id,
      title: backendGoal.name,
      type: TYPE_TO_FRONTEND[backendGoal.type] || 'savings',
      target: backendGoal.targetAmount,
      current: backendGoal.currentAmount,
      originalAmount: backendGoal.originalAmount || backendGoal.targetAmount,
      deadline: backendGoal.targetDate,
      category:
        backendGoal.originalCategory ||
        CATEGORY_TO_FRONTEND[backendGoal.category] ||
        backendGoal.category ||
        'Other',
      priority: PRIORITY_TO_FRONTEND[backendGoal.priority] || 'medium',
      autoContribute: backendGoal.monthlyTarget || 0,
      showOnBalanceCard: backendGoal.showOnBalanceCard || false,
      isActive: !backendGoal.isCompleted && backendGoal.isActive !== false,
      completedDate: backendGoal.isCompleted
        ? backendGoal.updatedAt
        : undefined,
      description: backendGoal.description,
      createdAt: backendGoal.createdAt,
      updatedAt: backendGoal.updatedAt,
      interestRate: backendGoal.interestRate,
      minimumPayment: backendGoal.minimumPayment,
      loanTerm: backendGoal.loanTerm
        ? LOAN_TERM_TO_FRONTEND[backendGoal.loanTerm]
        : undefined,
    };
  }

  // Transform frontend goal to backend format
  transformFrontendGoal(
    frontendGoal: Partial<GoalDisplay> & {
      title?: string;
      target?: number;
      deadline?: string;
    },
  ): CreateGoalData {
    const type = frontendGoal.type
      ? TYPE_TO_BACKEND[frontendGoal.type]
      : 'SAVINGS';
    const category = frontendGoal.category
      ? CATEGORY_TO_BACKEND[frontendGoal.category] || 'GENERAL_SAVINGS'
      : 'GENERAL_SAVINGS';
    const priority = frontendGoal.priority
      ? PRIORITY_TO_BACKEND[frontendGoal.priority]
      : 'MEDIUM';

    // Calculate targetAmount based on goal type
    let targetAmount: number;
    if (frontendGoal.type === 'debt') {
      targetAmount = frontendGoal.originalAmount || frontendGoal.target || 0;
    } else {
      targetAmount = frontendGoal.target || 0;
    }

    const data: CreateGoalData = {
      name: frontendGoal.title || '',
      targetAmount: Number(targetAmount.toFixed(2)),
      currentAmount: Number((frontendGoal.current || 0).toFixed(2)),
      currency: 'AUD',
      category,
      type,
      priority,
      isActive: frontendGoal.isActive !== false,
      isCompleted: false,
      showOnBalanceCard: frontendGoal.showOnBalanceCard || false,
      originalCategory: frontendGoal.category, // Preserve for spending goals
    };

    if (frontendGoal.description) {
      data.description = frontendGoal.description;
    }

    if (frontendGoal.deadline) {
      data.targetDate = frontendGoal.deadline;
    }

    if (frontendGoal.autoContribute && frontendGoal.autoContribute > 0) {
      data.monthlyTarget = Number(frontendGoal.autoContribute.toFixed(2));
    }

    if (frontendGoal.type === 'debt' && frontendGoal.originalAmount) {
      data.originalAmount = Number(frontendGoal.originalAmount.toFixed(2));
    }

    // Add debt-specific fields
    if (frontendGoal.interestRate !== undefined) {
      data.interestRate = frontendGoal.interestRate;
    }

    if (frontendGoal.minimumPayment !== undefined) {
      data.minimumPayment = frontendGoal.minimumPayment;
    }

    if (frontendGoal.loanTerm !== undefined && frontendGoal.loanTerm !== '') {
      data.loanTerm =
        LOAN_TERM_TO_BACKEND[frontendGoal.loanTerm] || frontendGoal.loanTerm;
    }

    return data;
  }

  async getGoals(filters?: GoalFilters): Promise<GoalDisplay[]> {
    const goals = await api.get<Goal[]>(
      '/goals',
      filters as Record<string, unknown> | undefined,
    );
    return goals.map(g => this.transformBackendGoal(g));
  }

  async getGoal(id: string): Promise<GoalDisplay> {
    const goal = await api.get<Goal>(`/goals/${id}`);
    return this.transformBackendGoal(goal);
  }

  async createGoal(data: Partial<GoalDisplay>): Promise<GoalDisplay> {
    const backendData = this.transformFrontendGoal(data);
    const goal = await api.post<Goal>('/goals', backendData);
    return this.transformBackendGoal(goal);
  }

  async updateGoal(
    id: string,
    data: Partial<GoalDisplay>,
  ): Promise<GoalDisplay> {
    const backendData = this.transformFrontendGoal(data);
    const goal = await api.put<Goal>(`/goals/${id}`, backendData);
    return this.transformBackendGoal(goal);
  }

  async deleteGoal(id: string): Promise<void> {
    await api.delete(`/goals/${id}`);
  }

  async addContribution(
    goalId: string,
    data: CreateContributionData,
  ): Promise<GoalContribution> {
    return api.post<GoalContribution>(`/goals/${goalId}/contributions`, data);
  }

  async getContributions(
    goalId: string,
    filters?: GoalFilters,
  ): Promise<GoalContribution[]> {
    return api.get<GoalContribution[]>(
      `/goals/${goalId}/contributions`,
      filters as Record<string, unknown> | undefined,
    );
  }

  async getGoalAnalytics(goalId: string): Promise<GoalAnalytics> {
    return api.get<GoalAnalytics>(`/goals/${goalId}/analytics`);
  }

  async getGoalsSummary(filters?: GoalFilters): Promise<GoalsSummary> {
    return api.get<GoalsSummary>(
      '/goals/analytics',
      filters as Record<string, unknown> | undefined,
    );
  }

  /**
   * Allocate rollover funds to goals (atomic operation)
   * Backend atomically: creates contributions, deducts rolloverAmount, updates/dismisses notification
   *
   * @param goalAllocations - Array of { goalId, amount } objects
   * @param description - Description for the contributions
   */
  async allocateRolloverToGoals(
    goalAllocations: Array<{ goalId: string; amount: number }>,
    description: string,
  ): Promise<RolloverAllocationResponse> {
    return api.post<RolloverAllocationResponse>('/goals/rollover-contribution', {
      goalAllocations,
      description,
    });
  }

  // Helper methods
  calculateProgress(goal: GoalDisplay): number {
    if (goal.type === 'debt') {
      const originalAmount = goal.originalAmount || goal.target;
      if (originalAmount === 0) return 0;
      const paid = originalAmount - goal.current;
      return Math.min(Math.round((paid / originalAmount) * 100), 100);
    }

    if (goal.target === 0) return 0;
    return Math.min(Math.round((goal.current / goal.target) * 100), 100);
  }

  calculateDaysRemaining(targetDate: string): number {
    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  calculateRequiredMonthlyContribution(goal: GoalDisplay): number {
    if (goal.type === 'debt') {
      const remaining = goal.current;
      if (remaining <= 0) return 0;

      const daysRemaining = this.calculateDaysRemaining(goal.deadline);
      if (daysRemaining <= 0) return remaining;

      const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30));
      return Math.ceil(remaining / monthsRemaining);
    }

    const remaining = goal.target - goal.current;
    if (remaining <= 0) return 0;

    const daysRemaining = this.calculateDaysRemaining(goal.deadline);
    if (daysRemaining <= 0) return remaining;

    const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30));
    return Math.ceil(remaining / monthsRemaining);
  }

  isGoalOverdue(goal: GoalDisplay): boolean {
    if (!goal.deadline) return false;
    const daysRemaining = this.calculateDaysRemaining(goal.deadline);
    const progress = this.calculateProgress(goal);
    return daysRemaining < 0 && progress < 100;
  }

  isOnTrack(goal: GoalDisplay): boolean {
    const progress = this.calculateProgress(goal);
    const daysRemaining = this.calculateDaysRemaining(goal.deadline);
    const totalDays = Math.ceil(
      (new Date(goal.deadline).getTime() -
        new Date(goal.createdAt || Date.now()).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const expectedProgress = ((totalDays - daysRemaining) / totalDays) * 100;
    return progress >= expectedProgress;
  }

  // Get goals that should show on balance card
  getBalanceCardGoals(goals: GoalDisplay[]): GoalDisplay[] {
    return goals.filter(goal => goal.showOnBalanceCard && goal.isActive);
  }

  // Calculate total monthly contributions from balance card goals
  calculateTotalGoalContributions(goals: GoalDisplay[]): number {
    return goals
      .filter(goal => goal.showOnBalanceCard && goal.autoContribute > 0)
      .reduce((sum, goal) => sum + goal.autoContribute, 0);
  }
}

export const goalService = new GoalService();

import { DateRangeFilter, PaginationParams } from './api.types';

export type GoalPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';

export interface Goal {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
  priority: GoalPriority;
  isActive: boolean;
  status?: GoalStatus;
  showOnBalanceCard?: boolean;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateGoalData {
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate: string;
  category?: string;
  priority?: GoalPriority;
}

export interface UpdateGoalData {
  name?: string;
  description?: string;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string;
  category?: string;
  priority?: GoalPriority;
  isActive?: boolean;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt?: string;
}

export interface CreateContributionData {
  amount: number;
  date?: string;
  notes?: string;
}

export interface GoalFilters extends DateRangeFilter, PaginationParams {
  isActive?: boolean;
  priority?: GoalPriority;
  category?: string;
}

export interface GoalAnalytics {
  goalId: string;
  progressPercentage: number;
  daysRemaining: number;
  requiredMonthlyContribution: number;
  projectedCompletionDate: string;
  isOnTrack: boolean;
  contributionHistory: {
    date: string;
    amount: number;
  }[];
}

export interface GoalsSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallProgress: number;
}

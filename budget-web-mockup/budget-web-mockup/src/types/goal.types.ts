import { DateRangeFilter, PaginationParams } from './api.types';

// Backend API types (what the API expects/returns)
export type GoalPriority = 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
export type GoalType = 'SAVINGS' | 'SPENDING_LIMIT' | 'DEBT_PAYOFF' | 'INVESTMENT';
export type GoalCategory =
  | 'EMERGENCY_FUND'
  | 'VACATION'
  | 'HOME_PURCHASE'
  | 'CAR_PURCHASE'
  | 'DEBT_PAYOFF'
  | 'EDUCATION'
  | 'RETIREMENT'
  | 'INVESTMENT'
  | 'GENERAL_SAVINGS';
export type ContributionType = 'MANUAL' | 'ROLLOVER' | 'WITHDRAWAL' | 'AUTO';

// Frontend display types (what the UI uses)
export type GoalTypeDisplay = 'savings' | 'spending' | 'debt';
export type GoalPriorityDisplay = 'high' | 'medium' | 'low';

// API Goal structure (from backend)
export interface Goal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  originalAmount?: number; // For debt goals
  targetDate: string;
  category: GoalCategory | string;
  originalCategory?: string; // Preserved for spending goals
  type: GoalType;
  priority: GoalPriority;
  monthlyTarget?: number; // Auto-contribution amount
  isActive: boolean;
  isCompleted?: boolean;
  status?: GoalStatus;
  showOnBalanceCard?: boolean;
  currency?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  interestRate?: number;
  minimumPayment?: number;
  loanTerm?: string;
}

// Frontend Goal structure (transformed for display)
export interface GoalDisplay {
  id: string;
  title: string;
  description?: string;
  type: GoalTypeDisplay;
  target: number;
  current: number;
  originalAmount?: number;
  deadline: string;
  category: string;
  priority: GoalPriorityDisplay;
  autoContribute: number;
  showOnBalanceCard: boolean;
  isActive: boolean;
  completedDate?: string;
  createdAt?: string;
  updatedAt?: string;
  lastProgressUpdate?: string;
  interestRate?: number;
  minimumPayment?: number;
  loanTerm?: string;
}

export interface CreateGoalData {
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount?: number;
  originalAmount?: number;
  targetDate?: string;
  category?: GoalCategory | string;
  originalCategory?: string;
  type?: GoalType;
  priority?: GoalPriority;
  monthlyTarget?: number;
  showOnBalanceCard?: boolean;
  currency?: string;
  isActive?: boolean;
  isCompleted?: boolean;
  interestRate?: number;
  minimumPayment?: number;
  loanTerm?: string;
}

export interface UpdateGoalData {
  name?: string;
  description?: string;
  targetAmount?: number;
  currentAmount?: number;
  originalAmount?: number;
  targetDate?: string;
  category?: GoalCategory | string;
  originalCategory?: string;
  type?: GoalType;
  priority?: GoalPriority;
  monthlyTarget?: number;
  isActive?: boolean;
  isCompleted?: boolean;
  showOnBalanceCard?: boolean;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  currency?: string;
  description?: string;
  type: ContributionType;
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateContributionData {
  amount: number | string;
  currency?: string;
  description?: string;
  type?: ContributionType;
  date?: string;
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

// Rollover allocation types
export interface RolloverAllocationRequest {
  goalAllocations: Array<{ goalId: string; amount: number }>;
  description: string;
}

export interface RolloverAllocationResponse {
  success: boolean;
  newRolloverAmount: number;
  contributions: GoalContribution[];
  message?: string;
}

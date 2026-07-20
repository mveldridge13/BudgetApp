export type PlanType =
  | 'PURCHASE'
  | 'INCOME'
  | 'BILL_CHANGE'
  | 'GOAL_CHANGE'
  | 'DEBT_PAYMENT';

export type PlanStatus = 'DRAFT' | 'PLANNED' | 'COMPLETED' | 'CANCELLED';

export type PlanDirection = 'INFLOW' | 'OUTFLOW';

export type PlanLinkedEntityType = 'TRANSACTION' | 'GOAL';

export interface Plan {
  id: string;
  userId: string;
  type: PlanType;
  status: PlanStatus;
  direction: PlanDirection;
  amount: number;
  plannedDate: string;
  description?: string | null;
  linkedEntityType?: PlanLinkedEntityType | null;
  linkedEntityId?: string | null;
  completedAt?: string | null;
  completedEntityId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanData {
  type: PlanType;
  status?: 'DRAFT' | 'PLANNED';
  direction: PlanDirection;
  amount: number;
  plannedDate: string;
  description?: string;
  linkedEntityType?: PlanLinkedEntityType;
  linkedEntityId?: string;
}

export type UpdatePlanData = Partial<Omit<CreatePlanData, 'status'>>;

export type FinancialEventDirection = 'INFLOW' | 'OUTFLOW';

export type FinancialEventSourceType =
  | 'PRIMARY_INCOME'
  | 'INCOME_SOURCE'
  | 'RECURRING_BILL'
  | 'PLAN';

export interface FinancialEvent {
  date: string;
  amount: number;
  direction: FinancialEventDirection;
  sourceType: FinancialEventSourceType;
  sourceId: string;
  isRequired: boolean;
  description: string;
}

export interface DailyBalance {
  date: string;
  balance: number;
}

export type InsightSeverity = 'positive' | 'warning' | 'neutral';

// A schedule-level observation about one active plan's consequences
// (clustering, income timing, period shift, cash availability, risk) -
// planId === '' means it's scenario-level, not attributable to one plan.
export interface PlanInsight {
  planId: string;
  severity: InsightSeverity;
  message: string;
}

export interface ForecastResult {
  events: FinancialEvent[];
  dailyBalances: DailyBalance[];
  breaches: DailyBalance[];
  // Same projection with all active plans excluded - "if nothing changes."
  baselineDailyBalances: DailyBalance[];
  baselineBreaches: DailyBalance[];
  insights: PlanInsight[];
}

export type ForecastHorizonDays = 30 | 60 | 90;

// Today's balance is derived live from Left to Spend + income-source surplus
// (see ForecastResult.dailyBalances[0]) — this only holds the safety buffer,
// which has no other source of truth.
export interface PlannerSettings {
  safetyBufferAmount: number | null;
}

export interface UpdatePlannerSettingsData {
  safetyBufferAmount?: number;
  clearSafetyBuffer?: boolean;
}

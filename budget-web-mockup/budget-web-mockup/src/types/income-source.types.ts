// Recurring non-salary income stream (e.g. fortnightly child support).
// The backend materializes due occurrences as INCOME transactions linked via
// incomeSourceId, so the money flows through all existing period math.

export type IncomeSourceFrequency = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  frequency: IncomeSourceFrequency;
  nextPaymentDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncomeSourceInput {
  name: string;
  amount: number;
  frequency: IncomeSourceFrequency;
  nextPaymentDate: string;
  isActive?: boolean;
}

export type UpdateIncomeSourceInput = Partial<CreateIncomeSourceInput>;

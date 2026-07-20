import { DateRangeFilter, PaginationParams } from './api.types';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ROLLOVER';
export type PaymentStatus = 'UPCOMING' | 'PAID' | 'OVERDUE';
export type RecurrenceType = 'none' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'sixmonths' | 'yearly';

export interface RecurringPattern {
  type: RecurrenceType;
  frequency: number;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category?: string; // Legacy field for compatibility
  categoryId?: string; // Primary field from backend
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
  subcategory?: string; // Legacy field for compatibility
  subcategoryId?: string; // Primary field from backend
  subcategoryName?: string;
  description: string;
  notes?: string;
  date: string;
  dueDate?: string;
  recurrence?: RecurrenceType; // Backend uses this field
  isRecurring?: boolean; // Legacy field
  recurringPattern?: RecurringPattern; // Legacy field
  status?: PaymentStatus; // Backend uses this field
  paymentStatus?: PaymentStatus; // Legacy field
  budgetId?: string;
  location?: string;
  incomeSourceId?: string; // Which IncomeSource this income/goal payment came from
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTransactionData {
  amount: number;
  type: TransactionType;
  categoryId: string; // Backend expects categoryId
  subcategoryId?: string; // Backend expects subcategoryId
  description: string;
  notes?: string;
  date: string;
  dueDate?: string;
  recurrence?: RecurrenceType; // Backend expects recurrence field
  status?: PaymentStatus; // Backend expects status, not paymentStatus
  budgetId?: string;
  location?: string;
  incomeSourceId?: string | null; // Attribute to an IncomeSource (income & goal payments); null = unattributed
}

export interface UpdateTransactionData {
  amount?: number;
  type?: TransactionType;
  categoryId?: string; // Backend expects categoryId
  subcategoryId?: string; // Backend expects subcategoryId
  description?: string;
  notes?: string;
  date?: string;
  dueDate?: string;
  recurrence?: RecurrenceType; // Backend expects recurrence field
  status?: PaymentStatus; // Backend expects status
  paymentStatus?: PaymentStatus;
  budgetId?: string;
  location?: string;
  incomeSourceId?: string | null; // Change/clear IncomeSource attribution
}

export interface TransactionFilters extends DateRangeFilter, PaginationParams {
  type?: TransactionType;
  category?: string;
  paymentStatus?: PaymentStatus;
  isRecurring?: boolean;
  search?: string;
  sortBy?: 'date' | 'amount' | 'category';
  sortOrder?: 'asc' | 'desc';
  [key: string]: unknown; // Allow index signature for compatibility with Record<string, unknown>
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
}

export interface TransactionAnalytics {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  categoryBreakdown: {
    categoryId: string;
    categoryName: string;
    amount: number;
    percentage: number;
  }[];
  dailyTrend: {
    date: string;
    income: number;
    expenses: number;
  }[];
}

// Matches the actual backend response (TransactionsService.getBillsAnalytics)
// exactly - this previously didn't (claimed totalUpcoming/totalOverdue and
// typed overdueBills as an array), which crashed PlanFormModal in production
// since overdueBills is really a count; the array is overdueBillsList.
export interface BillsAnalyticsBill {
  id: string;
  description: string;
  amount: number;
  dueDate?: string | null;
  status: string;
  category?: {name: string} | null;
  recurrence?: string;
}

export interface BillsAnalytics {
  period?: {
    start: string;
    end: string;
    isPayPeriod: boolean;
    frequency: string | null;
  };
  totalBills: number;
  paidBills: number;
  unpaidBills: number;
  overdueBills: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  overdueAmount: number;
  progress: number;
  upcomingBills: BillsAnalyticsBill[];
  paidBillsList: BillsAnalyticsBill[];
  unpaidBillsList: BillsAnalyticsBill[];
  overdueBillsList: BillsAnalyticsBill[];
}

export interface DiscretionarySubcategory {
  subcategoryId?: string;
  subcategoryName: string;
  amount: number;
  transactionCount: number;
  percentage: number; // share within the parent category
  transactions?: {
    id: string;
    date: string;
    amount: number;
    description?: string;
    merchant?: string;
  }[];
}

export interface DiscretionaryBreakdownCategory {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  categoryColor?: string;
  amount: number;
  transactionCount: number;
  percentage: number;
  // Backend returns one entry per transaction; group by name for a clean list.
  subcategories?: DiscretionarySubcategory[];
}

// Matches backend DiscretionaryBreakdownDto: discretionary-only and scoped to a
// single period (the day/week/month containing selectedDate/endDate).
export interface DiscretionaryBreakdown {
  selectedDate: string;
  selectedPeriod: 'daily' | 'weekly' | 'monthly';
  totalDiscretionaryAmount: number;
  categoryBreakdown: DiscretionaryBreakdownCategory[];
  previousPeriod?: {
    date: string;
    totalDiscretionaryAmount: number;
    percentageChange: number;
    topCategories: { categoryName: string; amount: number }[];
  };
  summary?: {
    transactionCount: number;
    topSpendingCategory?: {
      categoryName: string;
      amount: number;
      percentage: number;
    };
  };
}

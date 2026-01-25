import { DateRangeFilter, PaginationParams } from './api.types';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ROLLOVER';
export type PaymentStatus = 'UPCOMING' | 'PAID' | 'OVERDUE';
export type RecurrenceType = 'none' | 'weekly' | 'fortnightly' | 'monthly' | 'sixmonths' | 'yearly';

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

export interface BillsAnalytics {
  totalUpcoming: number;
  totalOverdue: number;
  upcomingBills: Transaction[];
  overdueBills: Transaction[];
}

export interface DiscretionaryBreakdown {
  totalDiscretionary: number;
  totalCommitted: number;
  categories: {
    categoryId: string;
    categoryName: string;
    amount: number;
    isDiscretionary: boolean;
  }[];
}

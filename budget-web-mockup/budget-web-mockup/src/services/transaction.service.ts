import {api} from './api';
import {
  Transaction,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
  TransactionSummary,
  TransactionAnalytics,
  BillsAnalytics,
  DiscretionaryBreakdown,
} from '@/types';

class TransactionService {
  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    return api.get<Transaction[]>('/transactions', filters as Record<string, unknown> | undefined);
  }

  async getTransaction(id: string): Promise<Transaction> {
    return api.get<Transaction>(`/transactions/${id}`);
  }

  async createTransaction(data: CreateTransactionData): Promise<Transaction> {
    return api.post<Transaction>('/transactions', data);
  }

  async updateTransaction(
    id: string,
    data: UpdateTransactionData,
  ): Promise<Transaction> {
    return api.patch<Transaction>(`/transactions/${id}`, data);
  }

  async deleteTransaction(id: string): Promise<void> {
    await api.delete(`/transactions/${id}`);
  }

  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    return api.get<Transaction[]>('/transactions/recent', {limit});
  }

  async searchTransactions(
    query: string,
    filters?: TransactionFilters,
  ): Promise<Transaction[]> {
    return api.get<Transaction[]>('/transactions/search', {query, ...(filters as Record<string, unknown> | undefined || {})});
  }

  async getTransactionsByCategory(
    categoryId: string,
    filters?: TransactionFilters,
  ): Promise<Transaction[]> {
    return api.get<Transaction[]>(
      `/transactions/by-category/${categoryId}`,
      filters,
    );
  }

  async getTransactionsByBudget(
    budgetId: string,
    filters?: TransactionFilters,
  ): Promise<Transaction[]> {
    return api.get<Transaction[]>(
      `/transactions/by-budget/${budgetId}`,
      filters,
    );
  }

  async getSummary(filters?: TransactionFilters): Promise<TransactionSummary> {
    return api.get<TransactionSummary>('/transactions/summary', filters as Record<string, unknown> | undefined);
  }

  async getAnalytics(
    filters?: TransactionFilters,
  ): Promise<TransactionAnalytics> {
    return api.get<TransactionAnalytics>('/transactions/analytics', filters as Record<string, unknown> | undefined);
  }

  async getBillsAnalytics(
    filters?: TransactionFilters,
  ): Promise<BillsAnalytics> {
    return api.get<BillsAnalytics>('/transactions/bills-analytics', filters as Record<string, unknown> | undefined);
  }

  async getIncomeAnalytics(
    filters?: TransactionFilters,
  ): Promise<TransactionAnalytics> {
    return api.get<TransactionAnalytics>(
      '/transactions/income-analytics',
      filters,
    );
  }

  async getDiscretionaryBreakdown(
    filters?: TransactionFilters,
  ): Promise<DiscretionaryBreakdown> {
    return api.get<DiscretionaryBreakdown>(
      '/transactions/discretionary-breakdown',
      filters,
    );
  }

  async getDayTimePatterns(filters?: TransactionFilters): Promise<unknown> {
    return api.get('/transactions/day-time-patterns', filters as Record<string, unknown> | undefined);
  }
}

export const transactionService = new TransactionService();

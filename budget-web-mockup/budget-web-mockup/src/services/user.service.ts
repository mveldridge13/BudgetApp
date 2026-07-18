import { api } from './api';
import {
  UserIncome,
  UpdateIncomeData,
  RolloverSettings,
  UpdateRolloverData,
  RolloverEntry,
  CreateRolloverEntryData,
  RolloverHistory,
  ExportDataResponse,
  UserProfile,
} from '@/types';

class UserService {
  // Profile
  async getProfile(): Promise<UserProfile> {
    return api.get<UserProfile>('/users/profile');
  }

  // Income management
  async getIncome(): Promise<UserIncome> {
    return api.get<UserIncome>('/users/income');
  }

  async updateIncome(data: UpdateIncomeData): Promise<UserIncome> {
    return api.put<UserIncome>('/users/income', data);
  }

  // Rollover management
  async getRollover(): Promise<RolloverSettings> {
    return api.get<RolloverSettings>('/users/rollover');
  }

  async updateRollover(data: UpdateRolloverData): Promise<RolloverSettings> {
    return api.put<RolloverSettings>('/users/rollover', data);
  }

  async addRolloverEntry(data: CreateRolloverEntryData): Promise<RolloverEntry> {
    return api.post<RolloverEntry>('/users/rollover/entries', data);
  }

  async getRolloverHistory(filters?: { startDate?: string; endDate?: string }): Promise<RolloverHistory> {
    return api.get<RolloverHistory>('/users/rollover/history', filters as Record<string, unknown> | undefined);
  }

  /**
   * Dismiss rollover notification banner
   * Marks notification as dismissed, funds stay in spendable pool
   */
  async dismissRolloverNotification(): Promise<void> {
    await api.delete('/users/rollover/notification');
  }

  // Account management
  async deleteProfile(): Promise<void> {
    await api.delete('/users/profile');
  }

  async deleteAccount(): Promise<void> {
    await api.delete('/users/account');
  }

  async exportData(): Promise<ExportDataResponse> {
    return api.post<ExportDataResponse>('/users/export-data');
  }

  // Home summary (single source of truth for balance card)
  async getHomeSummary(): Promise<HomeSummaryResponse> {
    return api.get<HomeSummaryResponse>('/home/summary');
  }
}

// Home summary types

// A single committed bill/obligation in the current pay period. `status` is the
// computed display status (PAID / UPCOMING / OVERDUE).
export interface CommittedItem {
  id: string;
  description: string;
  amount: number;
  status: string | null;
  date: string;
  dueDate: string | null;
  categoryName: string | null;
}

// A per-income-stream ledger entry. Attribution-only: the entries always sum
// to the single spendable total. The salary entry holds base income +
// rollover + unattributed income and pays for all unattributed spending.
export interface IncomeLedgerInfo {
  id: string; // 'salary' or the IncomeSource id
  name: string;
  isSalary: boolean;
  received: number;
  // Same three expense buckets the main balance card shows, restricted to this
  // income stream's attributed spending.
  committed: number;
  discretionary: number;
  goals: number;
  spent: number; // committed + discretionary + goals
  left: number; // may be negative (over-spent)
  frequency: string | null;
  nextPaymentDate: string | null;
  // Present when this source just rolled a surplus into `received` and it
  // hasn't been dismissed yet (absent on older backend deploys).
  rolloverNotification?: {
    amount: number;
    fromPeriod?: string;
    createdAt?: string;
  } | null;
}

export interface HomeSummaryResponse {
  period: {
    start: string;
    end: string;
    frequency: string;
    daysRemaining: number;
    daysTotal: number;
  };
  income: {
    baseIncome: number;
    additionalIncome: number;
    rolloverAvailable: number;
    totalInflow: number;
    // Named breakdown of additional income received from income sources this
    // period (absent on older backend deploys — treat as []).
    sources?: {id: string; name: string; amount: number}[];
  };
  outflows: {
    committed: {
      plannedTotal: number;
      paidSoFar: number;
      remaining: number;
      items: CommittedItem[];
    };
    discretionary: {
      spentSoFar: number;
    };
    goals: {
      plannedTotal: number;
      paidSoFar: number;
      remaining: number;
    };
  };
  totals: {
    totalExpensesAllocated: number;
    leftToSpendSafe: number;
  };
  // Per-source income ledger; length >= 2 only when the user has income
  // sources (absent on older backend deploys — treat as [])
  incomeLedger?: IncomeLedgerInfo[];
  // One-time, dismissible notification emitted by the backend after an
  // auto-rollover occurs. Distinct from income.rolloverAvailable (the spendable
  // amount): the notification drives the banner and clears on dismiss.
  rolloverNotification?: {
    amount: number;
    fromPeriod?: string;
    createdAt?: string;
  } | null;
}

export const userService = new UserService();

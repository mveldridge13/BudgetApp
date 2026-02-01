export interface UserIncome {
  id: string;
  amount: number;
  frequency: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'YEARLY';
  source?: string;
  isActive: boolean;
  nextPayDate?: string;
}

export interface UpdateIncomeData {
  amount: number;
  frequency: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'YEARLY';
  source?: string;
}

export interface RolloverSettings {
  isEnabled: boolean;
  rolloverAmount: number;
  lastCalculatedDate?: string;
}

export interface UpdateRolloverData {
  isEnabled?: boolean;
  rolloverAmount?: number;
}

export interface RolloverEntry {
  id: string;
  amount: number;
  date: string;
  type: 'MANUAL' | 'AUTOMATIC';
  notes?: string;
}

export interface CreateRolloverEntryData {
  amount: number;
  date?: string;
  notes?: string;
}

export interface RolloverHistory {
  entries: RolloverEntry[];
  total: number;
}

export interface UserSettings {
  notifications: boolean;
  biometricAuth: boolean;
  currency: string;
  budgetPeriod: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';
  isPro: boolean;
}

export interface ExportDataResponse {
  downloadUrl: string;
  expiresAt: string;
}

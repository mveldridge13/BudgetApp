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
}

export const userService = new UserService();

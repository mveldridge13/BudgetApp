import {api} from './api';
import type {
  IncomeSource,
  CreateIncomeSourceInput,
  UpdateIncomeSourceInput,
} from '@/types';

// Strip undefined values so we never trip the backend's forbidNonWhitelisted
// validation with stray fields.
function clean<T extends object>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out as Partial<T>;
}

class IncomeSourceService {
  async getIncomeSources(): Promise<IncomeSource[]> {
    const res = await api.get<IncomeSource[]>('/income-sources');
    return Array.isArray(res) ? res : [];
  }

  async createIncomeSource(data: CreateIncomeSourceInput): Promise<IncomeSource> {
    return api.post<IncomeSource>('/income-sources', clean(data));
  }

  async updateIncomeSource(id: string, data: UpdateIncomeSourceInput): Promise<IncomeSource> {
    return api.put<IncomeSource>(`/income-sources/${id}`, clean(data));
  }

  async deleteIncomeSource(id: string): Promise<void> {
    await api.delete(`/income-sources/${id}`);
  }
}

export const incomeSourceService = new IncomeSourceService();

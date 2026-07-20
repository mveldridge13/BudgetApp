import {api} from './api';
import {
  Plan,
  CreatePlanData,
  UpdatePlanData,
  ForecastResult,
  ForecastHorizonDays,
  PlannerSettings,
  UpdatePlannerSettingsData,
} from '@/types';

class PlannerService {
  async getForecast(days: ForecastHorizonDays = 30): Promise<ForecastResult> {
    return api.get<ForecastResult>('/planner/forecast', {days});
  }

  async getPlans(): Promise<Plan[]> {
    return api.get<Plan[]>('/planner/plans');
  }

  async createPlan(data: CreatePlanData): Promise<Plan> {
    return api.post<Plan>('/planner/plans', data);
  }

  async updatePlan(id: string, data: UpdatePlanData): Promise<Plan> {
    return api.patch<Plan>(`/planner/plans/${id}`, data);
  }

  async promotePlan(id: string): Promise<Plan> {
    return api.patch<Plan>(`/planner/plans/${id}/promote`, {});
  }

  async cancelPlan(id: string): Promise<Plan> {
    return api.patch<Plan>(`/planner/plans/${id}/cancel`, {});
  }

  async completePlan(id: string): Promise<Plan> {
    return api.post<Plan>(`/planner/plans/${id}/complete`, {});
  }

  async deletePlan(id: string): Promise<void> {
    await api.delete(`/planner/plans/${id}`);
  }

  async getSettings(): Promise<PlannerSettings> {
    return api.get<PlannerSettings>('/planner/settings');
  }

  async updateSettings(
    data: UpdatePlannerSettingsData,
  ): Promise<PlannerSettings> {
    return api.patch<PlannerSettings>('/planner/settings', data);
  }
}

export const plannerService = new PlannerService();

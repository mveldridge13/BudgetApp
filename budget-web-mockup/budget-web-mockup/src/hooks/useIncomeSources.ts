import useSWR from 'swr';
import {incomeSourceService} from '@/services/income-source.service';
import type {
  IncomeSource,
  CreateIncomeSourceInput,
  UpdateIncomeSourceInput,
} from '@/types';

interface UseIncomeSourcesResult {
  incomeSources: IncomeSource[];
  activeIncomeSources: IncomeSource[];
  isLoading: boolean;
  error: Error | null;
  createIncomeSource: (data: CreateIncomeSourceInput) => Promise<IncomeSource>;
  updateIncomeSource: (id: string, data: UpdateIncomeSourceInput) => Promise<IncomeSource>;
  deleteIncomeSource: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

// SWR for display + CRUD methods that revalidate the cache, matching the
// established data-caching pattern (see useDashboardData).
export function useIncomeSources(): UseIncomeSourcesResult {
  const {data, error, isLoading, mutate} = useSWR<IncomeSource[]>(
    'income-sources',
    () => incomeSourceService.getIncomeSources(),
    {keepPreviousData: true},
  );

  const incomeSources = data ?? [];

  const createIncomeSource = async (input: CreateIncomeSourceInput) => {
    const created = await incomeSourceService.createIncomeSource(input);
    await mutate();
    return created;
  };

  const updateIncomeSource = async (id: string, input: UpdateIncomeSourceInput) => {
    const updated = await incomeSourceService.updateIncomeSource(id, input);
    await mutate();
    return updated;
  };

  const deleteIncomeSource = async (id: string) => {
    await incomeSourceService.deleteIncomeSource(id);
    await mutate();
  };

  return {
    incomeSources,
    activeIncomeSources: incomeSources.filter(s => s.isActive),
    isLoading,
    error: error instanceof Error ? error : error ? new Error('Failed to fetch income sources') : null,
    createIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,
    refresh: async () => {
      await mutate();
    },
  };
}

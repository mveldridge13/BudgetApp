'use client';

import { useState, useCallback, useEffect } from 'react';
import { userService } from '@/services/user.service';
import { useAuth } from '@/contexts/AuthContext';
import {
  UserIncome,
  UpdateIncomeData,
  RolloverSettings,
  UpdateRolloverData,
} from '@/types';

interface UseUserReturn {
  income: UserIncome | null;
  rollover: RolloverSettings | null;
  isLoading: boolean;
  error: string | null;
  fetchIncome: () => Promise<void>;
  updateIncome: (data: UpdateIncomeData) => Promise<void>;
  fetchRollover: () => Promise<void>;
  updateRollover: (data: UpdateRolloverData) => Promise<void>;
  dismissRolloverNotification: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useUser(): UseUserReturn {
  const { isAuthenticated } = useAuth();
  const [income, setIncome] = useState<UserIncome | null>(null);
  const [rollover, setRollover] = useState<RolloverSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIncome = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const incomeData = await userService.getIncome();
      setIncome(incomeData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch income';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const updateIncome = useCallback(async (data: UpdateIncomeData) => {
    setError(null);

    try {
      const updatedIncome = await userService.updateIncome(data);
      setIncome(updatedIncome);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update income';
      setError(message);
      throw err;
    }
  }, []);

  const fetchRollover = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const rolloverData = await userService.getRollover();
      setRollover(rolloverData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch rollover';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const updateRollover = useCallback(async (data: UpdateRolloverData) => {
    setError(null);

    try {
      const updatedRollover = await userService.updateRollover(data);
      setRollover(updatedRollover);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update rollover';
      setError(message);
      throw err;
    }
  }, []);

  const dismissRolloverNotification = useCallback(async () => {
    setError(null);

    try {
      await userService.dismissRolloverNotification();
      // Refresh rollover data after dismissing notification
      await fetchRollover();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to dismiss rollover notification';
      setError(message);
      throw err;
    }
  }, [fetchRollover]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchIncome(), fetchRollover()]);
  }, [fetchIncome, fetchRollover]);

  // Initial fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    }
  }, [isAuthenticated]);

  return {
    income,
    rollover,
    isLoading,
    error,
    fetchIncome,
    updateIncome,
    fetchRollover,
    updateRollover,
    dismissRolloverNotification,
    refresh,
  };
}

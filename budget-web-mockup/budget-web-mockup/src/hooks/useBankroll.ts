'use client';

import {useState, useCallback, useEffect} from 'react';
import {pokerService} from '@/services/poker.service';
import type {PokerBankroll, BankrollTransactionInput} from '@/types';

interface UseBankrollReturn {
  bankroll: PokerBankroll | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addTransaction: (data: BankrollTransactionInput) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

export function useBankroll(): UseBankrollReturn {
  const [bankroll, setBankroll] = useState<PokerBankroll | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBankroll = useCallback(async () => {
    setError(null);
    try {
      const data = await pokerService.getBankroll();
      setBankroll(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bankroll');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchBankroll();
  }, [fetchBankroll]);

  // Both mutations change the computed picture (current bankroll, status,
  // suggested withdrawal), so we always refetch rather than patch locally.
  const addTransaction = useCallback(
    async (data: BankrollTransactionInput) => {
      setError(null);
      await pokerService.addBankrollTransaction(data);
      await fetchBankroll();
    },
    [fetchBankroll],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      setError(null);
      await pokerService.deleteBankrollTransaction(id);
      await fetchBankroll();
    },
    [fetchBankroll],
  );

  useEffect(() => {
    fetchBankroll();
  }, [fetchBankroll]);

  return {
    bankroll,
    isLoading,
    error,
    refresh,
    addTransaction,
    deleteTransaction,
  };
}

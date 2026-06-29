'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';

export type IncomeFrequency = 'weekly' | 'fortnightly' | 'monthly';

export interface IncomeSetupData {
  income: string;
  selectedFrequency: IncomeFrequency | '';
  nextPayDate: Date;
  hasSelectedDate: boolean;
}

const frequencies = [
  { id: 'weekly' as const, label: 'Weekly', days: 7 },
  { id: 'fortnightly' as const, label: 'Fortnightly', days: 14 },
  { id: 'monthly' as const, label: 'Monthly', days: 30 },
];

export function useIncomeSetup(isEditMode: boolean = false) {
  // ==============================================
  // BUSINESS LOGIC STATE MANAGEMENT
  // ==============================================

  const { user, updateProfile } = useAuth();
  const [income, setIncome] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState<IncomeFrequency | ''>('');
  const [nextPayDate, setNextPayDate] = useState(new Date());
  const [hasSelectedDate, setHasSelectedDate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==============================================
  // BACKEND INTEGRATION METHODS
  // ==============================================

  /**
   * Load existing income data from backend
   */
  const loadExistingData = useCallback(async () => {
    if (!isEditMode || !user) {
      return;
    }

    try {
      if (user.income) {
        setIncome(user.income.toString());
      }

      if (user.incomeFrequency) {
        setSelectedFrequency(user.incomeFrequency.toLowerCase() as IncomeFrequency);
      }

      if (user.nextPayDate) {
        const backendDate = new Date(user.nextPayDate);
        const localDate = new Date(
          backendDate.getFullYear(),
          backendDate.getMonth(),
          backendDate.getDate()
        );

        if (!isNaN(localDate.getTime())) {
          setNextPayDate(localDate);
          setHasSelectedDate(true);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    }
  }, [isEditMode, user]);

  /**
   * Save income data to backend
   */
  const saveIncomeData = useCallback(async (): Promise<boolean> => {
    if (!income || !selectedFrequency || !hasSelectedDate) {
      setError('Please fill in all fields to continue');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const incomeAmount = parseFloat(income);

      // Validate income amount
      if (!incomeAmount || isNaN(incomeAmount) || incomeAmount <= 0) {
        throw new Error('Invalid income amount: must be a positive number');
      }

      // Validate frequency
      const validFrequencies = ['weekly', 'fortnightly', 'monthly'];
      if (!validFrequencies.includes(selectedFrequency)) {
        throw new Error('Invalid income frequency');
      }

      // Validate date
      if (!nextPayDate || isNaN(nextPayDate.getTime())) {
        throw new Error('Invalid date: must be a valid date');
      }

      // Prepare data for backend (matching mobile app format)
      const profileUpdateData = {
        income: incomeAmount,
        incomeFrequency: selectedFrequency.toUpperCase() as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY',
        nextPayDate: new Date(
          nextPayDate.getFullYear(),
          nextPayDate.getMonth(),
          nextPayDate.getDate(),
          12,
          0,
          0
        ).toISOString(), // Send as noon local time to avoid timezone issues
        setupComplete: true,
        hasSeenWelcome: true, // Skip welcome screens on mobile app
      };

      // Save to backend using income-specific endpoint (matching mobile app)
      await authService.updateIncomeProfile(profileUpdateData);

      return true;
    } catch (err) {
      let errorMessage = 'Failed to save your income information. Please try again.';

      if (err instanceof Error) {
        if (err.message.includes('Network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (err.message.includes('401')) {
          errorMessage = 'Session expired. Please log in again.';
        } else if (err.message.includes('400')) {
          errorMessage = 'Invalid data. Please check your inputs.';
        } else if (err.message.includes('500')) {
          errorMessage = 'Server error. Please try again later.';
        }
      }

      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [income, selectedFrequency, nextPayDate, hasSelectedDate]);

  /**
   * Handle income input change
   */
  const handleIncomeChange = useCallback((value: string) => {
    setIncome(value);
    setError(null);
  }, []);

  /**
   * Handle frequency selection
   */
  const handleFrequencySelect = useCallback((frequencyId: IncomeFrequency) => {
    if (!loading) {
      setSelectedFrequency(frequencyId);
      setError(null);
    }
  }, [loading]);

  /**
   * Handle date selection
   */
  const handleDateChange = useCallback((selectedDate: Date) => {
    setNextPayDate(selectedDate);
    setHasSelectedDate(true);
    setError(null);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ==============================================
  // LIFECYCLE METHODS
  // ==============================================

  // Load existing data on mount if in edit mode
  useEffect(() => {
    loadExistingData();
  }, [loadExistingData]);

  // ==============================================
  // RETURN INTERFACE
  // ==============================================

  return {
    // Data
    income,
    selectedFrequency,
    nextPayDate,
    hasSelectedDate,
    loading,
    error,
    frequencies,
    isEditMode,

    // Actions
    handleIncomeChange,
    handleFrequencySelect,
    handleDateChange,
    saveIncomeData,
    clearError,
  };
}

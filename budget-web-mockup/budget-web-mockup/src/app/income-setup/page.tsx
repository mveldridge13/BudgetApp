'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useIncomeSetup } from '@/hooks/useIncomeSetup';
import IncomeSetupForm from '@/components/income/IncomeSetupForm';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

function IncomeSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  const { refreshProfile } = useAuth();

  // Business logic from useIncomeSetup hook (like IncomeSetupContainer)
  const {
    income,
    selectedFrequency,
    nextPayDate,
    hasSelectedDate,
    loading,
    error,
    frequencies,
    handleIncomeChange,
    handleFrequencySelect,
    handleDateChange,
    saveIncomeData,
    clearError,
  } = useIncomeSetup(isEditMode);

  const handleSave = async () => {
    const success = await saveIncomeData();
    if (success) {
      // Refresh profile to get updated user data (including setupComplete)
      await refreshProfile();

      if (isEditMode) {
        router.back();
      } else {
        // After first-time setup, navigate to dashboard
        router.replace('/dashboard');
      }
    }
  };

  const handleCancel = () => {
    if (isEditMode) {
      router.back();
    }
  };

  return (
    <ProtectedRoute>
      <IncomeSetupForm
        income={income}
        selectedFrequency={selectedFrequency}
        nextPayDate={nextPayDate}
        hasSelectedDate={hasSelectedDate}
        loading={loading}
        error={error}
        isEditMode={isEditMode}
        frequencies={frequencies}
        onIncomeChange={handleIncomeChange}
        onFrequencySelect={handleFrequencySelect}
        onDateChange={handleDateChange}
        onSave={handleSave}
        onCancel={isEditMode ? handleCancel : undefined}
        clearError={clearError}
      />
    </ProtectedRoute>
  );
}

export default function IncomeSetupPage() {
  return (
    <Suspense fallback={null}>
      <IncomeSetupContent />
    </Suspense>
  );
}

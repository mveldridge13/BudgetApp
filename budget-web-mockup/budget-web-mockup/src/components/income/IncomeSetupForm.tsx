'use client';

import {IncomeFrequency} from '@/hooks/useIncomeSetup';
import {DatePicker} from '@/components/ui';

interface FrequencyOption {
  id: IncomeFrequency;
  label: string;
  days: number;
}

interface IncomeSetupFormProps {
  // Data props
  income: string;
  selectedFrequency: IncomeFrequency | '';
  nextPayDate: Date;
  hasSelectedDate: boolean;
  loading: boolean;
  error: string | null;
  isEditMode: boolean;
  frequencies: FrequencyOption[];

  // Event handlers
  onIncomeChange: (value: string) => void;
  onFrequencySelect: (frequencyId: IncomeFrequency) => void;
  onDateChange: (date: Date) => void;
  onSave: () => void;
  onCancel?: () => void;
  clearError: () => void;
}

const FrequencyButton = ({
  frequency,
  selectedFrequency,
  onSelect,
  disabled,
}: {
  frequency: FrequencyOption;
  selectedFrequency: IncomeFrequency | '';
  onSelect: (id: IncomeFrequency) => void;
  disabled: boolean;
}) => (
  <button
    type="button"
    onClick={() => onSelect(frequency.id)}
    disabled={disabled}
    className={`
      flex-1 py-3 px-4 rounded-lg border-2 transition-colors
      ${
        selectedFrequency === frequency.id
          ? 'bg-purple-500 border-purple-500 text-white'
          : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-purple-300'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}>
    <span className="text-sm font-medium">{frequency.label}</span>
  </button>
);

const formatDateForInput = (date: Date): string => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function IncomeSetupForm({
  income,
  selectedFrequency,
  nextPayDate,
  loading,
  error,
  isEditMode,
  frequencies,
  onIncomeChange,
  onFrequencySelect,
  onDateChange,
  onSave,
  onCancel,
}: IncomeSetupFormProps) {
  const handleDateChange = (dateValue: string) => {
    if (dateValue) {
      const selectedDate = new Date(dateValue + 'T12:00:00'); // Noon to avoid timezone issues
      onDateChange(selectedDate);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Trend Budget</h1>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">
            {isEditMode ? 'Edit Income Setup' : "Let's get started"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isEditMode
              ? 'Update your income information'
              : 'Tell us about your income to set up your budget'}
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Income Input */}
            <div>
              <label
                htmlFor="income"
                className="block text-sm font-medium text-gray-700 mb-2">
                Income Amount
              </label>
              <div className="flex items-center border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent">
                <span className="px-4 text-lg font-medium text-gray-700">
                  $
                </span>
                <input
                  id="income"
                  type="number"
                  step="0.01"
                  value={income}
                  onChange={e => onIncomeChange(e.target.value)}
                  disabled={loading}
                  placeholder="0"
                  className="flex-1 py-3 pr-4 text-lg border-0 focus:ring-0 focus:outline-none"
                />
              </div>
            </div>

            {/* Frequency Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How often are you paid?
              </label>
              <div className="flex gap-3">
                {frequencies.map(frequency => (
                  <FrequencyButton
                    key={frequency.id}
                    frequency={frequency}
                    selectedFrequency={selectedFrequency}
                    onSelect={onFrequencySelect}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            {/* Next Pay Date */}
            <div>
              <label
                htmlFor="nextPayDate"
                className="block text-sm font-medium text-gray-700 mb-2">
                Next Pay Date
              </label>
              <DatePicker
                value={formatDateForInput(nextPayDate)}
                onChange={handleDateChange}
                disabled={loading}
              />
              <p className="mt-2 text-xs text-gray-500">
                This helps us calculate your current budget period
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            {isEditMode && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`
                ${isEditMode ? 'flex-1' : 'w-full'}
                py-3 px-4 bg-purple-600 text-white rounded-lg font-medium
                hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors
              `}>
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </span>
              ) : isEditMode ? (
                'Save Changes'
              ) : (
                'Get Started'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

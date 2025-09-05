import { useState } from 'react';

export default function HeroSection() {
  const [expenseView, setExpenseView] = useState<'committed' | 'discretionary'>('committed');

  // Mock data - would come from your actual data source
  const balanceData = {
    startingBalance: 3200.00,
    committedExpenses: 1840.00, // Bills, rent, subscriptions, etc.
    discretionaryExpenses: 239.23, // Food, entertainment, shopping, etc.
    leftToSpend: 1120.77,
    budgetLimit: 2800.00
  };

  const totalExpenses = balanceData.committedExpenses + balanceData.discretionaryExpenses;
  
  const currentExpenses = expenseView === 'committed' 
    ? balanceData.committedExpenses 
    : balanceData.discretionaryExpenses;

  const progressPercentage = Math.min(
    ((balanceData.budgetLimit - balanceData.leftToSpend) / balanceData.budgetLimit) * 100, 
    100
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div style={{ backgroundColor: '#6366f1' }} className="rounded-xl p-6 text-white mb-8">
      {/* Starting Balance */}
      <div className="text-center mb-4">
        <h2 className="text-sm font-medium opacity-75">Starting Balance</h2>
        <p className="text-4xl font-bold">{formatCurrency(balanceData.startingBalance)}</p>
      </div>

      {/* Key Stats - Single Row */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs opacity-75 uppercase tracking-wide">Total Expenses</p>
          <div className="flex justify-center text-xs mb-1">
            <button
              onClick={() => setExpenseView('committed')}
              className={`px-2 py-0.5 transition-colors ${
                expenseView === 'committed'
                  ? 'text-white'
                  : 'text-white opacity-60 hover:opacity-80'
              }`}
            >
              Committed
            </button>
            <span className="mx-1 text-white opacity-60">|</span>
            <button
              onClick={() => setExpenseView('discretionary')}
              className={`px-2 py-0.5 transition-colors ${
                expenseView === 'discretionary'
                  ? 'text-white'
                  : 'text-white opacity-60 hover:opacity-80'
              }`}
            >
              Discretionary
            </button>
          </div>
          <p className="text-lg font-bold">{formatCurrency(totalExpenses)}</p>
          <p className="text-xs opacity-60 mt-1">
            {expenseView === 'committed' 
              ? `${formatCurrency(currentExpenses)} committed` 
              : `${formatCurrency(currentExpenses)} discretionary`
            }
          </p>
        </div>
        <div>
          <p className="text-xs opacity-75 uppercase tracking-wide">Left to Spend</p>
          <p className="text-lg font-bold">{formatCurrency(balanceData.leftToSpend)}</p>
        </div>
        <div>
          <p className="text-xs opacity-75 uppercase tracking-wide">Budget Used</p>
          <p className="text-lg font-bold">{Math.round(progressPercentage)}%</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${progressPercentage}%`,
              backgroundColor: progressPercentage > 80 ? '#FF6B6B' : progressPercentage > 60 ? '#FFB84D' : '#4ECDC4',
            }}
          />
        </div>
      </div>
    </div>
  );
}
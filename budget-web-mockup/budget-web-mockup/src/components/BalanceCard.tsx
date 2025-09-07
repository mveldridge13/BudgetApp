interface BalanceCardProps {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    upcomingBills: number;
    goalsSavings: number;
    monthlyBudget: number;
  };
}

export default function BalanceCard({ summary }: BalanceCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-medium opacity-90">Current Balance</h3>
          <p className="text-3xl font-bold">{formatCurrency(summary.balance)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm opacity-75">This Month</p>
          <p className="text-lg font-semibold">January 2025</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white bg-opacity-10 rounded-lg p-4">
          <p className="text-sm opacity-75">Income</p>
          <p className="text-xl font-semibold text-green-300">
            +{formatCurrency(summary.totalIncome)}
          </p>
        </div>
        <div className="bg-white bg-opacity-10 rounded-lg p-4">
          <p className="text-sm opacity-75">Expenses</p>
          <p className="text-xl font-semibold text-red-300">
            -{formatCurrency(Math.abs(summary.totalExpenses))}
          </p>
        </div>
      </div>
    </div>
  );
}

interface QuickStatsProps {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    upcomingBills: number;
    goalsSavings: number;
    monthlyBudget: number;
  };
}

export default function QuickStats({ summary }: QuickStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const stats = [
    {
      title: 'Upcoming Bills',
      value: formatCurrency(summary.upcomingBills),
      icon: '📄',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Goals Savings',
      value: formatCurrency(summary.goalsSavings),
      icon: '🎯',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Monthly Budget',
      value: formatCurrency(summary.monthlyBudget),
      icon: '📊',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className={`text-2xl font-bold ${stat.color} mt-1`}>
                {stat.value}
              </p>
            </div>
            <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
              <span className="text-2xl">{stat.icon}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
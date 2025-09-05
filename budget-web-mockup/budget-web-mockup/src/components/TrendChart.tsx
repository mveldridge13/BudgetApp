export default function TrendChart() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Mock data for current and previous pay period spending
  const currentPayPeriod = [
    { day: 1, amount: 0 },
    { day: 2, amount: 45.50 },
    { day: 3, amount: 58.25 },
    { day: 4, amount: 147.24 },
    { day: 5, amount: 172.24 },
    { day: 6, amount: 197.24 },
    { day: 7, amount: 222.24 },
    { day: 8, amount: 252.23 },
    { day: 9, amount: 327.23 },
    { day: 10, amount: 367.22 },
    { day: 11, amount: 407.21 },
    { day: 12, amount: 432.21 },
    { day: 13, amount: 521.20 },
    { day: 14, amount: 594.19 }
  ];

  const lastPayPeriod = [
    { day: 1, amount: 0 },
    { day: 2, amount: 32.00 },
    { day: 3, amount: 67.50 },
    { day: 4, amount: 112.75 },
    { day: 5, amount: 158.25 },
    { day: 6, amount: 203.75 },
    { day: 7, amount: 249.25 },
    { day: 8, amount: 294.75 },
    { day: 9, amount: 340.25 },
    { day: 10, amount: 385.75 },
    { day: 11, amount: 431.25 },
    { day: 12, amount: 476.75 },
    { day: 13, amount: 522.25 },
    { day: 14, amount: 567.75 }
  ];

  const maxAmount = Math.max(
    Math.max(...currentPayPeriod.map(d => d.amount)),
    Math.max(...lastPayPeriod.map(d => d.amount))
  );
  const currentTotal = currentPayPeriod[currentPayPeriod.length - 1].amount;
  const lastTotal = lastPayPeriod[lastPayPeriod.length - 1].amount;
  const difference = currentTotal - lastTotal;
  const percentageChange = ((difference / lastTotal) * 100);

  // Create SVG path for line chart
  const createPath = (data: typeof currentPayPeriod) => {
    const width = 100;
    const height = 60;
    const padding = 10;

    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((point.amount / maxAmount) * (height - 2 * padding));
      return `${x},${y}`;
    });

    return `M${points.join(' L')}`;
  };

  const currentPath = createPath(currentPayPeriod);
  const lastPath = createPath(lastPayPeriod);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
      <div className="mb-16">
        <h2 className="text-sm text-gray-900">Spending Trend</h2>
        <p className="text-gray-600 text-base font-bold">{formatCurrency(currentTotal)}</p>
        <div className="flex items-center mt-1">
          <span 
            className={`text-xs font-medium ${
              difference >= 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {difference >= 0 ? '+' : ''}{formatCurrency(difference)} ({percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%)
          </span>
          <span className="text-xs text-gray-500 ml-2">vs last pay period</span>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="relative">
          <svg width="380" height="240" viewBox="0 0 100 60">
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="60" fill="url(#grid)" opacity="0.5"/>
            
            {/* Last pay period line */}
            <path
              d={lastPath}
              fill="none"
              stroke="#FF6B6B"
              strokeWidth="0.3"
              strokeDasharray="1,1"
              className="opacity-40"
            />
            
            {/* Current pay period line */}
            <path
              d={currentPath}
              fill="none"
              stroke="#6366f1"
              strokeWidth="0.5"
            />

            {/* Data points for current period */}
            {currentPayPeriod.map((point, index) => {
              const x = 10 + (index / (currentPayPeriod.length - 1)) * 80;
              const y = 50 - ((point.amount / maxAmount) * 40);
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="1"
                  fill="#6366f1"
                  className="hover:opacity-80 transition-all cursor-pointer"
                />
              );
            })}
          </svg>

          {/* Legend */}
          <div className="mt-4 flex justify-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-indigo-600"></div>
              <span className="text-xs text-gray-600">Current Pay Period</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-red-400"></div>
              <span className="text-xs text-gray-600">Last Pay Period</span>
            </div>
          </div>

          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-60 flex flex-col justify-between text-xs text-gray-500 -ml-12">
            <span>{formatCurrency(maxAmount)}</span>
            <span>{formatCurrency(maxAmount * 0.75)}</span>
            <span>{formatCurrency(maxAmount * 0.5)}</span>
            <span>{formatCurrency(maxAmount * 0.25)}</span>
            <span>$0</span>
          </div>

          {/* X-axis labels */}
          <div className="absolute -bottom-6 left-0 w-full flex justify-between text-xs text-gray-500">
            <span className="ml-10">Day 1</span>
            <span>Day 7</span>
            <span className="mr-10">Day 14</span>
          </div>
        </div>
      </div>
    </div>
  );
}
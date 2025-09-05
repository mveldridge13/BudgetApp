export default function StatsCards() {
  const stats = [
    {
      title: 'Starting Balance',
      value: '$3,200.00',
      change: 'This month',
      trend: 'up',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
          />
        </svg>
      ),
      iconBg: '#EEF2FF',
      iconColor: '#6366f1',
      cardBg: '#6366f1',
      textColor: 'white',
    },
    {
      title: 'Monthly Spending',
      value: '$156.49',
      change: '-5% from last month',
      trend: 'down',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
      iconBg: '#EEF2FF',
      iconColor: '#6366f1',
      cardBg: '#6366f1',
      textColor: 'white',
    },
    {
      title: 'Active Goals',
      value: '4',
      change: '2 completed this month',
      trend: 'neutral',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      ),
      iconBg: '#EEF2FF',
      iconColor: '#6366f1',
      cardBg: '#6366f1',
      textColor: 'white',
    },
    {
      title: 'Total Debt',
      value: '$1,200.00',
      change: '-15% from last month',
      trend: 'down',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
      iconBg: '#EEF2FF',
      iconColor: '#6366f1',
      cardBg: '#6366f1',
      textColor: 'white',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="rounded-lg border border-gray-200 p-6"
          style={{
            backgroundColor: stat.cardBg || 'white',
            borderColor: stat.cardBg ? stat.cardBg : '#e5e7eb',
          }}>
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-sm font-medium"
                style={{
                  color:
                    stat.textColor === 'white'
                      ? 'rgba(255,255,255,0.8)'
                      : '#6b7280',
                }}>
                {stat.title}
              </p>
              <p
                className="text-2xl font-bold mt-1"
                style={{
                  color: stat.textColor === 'white' ? 'white' : '#111827',
                }}>
                {stat.value}
              </p>
              <p
                className="text-sm mt-2 font-medium"
                style={{
                  color:
                    stat.textColor === 'white'
                      ? 'rgba(255,255,255,0.9)'
                      : stat.trend === 'up' ||
                        stat.change.includes('-15%') ||
                        stat.change.includes('-5%')
                      ? '#10b981'
                      : stat.trend === 'down' && !stat.change.includes('-')
                      ? '#f87171'
                      : '#6b7280',
                }}>
                {stat.change}
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: stat.iconBg,
                color: stat.iconColor,
              }}>
              {stat.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

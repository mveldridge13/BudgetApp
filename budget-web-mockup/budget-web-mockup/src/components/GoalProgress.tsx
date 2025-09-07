import { Goal } from '@/lib/mockData';

interface GoalProgressProps {
  goals: Goal[];
}

export default function GoalProgress({ goals }: GoalProgressProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getPriorityBadge = (category: string, percentage: number) => {
    if (percentage >= 80) {return { text: 'High', color: 'bg-red-100 text-red-700' };}
    if (percentage >= 40) {return { text: 'Medium', color: 'bg-orange-100 text-orange-700' };}
    return { text: 'Low', color: 'bg-gray-100 text-gray-700' };
  };

  const getProgressBarColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Savings: '#EF4444', // red
      Travel: '#F59E0B', // orange
      Technology: '#F59E0B', // orange
      Education: '#10B981', // green
      Health: '#3B82F6', // blue
    };
    return colors[category] || '#6B7280';
  };

  // Mock data that matches the design
  const mockGoalData = [
    {
      id: '1',
      title: 'Emergency Fund',
      category: 'Savings',
      status: 'Overdue',
      progress: 65,
      current: 6500,
      target: 10000,
      priority: 'High',
    },
    {
      id: '2',
      title: 'Vacation to Japan',
      category: 'Savings',
      status: 'Overdue',
      progress: 56,
      current: 2800,
      target: 5000,
      priority: 'Medium',
    },
    {
      id: '3',
      title: 'Credit Card Debt',
      category: 'Debt',
      status: 'Overdue',
      progress: 66,
      current: 3300,
      target: 5000,
      priority: 'High',
    },
    {
      id: '4',
      title: 'Monthly Food Budget',
      category: 'Spending',
      status: 'Overdue',
      progress: 53,
      current: 265,
      target: 500,
      priority: 'Medium',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {mockGoalData.map((goal) => (
        <div key={goal.id} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{goal.title}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-gray-600">{goal.category}</span>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-600">{goal.status}</span>
              </div>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              goal.priority === 'High'
                ? 'bg-red-50 text-red-400'
                : goal.priority === 'Medium'
                ? 'bg-orange-50 text-orange-400'
                : 'bg-gray-50 text-gray-400'
            }`}>
              {goal.priority}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-semibold text-gray-900">{goal.progress}%</span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${goal.progress}%`,
                  backgroundColor: goal.priority === 'High' ? '#FF6B6B' : '#FFB84D',
                }}
              />
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                Current: {formatCurrency(goal.current)}
              </span>
              <span className="text-gray-600">
                Target: {formatCurrency(goal.target)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

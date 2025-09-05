import { Goal } from '@/lib/mockData';

interface GoalsListProps {
  goals: Goal[];
}

export default function GoalsList({ goals }: GoalsListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Savings: '#10B981',
      Travel: '#3B82F6',
      Technology: '#8B5CF6',
      Education: '#F59E0B',
      Health: '#EF4444',
    };
    return colors[category] || '#6B7280';
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      Savings: '💰',
      Travel: '✈️',
      Technology: '💻',
      Education: '📚',
      Health: '🏥',
    };
    return icons[category] || '🎯';
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {goals.length === 0 ? (
        <div className="col-span-full text-center text-gray-500 py-8">
          <p>No goals found</p>
        </div>
      ) : (
        goals.map((goal) => {
          const percentage = getProgressPercentage(goal.currentAmount, goal.targetAmount);
          const remaining = goal.targetAmount - goal.currentAmount;
          
          return (
            <div key={goal.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{goal.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                </div>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: getCategoryColor(goal.category) }}
                >
                  <span className="text-lg">{getCategoryIcon(goal.category)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm font-semibold text-gray-900">{percentage}%</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: getCategoryColor(goal.category),
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    {formatCurrency(goal.currentAmount)} saved
                  </span>
                  <span className="text-gray-600">
                    {formatCurrency(goal.targetAmount)} goal
                  </span>
                </div>

                {remaining > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{formatCurrency(remaining)}</span> remaining
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Due by {formatDate(goal.dueDate)}
                    </p>
                  </div>
                )}

                {percentage === 100 && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                      🎉 Goal achieved!
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
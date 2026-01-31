'use client';

interface ActiveGoalCardProps {
  activeGoalsCount: number;
  completedGoalsCount: number;
  isLoading: boolean;
}

export default function ActiveGoalCard({
  activeGoalsCount = 0,
  completedGoalsCount = 0,
  isLoading
}: ActiveGoalCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-100 rounded-full w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  const totalGoals = activeGoalsCount + completedGoalsCount;
  const activePercentage = totalGoals > 0 ? (activeGoalsCount / totalGoals) * 100 : 0;
  const completedPercentage = totalGoals > 0 ? (completedGoalsCount / totalGoals) * 100 : 0;

  // SVG donut chart parameters
  const size = 160;
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate the arc lengths for each segment
  const completedArcLength = (completedPercentage / 100) * circumference;
  const activeArcLength = (activePercentage / 100) * circumference;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}>
      <p className="text-sm font-medium text-gray-500 mb-5">Goals Overview</p>

      <div className="flex items-center justify-center mb-4">
        {totalGoals === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No goals yet</p>
          </div>
        ) : (
          <div className="relative flex items-center justify-center" style={{ width: size + 80, height: size }}>
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth={strokeWidth}
                />

                {/* Active goals segment (only show if count > 0) */}
                {activeGoalsCount > 0 && (
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${activeArcLength} ${circumference - activeArcLength}`}
                    strokeDashoffset={0}
                    className="transition-all duration-500"
                  />
                )}

                {/* Completed goals segment (only show if count > 0) */}
                {completedGoalsCount > 0 && (
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${completedArcLength} ${circumference - completedArcLength}`}
                    strokeDashoffset={-activeArcLength}
                    className="transition-all duration-500"
                  />
                )}
              </svg>

              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <p className="text-3xl font-bold text-gray-900">{totalGoals}</p>
                <p className="text-xs text-gray-500">Total Goals</p>
              </div>
            </div>

            {/* Percentage labels */}
            {activeGoalsCount > 0 && (
              <div className="absolute" style={{ top: '20%', right: '0' }}>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: '#6366f1' }}>
                    {Math.round(activePercentage)}%
                  </p>
                  <p className="text-xs text-gray-500">Active</p>
                </div>
              </div>
            )}

            {completedGoalsCount > 0 && (
              <div className="absolute" style={{ bottom: '20%', right: '0' }}>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: '#10B981' }}>
                    {Math.round(completedPercentage)}%
                  </p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      {totalGoals > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2.5" style={{ backgroundColor: '#6366f1' }}></div>
              <span className="text-sm text-gray-500 font-medium">Active</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{activeGoalsCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2.5" style={{ backgroundColor: '#10B981' }}></div>
              <span className="text-sm text-gray-500 font-medium">Completed</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{completedGoalsCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}

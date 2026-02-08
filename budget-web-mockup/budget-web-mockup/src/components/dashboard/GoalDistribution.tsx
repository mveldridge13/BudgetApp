'use client';

import { GoalDisplay } from '@/types';
import { Target, CreditCard, TrendingDown } from 'lucide-react';

interface GoalDistributionProps {
  goals: GoalDisplay[];
  isLoading: boolean;
}

interface GoalTypeConfig {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

export default function GoalDistribution({ goals, isLoading }: GoalDistributionProps) {
  // Only count active goals
  const activeGoals = goals.filter((g) => g.isActive);

  // Calculate distribution by type
  const typeDistribution = {
    savings: activeGoals.filter((g) => g.type === 'savings').length,
    spending: activeGoals.filter((g) => g.type === 'spending').length,
    debt: activeGoals.filter((g) => g.type === 'debt').length,
  };


  const goalTypes: Record<string, GoalTypeConfig> = {
    savings: {
      label: 'Savings',
      icon: Target,
      color: '#475569',
      bgColor: '#F1F5F9',
    },
    spending: {
      label: 'Spending',
      icon: CreditCard,
      color: '#64748B',
      bgColor: '#F8FAFC',
    },
    debt: {
      label: 'Debt',
      icon: TrendingDown,
      color: '#374151',
      bgColor: '#F3F4F6',
    },
  };

  if (isLoading) {
    return (
      <div
        className="bg-white rounded-xl border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg"
        style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-100 rounded w-1/2"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-100 rounded-lg"></div>
            <div className="h-16 bg-gray-100 rounded-lg"></div>
            <div className="h-16 bg-gray-100 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg"
      style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-5">Goal Distribution</h3>

      {/* By Type */}
      <div className="space-y-3">
        {Object.entries(goalTypes).map(([key, config]) => {
          const count = typeDistribution[key as keyof typeof typeDistribution];
          const Icon = config.icon;

          return (
            <div
              key={key}
              className="rounded-lg p-3 transition-all duration-200 hover:shadow-sm"
              style={{ backgroundColor: config.bgColor }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-1.5 rounded-md"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: config.color }} />
                </div>
                <span className="text-sm font-medium text-gray-900 flex-1">
                  {config.label}
                </span>
                <span className="text-lg font-bold text-gray-900">{count}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

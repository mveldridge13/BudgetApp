'use client';

import { useState, useEffect } from 'react';
import { GoalDisplay, GoalContribution } from '@/types';
import { goalService } from '@/services/goal.service';
import {
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Check,
  X,
  Plus,
  Minus,
  DollarSign,
  List,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';

interface GoalCardProps {
  goal: GoalDisplay;
  onEdit?: (goal: GoalDisplay) => void;
  onDelete?: (goalId: string) => void;
  onToggleBalanceDisplay?: (goalId: string) => void;
  onUpdateProgress?: (goalId: string, amount: number, paymentSource: string) => Promise<void>;
  onComplete?: (goalId: string) => void;
  onOpenSimulator?: (goal: GoalDisplay) => void;
  isCompleted?: boolean;
}

export default function GoalCard({
  goal,
  onEdit,
  onDelete,
  onToggleBalanceDisplay,
  onUpdateProgress,
  onComplete,
  onOpenSimulator,
  isCompleted = false,
}: GoalCardProps) {
  const [showProgressUpdate, setShowProgressUpdate] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [transactionType, setTransactionType] = useState<'add' | 'withdraw'>('add');
  const [paymentSource, setPaymentSource] = useState('income');
  const [localShowOnBalanceCard, setLocalShowOnBalanceCard] = useState(goal.showOnBalanceCard);

  const progress = goalService.calculateProgress(goal);
  const isDebtGoal = goal.type === 'debt';
  const isSpendingGoal = goal.type === 'spending';

  const daysLeft = goal.deadline ? goalService.calculateDaysRemaining(goal.deadline) : null;
  const monthlyNeeded = goal.deadline ? goalService.calculateRequiredMonthlyContribution(goal) : 0;
  const isOverdue = goal.deadline ? goalService.isGoalOverdue(goal) : false;

  const getGoalColor = () => {
    switch (goal.type) {
      case 'debt':
        return 'red';
      case 'spending':
        return 'amber';
      case 'savings':
      default:
        return 'blue';
    }
  };

  const goalColor = getGoalColor();

  const getProgressColor = () => {
    if (isDebtGoal) return 'bg-red-300';
    if (isSpendingGoal) return 'bg-amber-500';
    if (isOverdue) return 'bg-red-500';
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  const handleCustomAmountSubmit = async () => {
    const amount = parseFloat(customAmount);

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }

    if (transactionType === 'withdraw' && amount > goal.current) {
      alert(`You can only withdraw up to $${goal.current.toFixed(2)} from this goal.`);
      return;
    }

    const finalAmount = transactionType === 'withdraw' ? -amount : amount;

    if (onUpdateProgress) {
      try {
        await onUpdateProgress(goal.id, finalAmount, paymentSource);
        setCustomAmount('');
        setTransactionType('add');
        setShowProgressUpdate(false);
      } catch (error) {
        console.error('Error updating progress:', error);
        alert('Failed to update goal progress. Please try again.');
      }
    }
  };

  const handleToggleBalanceDisplay = () => {
    setLocalShowOnBalanceCard(!localShowOnBalanceCard);
    if (onToggleBalanceDisplay) {
      onToggleBalanceDisplay(goal.id);
    }
  };

  const loadPaymentHistory = async () => {
    setLoadingContributions(true);
    try {
      const data = await goalService.getContributions(goal.id);
      setContributions(data);
    } catch (error) {
      console.error('Error loading payment history:', error);
      setContributions([]);
    } finally {
      setLoadingContributions(false);
    }
  };

  const handleOpenPaymentHistory = () => {
    setShowPaymentHistory(true);
    loadPaymentHistory();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  };

  const getContributionTypeDisplay = (type: string) => {
    switch (type) {
      case 'MANUAL':
        return 'Manual Payment';
      case 'WITHDRAWAL':
        return 'Withdrawal';
      case 'AUTO':
        return 'Automatic Payment';
      case 'ROLLOVER':
        return 'Rollover Allocation';
      default:
        return 'Payment';
    }
  };

  const totalPaid = contributions.reduce((sum, c) => sum + c.amount, 0);
  const remaining = isDebtGoal
    ? Math.max(0, goal.current)
    : Math.max(0, goal.target - goal.current);

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-medium text-gray-900">{goal.title}</h3>
            {goal.priority === 'high' && !isCompleted && (
              <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded">
                High Priority
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{goal.category}</p>
        </div>

        {!isCompleted && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleBalanceDisplay}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title={localShowOnBalanceCard ? 'Hide from balance card' : 'Show on balance card'}
            >
              {localShowOnBalanceCard ? (
                <Eye className="w-4 h-4 text-blue-600" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <button
              onClick={() => onEdit && onEdit(goal)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Edit3 className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => onDelete && onDelete(goal.id)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        )}
      </div>

      {/* Progress Section */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-2xl font-light text-gray-900">
            ${goal.current.toFixed(2)}
          </span>
          <span className="text-sm text-gray-500">
            {isDebtGoal
              ? `of $${goal.originalAmount?.toFixed(2)} debt`
              : `of $${goal.target.toFixed(2)}`}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-300`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">
              {progress.toFixed(0)}% {isDebtGoal ? 'paid off' : 'complete'}
            </span>
            {!isCompleted && !isSpendingGoal && monthlyNeeded > 0 && (
              <span className="text-gray-500">
                • ${monthlyNeeded.toFixed(2)}/mo
              </span>
            )}
          </div>
          {!isCompleted && daysLeft !== null && (
            <span className={`${daysLeft < 30 ? 'text-red-600' : 'text-gray-500'}`}>
              {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
            </span>
          )}
        </div>
      </div>

      {/* Custom Amount Input Section */}
      {showProgressUpdate && !isCompleted && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-3">
            {isDebtGoal
              ? 'Enter Payment Amount'
              : transactionType === 'withdraw'
              ? 'Enter Withdrawal Amount'
              : 'Enter Contribution Amount'}
          </p>

          {/* Transaction Type Selection for Savings Goals */}
          {!isDebtGoal && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTransactionType('add')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                    transactionType === 'add'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add Money</span>
                </button>
                <button
                  onClick={() => setTransactionType('withdraw')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                    transactionType === 'withdraw'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <Minus className="w-4 h-4" />
                  <span className="text-sm font-medium">Withdraw</span>
                </button>
              </div>
            </div>
          )}

          {/* Payment Source Selection - only show for additions or debt payments */}
          {(transactionType === 'add' || isDebtGoal) && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Payment Source
              </label>
              <div className="relative">
                <select
                  value={paymentSource}
                  onChange={(e) => setPaymentSource(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                >
                  <option value="income" className="text-gray-900">Income</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2">
              <span className="text-gray-500 mr-1">$</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 outline-none text-gray-900"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomAmountSubmit();
                  }
                }}
              />
            </div>
            <button
              onClick={() => {
                setCustomAmount('');
                setTransactionType('add');
                setShowProgressUpdate(false);
              }}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleCustomAmountSubmit}
              className={`p-2 rounded-lg text-white ${
                goalColor === 'red'
                  ? 'bg-red-400 hover:bg-red-500'
                  : goalColor === 'amber'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Check className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!isCompleted && !showProgressUpdate && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowProgressUpdate(true)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white ${
                goalColor === 'red'
                  ? 'bg-red-400 hover:bg-red-500'
                  : goalColor === 'amber'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">
                {isDebtGoal ? 'Make Payment' : 'Add/Withdraw'}
              </span>
            </button>
            <button
              onClick={handleOpenPaymentHistory}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            >
              <List className="w-4 h-4" />
              <span className="text-sm font-medium">Payment History</span>
            </button>
          </div>

          {/* Simulator Button - Only for Debt Goals */}
          {isDebtGoal && onOpenSimulator && (
            <button
              onClick={() => onOpenSimulator(goal)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
            >
              <span className="text-sm font-medium">Plan Payoff</span>
            </button>
          )}
        </div>
      )}

      {/* Complete Goal Button */}
      {!isCompleted && progress >= 100 && (
        <button
          onClick={() => onComplete && onComplete(goal.id)}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">Mark as Complete</span>
        </button>
      )}

      {/* Payment History Modal */}
      {showPaymentHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              <button
                onClick={() => setShowPaymentHistory(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Summary Stats */}
            {!loadingContributions && contributions.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Paid</p>
                    <p className="text-lg font-semibold text-gray-900">${totalPaid.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Remaining</p>
                    <p className="text-lg font-semibold text-gray-900">${remaining.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Payments</p>
                    <p className="text-lg font-semibold text-gray-900">{contributions.length}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingContributions ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : contributions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <List className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium">No payment history yet</p>
                  <p className="text-xs mt-1">Contributions and withdrawals will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contributions.map((contribution, index) => {
                    const isWithdrawal = contribution.type === 'WITHDRAWAL';
                    return (
                      <div
                        key={contribution.id || index}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className={`p-2 rounded-full ${isWithdrawal ? 'bg-red-100' : 'bg-green-100'}`}>
                          {isWithdrawal ? (
                            <ArrowUpCircle className="w-4 h-4 text-red-600" />
                          ) : (
                            <ArrowDownCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-semibold text-gray-900">
                              {isWithdrawal ? '-' : ''}${contribution.amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(contribution.date)}</p>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {getContributionTypeDisplay(contribution.type)}
                          </p>
                          {contribution.description && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {contribution.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowPaymentHistory(false)}
                className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

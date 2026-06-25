'use client';

import {useState, useEffect, useMemo} from 'react';
import {useSearchParams} from 'next/navigation';
import {goalService} from '@/services/goal.service';
import {transactionService} from '@/services/transaction.service';
import {categoryService} from '@/services/category.service';
import {GoalDisplay} from '@/types';
import {
  Plus,
  Target,
  TrendingDown,
  DollarSign,
  PiggyBank,
  Percent,
  Trophy,
} from 'lucide-react';
import GoalCard from '@/components/goals/GoalCard';
import AddGoalModal from '@/components/goals/AddGoalModal';
import DebtSimulator from '@/components/goals/DebtSimulator';
import {CustomSelect} from '@/components/ui';

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalDisplay | null>(null);
  const [simulatingGoal, setSimulatingGoal] = useState<GoalDisplay | null>(
    null,
  );

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');
  const [sortOrder, setSortOrder] = useState('Newest First');

  // Pre-fill the search from the global search (?q=...).
  const searchParams = useSearchParams();
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchTerm(q);
  }, [searchParams]);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      const data = await goalService.getGoals();
      setGoals(data);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply search and filters to goals
  const filteredGoals = useMemo(() => {
    return goals.filter(goal => {
      // Search filter
      const matchesSearch = goal.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      // Type filter
      const matchesType =
        typeFilter === 'All Types' ||
        (typeFilter === 'Savings' && goal.type === 'savings') ||
        (typeFilter === 'Spending' && goal.type === 'spending') ||
        (typeFilter === 'Debt' && goal.type === 'debt');

      // Priority filter
      const matchesPriority =
        priorityFilter === 'All Priorities' ||
        (priorityFilter === 'High' && goal.priority === 'high') ||
        (priorityFilter === 'Medium' && goal.priority === 'medium') ||
        (priorityFilter === 'Low' && goal.priority === 'low');

      return matchesSearch && matchesType && matchesPriority;
    });
  }, [goals, searchTerm, typeFilter, priorityFilter]);

  // Sort filtered goals
  const sortedFilteredGoals = useMemo(() => {
    return [...filteredGoals].sort((a, b) => {
      switch (sortOrder) {
        case 'Newest First': {
          const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bCreated - aCreated;
        }
        case 'Oldest First': {
          const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aCreated - bCreated;
        }
        case 'Highest Target':
          return b.target - a.target;
        case 'Lowest Target':
          return a.target - b.target;
        case 'Most Progress': {
          const aProgress = a.target > 0 ? (a.current / a.target) * 100 : 0;
          const bProgress = b.target > 0 ? (b.current / b.target) * 100 : 0;
          return bProgress - aProgress;
        }
        case 'Least Progress': {
          const aProgress = a.target > 0 ? (a.current / a.target) * 100 : 0;
          const bProgress = b.target > 0 ? (b.current / b.target) * 100 : 0;
          return aProgress - bProgress;
        }
        default:
          return 0;
      }
    });
  }, [filteredGoals, sortOrder]);

  // Filter goals by status and type (from sorted filtered goals)
  const activeGoals = useMemo(
    () => sortedFilteredGoals.filter(g => g.isActive && g.type !== 'debt'),
    [sortedFilteredGoals],
  );

  const debtGoals = useMemo(
    () => sortedFilteredGoals.filter(g => g.isActive && g.type === 'debt'),
    [sortedFilteredGoals],
  );

  const completedGoals = useMemo(
    () => sortedFilteredGoals.filter(g => !g.isActive),
    [sortedFilteredGoals],
  );

  // Headline metrics users can actually track over time.
  // Active goals only; spending budgets (limits) are excluded — these measure
  // wealth building on goals still in progress.
  const goalStats = useMemo(() => {
    let totalSaved = 0;
    let totalDebtReduced = 0;
    let achievedValue = 0;
    let totalPotential = 0;

    for (const goal of goals) {
      if (!goal.isActive) continue;

      if (goal.type === 'debt') {
        const original = goal.originalAmount || goal.target;
        const reduced = Math.max(0, original - goal.current);
        totalDebtReduced += reduced;
        achievedValue += Math.min(reduced, original);
        totalPotential += original;
      } else if (goal.type === 'savings') {
        totalSaved += goal.current;
        achievedValue += Math.min(goal.current, goal.target);
        totalPotential += goal.target;
      }
    }

    const netProgress =
      totalPotential > 0 ? (achievedValue / totalPotential) * 100 : 0;

    return {totalSaved, totalDebtReduced, netProgress};
  }, [goals]);

  // Lifetime accomplishments across ALL goals (active + completed, ignoring the
  // current search/filters). Gives users a sense of progress over time without
  // confusing it with the goals they're actively working on.
  const lifetimeStats = useMemo(() => {
    let lifetimeSaved = 0;
    let lifetimeDebtReduced = 0;
    let goalsCompleted = 0;
    let largestAchieved: {title: string; amount: number} | null = null;

    for (const goal of goals) {
      if (goal.type === 'savings') {
        lifetimeSaved += Math.max(0, goal.current);
      } else if (goal.type === 'debt') {
        const original = goal.originalAmount || goal.target;
        lifetimeDebtReduced += Math.max(0, original - goal.current);
      }

      if (!goal.isActive) {
        goalsCompleted += 1;
        const achievedAmount =
          goal.type === 'debt'
            ? goal.originalAmount || goal.target
            : goal.target;
        if (!largestAchieved || achievedAmount > largestAchieved.amount) {
          largestAchieved = {title: goal.title, amount: achievedAmount};
        }
      }
    }

    return {
      lifetimeSaved,
      lifetimeDebtReduced,
      goalsCompleted,
      largestAchieved,
    };
  }, [goals]);

  // Group active goals by type
  const groupedActiveGoals = useMemo(() => {
    const grouped = {
      spending: activeGoals.filter(g => g.type === 'spending'),
      savings: activeGoals.filter(g => g.type === 'savings'),
    };
    return grouped;
  }, [activeGoals]);

  const handleSaveGoal = async (goalData: Partial<GoalDisplay>) => {
    try {
      if (editingGoal) {
        await goalService.updateGoal(editingGoal.id, goalData);
      } else {
        await goalService.createGoal(goalData);
      }
      await loadGoals();
      setShowAddGoal(false);
      setEditingGoal(null);
    } catch (error) {
      console.error('Error saving goal:', error);
      throw error;
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (
      confirm(
        'Are you sure you want to delete this goal? This action cannot be undone.',
      )
    ) {
      try {
        await goalService.deleteGoal(goalId);
        await loadGoals();
      } catch (error) {
        console.error('Error deleting goal:', error);
        alert('Failed to delete goal. Please try again.');
      }
    }
  };

  const handleToggleBalanceDisplay = async (goalId: string) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      if (goal) {
        await goalService.updateGoal(goalId, {
          ...goal,
          showOnBalanceCard: !goal.showOnBalanceCard,
        });
        await loadGoals();
      }
    } catch (error) {
      console.error('Error toggling balance display:', error);
      alert('Failed to update goal. Please try again.');
    }
  };

  const handleUpdateProgress = async (
    goalId: string,
    amount: number,
    paymentSource: string,
  ) => {
    const timestamp = new Date().toISOString();
    const isWithdrawal = amount < 0;

    try {
      // Create contribution
      await goalService.addContribution(goalId, {
        amount: Math.abs(amount),
        type: isWithdrawal ? 'WITHDRAWAL' : 'MANUAL',
        date: timestamp,
        description: isWithdrawal
          ? `Withdrawal from goal`
          : `${paymentSource === 'income' ? 'Income' : 'Manual'} payment`,
      });

      // Mirror mobile: create a TRANSFER transaction for MANUAL contributions so
      // the payment is visible in the transaction list. TRANSFER (not EXPENSE) is
      // used so it's not double-counted in spending totals — the contribution is
      // already tracked via the goal's income payments.
      if (!isWithdrawal) {
        await createGoalPaymentTransaction(goalId, Math.abs(amount), timestamp);
      }

      await loadGoals();
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  };

  /**
   * Creates a TRANSFER transaction recording a manual goal payment, matching the
   * mobile app. Resolves (and lazily creates) the "Other" → "Debt Payment"
   * category/subcategory used by mobile so the entry is categorized consistently.
   * Failure here is non-fatal — the contribution already succeeded.
   */
  const createGoalPaymentTransaction = async (
    goalId: string,
    amount: number,
    timestamp: string,
  ) => {
    try {
      const targetGoal = goals.find(g => g.id === goalId);
      if (!targetGoal) return;

      let categoryId: string | null = null;
      let subcategoryId: string | undefined = undefined;

      try {
        const categories = await categoryService.getCategories();

        // Prefer the "Other" parent category (which holds "Debt Payment").
        let otherCategory = categories.find(
          c => !c.parentId && c.name?.toLowerCase() === 'other',
        );

        if (!otherCategory) {
          otherCategory = await categoryService.createCategory({
            name: 'Other',
            type: 'EXPENSE',
            icon: 'ellipsis-horizontal-outline',
            color: '#A8A8A8',
          });
        }

        // Find or create the "Debt Payment" subcategory under "Other".
        let debtPaymentSubcategory = categories.find(
          c => c.parentId === otherCategory!.id && c.name?.toLowerCase().includes('debt'),
        );

        if (otherCategory && !debtPaymentSubcategory) {
          debtPaymentSubcategory = await categoryService.createCategory({
            name: 'Debt Payment',
            type: 'EXPENSE',
            icon: 'card-outline',
            color: '#A8A8A8',
            parentId: otherCategory.id,
          });
        }

        const billsCategory = categories.find(c =>
          c.name?.toLowerCase().includes('bill'),
        );
        const fallbackCategory =
          categories.find(c => c.type === 'EXPENSE') || categories[0];

        const selectedCategory = otherCategory || billsCategory || fallbackCategory;
        categoryId = selectedCategory?.id ?? null;
        subcategoryId = debtPaymentSubcategory?.id;
      } catch (catError) {
        console.warn('Failed to resolve categories for goal payment:', catError);
      }

      if (!categoryId) return;

      await transactionService.createTransaction({
        amount,
        categoryId,
        subcategoryId,
        description: `Payment to ${targetGoal.title}`,
        type: 'TRANSFER',
        date: timestamp,
        recurrence: 'none',
      });
    } catch (transactionError) {
      // Non-fatal: the contribution succeeded; the transaction is supplementary.
      console.error(
        'Failed to create transaction for goal payment:',
        transactionError,
      );
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    if (confirm('Mark this goal as completed?')) {
      try {
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
          await goalService.updateGoal(goalId, {
            ...goal,
            isActive: false,
            completedDate: new Date().toISOString(),
          });
          await loadGoals();
        }
      } catch (error) {
        console.error('Error completing goal:', error);
        alert('Failed to complete goal. Please try again.');
      }
    }
  };

  const handleEditGoal = (goal: GoalDisplay) => {
    setEditingGoal(goal);
    setShowAddGoal(true);
  };

  const handleAddGoal = () => {
    setEditingGoal(null);
    setShowAddGoal(true);
  };

  const handleCloseModal = () => {
    setShowAddGoal(false);
    setEditingGoal(null);
  };

  const handleOpenSimulator = (goal: GoalDisplay) => {
    setSimulatingGoal(goal);
  };

  const handleCloseSimulator = () => {
    setSimulatingGoal(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Goals
          </h1>
          <p className="text-gray-500 mt-2">Track your financial objectives</p>
        </div>
        <button
          onClick={handleAddGoal}
          className="text-white px-5 py-2.5 rounded-xl font-medium flex items-center space-x-2 transition-all hover:shadow-lg"
          style={{
            backgroundColor: '#6366f1',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)',
          }}>
          <Plus className="w-5 h-5" />
          <span>Add Goal</span>
        </button>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-500">Total Saved</p>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            $
            {goalStats.totalSaved.toLocaleString('en-AU', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Across your savings goals
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-500">
              Total Debt Reduced
            </p>
            <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            $
            {goalStats.totalDebtReduced.toLocaleString('en-AU', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Paid down from original balances
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-500">
              Net Goal Progress
            </p>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Percent className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {goalStats.netProgress.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Savings + debt paydown combined
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search goals..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>
        <div className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white min-w-[160px]">
          <CustomSelect
            value={typeFilter}
            onChange={value => setTypeFilter(value)}
            options={[
              {value: 'All Types', label: 'All Types'},
              {value: 'Savings', label: 'Savings'},
              {value: 'Spending', label: 'Spending'},
              {value: 'Debt', label: 'Debt'},
            ]}
            placeholder="All Types"
          />
        </div>
        <div className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white min-w-[160px]">
          <CustomSelect
            value={priorityFilter}
            onChange={value => setPriorityFilter(value)}
            options={[
              {value: 'All Priorities', label: 'All Priorities'},
              {value: 'High', label: 'High'},
              {value: 'Medium', label: 'Medium'},
              {value: 'Low', label: 'Low'},
            ]}
            placeholder="All Priorities"
          />
        </div>
        <div className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white min-w-[180px]">
          <CustomSelect
            value={sortOrder}
            onChange={value => setSortOrder(value)}
            options={[
              {value: 'Newest First', label: 'Newest First'},
              {value: 'Oldest First', label: 'Oldest First'},
              {value: 'Highest Target', label: 'Highest Target'},
              {value: 'Lowest Target', label: 'Lowest Target'},
              {value: 'Most Progress', label: 'Most Progress'},
              {value: 'Least Progress', label: 'Least Progress'},
            ]}
            placeholder="Sort by"
          />
        </div>
      </div>

      {/* Active Goals - Grouped by Type */}
      {activeGoals.length > 0 || debtGoals.length > 0 ? (
        <div className="space-y-8">
          {/* Spending Budgets */}
          {groupedActiveGoals.spending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Spending Budgets
                </h2>
                <span className="bg-blue-100 text-blue-600 text-xs font-medium px-2 py-1 rounded-full">
                  {groupedActiveGoals.spending.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedActiveGoals.spending.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={handleEditGoal}
                    onDelete={handleDeleteGoal}
                    onToggleBalanceDisplay={handleToggleBalanceDisplay}
                    onUpdateProgress={handleUpdateProgress}
                    onComplete={handleCompleteGoal}
                    onOpenSimulator={handleOpenSimulator}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Savings Goals */}
          {groupedActiveGoals.savings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Savings Goals
                </h2>
                <span className="bg-blue-100 text-blue-600 text-xs font-medium px-2 py-1 rounded-full">
                  {groupedActiveGoals.savings.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedActiveGoals.savings.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={handleEditGoal}
                    onDelete={handleDeleteGoal}
                    onToggleBalanceDisplay={handleToggleBalanceDisplay}
                    onUpdateProgress={handleUpdateProgress}
                    onComplete={handleCompleteGoal}
                    onOpenSimulator={handleOpenSimulator}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Goals Yet
          </h3>
          <p className="text-gray-500 mb-6">
            Set your first financial goal to start tracking your progress
          </p>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <svg
            className="w-12 h-12 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Goals Found
          </h3>
          <p className="text-gray-500 mb-6">
            No goals match your current filters
          </p>
        </div>
      )}

      {/* Debt Goals Section */}
      {debtGoals.length > 0 && (
        <div>
          {debtGoals.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Debt Payments
                </h2>
                <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-1 rounded-full">
                  {debtGoals.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {debtGoals.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={handleEditGoal}
                    onDelete={handleDeleteGoal}
                    onToggleBalanceDisplay={handleToggleBalanceDisplay}
                    onUpdateProgress={handleUpdateProgress}
                    onComplete={handleCompleteGoal}
                    onOpenSimulator={handleOpenSimulator}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <TrendingDown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Debt Goals
              </h3>
              <p className="text-gray-500 mb-6">
                Create a debt goal to track loan or credit card payments
              </p>
            </div>
          )}
        </div>
      )}

      {/* Completed Goals Section */}
      {completedGoals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Completed Goals
            </h2>
            <span className="bg-green-100 text-green-600 text-xs font-medium px-2 py-1 rounded-full">
              {completedGoals.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} isCompleted={true} />
            ))}
          </div>
        </div>
      )}

      {/* Goal Achievements - lifetime accomplishments */}
      {goals.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Goal Achievements
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100 p-5">
              <Trophy className="w-5 h-5 text-amber-500 mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">
                Lifetime Savings Contributed
              </p>
              <p className="text-2xl font-bold text-gray-900">
                $
                {lifetimeStats.lifetimeSaved.toLocaleString('en-AU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100 p-5">
              <Trophy className="w-5 h-5 text-amber-500 mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">
                Lifetime Debt Reduced
              </p>
              <p className="text-2xl font-bold text-gray-900">
                $
                {lifetimeStats.lifetimeDebtReduced.toLocaleString('en-AU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100 p-5">
              <Trophy className="w-5 h-5 text-amber-500 mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">
                Goals Completed
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {lifetimeStats.goalsCompleted}
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100 p-5">
              <Trophy className="w-5 h-5 text-amber-500 mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">
                Largest Goal Achieved
              </p>
              {lifetimeStats.largestAchieved ? (
                <>
                  <p className="text-lg font-bold text-gray-900 truncate">
                    {lifetimeStats.largestAchieved.title}
                  </p>
                  <p className="text-sm font-semibold text-amber-600">
                    $
                    {lifetimeStats.largestAchieved.amount.toLocaleString(
                      'en-AU',
                      {minimumFractionDigits: 2, maximumFractionDigits: 2},
                    )}
                  </p>
                </>
              ) : (
                <p className="text-lg font-bold text-gray-400">
                  No goals completed yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Goal Modal */}
      <AddGoalModal
        visible={showAddGoal}
        onClose={handleCloseModal}
        onSave={handleSaveGoal}
        editingGoal={editingGoal}
      />

      {/* Debt Simulator */}
      {simulatingGoal && (
        <DebtSimulator
          goal={simulatingGoal}
          visible={true}
          onClose={handleCloseSimulator}
        />
      )}
    </div>
  );
}

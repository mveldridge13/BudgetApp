'use client';

import {useState} from 'react';
import {Transaction, TransactionSummary} from '@/types';
import {formatCurrency} from '@/lib/formatters';
import {CategoryIcon, CustomSelect} from '@/components/ui';
import TransactionSummaryTiles from './TransactionSummaryTiles';
import TransactionDetailPanel from './TransactionDetailPanel';

interface CategoryObject {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  summary?: TransactionSummary | null;
  onEdit?: (transaction: Transaction) => void;
  onUpdate?: (id: string, data: Partial<Transaction>) => Promise<void>;
  onDelete?: (id: string) => void;
  onMarkPaid?: (id: string) => void;
}

export default function TransactionList({
  transactions,
  onEdit,
  onUpdate,
  onDelete,
  onMarkPaid,
}: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [frequencyFilter, setFrequencyFilter] = useState('All Frequencies');
  const [sortOrder, setSortOrder] = useState('Newest First');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter(transaction => {
      const matchesSearch = transaction.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const transactionCategoryName =
        typeof transaction.categoryName === 'string'
          ? transaction.categoryName
          : (transaction.categoryName as unknown as CategoryObject)?.name;

      const matchesCategory =
        categoryFilter === 'All Categories' ||
        transactionCategoryName === categoryFilter;
      const matchesFrequency =
        frequencyFilter === 'All Frequencies' ||
        getFrequencyLabel(transaction) === frequencyFilter;
      return matchesSearch && matchesCategory && matchesFrequency;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case 'Newest First': {
          // Sort by date first, then by createdAt as tiebreaker
          const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          // If dates are the same, use createdAt
          const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bCreated - aCreated;
        }
        case 'Oldest First': {
          // Sort by date first, then by createdAt as tiebreaker
          const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          // If dates are the same, use createdAt
          const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aCreated - bCreated;
        }
        case 'Highest Amount':
          return Math.abs(b.amount) - Math.abs(a.amount);
        case 'Lowest Amount':
          return Math.abs(a.amount) - Math.abs(b.amount);
        default:
          return 0;
      }
    });

  // Get unique categories
  const categories = [
    'All Categories',
    ...new Set(
      transactions
        .map(t => {
          if (typeof t.categoryName === 'string') {
            return t.categoryName;
          }
          return (t.categoryName as unknown as CategoryObject)?.name;
        })
        .filter(Boolean),
    ),
  ];

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const dateKey = new Date(transaction.date).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);

  // Get sorted date keys (maintains the sort order from filteredTransactions)
  const sortedDateKeys = Object.keys(groupedTransactions).sort((a, b) => {
    const dateA = new Date(a).getTime();
    const dateB = new Date(b).getTime();
    return sortOrder === 'Oldest First' ? dateA - dateB : dateB - dateA;
  });

  // Format date for header display
  function formatDateHeader(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  }


  function getFrequencyLabel(transaction: Transaction): string {
    // Backend uses 'recurrence' field directly
    const recurrence = transaction.recurrence || (transaction.isRecurring ? transaction.recurringPattern?.type : 'none');

    if (!recurrence || recurrence === 'none') return 'One-time';

    const frequencyMap: Record<string, string> = {
      'none': 'One-time',
      'weekly': 'Weekly',
      'fortnightly': 'Fortnightly',
      'monthly': 'Monthly',
      'sixmonths': 'Every 6 months',
      'yearly': 'Yearly',
    };

    return frequencyMap[recurrence] || 'Monthly';
  }

  function getCategoryColor(categoryName?: string): string {
    const colorMap: Record<string, string> = {
      'Food & Dining': '#10B981',
      Transportation: '#3B82F6',
      Entertainment: '#EC4899',
      Housing: '#F87171',
      Groceries: '#10B981',
      Fuel: '#3B82F6',
      Movies: '#EC4899',
      Rent: '#F87171',
    };
    return colorMap[categoryName || ''] || '#6B7280';
  }

  function renderTransactionCard(transaction: Transaction) {
    // Handle category data - could be string or object
    let categoryName = 'Uncategorized';
    let categoryColor = '#6B7280';
    let categoryIcon = 'help-circle-outline';

    if (typeof transaction.categoryName === 'string') {
      categoryName = transaction.categoryName;
      categoryColor = transaction.categoryColor || getCategoryColor(categoryName);
      categoryIcon = transaction.categoryIcon || 'help-circle-outline';
    } else if (transaction.categoryName) {
      const categoryObj = transaction.categoryName as unknown as CategoryObject;
      categoryName = categoryObj.name || 'Uncategorized';
      categoryColor = categoryObj.color || getCategoryColor(categoryName);
      categoryIcon = categoryObj.icon || 'help-circle-outline';
    }

    const frequency = getFrequencyLabel(transaction);

    // Determine payment status based on backend status field
    const getPaymentStatus = () => {
      // One-off paid transactions (e.g. a goal payment made from the goal card)
      // get a green "Paid" badge. Recurring bills indicate paid via the action
      // button below, so we don't double up with a badge for those.
      if (frequency === 'One-time') {
        return transaction.status === 'PAID'
          ? { label: 'Paid', color: '#10B981' }
          : null;
      }
      if (transaction.status === 'PAID') return null;

      // Recurring, not yet paid: show status based on backend's status field.
      if (transaction.status === 'OVERDUE') {
        return { label: 'Overdue', color: '#EF4444' };
      } else if (transaction.status === 'UPCOMING') {
        return { label: 'Upcoming', color: '#3B82F6' };
      }

      return null;
    };

    const paymentStatus = getPaymentStatus();

    const isIncome = transaction.type === 'INCOME';

    return (
      <div
        key={transaction.id}
        onClick={() => setSelectedTransaction(transaction)}
        className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all cursor-pointer group"
        style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)' }}
      >
        <div className="flex items-center">
          {/* Circle Icon */}
          <div className="mr-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform"
              style={{backgroundColor: `${categoryColor}20`}}>
              <CategoryIcon
                iconName={categoryIcon}
                size={24}
                color={categoryColor}
              />
            </div>
          </div>

          {/* Transaction Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-base font-medium text-gray-900">
                {transaction.description}
              </h4>
              {frequency !== 'One-time' && (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: '#4CAF50' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
              {paymentStatus && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    color: paymentStatus.color,
                    backgroundColor: `${paymentStatus.color}15`
                  }}
                >
                  {paymentStatus.label}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {categoryName}
              {transaction.subcategoryName && ` - ${transaction.subcategoryName}`} - {frequency}
            </p>
          </div>

          {/* Amount */}
          <div className="text-right mr-4">
            <p
              className={`text-lg font-semibold ${
                isIncome ? 'text-green-600' : 'text-gray-900'
              }`}
            >
              {isIncome ? '+' : ''}
              {formatCurrency(Math.abs(transaction.amount))}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            {frequency !== 'One-time' && onMarkPaid && (
              <div onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onMarkPaid(transaction.id)}
                  disabled={transaction.status === 'PAID'}
                  className={`px-3 py-1.5 text-sm font-medium border rounded-lg transition-all ${
                    transaction.status === 'PAID'
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'hover:bg-green-50'
                  }`}
                  style={transaction.status === 'PAID' ? {} : { color: '#10B981', borderColor: '#a7f3d0' }}>
                  {transaction.status === 'PAID' ? 'Paid ✓' : 'Paid'}
                </button>
              </div>
            )}
            {/* Chevron indicator */}
            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Transaction Summary Tiles */}
      <TransactionSummaryTiles transactions={filteredTransactions} />

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
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>
        <div className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white min-w-[180px]">
          <CustomSelect
            value={categoryFilter}
            onChange={(value) => setCategoryFilter(value)}
            options={categories.map(cat => ({ value: cat, label: cat }))}
            placeholder="All Categories"
          />
        </div>
        <div className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white min-w-[180px]">
          <CustomSelect
            value={frequencyFilter}
            onChange={(value) => setFrequencyFilter(value)}
            options={[
              { value: 'All Frequencies', label: 'All Frequencies' },
              { value: 'One-time', label: 'One-time' },
              { value: 'Weekly', label: 'Weekly' },
              { value: 'Monthly', label: 'Monthly' },
              { value: 'Yearly', label: 'Yearly' },
            ]}
            placeholder="All Frequencies"
          />
        </div>
        <div className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white min-w-[180px]">
          <CustomSelect
            value={sortOrder}
            onChange={(value) => setSortOrder(value)}
            options={[
              { value: 'Newest First', label: 'Newest First' },
              { value: 'Oldest First', label: 'Oldest First' },
              { value: 'Highest Amount', label: 'Highest Amount' },
              { value: 'Lowest Amount', label: 'Lowest Amount' },
            ]}
            placeholder="Sort by"
          />
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-6">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            <p>No transactions found</p>
          </div>
        ) : (
          sortedDateKeys.map(dateKey => {
            // Separate goal payments (TRANSFER) into their own labelled group,
            // matching the mobile app's "Goal Payments" section.
            const groupTxns = groupedTransactions[dateKey];
            const regularTxns = groupTxns.filter(t => t.type !== 'TRANSFER');
            const goalPaymentTxns = groupTxns.filter(t => t.type === 'TRANSFER');

            return (
              <div key={dateKey} className="space-y-3">
                {/* Date Header */}
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    {formatDateHeader(dateKey)}
                  </h3>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">
                    {groupTxns.length} transaction{groupTxns.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Regular transactions for this date */}
                {regularTxns.map(renderTransactionCard)}

                {/* Goal Payments (TRANSFER) - own sub-section, mirrors mobile */}
                {goalPaymentTxns.length > 0 && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Goal Payments
                      </h4>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    {goalPaymentTxns.map(renderTransactionCard)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Transaction Detail Panel */}
      <TransactionDetailPanel
        transaction={selectedTransaction}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onEdit={onEdit}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onMarkPaid={onMarkPaid}
      />
    </div>
  );
}

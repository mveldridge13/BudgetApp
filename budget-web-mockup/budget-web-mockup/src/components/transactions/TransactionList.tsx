'use client';

import {useState} from 'react';
import {Transaction, TransactionSummary} from '@/types';
import {formatCurrency, formatDate} from '@/lib/formatters';
import {CategoryIcon} from '@/components/ui';
import TransactionSummaryTiles from './TransactionSummaryTiles';

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
  onDelete?: (id: string) => void;
}

export default function TransactionList({
  transactions,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [frequencyFilter, setFrequencyFilter] = useState('All Frequencies');
  const [sortOrder, setSortOrder] = useState('Newest First');

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
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white">
          {categories.map(cat => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={frequencyFilter}
          onChange={e => setFrequencyFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white">
          <option>All Frequencies</option>
          <option>One-time</option>
          <option>Weekly</option>
          <option>Monthly</option>
          <option>Yearly</option>
        </select>
        <select
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white">
          <option>Newest First</option>
          <option>Oldest First</option>
          <option>Highest Amount</option>
          <option>Lowest Amount</option>
        </select>
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            <p>No transactions found</p>
          </div>
        ) : (
          filteredTransactions.map(transaction => {
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

            return (
              <div
                key={transaction.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center">
                  {/* Circle Icon */}
                  <div className="mr-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{backgroundColor: `${categoryColor}20`}}>
                      <CategoryIcon
                        iconName={categoryIcon}
                        size={20}
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
                    </div>
                    <p className="text-sm text-gray-600">
                      {categoryName}
                      {transaction.subcategoryName && ` - ${transaction.subcategoryName}`} - {frequency}
                    </p>
                  </div>

                  {/* Amount and Date */}
                  <div className="text-right mr-4">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(Math.abs(transaction.amount))}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDate(transaction.date)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(transaction)}
                        className="px-3 py-1.5 text-sm font-medium border rounded-lg transition-all hover:bg-indigo-50"
                        style={{ color: '#6366f1', borderColor: '#c7d2fe' }}>
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(transaction.id)}
                        className="px-3 py-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 text-sm font-medium border border-red-200 rounded-lg transition-colors">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

'use client';

import {useState} from 'react';
import {Transaction, TransactionSummary} from '@/types';
import {formatCurrency, formatDate} from '@/lib/formatters';

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
  const filteredTransactions = transactions.filter(transaction => {
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

  const totalAmount = filteredTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0,
  );

  function getFrequencyLabel(transaction: Transaction): string {
    if (!transaction.isRecurring) return 'One-time';
    // You can extend this based on your transaction data structure
    return 'Monthly';
  }

  function getCategoryColor(categoryName?: string): string {
    const colorMap: Record<string, string> = {
      'Food & Dining': '#10B981',
      Transportation: '#3B82F6',
      Entertainment: '#EC4899',
      Housing: '#EF4444',
      Groceries: '#10B981',
      Fuel: '#3B82F6',
      Movies: '#EC4899',
      Rent: '#EF4444',
    };
    return colorMap[categoryName || ''] || '#6B7280';
  }

  return (
    <div className="space-y-6">
      {/* Transaction Summary */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Transaction Summary
            </h2>
            <p className="text-sm text-gray-600">
              {filteredTransactions.length} transaction
              {filteredTransactions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(totalAmount)}
            </p>
            <p className="text-sm text-gray-600">Total Amount</p>
          </div>
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
            let categoryIcon = '💰';

            if (typeof transaction.categoryName === 'string') {
              categoryName = transaction.categoryName;
              categoryColor = transaction.categoryColor || getCategoryColor(categoryName);
              categoryIcon = transaction.categoryIcon || '💰';
            } else if (transaction.categoryName) {
              const categoryObj = transaction.categoryName as unknown as CategoryObject;
              categoryName = categoryObj.name || 'Uncategorized';
              categoryColor = categoryObj.color || getCategoryColor(categoryName);
              categoryIcon = categoryObj.icon || '💰';
            }

            const subcategoryName =
              typeof transaction.subcategory === 'string'
                ? transaction.subcategory
                : (transaction.subcategory as unknown as CategoryObject)?.name ||
                  categoryName;

            const frequency = getFrequencyLabel(transaction);

            return (
              <div
                key={transaction.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center">
                  {/* Circle Icon */}
                  <div className="mr-4">
                    <div
                      className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg"
                      style={{borderColor: categoryColor}}>
                      {categoryIcon}
                    </div>
                  </div>

                  {/* Transaction Info */}
                  <div className="flex-1">
                    <h4 className="text-base font-medium text-gray-900 mb-1">
                      {transaction.description}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {categoryName} • {subcategoryName} • {frequency}
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
                  <div className="flex gap-3">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(transaction)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(transaction.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium">
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

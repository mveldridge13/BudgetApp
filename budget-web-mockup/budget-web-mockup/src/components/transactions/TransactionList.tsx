'use client';

import { useState } from 'react';
import { Transaction, TransactionSummary } from '@/types';
import { formatCurrency, formatDate, formatRecurrence } from '@/lib/formatters';
import { TRANSACTION_TYPE_COLORS } from '@/lib/constants';

interface TransactionListProps {
  transactions: Transaction[];
  summary?: TransactionSummary | null;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
}

export default function TransactionList({
  transactions,
  summary,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [frequencyFilter, setFrequencyFilter] = useState('All Frequencies');
  const [sortOrder, setSortOrder] = useState('Newest First');

  // Filter and sort transactions
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === 'All Categories' ||
      transaction.categoryName === categoryFilter;
    const matchesFrequency =
      frequencyFilter === 'All Frequencies' ||
      formatRecurrence(transaction.isRecurring ? 'monthly' : 'none') === frequencyFilter;
    return matchesSearch && matchesCategory && matchesFrequency;
  });

  // Get unique categories
  const categories = [
    'All Categories',
    ...new Set(transactions.map((t) => t.categoryName).filter(Boolean)),
  ];

  const totalAmount = filteredTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  );

  const getAmountDisplay = (transaction: Transaction) => {
    if (transaction.type === 'INCOME') {
      return `+${formatCurrency(Math.abs(transaction.amount))}`;
    }
    return `-${formatCurrency(Math.abs(transaction.amount))}`;
  };

  const getAmountColor = (type: string) => {
    return TRANSACTION_TYPE_COLORS[type as keyof typeof TRANSACTION_TYPE_COLORS] || '#6B7280';
  };

  const getLightBackgroundColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  };

  return (
    <div className="space-y-6">
      {/* Transaction Summary */}
      {summary && (
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Transaction Summary
              </h2>
              <p className="text-gray-600">
                {summary.transactionCount} transactions
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalAmount)}
              </p>
              <p className="text-gray-600">Total Amount</p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
          {categories.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={frequencyFilter}
          onChange={(e) => setFrequencyFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
          <option>All Frequencies</option>
          <option>One-time</option>
          <option>Weekly</option>
          <option>Monthly</option>
          <option>Yearly</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
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
          filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              style={{
                borderLeft: transaction.isRecurring ? '3px solid #6366f1' : 'none',
              }}
            >
              <div className="flex items-center">
                {/* Icon */}
                <div className="mr-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: getLightBackgroundColor(
                        transaction.categoryColor || '#6B7280'
                      ),
                    }}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke={transaction.categoryColor || '#6B7280'}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                      />
                    </svg>
                  </div>
                </div>

                {/* Transaction Info */}
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <h4 className="text-base font-light text-gray-900 flex-1">
                      {transaction.description}
                    </h4>
                    {transaction.isRecurring && (
                      <div className="ml-2 p-1">
                        <svg
                          className="w-3 h-3 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-light text-gray-500">
                    {transaction.categoryName || 'Uncategorized'} •{' '}
                    {formatDate(transaction.date)}
                  </p>
                  {transaction.paymentStatus && transaction.paymentStatus !== 'PAID' && (
                    <p
                      className="text-xs font-medium mt-1"
                      style={{
                        color:
                          transaction.paymentStatus === 'UPCOMING'
                            ? '#007AFF'
                            : transaction.paymentStatus === 'OVERDUE'
                            ? '#F44336'
                            : '#6B7280',
                      }}
                    >
                      {transaction.paymentStatus === 'UPCOMING'
                        ? 'Upcoming'
                        : transaction.paymentStatus === 'OVERDUE'
                        ? 'Overdue'
                        : transaction.paymentStatus}
                    </p>
                  )}
                </div>

                {/* Amount */}
                <div className="text-right ml-4">
                  <p
                    className="text-base font-light"
                    style={{ color: getAmountColor(transaction.type) }}
                  >
                    {getAmountDisplay(transaction)}
                  </p>
                </div>

                {/* Actions */}
                {(onEdit || onDelete) && (
                  <div className="ml-4 flex space-x-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(transaction)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(transaction.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useRecentTransactions } from '@/hooks/useRecentTransactions';
import { formatCurrency, formatDateShort } from '@/lib/formatters';
import { CategoryIcon } from '@/components/ui';

interface RecentTransactionsProps {
  currency?: string;
  limit?: number;
}

export default function RecentTransactions({ currency = 'AUD', limit = 5 }: RecentTransactionsProps) {
  const { transactions, isLoading } = useRecentTransactions();

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => {
          const dateDiff =
            new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          // Same-day transactions tie on date (day-granular); break the tie by
          // createdAt so the most recently added shows first.
          const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bCreated - aCreated;
        })
        .slice(0, limit),
    [transactions, limit],
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
        <Link
          href="/transactions"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 bg-gray-100 rounded" />
                <div className="h-2.5 w-1/4 bg-gray-100 rounded" />
              </div>
              <div className="h-3 w-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : recent.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">No transactions yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {recent.map((t) => {
            const isIncome = t.type === 'INCOME';
            const color = t.categoryColor || '#6366f1';
            return (
              <Link
                key={t.id}
                href="/transactions"
                className="flex items-center py-3 -mx-2 px-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mr-3 flex-shrink-0"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <CategoryIcon iconName={t.categoryIcon || 'help-circle-outline'} size={20} color={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {t.description || t.categoryName || 'Transaction'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {t.categoryName || 'Uncategorised'} · {formatDateShort(t.date)}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold ml-3 flex-shrink-0 ${
                    isIncome ? 'text-green-600' : 'text-gray-900'
                  }`}
                >
                  {isIncome ? '+' : '-'}
                  {formatCurrency(Math.abs(t.amount), currency)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

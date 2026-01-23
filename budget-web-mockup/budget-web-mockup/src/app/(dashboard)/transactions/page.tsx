'use client';

import { useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionModal from '@/components/transactions/TransactionModal';
import { Spinner } from '@/components/ui';

export default function TransactionsPage() {
  const { transactions, summary, isLoading, error, createTransaction, refresh } = useTransactions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveTransaction = async (data: unknown) => {
    try {
      await createTransaction(data as Parameters<typeof createTransaction>[0]);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save transaction:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-1">
            Track and manage your financial transactions
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span>Add Transaction</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p>{error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading && transactions.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <TransactionList transactions={transactions} summary={summary} />
      )}

      <TransactionModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
      />
    </div>
  );
}

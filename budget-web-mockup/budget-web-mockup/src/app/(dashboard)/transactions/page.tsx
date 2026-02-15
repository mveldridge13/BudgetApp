'use client';

import {useState} from 'react';
import {useTransactions} from '@/hooks/useTransactions';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionModal from '@/components/transactions/TransactionModal';
import {Spinner} from '@/components/ui';
import {Transaction, UpdateTransactionData} from '@/types';

export default function TransactionsPage() {
  const {
    transactions,
    summary,
    isLoading,
    error,
    payPeriod,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refresh,
  } = useTransactions({ usePayPeriod: true });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const handleSaveTransaction = async (data: unknown) => {
    try {
      if (editingTransaction) {
        await updateTransaction(
          editingTransaction.id,
          data as Parameters<typeof updateTransaction>[1],
        );
      } else {
        await createTransaction(
          data as Parameters<typeof createTransaction>[0],
        );
      }
      setIsModalOpen(false);
      setEditingTransaction(null);
      refresh();
    } catch (err) {
      console.error('Failed to save transaction:', err);
      const errorMessage = (err as {message?: string | string[]})?.message || 'Unknown error';
      alert(`Failed to save transaction: ${Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage}`);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransaction(id);
        refresh();
      } catch (err) {
        console.error('Failed to delete transaction:', err);
      }
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await updateTransaction(id, { status: 'PAID' });
      refresh();
    } catch (err) {
      console.error('Failed to mark transaction as paid:', err);
      alert('Failed to mark transaction as paid. Please try again.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-1">
            {payPeriod ? (
              <>
                Showing transactions for{' '}
                <span className="font-medium text-indigo-600">
                  {new Date(payPeriod.start).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  {' - '}
                  {new Date(payPeriod.end).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </span>
              </>
            ) : (
              'Track and manage your financial transactions'
            )}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-white px-5 py-2.5 rounded-xl font-medium flex items-center space-x-2 transition-all hover:shadow-lg"
          style={{ backgroundColor: '#6366f1', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)' }}>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
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
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-500">
            Retry
          </button>
        </div>
      )}

      {isLoading && transactions.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <TransactionList
          transactions={transactions}
          summary={summary}
          onEdit={handleEditTransaction}
          onUpdate={async (id, data) => {
            await updateTransaction(id, data as UpdateTransactionData);
            refresh();
          }}
          onDelete={handleDeleteTransaction}
          onMarkPaid={handleMarkPaid}
        />
      )}

      <TransactionModal
        visible={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveTransaction}
        isEditMode={!!editingTransaction}
        initialData={editingTransaction}
      />
    </div>
  );
}

'use client';

import {useState, useMemo, useEffect} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {useTransactions} from '@/hooks/useTransactions';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionModal from '@/components/transactions/TransactionModal';
import {Spinner} from '@/components/ui';
import {exportTransactionsToCsv} from '@/lib/exportTransactions';
import {Transaction, UpdateTransactionData} from '@/types';

export default function TransactionsPage() {
  // Global search query (?q=...) and single-transaction deep link (?txn=<id>).
  // When either is present, treat the list as a historical record: drop the
  // pay-period restriction so transactions from any period (e.g. an income from
  // a past month) can be found.
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').trim();
  const txnId = (searchParams.get('txn') || '').trim();

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
  } = useTransactions({ usePayPeriod: !query && !txnId });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  // Refetch when the tab regains focus so payments/cards created on another
  // device (e.g. a goal payment made on mobile) appear here. Mirrors the mobile
  // app's nav-focus refetch and the dashboard's existing focus listener.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refresh]);

  // Filter the loaded transactions. A ?txn=<id> deep link narrows to just that
  // one transaction; otherwise the ?q= search query filters by text.
  const filteredTransactions = useMemo(() => {
    if (txnId) return transactions.filter((t) => t.id === txnId);
    if (!query) return transactions;
    const q = query.toLowerCase();
    return transactions.filter(
      (t) =>
        (t.description || '').toLowerCase().includes(q) ||
        (t.categoryName || '').toLowerCase().includes(q) ||
        (t.subcategoryName || '').toLowerCase().includes(q),
    );
  }, [transactions, query, txnId]);

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

  // Export the currently visible (filtered) transactions to CSV.
  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      alert('There are no transactions to export.');
      return;
    }
    exportTransactionsToCsv(filteredTransactions);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Transactions</h1>
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
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all hover:bg-gray-50 hover:shadow-sm">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Export</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-white px-4 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-base rounded-xl font-medium flex items-center space-x-2 transition-all hover:shadow-lg"
            style={{ backgroundColor: '#6366f1', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)' }}>
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
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

      {txnId ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Showing a single transaction from search</span>
          <Link href="/transactions" className="font-medium text-indigo-600 hover:text-indigo-700">
            Clear
          </Link>
        </div>
      ) : query && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>
            Showing results for{' '}
            <span className="font-medium text-gray-900">&ldquo;{query}&rdquo;</span>
            {' '}({filteredTransactions.length})
          </span>
          <Link href="/transactions" className="font-medium text-indigo-600 hover:text-indigo-700">
            Clear
          </Link>
        </div>
      )}

      {isLoading && transactions.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <TransactionList
          transactions={filteredTransactions}
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

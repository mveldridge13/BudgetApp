'use client';

import { useState, useEffect } from 'react';
import { Transaction } from '@/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CategoryIcon, CustomSelect } from '@/components/ui';
import { useCategories } from '@/hooks/useCategories';

interface CategoryObject {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface TransactionDetailPanelProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (transaction: Transaction) => void;
  onUpdate?: (id: string, data: Partial<Transaction>) => Promise<void>;
  onDelete?: (id: string) => void;
  onMarkPaid?: (id: string) => void;
}

export default function TransactionDetailPanel({
  transaction,
  isOpen,
  onClose,
  onEdit,
  onUpdate,
  onDelete,
  onMarkPaid,
}: TransactionDetailPanelProps) {
  const { categoriesWithSubcategories } = useCategories();
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTransaction, setEditedTransaction] = useState(transaction);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsEditMode(false);
      setShowDeleteConfirm(false);
      // Trigger animation after component mounts
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      // Remove from DOM after animation completes
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (transaction) {
      setEditedTransaction(transaction);
      // Initialize category/subcategory IDs
      setSelectedCategoryId(transaction.categoryId || '');
      setSelectedSubcategoryId(transaction.subcategoryId || '');
    }
  }, [transaction]);

  if (!shouldRender) return null;
  if (!transaction) return null;

  const selectedCategoryData = categoriesWithSubcategories.find(
    c => c.id === selectedCategoryId
  );

  // Handle category data
  let categoryName = 'Uncategorized';
  let categoryColor = '#6B7280';
  let categoryIcon = 'help-circle-outline';

  if (typeof transaction.categoryName === 'string') {
    categoryName = transaction.categoryName;
    categoryColor = transaction.categoryColor || '#6B7280';
    categoryIcon = transaction.categoryIcon || 'help-circle-outline';
  } else if (transaction.categoryName) {
    const categoryObj = transaction.categoryName as unknown as CategoryObject;
    categoryName = categoryObj.name || 'Uncategorized';
    categoryColor = categoryObj.color || '#6B7280';
    categoryIcon = categoryObj.icon || 'help-circle-outline';
  }

  const getFrequencyLabel = (transaction: Transaction): string => {
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
  };

  const frequency = getFrequencyLabel(transaction);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed top-0 left-0 right-0 bottom-0 w-full h-full bg-black transition-opacity duration-300 z-40 ${
          isAnimating ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClose();
        }}
        style={{ minHeight: '100vh', minWidth: '100vw' }}
      />

      {/* Slide-in Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[500px] bg-white shadow-2xl transform transition-transform duration-300 ease-out z-50 ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200" style={{ backgroundColor: '#6366f1' }}>
            <h2 className="text-xl font-semibold text-white">
              {isEditMode ? 'Edit Transaction' : 'Transaction Details'}
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Category Icon & Amount */}
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${categoryColor}20` }}
              >
                <CategoryIcon iconName={categoryIcon} size={32} color={categoryColor} />
              </div>
              <div className="flex-1">
                {isEditMode ? (
                  <input
                    type="number"
                    step="0.01"
                    value={Math.abs(editedTransaction?.amount || 0)}
                    onChange={(e) => setEditedTransaction(prev => prev ? {...prev, amount: parseFloat(e.target.value) || 0} : prev)}
                    className="text-3xl font-bold text-gray-900 border-b-2 border-indigo-500 bg-transparent focus:outline-none w-40"
                  />
                ) : (
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(Math.abs(transaction.amount))}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">{transaction.type}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Description</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                {isEditMode ? (
                  <input
                    type="text"
                    value={editedTransaction?.description || ''}
                    onChange={(e) => setEditedTransaction(prev => prev ? {...prev, description: e.target.value} : prev)}
                    className="w-full bg-transparent border-none p-0 text-base text-gray-900 font-medium focus:outline-none focus:ring-0"
                  />
                ) : (
                  <p className="text-base text-gray-900 font-medium">{transaction.description}</p>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Category</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 transition-colors">
                  {isEditMode ? (
                    <CustomSelect
                      value={selectedCategoryId}
                      onChange={(value) => {
                        setSelectedCategoryId(value);
                        setSelectedSubcategoryId(''); // Reset subcategory when category changes
                      }}
                      options={categoriesWithSubcategories.map(category => ({
                        value: category.id,
                        label: category.name,
                        icon: (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${category.color}20` }}
                          >
                            <CategoryIcon
                              iconName={category.icon}
                              size={12}
                              color={category.color}
                            />
                          </div>
                        ),
                      }))}
                      placeholder="Select a category"
                      leftIcon={
                        selectedCategoryData ? (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${selectedCategoryData.color}20` }}
                          >
                            <CategoryIcon
                              iconName={selectedCategoryData.icon}
                              size={10}
                              color={selectedCategoryData.color}
                            />
                          </div>
                        ) : undefined
                      }
                    />
                  ) : (
                    <p className="text-sm text-gray-900 font-medium">{categoryName}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Subcategory</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 transition-colors">
                  {isEditMode ? (
                    selectedCategoryData && selectedCategoryData.subcategories.length > 0 ? (
                      <CustomSelect
                        value={selectedSubcategoryId}
                        onChange={(value) => setSelectedSubcategoryId(value)}
                        options={selectedCategoryData.subcategories.map(subcategory => ({
                          value: subcategory.id,
                          label: subcategory.name,
                        }))}
                        placeholder="None"
                      />
                    ) : (
                      <p className="text-sm text-gray-500 font-medium">No subcategories</p>
                    )
                  ) : (
                    <p className="text-sm text-gray-900 font-medium">{transaction.subcategoryName || 'None'}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Date</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  {isEditMode ? (
                    <input
                      type="date"
                      value={editedTransaction?.date?.split('T')[0] || ''}
                      onChange={(e) => setEditedTransaction(prev => prev ? {...prev, date: e.target.value} : prev)}
                      className="w-full bg-transparent border-none p-0 text-sm text-gray-900 font-medium focus:outline-none focus:ring-0"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 font-medium">{formatDate(transaction.date)}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Frequency</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 transition-colors">
                  {isEditMode ? (
                    <CustomSelect
                      value={editedTransaction?.recurrence || 'none'}
                      onChange={(value) => setEditedTransaction(prev => prev ? {...prev, recurrence: value as any} : prev)}
                      options={[
                        { value: 'none', label: 'One-time' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'fortnightly', label: 'Fortnightly' },
                        { value: 'monthly', label: 'Monthly' },
                        { value: 'sixmonths', label: 'Every 6 months' },
                        { value: 'yearly', label: 'Yearly' },
                      ]}
                      placeholder="Select frequency"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-900 font-medium">{frequency}</p>
                      {frequency !== 'One-time' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#4CAF50' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {(editedTransaction?.recurrence && editedTransaction.recurrence !== 'none') && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Due Date</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                    {isEditMode ? (
                      <input
                        type="date"
                        value={editedTransaction?.dueDate?.split('T')[0] || ''}
                        onChange={(e) => setEditedTransaction(prev => prev ? {...prev, dueDate: e.target.value} : prev)}
                        className="w-full bg-transparent border-none p-0 text-sm text-gray-900 font-medium focus:outline-none focus:ring-0"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 font-medium">{transaction.dueDate ? formatDate(transaction.dueDate) : 'None'}</p>
                    )}
                  </div>
                </div>
              )}
              {(editedTransaction?.recurrence && editedTransaction.recurrence !== 'none') && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Status</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 transition-colors">
                    {isEditMode ? (
                      <CustomSelect
                        value={editedTransaction?.status || 'UPCOMING'}
                        onChange={(value) => setEditedTransaction(prev => prev ? {...prev, status: value as any} : prev)}
                        options={[
                          { value: 'UPCOMING', label: 'Upcoming' },
                          { value: 'PAID', label: 'Paid' },
                          { value: 'OVERDUE', label: 'Overdue' },
                        ]}
                        placeholder="Select status"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 font-medium">{transaction.status || 'None'}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Location */}
            {transaction.location && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Location</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-gray-900 font-medium">{transaction.location}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div className="border-t border-gray-200 p-6 space-y-3">
            {/* Edit Mode Actions */}
            {isEditMode ? (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsEditMode(false);
                    setEditedTransaction(transaction);
                    setSelectedCategoryId(transaction?.categoryId || '');
                    setSelectedSubcategoryId(transaction?.subcategoryId || '');
                  }}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (onUpdate && editedTransaction) {
                      try {
                        await onUpdate(editedTransaction.id, {
                          description: editedTransaction.description,
                          amount: editedTransaction.amount,
                          date: editedTransaction.date,
                          dueDate: editedTransaction.dueDate,
                          recurrence: editedTransaction.recurrence,
                          status: editedTransaction.status,
                          categoryId: selectedCategoryId,
                          ...(selectedSubcategoryId && { subcategoryId: selectedSubcategoryId }),
                        });
                        setIsEditMode(false);
                        onClose();
                      } catch (error) {
                        console.error('Failed to update transaction:', error);
                        alert('Failed to save changes. Please try again.');
                      }
                    }
                  }}
                  className="flex-1 px-4 py-3 text-sm font-medium rounded-xl transition-all text-white"
                  style={{ backgroundColor: '#6366f1' }}
                >
                  Save Changes
                </button>
              </div>
            ) : showDeleteConfirm ? (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Delete Transaction</h4>
                    <p className="text-sm text-gray-600">Are you sure you want to delete this transaction? This action cannot be undone.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (onDelete) {
                        onDelete(transaction.id);
                        setShowDeleteConfirm(false);
                        onClose();
                      }
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                {frequency !== 'One-time' && onMarkPaid && (
                  <button
                    onClick={() => {
                      onMarkPaid(transaction.id);
                      onClose();
                    }}
                    disabled={transaction.status === 'PAID'}
                    className={`w-full px-4 py-3 text-sm font-medium border rounded-xl transition-all ${
                      transaction.status === 'PAID'
                        ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                        : 'hover:bg-green-50 text-green-600 border-green-200'
                    }`}
                  >
                    {transaction.status === 'PAID' ? 'Marked as Paid ✓' : 'Mark as Paid'}
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="w-full px-4 py-3 text-sm font-medium rounded-xl transition-all"
                    style={{ backgroundColor: '#6366f1', color: 'white' }}
                  >
                    Edit Transaction
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full px-4 py-3 text-red-600 hover:bg-red-50 text-sm font-medium border border-red-200 rounded-xl transition-colors"
                  >
                    Delete Transaction
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

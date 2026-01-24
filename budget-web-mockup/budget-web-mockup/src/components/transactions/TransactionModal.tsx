'use client';

import {useState, useEffect} from 'react';
import {useCategories} from '@/hooks/useCategories';
import {Modal, Button, Input} from '@/components/ui';
import {RECURRENCE_OPTIONS} from '@/lib/constants';
import {formatISODate} from '@/lib/formatters';

interface TransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: unknown) => void;
  isEditMode?: boolean;
  initialData?: unknown;
}

export default function TransactionModal({
  visible,
  onClose,
  onSave,
  isEditMode = false,
  initialData,
}: TransactionModalProps) {
  const {categoriesWithSubcategories, isLoading: categoriesLoading} =
    useCategories();

  const [transactionType, setTransactionType] = useState<'EXPENSE' | 'INCOME'>(
    'EXPENSE',
  );
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedDate, setSelectedDate] = useState(formatISODate(new Date()));
  const [recurrence, setRecurrence] = useState('none');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (initialData && visible) {
      const transaction = initialData as {
        type?: string;
        amount?: number;
        description?: string;
        category?: string;
        subcategory?: string;
        date?: string;
        isRecurring?: boolean;
        recurringPattern?: { type?: string };
      };
      setTransactionType(transaction.type === 'INCOME' ? 'INCOME' : 'EXPENSE');
      setAmount(transaction.amount ? Math.abs(transaction.amount).toString() : '');
      setDescription(transaction.description || '');
      setSelectedCategory(transaction.category || '');
      setSelectedSubcategory(transaction.subcategory || '');

      // Format date for HTML date input (yyyy-MM-dd)
      const dateValue = transaction.date
        ? transaction.date.split('T')[0] // Extract date part from ISO string
        : formatISODate(new Date());
      setSelectedDate(dateValue);

      setRecurrence(
        transaction.isRecurring
          ? transaction.recurringPattern?.type || 'monthly'
          : 'none',
      );
    } else if (!visible) {
      resetForm();
    }
  }, [initialData, visible]);

  const selectedCategoryData = categoriesWithSubcategories.find(
    c => c.id === selectedCategory,
  );

  const handleSave = () => {
    if (!amount || !selectedCategory) {
      alert('Please fill in amount and category');
      return;
    }

    const transactionData = {
      amount: Math.abs(parseFloat(amount)), // Backend expects positive amounts
      type: transactionType,
      category: selectedCategory,
      subcategory: selectedSubcategory || undefined,
      description,
      date: selectedDate,
      isRecurring: recurrence !== 'none',
      recurringPattern:
        recurrence !== 'none' ? {type: recurrence, frequency: 1} : undefined,
      paymentStatus: 'PAID',
    };

    onSave(transactionData);
    resetForm();
  };

  const resetForm = () => {
    setTransactionType('EXPENSE');
    setAmount('');
    setDescription('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSelectedDate(formatISODate(new Date()));
    setRecurrence('none');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      isOpen={visible}
      onClose={handleClose}
      title={isEditMode ? 'Edit Transaction' : 'Add Transaction'}
      size="lg">
      <div className="p-4 space-y-4">
        {/* Transaction Type Toggle */}
        <div className="flex space-x-2">
          <button
            onClick={() => setTransactionType('EXPENSE')}
            className={`flex-1 flex items-center justify-center py-3 px-4 rounded-lg border-2 transition-colors ${
              transactionType === 'EXPENSE'
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'
            }`}>
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
              />
            </svg>
            <span className="font-medium">Expense</span>
          </button>
          <button
            onClick={() => setTransactionType('INCOME')}
            className={`flex-1 flex items-center justify-center py-3 px-4 rounded-lg border-2 transition-colors ${
              transactionType === 'INCOME'
                ? 'border-green-500 bg-green-500 text-white'
                : 'border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50'
            }`}>
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <span className="font-medium">Income</span>
          </button>
        </div>

        {/* Date Field */}
        <Input
          type="date"
          label="Date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
        />

        {/* Amount Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <div className="px-4 py-3 bg-gray-50 border-r border-gray-300">
              <span className="text-xl font-medium text-gray-700">$</span>
            </div>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 px-4 py-3 text-xl text-gray-900 outline-none"
              step="0.01"
            />
          </div>
        </div>

        {/* Description Field */}
        <Input
          label="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
        />

        {/* Category Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <button
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg text-left hover:bg-gray-50">
            <div className="flex items-center">
              {selectedCategoryData ? (
                <>
                  <div
                    className="w-8 h-8 rounded-full mr-3 flex items-center justify-center"
                    style={{
                      backgroundColor: `${selectedCategoryData.color}20`,
                    }}>
                    <span style={{color: selectedCategoryData.color}}>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                    </span>
                  </div>
                  <span className="text-gray-900">
                    {selectedCategoryData.name}
                  </span>
                </>
              ) : (
                <span className="text-gray-500">Select a category</span>
              )}
            </div>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showCategoryPicker && (
            <div className="mt-2 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
              {categoriesLoading ? (
                <div className="p-4 text-center text-gray-500">
                  Loading categories...
                </div>
              ) : (
                categoriesWithSubcategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setShowCategoryPicker(false);
                    }}
                    className={`w-full flex items-center px-4 py-3 hover:bg-gray-50 ${
                      selectedCategory === category.id ? 'bg-blue-50' : ''
                    }`}>
                    <div
                      className="w-8 h-8 rounded-full mr-3 flex items-center justify-center"
                      style={{backgroundColor: `${category.color}20`}}>
                      <span style={{color: category.color}}>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                      </span>
                    </div>
                    <span className="text-gray-900">{category.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Recurrence */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recurrence
          </label>
          <select
            value={recurrence}
            onChange={e => setRecurrence(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            {RECURRENCE_OPTIONS.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!amount || !selectedCategory}>
            {isEditMode ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

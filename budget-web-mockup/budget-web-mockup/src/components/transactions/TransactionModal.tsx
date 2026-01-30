'use client';

import {useState, useEffect} from 'react';
import {useCategories} from '@/hooks/useCategories';
import {Modal, Button, Input} from '@/components/ui';
import CategoryIcon from '@/components/ui/CategoryIcon';
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

  // Populate form when editing
  useEffect(() => {
    if (initialData && visible) {
      const transaction = initialData as {
        type?: string;
        amount?: number;
        description?: string;
        category?: string;
        categoryId?: string;
        subcategory?: string;
        subcategoryId?: string;
        date?: string;
        recurrence?: string;
        isRecurring?: boolean;
        recurringPattern?: {type?: string};
      };
      setTransactionType(transaction.type === 'INCOME' ? 'INCOME' : 'EXPENSE');
      setAmount(
        transaction.amount ? Math.abs(transaction.amount).toString() : '',
      );
      setDescription(transaction.description || '');
      // Backend uses categoryId/subcategoryId
      setSelectedCategory(transaction.categoryId || transaction.category || '');
      setSelectedSubcategory(
        transaction.subcategoryId || transaction.subcategory || '',
      );

      // Format date for HTML date input (yyyy-MM-dd)
      const dateValue = transaction.date
        ? transaction.date.split('T')[0] // Extract date part from ISO string
        : formatISODate(new Date());
      setSelectedDate(dateValue);

      // Backend uses 'recurrence' field directly
      setRecurrence(transaction.recurrence || 'none');
    } else if (!visible) {
      resetForm();
    }
  }, [initialData, visible]);

  const selectedCategoryData = categoriesWithSubcategories.find(
    c => c.id === selectedCategory,
  );

  const selectedSubcategoryData = selectedCategoryData?.subcategories.find(
    s => s.id === selectedSubcategory,
  );

  // Auto-fill description from subcategory when subcategory changes
  // Only set description if it's currently empty
  useEffect(() => {
    if (selectedSubcategoryData && !description) {
      setDescription(selectedSubcategoryData.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubcategory, selectedSubcategoryData]);

  const handleSave = () => {
    if (!amount || !selectedCategory) {
      alert('Please fill in amount and category');
      return;
    }

    // Convert date to ISO string like mobile app does
    const dateISO = new Date(selectedDate).toISOString();

    const transactionData = {
      amount: Math.abs(parseFloat(amount)), // Backend expects positive amounts
      type: transactionType,
      categoryId: selectedCategory, // Backend expects categoryId, not category
      ...(selectedSubcategory && {subcategoryId: selectedSubcategory}), // Backend expects subcategoryId
      description,
      date: dateISO, // Backend expects ISO string
      recurrence: recurrence, // Send recurrence field directly
      status: 'PAID', // Backend expects 'status', not 'paymentStatus'
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

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <div className="relative">
            {selectedCategoryData && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: `${selectedCategoryData.color}20`,
                  }}>
                  <CategoryIcon
                    iconName={selectedCategoryData.icon}
                    size={12}
                    color={selectedCategoryData.color}
                  />
                </div>
              </div>
            )}
            <select
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value);
                setSelectedSubcategory(''); // Reset subcategory when category changes
              }}
              className={`w-full ${
                selectedCategoryData ? 'pl-12' : 'pl-4'
              } pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white`}
              disabled={categoriesLoading}>
              <option value="">Select a category</option>
              {categoriesWithSubcategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Subcategory */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subcategory <span className="text-gray-400">(optional)</span>
          </label>
          <select
            value={selectedSubcategory}
            onChange={e => setSelectedSubcategory(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            disabled={!selectedCategoryData || selectedCategoryData.subcategories.length === 0}>
            <option value="">
              {!selectedCategory
                ? 'Select a category first'
                : selectedCategoryData && selectedCategoryData.subcategories.length === 0
                  ? 'No subcategories available'
                  : 'None'}
            </option>
            {selectedCategoryData?.subcategories.map(subcategory => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
          </select>
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

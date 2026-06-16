'use client';

import {useState, useEffect} from 'react';
import {useCategories} from '@/hooks/useCategories';
import {Modal, Button, Input, DatePicker, CustomSelect} from '@/components/ui';
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

  const [showTypeSelection, setShowTypeSelection] = useState(true);
  const [selectedFlowType, setSelectedFlowType] = useState<'oneoff' | 'recurring' | 'debt' | null>(null);

  const [transactionType, setTransactionType] = useState<'EXPENSE' | 'INCOME'>(
    'EXPENSE',
  );
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedDate, setSelectedDate] = useState(formatISODate(new Date()));
  const [recurrence, setRecurrence] = useState('none');
  const [dueDate, setDueDate] = useState(formatISODate(new Date()));

  // Populate form when editing
  useEffect(() => {
    if (initialData && visible) {
      // Skip type selection when editing
      setShowTypeSelection(false);

      const transaction = initialData as {
        type?: string;
        amount?: number;
        description?: string;
        category?: string;
        categoryId?: string;
        subcategory?: string;
        subcategoryId?: string;
        date?: string;
        dueDate?: string;
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

      // Format due date for HTML date input (yyyy-MM-dd)
      const dueDateValue = transaction.dueDate
        ? transaction.dueDate.split('T')[0]
        : formatISODate(new Date());
      setDueDate(dueDateValue);

      // Backend uses 'recurrence' field directly
      const recurrenceValue = transaction.recurrence || 'none';
      setRecurrence(recurrenceValue);
      // Set flow type based on whether it's recurring
      setSelectedFlowType(recurrenceValue !== 'none' ? 'recurring' : 'oneoff');
    } else if (!visible) {
      resetForm();
    } else if (visible && !initialData) {
      // Show type selection for new transactions
      setShowTypeSelection(true);
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
    const dueDateISO = new Date(dueDate).toISOString();

    const transactionData = {
      amount: Math.abs(parseFloat(amount)), // Backend expects positive amounts
      type: transactionType,
      categoryId: selectedCategory, // Backend expects categoryId, not category
      ...(selectedSubcategory && {subcategoryId: selectedSubcategory}), // Backend expects subcategoryId
      description,
      date: dateISO, // Backend expects ISO string
      recurrence: recurrence, // Send recurrence field directly
      ...(recurrence !== 'none' && {dueDate: dueDateISO}), // Include dueDate for recurring transactions
      ...(recurrence !== 'none' && {status: 'UPCOMING'}), // Only recurring transactions have status; one-off = no status
    };

    onSave(transactionData);
    resetForm();
  };

  const resetForm = () => {
    setShowTypeSelection(true);
    setSelectedFlowType(null);
    setTransactionType('EXPENSE');
    setAmount('');
    setDescription('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSelectedDate(formatISODate(new Date()));
    setDueDate(formatISODate(new Date()));
    setRecurrence('none');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTypeSelect = (type: 'oneoff' | 'recurring' | 'debt') => {
    setShowTypeSelection(false);
    setSelectedFlowType(type);

    // Set defaults based on type
    if (type === 'recurring') {
      setRecurrence('none'); // Default to none, user must select a pattern
    } else if (type === 'debt') {
      // Could set specific defaults for debt payments
      setRecurrence('none');
    } else {
      setRecurrence('none');
    }
  };

  if (!visible) return null;

  return (
    <Modal
      isOpen={visible}
      onClose={handleClose}
      title={isEditMode ? 'Edit Transaction' : 'Add Transaction'}
      size="lg">
      {showTypeSelection && !isEditMode ? (
        /* Type Selection Screen */
        <div className="p-8 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
            What type of transaction would you like to add?
          </h3>
          <div className="space-y-4">
            {/* One-off Transaction */}
            <button
              onClick={() => handleTypeSelect('oneoff')}
              className="w-full p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: 'rgba(0, 122, 255, 0.15)' }}>
                  <svg
                    className="w-8 h-8"
                    style={{ color: '#007AFF' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">One-off</h4>
                <p className="text-sm text-gray-600">A single transaction that happens once</p>
              </div>
            </button>

            {/* Recurring Transaction */}
            <button
              onClick={() => handleTypeSelect('recurring')}
              className="w-full p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: 'rgba(76, 175, 80, 0.15)' }}>
                  <svg
                    className="w-8 h-8"
                    style={{ color: '#4CAF50' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">Recurring</h4>
                <p className="text-sm text-gray-600">A transaction that repeats over time</p>
              </div>
            </button>

            {/* Debt Payment */}
            <button
              onClick={() => handleTypeSelect('debt')}
              className="w-full p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: 'rgba(255, 107, 133, 0.15)' }}>
                  <svg
                    className="w-8 h-8"
                    style={{ color: '#FF6B85' }}
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
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">Debt Payment</h4>
                <p className="text-sm text-gray-600">Pay down a loan or credit card</p>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Transaction Type Toggle */}
        <div className="flex space-x-2">
          <button
            onClick={() => setTransactionType('EXPENSE')}
            className={`flex-1 flex items-center justify-center py-3 px-4 rounded-lg border-2 transition-colors ${
              transactionType === 'EXPENSE'
                ? 'border-red-400 bg-red-400 text-white'
                : 'border-gray-200 text-gray-600 hover:border-red-200 hover:bg-red-50'
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
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <DatePicker
            value={selectedDate}
            onChange={setSelectedDate}
          />
        </div>

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
          <div className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 transition-colors hover:border-gray-400">
            <CustomSelect
              value={selectedCategory}
              onChange={value => {
                setSelectedCategory(value);
                setSelectedSubcategory(''); // Reset subcategory when category changes
              }}
              placeholder="Select a category"
              disabled={categoriesLoading}
              leftIcon={
                selectedCategoryData ? (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${selectedCategoryData.color}20` }}>
                    <CategoryIcon
                      iconName={selectedCategoryData.icon}
                      size={12}
                      color={selectedCategoryData.color}
                    />
                  </div>
                ) : undefined
              }
              options={categoriesWithSubcategories.map(category => ({
                value: category.id,
                label: category.name,
                icon: (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}20` }}>
                    <CategoryIcon
                      iconName={category.icon}
                      size={12}
                      color={category.color}
                    />
                  </div>
                ),
              }))}
            />
          </div>
        </div>

        {/* Subcategory - only show if selected category has subcategories */}
        {selectedCategoryData && selectedCategoryData.subcategories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subcategory <span className="text-gray-400">(optional)</span>
            </label>
            <div className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 transition-colors hover:border-gray-400">
              <CustomSelect
                value={selectedSubcategory}
                onChange={setSelectedSubcategory}
                placeholder="None"
                options={[
                  { value: '', label: 'None' },
                  ...selectedCategoryData.subcategories.map(subcategory => ({
                    value: subcategory.id,
                    label: subcategory.name,
                  })),
                ]}
              />
            </div>
          </div>
        )}

        {/* Recurrence - only show for recurring and debt transactions */}
        {(selectedFlowType === 'recurring' || selectedFlowType === 'debt') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recurrence
            </label>
            <div className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 transition-colors hover:border-gray-400">
              <CustomSelect
                value={recurrence}
                onChange={setRecurrence}
                options={RECURRENCE_OPTIONS.map(option => ({
                  value: option.id,
                  label: option.id === 'none' ? 'None' : option.name,
                }))}
              />
            </div>
          </div>
        )}

        {/* Due Date - only show for recurring transactions */}
        {recurrence !== 'none' && (selectedFlowType === 'recurring' || selectedFlowType === 'debt') && (
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
            />
          </div>
        )}

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
      )}
    </Modal>
  );
}

import { useState } from 'react';
import { mockCategories } from '@/lib/mockData';

interface TransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isEditMode?: boolean;
}

// Ionicon SVG Component for modal
const ModalIoniconSvg = ({ name, color, size }: { name: string; color: string; size: number }) => {
  const iconMap: { [key: string]: React.ReactElement } = {
    'trending-down': (
      <svg fill="none" stroke={color} viewBox="0 0 24 24" width={size} height={size}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    ),
    'trending-up': (
      <svg fill="none" stroke={color} viewBox="0 0 24 24" width={size} height={size}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    'calendar-outline': (
      <svg fill="none" stroke={color} viewBox="0 0 24 24" width={size} height={size}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    'albums-outline': (
      <svg fill="none" stroke={color} viewBox="0 0 24 24" width={size} height={size}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    'chevron-forward': (
      <svg fill="none" stroke={color} viewBox="0 0 24 24" width={size} height={size}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    ),
    'refresh-outline': (
      <svg fill="none" stroke={color} viewBox="0 0 24 24" width={size} height={size}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  };

  return iconMap[name] || <div />;
};

export default function TransactionModal({ visible, onClose, onSave, isEditMode = false }: TransactionModalProps) {
  const [transactionType, setTransactionType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurrence, setRecurrence] = useState('none');

  const recurrenceOptions = [
    { id: 'none', name: 'One-time' },
    { id: 'weekly', name: 'Weekly' },
    { id: 'fortnightly', name: 'Fortnightly' },
    { id: 'monthly', name: 'Monthly' },
    { id: 'sixmonths', name: 'Every six months' },
    { id: 'yearly', name: 'Yearly' },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCategoryById = (id: string) => {
    return mockCategories.find(cat => cat.id === id);
  };

  const getSelectedCategoryData = () => {
    return getCategoryById(selectedCategory);
  };

  const handleSave = () => {
    if (!amount || !selectedCategory) {
      alert('Please fill in amount and category');
      return;
    }

    const categoryData = getCategoryById(selectedCategory);
    const subcategoryData = categoryData?.subcategories.find(sub => sub.id === selectedSubcategory);

    const transactionData = {
      amount: parseFloat(amount) * (transactionType === 'EXPENSE' ? -1 : 1),
      description,
      category: categoryData,
      subcategory: subcategoryData || categoryData?.subcategories[0],
      date: selectedDate,
      recurrence,
      transactionType,
      paymentStatus: 'PAID',
    };

    onSave(transactionData);
    onClose();
  };

  if (!visible) {return null;}

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden shadow-2xl border-2 border-gray-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <button
            onClick={onClose}
            className="text-blue-600 font-medium"
          >
            Cancel
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {isEditMode ? 'Edit Transaction' : 'Add Transaction'}
          </h1>
          <button
            onClick={handleSave}
            disabled={!amount || !selectedCategory}
            className={`font-medium ${
              amount && selectedCategory
                ? 'text-blue-600 hover:text-blue-700'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            {isEditMode ? 'Update' : 'Save'}
          </button>
        </div>

        {/* Form Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-64px)]">
          <div className="p-4 space-y-4">
            {/* Transaction Type Toggle */}
            <div className="flex space-x-2">
              <button
                onClick={() => setTransactionType('EXPENSE')}
                className={`flex-1 flex items-center justify-center py-3 px-4 rounded-lg border-2 transition-colors ${
                  transactionType === 'EXPENSE'
                    ? 'border-red-500 bg-red-500 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'
                }`}
              >
                <ModalIoniconSvg
                  name="trending-down"
                  color={transactionType === 'EXPENSE' ? '#FFFFFF' : '#6B7280'}
                  size={18}
                />
                <span className="ml-2 font-medium">Expense</span>
              </button>
              <button
                onClick={() => setTransactionType('INCOME')}
                className={`flex-1 flex items-center justify-center py-3 px-4 rounded-lg border-2 transition-colors ${
                  transactionType === 'INCOME'
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50'
                }`}
              >
                <ModalIoniconSvg
                  name="trending-up"
                  color={transactionType === 'INCOME' ? '#FFFFFF' : '#6B7280'}
                  size={18}
                />
                <span className="ml-2 font-medium">Income</span>
              </button>
            </div>

            {/* Date Field */}
            <div className="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
              <ModalIoniconSvg name="calendar-outline" color="#007AFF" size={18} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="ml-3 bg-transparent text-gray-900 font-medium outline-none flex-1"
              />
            </div>

            {/* Amount Field */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-4 bg-gray-50 border-r border-gray-200">
                <span className="text-xl font-medium text-gray-700">$</span>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-4 py-4 text-xl text-gray-900 outline-none"
                step="0.01"
              />
            </div>

            {/* Description Field */}
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-4 py-4 border border-gray-200 rounded-lg text-gray-900 outline-none focus:border-blue-500"
            />

            {/* Category Field (No functionality) */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-gray-100">
                    <ModalIoniconSvg name="albums-outline" color="#6B7280" size={18} />
                  </div>
                  <span className="text-gray-500">Category</span>
                </div>
                <ModalIoniconSvg name="chevron-forward" color="#6B7280" size={20} />
              </div>
            </div>

            {/* Recurrence Field (No functionality) */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ModalIoniconSvg name="refresh-outline" color="#6B7280" size={18} />
                  <span className="ml-3 text-gray-900 font-medium">One-time</span>
                </div>
                <ModalIoniconSvg name="chevron-forward" color="#6B7280" size={20} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

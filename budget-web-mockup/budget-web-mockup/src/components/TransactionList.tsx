import React, { useState } from 'react';
import { Transaction } from '@/lib/mockData';

// Ionicon SVG Component
const IoniconSvg = ({ name, color, size }: { name: string; color: string; size: number }) => {
  const iconMap: { [key: string]: React.ReactElement } = {
    'restaurant-outline': (
      <svg fill="none" stroke={color} viewBox="0 0 24 24" width={size} height={size}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.254 48.254 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l-.5 13.5m-9.5-13.5a48.416 48.416 0 0 0-3 .52m3-.52l.5 13.5m9.5-13.5l.5 13.5" />
      </svg>
    ),
    'car-outline': (
      <svg fill="none" stroke={color} viewBox="0 0 24 24" width={size} height={size}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m0 0a1.125 1.125 0 0 1 1.125-1.125m0 0h17.25m-17.25 0h7.5m0 0V9a2.25 2.25 0 0 1 2.25-2.25h.75m0 0a2.25 2.25 0 0 1 2.25 2.25v8.25m-15.75 0V9A6.75 6.75 0 0 1 9 2.25h1.5a2.25 2.25 0 0 1 2.25 2.25v6.75m0 0a2.25 2.25 0 0 0 2.25 2.25M12 9.75h3.375c.621 0 1.125.504 1.125 1.125m0 0V19.5m0-8.625v4.5m0 0h-3.375m3.375 0a1.125 1.125 0 0 0 1.125-1.125" />
      </svg>
    ),
    'film-outline': (
      <svg fill="none" stroke={color} viewBox="0 0 24 24" width={size} height={size}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    'bag-outline': (
      <svg fill="none" stroke={color} viewBox="0 0 24 24" width={size} height={size}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
    'cash-outline': (
      <svg fill="none" stroke={color} viewBox="0 0 24 24" width={size} height={size}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    'fitness-outline': (
      <svg fill="none" stroke={color} viewBox="0 0 24 24" width={size} height={size}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.949 8.949 0 0 0 4.951-1.488A3.987 3.987 0 0 0 13.5 16.5h-3a3.987 3.987 0 0 0-3.451 3.012A8.948 8.948 0 0 0 12 21Zm3-11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
    'flash-outline': (
      <svg fill="none" stroke={color} viewBox="0 0 24 24" width={size} height={size}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    ),
    'school-outline': (
      <svg fill="none" stroke={color} viewBox="0 0 24 24" width={size} height={size}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
      </svg>
    )
  };

  return iconMap[name] || (
    <svg fill="none" stroke={color} viewBox="0 0 24 24" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
};

interface TransactionListProps {
  transactions: Transaction[];
}

export default function TransactionList({ transactions }: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [frequencyFilter, setFrequencyFilter] = useState('All Frequencies');
  const [sortOrder, setSortOrder] = useState('Newest First');
  const [swipeStates, setSwipeStates] = useState<{[key: string]: number}>({});
  const [isDragging, setIsDragging] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getRecurrenceDisplay = (recurrence: string) => {
    if (recurrence === 'none') return 'One-time';
    return recurrence.charAt(0).toUpperCase() + recurrence.slice(1);
  };

  // Calculate total amount
  const totalAmount = transactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

  // Filter and sort transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All Categories' || transaction.category.name === categoryFilter;
    const matchesFrequency = frequencyFilter === 'All Frequencies' || getRecurrenceDisplay(transaction.recurrence) === frequencyFilter;
    return matchesSearch && matchesCategory && matchesFrequency;
  });

  // Swipe gesture handlers
  const handleMouseDown = (e: React.MouseEvent, transactionId: string) => {
    e.preventDefault();
    const startX = e.clientX;
    let isDraggingThis = true;
    setIsDragging(transactionId);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingThis) return;
      const currentX = moveEvent.clientX;
      const deltaX = currentX - startX; // Fixed: currentX - startX (not startX - currentX)
      const clampedDelta = Math.max(-100, Math.min(100, deltaX));
      
      setSwipeStates(prev => ({
        ...prev,
        [transactionId]: clampedDelta
      }));
    };

    const handleMouseUp = () => {
      const currentSwipe = swipeStates[transactionId] || 0;
      
      if (Math.abs(currentSwipe) < 30) {
        // Snap back to center if swipe wasn't significant
        setSwipeStates(prev => ({
          ...prev,
          [transactionId]: 0
        }));
      } else if (currentSwipe > 0) {
        // Swiped right - edit
        handleEdit(transactionId);
      } else {
        // Swiped left - delete  
        handleDelete(transactionId);
      }
      
      isDraggingThis = false;
      setIsDragging(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleEdit = (transactionId: string) => {
    console.log('Edit transaction:', transactionId);
    // Reset swipe state
    setSwipeStates(prev => ({
      ...prev,
      [transactionId]: 0
    }));
  };

  const handleDelete = (transactionId: string) => {
    console.log('Delete transaction:', transactionId);
    // Reset swipe state
    setSwipeStates(prev => ({
      ...prev,
      [transactionId]: 0
    }));
  };

  return (
    <div className="space-y-6">
      {/* Transaction Summary */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Transaction Summary</h2>
            <p className="text-gray-600">{transactions.length} transactions</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
            <p className="text-gray-600">Total Amount</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
          <option>All Categories</option>
          <option>Food & Dining</option>
          <option>Transportation</option>
          <option>Entertainment</option>
          <option>Shopping</option>
          <option>Health & Fitness</option>
          <option>Utilities</option>
          <option>Education</option>
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
          filteredTransactions.map((transaction) => {
            const swipeOffset = swipeStates[transaction.id] || 0;
            const isBeingDragged = isDragging === transaction.id;
            const isRecurring = transaction.recurrence && transaction.recurrence !== 'none';
            
            const getAmountDisplay = () => {
              if (transaction.transactionType === 'INCOME') {
                return `+${formatCurrency(transaction.amount)}`;
              } else {
                return `-${formatCurrency(transaction.amount)}`;
              }
            };

            const getAmountColor = () => {
              if (transaction.transactionType === 'INCOME') {
                return '#4CAF50';
              } else {
                return '#FF4757';
              }
            };

            const getLightBackgroundColor = (color: string) => {
              const hex = color.replace('#', '');
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const b = parseInt(hex.substring(4, 6), 16);
              return `rgba(${r}, ${g}, ${b}, 0.15)`;
            };

            const getMetadataText = () => {
              const recurrenceText = getRecurrenceDisplay(transaction.recurrence);
              const categoryName = transaction.category?.name || 'Other';

              if (recurrenceText !== 'One-time') {
                return `${categoryName} • ${recurrenceText}`;
              } else {
                return `${categoryName} • ${formatDate(transaction.date)}`;
              }
            };
            
            return (
              <div key={transaction.id} className="relative overflow-hidden mb-2">
                {/* Edit Background (Right Swipe) */}
                <div 
                  className="absolute inset-0 rounded-xl flex items-center justify-start pl-5"
                  style={{
                    backgroundColor: '#52C788',
                    opacity: swipeOffset > 0 ? Math.min(swipeOffset / 100, 1) : 0,
                  }}
                >
                  <div className="flex items-center">
                    {/* Ionicons create-outline equivalent */}
                    <svg className="w-6 h-6 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                    <span className="text-white font-medium text-base" style={{ letterSpacing: '-0.2px' }}>Edit</span>
                  </div>
                </div>

                {/* Delete Background (Left Swipe) */}
                <div 
                  className="absolute inset-0 rounded-xl flex items-center justify-end pr-5"
                  style={{
                    backgroundColor: '#FF6B85',
                    opacity: swipeOffset < 0 ? Math.min(Math.abs(swipeOffset) / 100, 1) : 0,
                  }}
                >
                  <div className="flex items-center">
                    {/* Ionicons trash-outline equivalent */}
                    <svg className="w-6 h-6 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                    <span className="text-white font-medium text-base" style={{ letterSpacing: '-0.2px' }}>Delete</span>
                  </div>
                </div>

                {/* Main Transaction Card */}
                <div
                  className="relative bg-white rounded-xl p-4 cursor-pointer select-none shadow-sm"
                  style={{
                    transform: `translateX(${swipeOffset}px) scale(${isBeingDragged ? 0.98 : 1})`,
                    transition: isBeingDragged ? 'none' : 'transform 0.2s ease-out',
                    borderLeft: isRecurring ? '3px solid #6366f1' : 'none',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, transaction.id)}
                >
                  <div className="flex items-center">
                    {/* Icon */}
                    <div className="mr-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: getLightBackgroundColor(transaction.category.color) }}
                      >
                        {/* Render Ionicon as SVG */}
                        <IoniconSvg 
                          name={transaction.category.icon} 
                          color={transaction.category.color} 
                          size={20}
                        />
                      </div>
                    </div>

                    {/* Transaction Info */}
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <h4 className="text-base font-light text-gray-900 flex-1" style={{ letterSpacing: '-0.2px' }}>
                          {transaction.description}
                        </h4>
                        {isRecurring && (
                          <div className="ml-2 p-1">
                            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-light text-gray-500" style={{ letterSpacing: '-0.1px' }}>
                        {getMetadataText()}
                      </p>
                      {transaction.dueDate && (
                        <p className="text-xs font-normal text-orange-500 mt-1" style={{ letterSpacing: '-0.1px' }}>
                          Due {formatDate(transaction.dueDate)}
                        </p>
                      )}
                      {transaction.paymentStatus && transaction.paymentStatus !== 'PAID' && (
                        <p className="text-xs font-medium mt-1" style={{ 
                          letterSpacing: '-0.1px',
                          color: transaction.paymentStatus === 'UPCOMING' ? '#007AFF' : 
                                transaction.paymentStatus === 'OVERDUE' ? '#F44336' : '#6B7280'
                        }}>
                          {transaction.paymentStatus === 'UPCOMING' ? 'Upcoming' : 
                           transaction.paymentStatus === 'OVERDUE' ? 'Overdue' : transaction.paymentStatus}
                        </p>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="text-right ml-4">
                      <p 
                        className="text-base font-light" 
                        style={{ 
                          color: getAmountColor(),
                          letterSpacing: '-0.2px'
                        }}
                      >
                        {getAmountDisplay()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
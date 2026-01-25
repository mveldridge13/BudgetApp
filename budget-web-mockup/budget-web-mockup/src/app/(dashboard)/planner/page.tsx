'use client';

import { useState } from 'react';

// Mock data for the Kanban board
const mockPayments = [
  {
    id: '1',
    name: 'Netflix Subscription',
    amount: 17.99,
    dueDate: '2026-02-05',
    status: 'upcoming',
    type: 'recurring',
    frequency: 'monthly',
  },
  {
    id: '2',
    name: 'Rent Payment',
    amount: 1800,
    dueDate: '2026-01-28',
    status: 'due',
    type: 'recurring',
    frequency: 'monthly',
  },
  {
    id: '3',
    name: 'Electricity Bill',
    amount: 120,
    dueDate: '2026-01-26',
    status: 'due',
    type: 'recurring',
    frequency: 'monthly',
  },
  {
    id: '4',
    name: 'Car Loan',
    amount: 450,
    dueDate: '2026-01-20',
    status: 'paid',
    type: 'debt',
    frequency: 'monthly',
    paidDate: '2026-01-20',
  },
  {
    id: '5',
    name: 'Internet Bill',
    amount: 89,
    dueDate: '2026-01-15',
    status: 'overdue',
    type: 'recurring',
    frequency: 'monthly',
  },
];

const columns = [
  {
    id: 'upcoming',
    title: 'Upcoming',
    description: 'Scheduled for future',
    color: 'bg-blue-50 border-blue-200',
    headerColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  {
    id: 'due',
    title: 'Due',
    description: 'Needs attention',
    color: 'bg-yellow-50 border-yellow-200',
    headerColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
  },
  {
    id: 'paid',
    title: 'Paid',
    description: 'Completed',
    color: 'bg-green-50 border-green-200',
    headerColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  {
    id: 'overdue',
    title: 'Overdue',
    description: 'Missed payment window',
    color: 'bg-red-50 border-red-200',
    headerColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
];

export default function PlannerPage() {
  const [payments, setPayments] = useState(mockPayments);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<typeof mockPayments[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getPaymentsByStatus = (status: string) => {
    return payments.filter((p) => p.status === status);
  };

  const handleDragStart = (e: React.DragEvent, paymentId: string) => {
    setDraggedItem(paymentId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (columnId: string) => {
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();

    if (!draggedItem) return;

    setPayments((prevPayments) =>
      prevPayments.map((payment) => {
        if (payment.id === draggedItem) {
          const updatedPayment = { ...payment, status: newStatus };

          // If marking as paid, set the paid date to today
          if (newStatus === 'paid') {
            updatedPayment.paidDate = new Date().toISOString().split('T')[0];
          }

          return updatedPayment;
        }
        return payment;
      })
    );

    setDraggedItem(null);
    setDragOverColumn(null);
  };

  const handleCardClick = (payment: typeof mockPayments[0]) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPayment(null);
  };

  const handleStatusChange = (newStatus: string) => {
    if (!selectedPayment) return;

    setPayments((prevPayments) =>
      prevPayments.map((payment) => {
        if (payment.id === selectedPayment.id) {
          const updatedPayment = { ...payment, status: newStatus };

          // If marking as paid, set the paid date to today
          if (newStatus === 'paid' && !payment.paidDate) {
            updatedPayment.paidDate = new Date().toISOString().split('T')[0];
          }

          return updatedPayment;
        }
        return payment;
      })
    );

    // Update the selected payment to reflect the change
    setSelectedPayment({ ...selectedPayment, status: newStatus });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Planner</h1>
          <p className="text-gray-600 mt-1">
            Manage your recurring payments and debt obligations
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Total Due This Month</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(
              payments
                .filter((p) => p.status === 'due' || p.status === 'overdue')
                .reduce((sum, p) => sum + p.amount, 0)
            )}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Payments Due</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {getPaymentsByStatus('due').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {getPaymentsByStatus('paid').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Overdue</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {getPaymentsByStatus('overdue').length}
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {columns.map((column) => {
          const columnPayments = getPaymentsByStatus(column.id);
          return (
            <div key={column.id} className="flex flex-col">
              {/* Column Header */}
              <div className={`${column.headerColor} rounded-t-lg px-4 py-3 border ${column.color.split(' ')[1]}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold ${column.textColor}`}>
                    {column.title}
                  </h3>
                  <span className={`text-sm font-medium ${column.textColor}`}>
                    {columnPayments.length}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{column.description}</p>
              </div>

              {/* Column Content */}
              <div
                className={`${column.color} border border-t-0 rounded-b-lg p-3 space-y-3 min-h-[400px] flex-1 transition-all ${
                  dragOverColumn === column.id ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                }`}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {columnPayments.map((payment) => (
                  <div
                    key={payment.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, payment.id)}
                    onClick={() => handleCardClick(payment)}
                    className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                      draggedItem === payment.id ? 'invisible' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{payment.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            payment.type === 'debt'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {payment.type === 'debt' ? 'Debt' : 'Recurring'}
                          </span>
                          <span className="text-xs text-gray-500">{payment.frequency}</span>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </span>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {payment.status === 'paid' ? 'Paid' : 'Due'}
                        </p>
                        <p className="text-sm font-medium text-gray-700">
                          {formatDate(payment.status === 'paid' && payment.paidDate ? payment.paidDate : payment.dueDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {columnPayments.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-sm">No payments</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="font-semibold text-blue-900">How to use the Planner</h4>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Drag cards between columns to update payment status</li>
              <li>• Click on any card to view details or edit</li>
              <li>• <strong>Upcoming</strong> - Payments scheduled for the future</li>
              <li>• <strong>Due</strong> - Payments that need attention this period</li>
              <li>• <strong>Paid</strong> - Completed payments (syncs to Transactions)</li>
              <li>• <strong>Overdue</strong> - Payments that missed their due date</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Payment Detail Modal */}
      {isModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Payment Details</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status - Chevron Path */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Status
                </label>
                <div className="flex items-center -space-x-5">
                  {/* Upcoming */}
                  <button
                    onClick={() => handleStatusChange('upcoming')}
                    className={`flex-1 flex items-center justify-center py-3 px-8 transition-all relative ${
                      selectedPayment.status === 'upcoming'
                        ? 'bg-blue-500 text-white z-10'
                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300 z-0'
                    }`}
                    style={{ clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)' }}
                  >
                    <span className="text-sm font-medium">Upcoming</span>
                  </button>

                  {/* Due */}
                  <button
                    onClick={() => handleStatusChange('due')}
                    className={`flex-1 flex items-center justify-center py-3 px-8 transition-all relative ${
                      selectedPayment.status === 'due'
                        ? 'bg-yellow-500 text-white z-10'
                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300 z-0'
                    }`}
                    style={{ clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)' }}
                  >
                    <span className="text-sm font-medium">Due</span>
                  </button>

                  {/* Paid */}
                  <button
                    onClick={() => handleStatusChange('paid')}
                    className={`flex-1 flex items-center justify-center py-3 px-8 transition-all relative ${
                      selectedPayment.status === 'paid'
                        ? 'bg-green-500 text-white z-10'
                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300 z-0'
                    }`}
                    style={{ clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)' }}
                  >
                    <span className="text-sm font-medium">Paid</span>
                  </button>

                  {/* Overdue */}
                  <button
                    onClick={() => handleStatusChange('overdue')}
                    className={`flex-1 flex items-center justify-center py-3 px-8 transition-all relative ${
                      selectedPayment.status === 'overdue'
                        ? 'bg-red-500 text-white z-10'
                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300 z-0'
                    }`}
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
                  >
                    <span className="text-sm font-medium">Overdue</span>
                  </button>
                </div>
              </div>

              {/* Payment Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Name
                </label>
                <input
                  type="text"
                  value={selectedPayment.name}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  readOnly
                />
              </div>

              {/* Amount and Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(selectedPayment.amount)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="text"
                    value={new Date(selectedPayment.dueDate).toLocaleDateString('en-AU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>
              </div>

              {/* Type and Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      selectedPayment.type === 'debt'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {selectedPayment.type === 'debt' ? 'Debt Payment' : 'Recurring Payment'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <input
                    type="text"
                    value={selectedPayment.frequency.charAt(0).toUpperCase() + selectedPayment.frequency.slice(1)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>
              </div>

              {/* Paid Date (if applicable) */}
              {selectedPayment.paidDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paid Date
                  </label>
                  <input
                    type="text"
                    value={new Date(selectedPayment.paidDate).toLocaleDateString('en-AU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Edit Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

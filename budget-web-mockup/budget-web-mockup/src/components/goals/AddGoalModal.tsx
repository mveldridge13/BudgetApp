'use client';

import { useState, useEffect } from 'react';
import { GoalDisplay, GoalTypeDisplay, GoalPriorityDisplay } from '@/types';
import { DatePicker } from '@/components/ui';
import {
  DollarSign,
  CreditCard,
  TrendingDown,
  Shield,
  Car,
  Coffee,
  Zap,
  Heart,
  ShoppingBag,
  MoreHorizontal,
  Calendar,
  X,
  ChevronDown,
} from 'lucide-react';

interface AddGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (goalData: Partial<GoalDisplay>) => Promise<void>;
  editingGoal?: GoalDisplay | null;
}

const GOAL_TYPES = [
  {
    id: 'savings' as GoalTypeDisplay,
    label: 'Savings',
    icon: DollarSign,
    description: 'Save money for future purchases',
    color: 'blue',
  },
  {
    id: 'spending' as GoalTypeDisplay,
    label: 'Spending Budget',
    icon: CreditCard,
    description: 'Track spending in categories',
    color: 'amber',
  },
  {
    id: 'debt' as GoalTypeDisplay,
    label: 'Debt Payment',
    icon: TrendingDown,
    description: 'Pay off loans or credit cards',
    color: 'red',
  },
];

const CATEGORIES = [
  { id: 'Security', label: 'Emergency Fund', icon: Shield },
  { id: 'Debt', label: 'Debt Repayment', icon: CreditCard },
  { id: 'Food', label: 'Food', icon: Coffee },
  { id: 'Transport', label: 'Transport', icon: Car },
  { id: 'Shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'Entertainment', label: 'Entertainment', icon: Zap },
  { id: 'Bills', label: 'Bills', icon: Zap },
  { id: 'Health', label: 'Health', icon: Heart },
  { id: 'Other', label: 'Other', icon: MoreHorizontal },
];

const PRIORITIES: {
  id: GoalPriorityDisplay;
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}[] = [
  {
    id: 'high',
    label: 'High',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    textColor: '#991b1b'
  },
  {
    id: 'medium',
    label: 'Medium',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    textColor: '#92400e'
  },
  {
    id: 'low',
    label: 'Low',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    textColor: '#166534'
  },
];

export default function AddGoalModal({ visible, onClose, onSave, editingGoal }: AddGoalModalProps) {
  const [formData, setFormData] = useState<Partial<GoalDisplay>>({
    title: '',
    type: 'savings',
    target: undefined,
    current: undefined,
    originalAmount: undefined,
    deadline: '',
    category: '',
    priority: 'medium',
    autoContribute: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      // Lock body scroll for both add and edit
      document.body.style.overflow = 'hidden';

      // Trigger animation for slide-in panel (editing)
      if (editingGoal) {
        setTimeout(() => setIsAnimating(true), 10);
      }

      if (editingGoal) {
        setFormData({ ...editingGoal });
      } else {
        setFormData({
          title: '',
          type: 'savings',
          target: undefined,
          current: undefined,
          originalAmount: undefined,
          deadline: '',
          category: '',
          priority: 'medium',
          autoContribute: undefined,
        });
      }
      setErrors({});
      setSaving(false);
    } else {
      setIsAnimating(false);
      // Unlock body scroll
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible, editingGoal]);

  const updateFormData = (field: string, value: unknown) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-set category to Debt when type is debt
      if (field === 'type' && value === 'debt') {
        updated.category = 'Debt';
      }
      return updated;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Goal title is required';
    }

    if (formData.type === 'debt') {
      if (!formData.originalAmount || formData.originalAmount <= 0) {
        newErrors.originalAmount = 'Original debt amount is required';
      }
      if ((formData.current ?? 0) > (formData.originalAmount ?? 0)) {
        newErrors.current = 'Current debt cannot exceed original amount';
      }
      if (!formData.deadline) {
        newErrors.deadline = 'Deadline is required for debt goals';
      }
    } else {
      if (!formData.target || formData.target <= 0) {
        newErrors.target = 'Target amount must be greater than 0';
      }
    }

    if (formData.deadline) {
      const deadlineDate = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      deadlineDate.setHours(0, 0, 0, 0);

      if (deadlineDate <= today) {
        newErrors.deadline = 'Deadline must be in the future';
      }
    }

    if (formData.autoContribute && formData.autoContribute < 0) {
      newErrors.autoContribute = 'Auto-contribution cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Failed to save goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  const selectedType = GOAL_TYPES.find((t) => t.id === formData.type);

  // Use slide-in panel for editing, centered modal for adding
  if (editingGoal) {
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
              <h2 className="text-xl font-semibold text-white">Edit Goal</h2>
              <button
                onClick={onClose}
                className="absolute top-5 right-6 p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">

            {/* Goal Name */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Goal Name</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                placeholder="e.g., Emergency Fund"
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.title
                    ? 'border-red-300'
                    : 'border-gray-300'
                }`}
                maxLength={50}
              />
              {errors.title && <p className="mt-1.5 text-sm text-red-600">{errors.title}</p>}
            </div>

            {/* Type */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Type</label>
              <div className="relative">
                <select
                  value={formData.type}
                  onChange={(e) => updateFormData('type', e.target.value as GoalTypeDisplay)}
                  className="w-full pl-4 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white appearance-none"
                >
                  {GOAL_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Priority</label>
              <div className="relative">
                <select
                  value={formData.priority}
                  onChange={(e) => updateFormData('priority', e.target.value as GoalPriorityDisplay)}
                  className="w-full pl-4 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white appearance-none"
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {priority.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Category</label>
              <div className="relative">
                <select
                  value={formData.category}
                  onChange={(e) => updateFormData('category', e.target.value)}
                  className="w-full pl-4 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white appearance-none"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Amount Fields */}
            <div className="grid grid-cols-2 gap-4">
              {/* Current Amount */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Current Amount</label>
                <input
                  type="number"
                  value={formData.current ?? ''}
                  onChange={(e) => updateFormData('current', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                  placeholder="0"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    errors.current
                      ? 'border-red-300'
                      : 'border-gray-300'
                  }`}
                />
                {errors.current && <p className="mt-1.5 text-sm text-red-600">{errors.current}</p>}
              </div>

              {/* Target/Original Amount */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  {formData.type === 'debt' ? 'Original Amount' : 'Target Amount'}
                </label>
                <input
                  type="number"
                  value={formData.type === 'debt' ? (formData.originalAmount ?? '') : (formData.target ?? '')}
                  onChange={(e) =>
                    updateFormData(
                      formData.type === 'debt' ? 'originalAmount' : 'target',
                      e.target.value === '' ? undefined : parseFloat(e.target.value)
                    )
                  }
                  placeholder="0"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    errors.target || errors.originalAmount
                      ? 'border-red-300'
                      : 'border-gray-300'
                  }`}
                />
                {(errors.target || errors.originalAmount) && (
                  <p className="mt-1.5 text-sm text-red-600">
                    {errors.target || errors.originalAmount}
                  </p>
                )}
              </div>
            </div>

            {/* Loan Term - Only for Debt */}
            {formData.type === 'debt' && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Loan Term
                </label>
                <div className="relative">
                  <select
                    value={formData.loanTerm ?? ''}
                    onChange={(e) => updateFormData('loanTerm', e.target.value || undefined)}
                    className="w-full pl-4 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white appearance-none"
                  >
                    <option value="">-- None --</option>
                    <option value="1">1 year</option>
                    <option value="3">3 years</option>
                    <option value="5">5 years</option>
                    <option value="7">7 years</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Interest Rate & Minimum Payment - Only show if Loan Term is selected */}
            {formData.type === 'debt' && formData.loanTerm && (
              <>
                {/* Interest Rate */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                    Interest Rate (Annual %)
                  </label>
                  <input
                    type="number"
                    value={formData.interestRate ?? ''}
                    onChange={(e) => updateFormData('interestRate', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* Minimum Payment */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                    Minimum Payment
                  </label>
                  <input
                    type="number"
                    value={formData.minimumPayment ?? ''}
                    onChange={(e) => updateFormData('minimumPayment', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </>
            )}

            {/* Deadline */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Deadline {formData.type !== 'debt' && '(Optional)'}
              </label>
              <DatePicker
                value={formData.deadline?.split('T')[0] || ''}
                onChange={(val) => updateFormData('deadline', val)}
                error={!!errors.deadline}
              />
              {errors.deadline && <p className="mt-1.5 text-sm text-red-600">{errors.deadline}</p>}
            </div>

            {/* Auto Contribute */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Auto Contribute (Optional)
              </label>
              <input
                type="number"
                value={formData.autoContribute ?? ''}
                onChange={(e) => updateFormData('autoContribute', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                placeholder="Monthly contribution"
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  errors.autoContribute
                    ? 'border-red-300'
                    : 'border-gray-300'
                }`}
              />
              {errors.autoContribute && (
                <p className="mt-1.5 text-sm text-red-600">{errors.autoContribute}</p>
              )}
            </div>
          </div>

          {/* Footer */}
        <div className="border-t border-gray-200 p-6 space-y-3">
            <button
              onClick={handleSave}
              disabled={!formData.title || saving}
              className={`w-full px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                !formData.title || saving
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'text-white'
              }`}
              style={!formData.title && !saving ? {} : { backgroundColor: '#6366f1' }}
            >
              {saving ? 'Saving...' : editingGoal ? 'Save Changes' : 'Create'}
            </button>
            <button
              onClick={onClose}
              className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
        </div>
      </div>
      </div>
    </>
    );
  }

  // Centered modal for adding new goals - using same form as above
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ backgroundColor: '#6366f1' }}>
          <h2 className="text-xl font-semibold text-white">Add Goal</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content - Same as editing panel above */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">

            {/* Goal Name */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Goal Name</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                placeholder="e.g., Emergency Fund"
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.title
                    ? 'border-red-300'
                    : 'border-gray-300'
                }`}
                maxLength={50}
              />
              {errors.title && <p className="mt-1.5 text-sm text-red-600">{errors.title}</p>}
            </div>

            {/* Type */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Type</label>
              <div className="relative">
                <select
                  value={formData.type}
                  onChange={(e) => updateFormData('type', e.target.value as GoalTypeDisplay)}
                  className="w-full pl-4 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white appearance-none"
                >
                  {GOAL_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Category</label>
              <div className="relative">
                <select
                  value={formData.type === 'debt' ? 'Debt' : formData.category}
                  onChange={(e) => updateFormData('category', e.target.value)}
                  disabled={formData.type === 'debt'}
                  className={`w-full pl-4 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none ${
                    formData.type === 'debt' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'
                  }`}
                >
                  <option value="">-- None --</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Loan Term - Only for Debt type */}
            {formData.type === 'debt' && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Loan Term</label>
                <div className="relative">
                  <select
                    value={formData.loanTerm || ''}
                    onChange={(e) => updateFormData('loanTerm', e.target.value)}
                    className="w-full pl-4 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white appearance-none"
                  >
                    <option value="">-- None --</option>
                    <option value="1">1 year</option>
                    <option value="3">3 years</option>
                    <option value="5">5 years</option>
                    <option value="7">7 years</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Interest Rate & Minimum Payment - Only when loan term is selected */}
            {formData.type === 'debt' && formData.loanTerm && (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Interest Rate (%)</label>
                  <input
                    type="number"
                    value={formData.interestRate || ''}
                    onChange={(e) => updateFormData('interestRate', parseFloat(e.target.value))}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Minimum Payment</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      $
                    </span>
                    <input
                      type="number"
                      value={formData.minimumPayment || ''}
                      onChange={(e) => updateFormData('minimumPayment', parseFloat(e.target.value))}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Target Amount */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                {formData.type === 'debt' ? 'Original Amount' : formData.type === 'spending' ? 'Monthly Budget' : 'Target Amount'}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  $
                </span>
                <input
                  type="number"
                  value={formData.target || ''}
                  onChange={(e) => updateFormData('target', parseFloat(e.target.value))}
                  placeholder="0.00"
                  step="0.01"
                  className={`w-full pl-8 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.target
                      ? 'border-red-300'
                      : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.target && <p className="mt-1.5 text-sm text-red-600">{errors.target}</p>}
            </div>

            {/* Current/Starting Amount */}
            {formData.type === 'savings' && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Starting Amount (Optional)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    value={formData.current || ''}
                    onChange={(e) => updateFormData('current', parseFloat(e.target.value))}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {formData.type === 'debt' && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Current Balance</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    value={formData.current || ''}
                    onChange={(e) => updateFormData('current', parseFloat(e.target.value))}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {/* Deadline/Target Date */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                {formData.type === 'spending' ? 'Budget Period (Optional)' : 'Target Date'}
              </label>
              <DatePicker
                value={formData.deadline?.split('T')[0] || ''}
                onChange={(val) => updateFormData('deadline', val)}
              />
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Priority</label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((priority) => (
                  <button
                    key={priority.id}
                    type="button"
                    onClick={() => updateFormData('priority', priority.id)}
                    className="px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all"
                    style={{
                      backgroundColor: formData.priority === priority.id ? priority.bgColor : 'white',
                      borderColor: formData.priority === priority.id ? priority.borderColor : '#e5e7eb',
                      color: formData.priority === priority.id ? priority.textColor : '#374151',
                    }}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-contribution */}
            {formData.type !== 'spending' && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Monthly Auto-Contribution (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    value={formData.autoContribute || ''}
                    onChange={(e) => updateFormData('autoContribute', parseFloat(e.target.value))}
                    placeholder="0.00"
                    step="0.01"
                    className={`w-full pl-8 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.autoContribute
                        ? 'border-red-300'
                        : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.autoContribute && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.autoContribute}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.title || saving}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
              !formData.title || saving
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'text-white hover:opacity-90'
            }`}
            style={!formData.title && !saving ? {} : { backgroundColor: '#6366f1' }}
          >
            {saving ? 'Saving...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { GoalDisplay, GoalTypeDisplay, GoalPriorityDisplay } from '@/types';
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
    category: 'Other',
    priority: 'medium',
    autoContribute: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
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
          category: 'Other',
          priority: 'medium',
          autoContribute: undefined,
        });
      }
      setErrors({});
      setSaving(false);
    }
  }, [visible, editingGoal]);

  const updateFormData = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ backgroundColor: '#6366f1' }}>
          <h2 className="text-xl font-semibold text-white">
            {editingGoal ? 'Edit Goal' : 'Add Goal'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">

            {/* Goal Name */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Goal Name</label>
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
              <label className="block text-sm font-medium text-gray-900 mb-2">Type</label>
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
              <label className="block text-sm font-medium text-gray-900 mb-2">Priority</label>
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
              <label className="block text-sm font-medium text-gray-900 mb-2">Category</label>
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
                <label className="block text-sm font-medium text-gray-900 mb-2">Current Amount</label>
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
                <label className="block text-sm font-medium text-gray-900 mb-2">
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

            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Deadline {formData.type !== 'debt' && '(Optional)'}
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => updateFormData('deadline', e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.deadline
                    ? 'border-red-300'
                    : 'border-gray-300'
                }`}
              />
              {errors.deadline && <p className="mt-1.5 text-sm text-red-600">{errors.deadline}</p>}
            </div>

            {/* Auto Contribute */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
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
            {saving ? 'Saving...' : editingGoal ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

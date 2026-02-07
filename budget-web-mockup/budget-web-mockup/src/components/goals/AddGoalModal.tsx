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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: '#6366f1' }}>
          <h2 className="text-xl font-semibold text-white">
            {editingGoal ? 'Edit Goal' : 'Create New Goal'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Goal Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">Goal Type</label>
              <div className="grid grid-cols-3 gap-3">
                {GOAL_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.type === type.id;

                  const getColorClasses = () => {
                    if (!isSelected) {
                      return {
                        container: 'border-gray-100 hover:border-gray-200 bg-white',
                        icon: 'text-gray-400',
                        text: 'text-gray-700'
                      };
                    }

                    switch (type.color) {
                      case 'blue':
                        return {
                          container: 'border-blue-500 bg-blue-50',
                          icon: 'text-blue-600',
                          text: 'text-blue-900'
                        };
                      case 'amber':
                        return {
                          container: 'border-amber-500 bg-amber-50',
                          icon: 'text-amber-600',
                          text: 'text-amber-900'
                        };
                      case 'red':
                        return {
                          container: 'border-red-400 bg-red-50',
                          icon: 'text-red-500',
                          text: 'text-red-900'
                        };
                      default:
                        return {
                          container: 'border-gray-100 bg-white',
                          icon: 'text-gray-400',
                          text: 'text-gray-700'
                        };
                    }
                  };

                  const colors = getColorClasses();

                  return (
                    <button
                      key={type.id}
                      onClick={() => updateFormData('type', type.id)}
                      className={`relative p-4 rounded-xl border transition-all ${colors.container}`}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${colors.icon}`} />
                      <p className={`text-sm font-medium ${colors.text}`}>
                        {type.label}
                      </p>
                    </button>
                  );
                })}
              </div>
              {selectedType && (
                <p className="mt-2 text-sm text-gray-500 text-center">{selectedType.description}</p>
              )}
            </div>

            {/* Goal Title */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Goal Name</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                placeholder="e.g., Emergency Fund, Vacation"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-0 transition-colors ${
                  errors.title
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-200 focus:border-indigo-500'
                }`}
                maxLength={50}
              />
              {errors.title && <p className="mt-1.5 text-sm text-red-600">{errors.title}</p>}
            </div>

            {/* Amount Fields */}
            <div className="grid grid-cols-2 gap-4">
              {/* Target/Original Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {formData.type === 'debt' ? 'Original Amount' : 'Target Amount'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    value={formData.type === 'debt' ? (formData.originalAmount ?? '') : (formData.target ?? '')}
                    onChange={(e) =>
                      updateFormData(
                        formData.type === 'debt' ? 'originalAmount' : 'target',
                        e.target.value === '' ? undefined : parseFloat(e.target.value)
                      )
                    }
                    placeholder="0.00"
                    className={`w-full pl-8 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-0 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      errors.target || errors.originalAmount
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-200 focus:border-indigo-500'
                    }`}
                  />
                </div>
                {(errors.target || errors.originalAmount) && (
                  <p className="mt-1.5 text-sm text-red-600">
                    {errors.target || errors.originalAmount}
                  </p>
                )}
              </div>

              {/* Current Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {formData.type === 'debt' ? 'Remaining Balance' : 'Starting Amount'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    value={formData.current ?? ''}
                    onChange={(e) => updateFormData('current', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className={`w-full pl-8 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-0 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      errors.current
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-200 focus:border-indigo-500'
                    }`}
                  />
                </div>
                {errors.current && <p className="mt-1.5 text-sm text-red-600">{errors.current}</p>}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const isSelected = formData.category === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => updateFormData('category', category.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all text-sm ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                          : 'border-gray-100 hover:border-gray-200 text-gray-700'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="font-medium">{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Deadline and Priority Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Deadline {formData.type !== 'debt' && '(Optional)'}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => updateFormData('deadline', e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-0 transition-colors ${
                      errors.deadline
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-200 focus:border-indigo-500'
                    }`}
                  />
                </div>
                {errors.deadline && <p className="mt-1.5 text-sm text-red-600">{errors.deadline}</p>}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITIES.map((priority) => {
                    const isSelected = formData.priority === priority.id;
                    return (
                      <button
                        key={priority.id}
                        onClick={() => updateFormData('priority', priority.id)}
                        className={`px-3 py-3 rounded-lg border transition-all text-sm font-medium ${
                          isSelected ? '' : 'border-gray-100 hover:border-gray-200 text-gray-700'
                        }`}
                        style={
                          isSelected
                            ? {
                                backgroundColor: priority.bgColor,
                                borderColor: priority.borderColor,
                                color: priority.textColor,
                              }
                            : {}
                        }
                      >
                        {priority.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Monthly Contribution */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Monthly {formData.type === 'debt' ? 'Payment' : 'Contribution'} (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                  $
                </span>
                <input
                  type="number"
                  value={formData.autoContribute ?? ''}
                  onChange={(e) => updateFormData('autoContribute', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                  placeholder="0.00"
                  className={`w-full pl-8 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-0 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    errors.autoContribute
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-200 focus:border-indigo-500'
                  }`}
                />
              </div>
              <p className="mt-1.5 text-sm text-gray-500">
                {formData.type === 'debt'
                  ? 'Set a recurring monthly payment amount'
                  : 'Set a recurring monthly contribution amount'}
              </p>
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
            className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.title || saving}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
              !formData.title || saving
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'text-white hover:opacity-90 shadow-lg'
            }`}
            style={!formData.title && !saving ? {} : { backgroundColor: '#6366f1', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)' }}
          >
            {saving ? 'Saving...' : editingGoal ? 'Save Changes' : 'Create Goal'}
          </button>
        </div>
      </div>
    </div>
  );
}

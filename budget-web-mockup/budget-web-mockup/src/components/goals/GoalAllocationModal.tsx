'use client';

import { useState, useEffect, useMemo } from 'react';
import { GoalDisplay } from '@/types';
import { X, Check, PlusCircle } from 'lucide-react';

interface GoalAllocationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (allocations: { goalId: string; amount: number }[]) => void;
  onCreateGoal?: () => void;
  availableAmount: number;
  goals: GoalDisplay[];
}

export default function GoalAllocationModal({
  visible,
  onClose,
  onConfirm,
  onCreateGoal,
  availableAmount,
  goals,
}: GoalAllocationModalProps) {
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      setAllocations({});
      setSelectedGoals(new Set());
    }
  }, [visible]);

  const activeGoals = useMemo(
    () =>
      goals.filter(
        (goal) =>
          goal.isActive &&
          (goal.type === 'debt' ? goal.current > 0 : goal.current < goal.target)
      ),
    [goals]
  );

  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, amount) => {
      const numAmount = parseFloat(amount) || 0;
      return sum + numAmount;
    }, 0);
  }, [allocations]);

  const remainingAmount = availableAmount - totalAllocated;

  const handleGoalToggle = (goalId: string) => {
    const newSelected = new Set(selectedGoals);
    if (newSelected.has(goalId)) {
      newSelected.delete(goalId);
      const newAllocations = { ...allocations };
      delete newAllocations[goalId];
      setAllocations(newAllocations);
    } else {
      newSelected.add(goalId);
    }
    setSelectedGoals(newSelected);
  };

  const handleAllocationChange = (goalId: string, value: string) => {
    const cleanValue = value.replace(/[^0-9.]/g, '');
    setAllocations({
      ...allocations,
      [goalId]: cleanValue,
    });
  };

  const handleAllocateAll = (goalId: string) => {
    setAllocations({
      ...allocations,
      [goalId]: remainingAmount.toFixed(2),
    });
  };

  const handleEvenSplit = () => {
    if (selectedGoals.size === 0) {
      alert('Please select at least one goal first.');
      return;
    }

    const amountPerGoal = availableAmount / selectedGoals.size;
    const newAllocations: Record<string, string> = {};
    selectedGoals.forEach((goalId) => {
      newAllocations[goalId] = amountPerGoal.toFixed(2);
    });
    setAllocations(newAllocations);
  };

  const handleConfirm = () => {
    if (selectedGoals.size === 0) {
      alert('Please select at least one goal to allocate funds to.');
      return;
    }

    if (totalAllocated <= 0) {
      alert('Please specify amounts to allocate to your selected goals.');
      return;
    }

    if (totalAllocated > availableAmount) {
      alert(
        `You're trying to allocate $${totalAllocated.toFixed(
          2
        )} but only have $${availableAmount.toFixed(2)} available.`
      );
      return;
    }

    const goalAllocations: { goalId: string; amount: number }[] = [];
    selectedGoals.forEach((goalId) => {
      const amount = parseFloat(allocations[goalId]) || 0;
      if (amount > 0) {
        goalAllocations.push({ goalId, amount });
      }
    });

    onConfirm(goalAllocations);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-transparent flex items-end justify-center z-50 sm:items-center sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-medium text-gray-900">Allocate Rollover</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Amount Summary */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Available:</span>
              <span className="text-lg font-semibold text-gray-900">
                ${availableAmount.toFixed(2)}
              </span>
            </div>
            {totalAllocated > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Allocated:</span>
                <span
                  className={`text-lg font-semibold ${
                    totalAllocated > availableAmount ? 'text-red-600' : 'text-blue-600'
                  }`}
                >
                  ${totalAllocated.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Goals List */}
          {activeGoals.length > 0 ? (
            <>
              {selectedGoals.size === 0 && (
                <p className="text-sm text-gray-500 text-center italic">
                  Tap goals to select them
                </p>
              )}

              <div className="space-y-3">
                {activeGoals.map((goal) => {
                  const isSelected = selectedGoals.has(goal.id);
                  const allocation = allocations[goal.id] || '';

                  return (
                    <div
                      key={goal.id}
                      className={`rounded-lg border-2 p-4 transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <button
                        onClick={() => handleGoalToggle(goal.id)}
                        className="w-full flex items-start gap-3 mb-3"
                      >
                        <div className="mt-0.5">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900">{goal.title}</p>
                          <p className="text-sm text-gray-500">
                            {goal.type === 'debt'
                              ? `$${goal.current.toFixed(2)} remaining`
                              : `$${goal.current.toFixed(2)} / $${goal.target.toFixed(2)}`}
                          </p>
                        </div>
                      </button>

                      {isSelected && (
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                              $
                            </span>
                            <input
                              type="number"
                              value={allocation}
                              onChange={(e) => handleAllocationChange(goal.id, e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            onClick={() => handleAllocateAll(goal.id)}
                            disabled={remainingAmount <= 0}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              remainingAmount <= 0
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            All
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedGoals.size > 1 && (
                <button
                  onClick={handleEvenSplit}
                  className="w-full px-4 py-2 bg-blue-50 border-2 border-blue-500 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                >
                  Split Evenly
                </button>
              )}
            </>
          ) : (
            <div
              onClick={onCreateGoal}
              className="text-center py-8 bg-blue-50 rounded-lg border-2 border-dashed border-blue-300 cursor-pointer hover:bg-blue-100 transition-colors"
            >
              <PlusCircle className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Active Goals</h3>
              <p className="text-sm text-gray-600">
                Tap to create a goal for your rollover funds
              </p>
            </div>
          )}

          {/* Create New Goal Button */}
          {activeGoals.length > 0 && onCreateGoal && (
            <button
              onClick={onCreateGoal}
              className="w-full px-4 py-3 bg-white border-2 border-dashed border-blue-300 text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              Create New Goal
            </button>
          )}

          {/* Confirm Button */}
          {selectedGoals.size > 0 && totalAllocated > 0 && (
            <button
              onClick={handleConfirm}
              disabled={totalAllocated > availableAmount}
              className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                totalAllocated > availableAmount
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Allocate ${totalAllocated.toFixed(2)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

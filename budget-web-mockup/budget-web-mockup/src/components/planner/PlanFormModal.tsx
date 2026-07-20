'use client';

import {useEffect, useMemo, useState} from 'react';
import useSWR from 'swr';
import {X} from 'lucide-react';
import {DatePicker} from '@/components/ui';
import {goalService} from '@/services/goal.service';
import {transactionService} from '@/services/transaction.service';
import {
  CreatePlanData,
  Plan,
  PlanDirection,
  PlanType,
} from '@/types';
import {lockBodyScroll, unlockBodyScroll} from '@/lib/bodyScrollLock';

interface PlanFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: CreatePlanData) => Promise<void>;
  editingPlan?: Plan | null;
}

const TYPE_OPTIONS: {id: PlanType; label: string; defaultDirection: PlanDirection}[] = [
  {id: 'PURCHASE', label: 'Purchase', defaultDirection: 'OUTFLOW'},
  {id: 'INCOME', label: 'Income', defaultDirection: 'INFLOW'},
  {id: 'BILL_CHANGE', label: 'Move a bill', defaultDirection: 'OUTFLOW'},
  {id: 'GOAL_CHANGE', label: 'Goal contribution', defaultDirection: 'OUTFLOW'},
  {id: 'DEBT_PAYMENT', label: 'Extra debt payment', defaultDirection: 'OUTFLOW'},
];

const needsLinkedBill = (type: PlanType) => type === 'BILL_CHANGE';
const needsLinkedGoal = (type: PlanType) =>
  type === 'GOAL_CHANGE' || type === 'DEBT_PAYMENT';

// The api client throws a plain {message, statusCode, error} object (not an
// Error instance) for HTTP error responses, so `instanceof Error` alone
// misses real backend validation messages.
function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (
    e &&
    typeof e === 'object' &&
    'message' in e &&
    typeof (e as {message: unknown}).message === 'string'
  ) {
    return (e as {message: string}).message;
  }
  return 'Could not save this plan';
}

export default function PlanFormModal({
  visible,
  onClose,
  onSave,
  editingPlan,
}: PlanFormModalProps) {
  const [type, setType] = useState<PlanType>('PURCHASE');
  const [direction, setDirection] = useState<PlanDirection>('OUTFLOW');
  const [amount, setAmount] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PLANNED'>('DRAFT');
  const [linkedEntityId, setLinkedEntityId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const {data: goals = []} = useSWR(
    visible && needsLinkedGoal(type) ? 'planner-goal-options' : null,
    () => goalService.getGoals(),
  );
  const {data: billsAnalytics} = useSWR(
    visible && needsLinkedBill(type) ? 'planner-bill-options' : null,
    () => transactionService.getBillsAnalytics(),
  );
  const billOptions = useMemo(
    () => [
      // overdueBills/unpaidBills etc. on this response are counts, not
      // arrays - the actual bill lists are the *List-suffixed fields.
      ...(billsAnalytics?.overdueBillsList || []),
      ...(billsAnalytics?.upcomingBills || []),
    ],
    [billsAnalytics],
  );
  const goalOptions = useMemo(
    () =>
      type === 'DEBT_PAYMENT'
        ? goals.filter((g) => g.type === 'debt')
        : goals,
    [goals, type],
  );

  useEffect(() => {
    if (!visible) return;
    lockBodyScroll();
    if (editingPlan) {
      setType(editingPlan.type);
      setDirection(editingPlan.direction);
      setAmount(String(editingPlan.amount));
      setPlannedDate(editingPlan.plannedDate.slice(0, 10));
      setDescription(editingPlan.description || '');
      setStatus(editingPlan.status === 'PLANNED' ? 'PLANNED' : 'DRAFT');
      setLinkedEntityId(editingPlan.linkedEntityId || '');
    } else {
      setType('PURCHASE');
      setDirection('OUTFLOW');
      setAmount('');
      setPlannedDate('');
      setDescription('');
      setStatus('DRAFT');
      setLinkedEntityId('');
    }
    setError('');
    return () => unlockBodyScroll();
  }, [visible, editingPlan]);

  if (!visible) return null;

  const handleTypeChange = (nextType: PlanType) => {
    setType(nextType);
    setLinkedEntityId('');
    const option = TYPE_OPTIONS.find((o) => o.id === nextType);
    if (option) setDirection(option.defaultDirection);
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter an amount greater than 0');
      return;
    }
    if (!plannedDate) {
      setError('Choose a date');
      return;
    }
    if ((needsLinkedBill(type) || needsLinkedGoal(type)) && !linkedEntityId) {
      setError('Choose what this plan applies to');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        type,
        direction,
        amount: parsedAmount,
        plannedDate,
        description: description || undefined,
        status,
        linkedEntityType: needsLinkedBill(type)
          ? 'TRANSACTION'
          : needsLinkedGoal(type)
            ? 'GOAL'
            : undefined,
        linkedEntityId: linkedEntityId || undefined,
      });
      onClose();
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingPlan ? 'Edit plan' : 'Add a what-if plan'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Type
            </label>
            <div className="grid grid-cols-1 gap-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleTypeChange(option.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                    type === option.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {needsLinkedBill(type) && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Which bill?
              </label>
              <select
                value={linkedEntityId}
                onChange={(e) => {
                  setLinkedEntityId(e.target.value);
                  const bill = billOptions.find((b) => b.id === e.target.value);
                  if (bill) setAmount(String(bill.amount));
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Select a bill</option>
                {billOptions.map((bill) => (
                  <option key={bill.id} value={bill.id}>
                    {bill.description} — ${bill.amount}
                  </option>
                ))}
              </select>
            </div>
          )}

          {needsLinkedGoal(type) && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Which goal?
              </label>
              <select
                value={linkedEntityId}
                onChange={(e) => setLinkedEntityId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Select a goal</option>
                {goalOptions.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Amount
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Date
              </label>
              <DatePicker value={plannedDate} onChange={setPlannedDate} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Direction
            </label>
            <div className="flex gap-2">
              {(['OUTFLOW', 'INFLOW'] as PlanDirection[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDirection(d)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    direction === d
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {d === 'OUTFLOW' ? 'Money out' : 'Money in'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. New TV"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              How confident are you?
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus('DRAFT')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  status === 'DRAFT'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Just exploring
              </button>
              <button
                type="button"
                onClick={() => setStatus('PLANNED')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  status === 'PLANNED'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                I intend to do this
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : editingPlan ? 'Save changes' : 'Add plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

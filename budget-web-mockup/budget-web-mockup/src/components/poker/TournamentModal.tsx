'use client';

import {useEffect, useState} from 'react';
import {X} from 'lucide-react';
import {DatePicker} from '@/components/ui';
import type {PokerTournament, TournamentInput} from '@/types';

interface TournamentModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: TournamentInput) => Promise<void>;
  editingTournament?: PokerTournament | null;
}

interface FormState {
  name: string;
  location: string;
  venue: string;
  dateStart: string; // yyyy-mm-dd
  dateEnd: string; // yyyy-mm-dd
  startingBankroll: string;
  accommodationCost: string;
  foodBudget: string;
  otherExpenses: string;
}

const EMPTY: FormState = {
  name: '',
  location: '',
  venue: '',
  dateStart: '',
  dateEnd: '',
  startingBankroll: '',
  accommodationCost: '',
  foodBudget: '',
  otherExpenses: '',
};

const labelClass =
  'text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block';
const inputClass =
  'w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all border-gray-300';
const moneyInputClass =
  'w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

const toNum = (v: string): number | undefined => {
  if (v.trim() === '') return undefined;
  const n = parseFloat(v);
  return Number.isNaN(n) ? undefined : n;
};

export default function TournamentModal({
  visible,
  onClose,
  onSave,
  editingTournament,
}: TournamentModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    if (editingTournament) {
      setForm({
        name: editingTournament.name || '',
        location: editingTournament.location || '',
        venue: editingTournament.venue || '',
        dateStart: editingTournament.dateStart?.split('T')[0] || '',
        dateEnd: editingTournament.dateEnd?.split('T')[0] || '',
        startingBankroll: editingTournament.startingBankroll
          ? String(editingTournament.startingBankroll)
          : '',
        accommodationCost: editingTournament.accommodationCost
          ? String(editingTournament.accommodationCost)
          : '',
        foodBudget: editingTournament.foodBudget
          ? String(editingTournament.foodBudget)
          : '',
        otherExpenses: editingTournament.otherExpenses
          ? String(editingTournament.otherExpenses)
          : '',
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
    setSaving(false);
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible, editingTournament]);

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({...prev, [field]: value}));
    if (errors[field]) setErrors((prev) => ({...prev, [field]: ''}));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Tournament name is required';
    if (!form.location.trim()) next.location = 'Location is required';
    if (!form.dateStart) next.dateStart = 'Start date is required';
    if (form.dateEnd && form.dateStart && form.dateEnd < form.dateStart) {
      next.dateEnd = 'End date must be after the start date';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const payload: TournamentInput = {
      name: form.name.trim(),
      location: form.location.trim(),
      venue: form.venue.trim() || null,
      dateStart: new Date(form.dateStart).toISOString(),
      dateEnd: form.dateEnd ? new Date(form.dateEnd).toISOString() : null,
      startingBankroll: toNum(form.startingBankroll) ?? 0,
      accommodationCost: toNum(form.accommodationCost) ?? 0,
      foodBudget: toNum(form.foodBudget) ?? 0,
      otherExpenses: toNum(form.otherExpenses) ?? 0,
    };
    try {
      setSaving(true);
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Failed to save tournament:', err);
      alert('Failed to save tournament. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  const canSave = !!form.name.trim() && !saving;

  // Live preview: how much of the starting bankroll is left for buy-ins after
  // this trip's shared costs. Buy-ins/rebuys are logged per-event afterwards,
  // so this is an estimate at setup time.
  const startingBankrollNum = toNum(form.startingBankroll) ?? 0;
  const tripCostsNum =
    (toNum(form.accommodationCost) ?? 0) +
    (toNum(form.foodBudget) ?? 0) +
    (toNum(form.otherExpenses) ?? 0);
  const availableForBuyIns = startingBankrollNum - tripCostsNum;
  const fmtMoney = (n: number) =>
    n.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2});

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{backgroundColor: '#6366f1'}}>
          <h2 className="text-xl font-semibold text-white">
            {editingTournament ? 'Edit Tournament' : 'Add Tournament'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name */}
          <div>
            <label className={labelClass}>Tournament Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g., WSOP Main Event"
              className={`${inputClass} ${errors.name ? 'border-red-300' : ''}`}
              maxLength={80}
            />
            {errors.name && (
              <p className="mt-1.5 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className={labelClass}>Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              placeholder="e.g., Las Vegas, NV"
              className={`${inputClass} ${
                errors.location ? 'border-red-300' : ''
              }`}
            />
            {errors.location && (
              <p className="mt-1.5 text-sm text-red-600">{errors.location}</p>
            )}
          </div>

          {/* Venue */}
          <div>
            <label className={labelClass}>Venue (Optional)</label>
            <input
              type="text"
              value={form.venue}
              onChange={(e) => update('venue', e.target.value)}
              placeholder="e.g., Horseshoe Las Vegas"
              className={inputClass}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Start Date</label>
              <DatePicker
                value={form.dateStart}
                onChange={(val) => update('dateStart', val)}
                error={!!errors.dateStart}
              />
              {errors.dateStart && (
                <p className="mt-1.5 text-sm text-red-600">
                  {errors.dateStart}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>End Date (Optional)</label>
              <DatePicker
                value={form.dateEnd}
                onChange={(val) => update('dateEnd', val)}
                error={!!errors.dateEnd}
              />
              {errors.dateEnd && (
                <p className="mt-1.5 text-sm text-red-600">{errors.dateEnd}</p>
              )}
            </div>
          </div>

          {/* Bankroll */}
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">Bankroll</p>
            <label className={labelClass}>Starting Bankroll</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                $
              </span>
              <input
                type="number"
                value={form.startingBankroll}
                onChange={(e) => update('startingBankroll', e.target.value)}
                placeholder="0.00"
                step="0.01"
                className={moneyInputClass}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              The roll you brought to this trip. Accommodation, food, buy-ins and
              rebuys are all drawn from it.
            </p>
          </div>

          {/* Shared expenses */}
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">
              Shared Expenses
            </p>
            <div className="space-y-4">
              {(
                [
                  ['accommodationCost', 'Accommodation'],
                  ['foodBudget', 'Food Budget'],
                  ['otherExpenses', 'Other Expenses'],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <label className={labelClass}>{label}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      $
                    </span>
                    <input
                      type="number"
                      value={form[field]}
                      onChange={(e) => update(field, e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      className={moneyInputClass}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live bankroll preview */}
          {startingBankrollNum > 0 && (
            <div
              className={`rounded-lg px-4 py-3 flex items-center justify-between ${
                availableForBuyIns < 0 ? 'bg-red-50' : 'bg-indigo-50'
              }`}>
              <span className="text-sm font-medium text-gray-600">
                Available for buy-ins
              </span>
              <span
                className={`text-sm font-semibold ${
                  availableForBuyIns < 0 ? 'text-red-600' : 'text-indigo-600'
                }`}>
                ${fmtMoney(availableForBuyIns)}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
              canSave
                ? 'text-white hover:opacity-90'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            style={canSave ? {backgroundColor: '#6366f1'} : {}}>
            {saving
              ? 'Saving…'
              : editingTournament
                ? 'Save Changes'
                : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

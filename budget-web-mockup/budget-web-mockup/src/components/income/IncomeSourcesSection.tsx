'use client';

import {useState} from 'react';
import {Pencil, Trash2, Plus} from 'lucide-react';
import {DatePicker} from '@/components/ui';
import {useIncomeSources} from '@/hooks/useIncomeSources';
import type {IncomeSource, IncomeSourceFrequency} from '@/types';

const FREQUENCIES: {id: IncomeSourceFrequency; label: string}[] = [
  {id: 'WEEKLY', label: 'Weekly'},
  {id: 'FORTNIGHTLY', label: 'Fortnightly'},
  {id: 'MONTHLY', label: 'Monthly'},
];

const frequencyLabel = (frequency: string): string =>
  FREQUENCIES.find(f => f.id === frequency)?.label ?? frequency;

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

interface SourceFormState {
  name: string;
  amount: string;
  frequency: IncomeSourceFrequency | '';
  nextPaymentDate: Date;
}

const emptyForm = (): SourceFormState => ({
  name: '',
  amount: '',
  frequency: '',
  nextPaymentDate: new Date(),
});

/**
 * "Additional income sources" management (edit mode of the income setup page).
 * Each source is materialized by the backend as INCOME transactions on its pay
 * dates, so the money flows into the period budget automatically.
 */
export default function IncomeSourcesSection() {
  const {
    incomeSources,
    isLoading,
    createIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,
  } = useIncomeSources();

  // null = closed, 'new' = adding, otherwise the id of the source being edited
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<SourceFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdd = () => {
    setForm(emptyForm());
    setError(null);
    setEditing('new');
  };

  const openEdit = (source: IncomeSource) => {
    setForm({
      name: source.name,
      amount: String(source.amount),
      frequency: source.frequency,
      nextPaymentDate: new Date(source.nextPaymentDate),
    });
    setError(null);
    setEditing(source.id);
  };

  const close = () => {
    setEditing(null);
    setError(null);
  };

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!form.name.trim()) {
      setError('Please enter a name for this income source.');
      return;
    }
    if (!amount || amount <= 0) {
      setError('Please enter an amount greater than zero.');
      return;
    }
    if (!form.frequency) {
      setError('Please choose how often this income arrives.');
      return;
    }

    // Noon local time, matching how the salary pay date is stored
    const nextPaymentDate = new Date(form.nextPaymentDate);
    nextPaymentDate.setHours(12, 0, 0, 0);

    const payload = {
      name: form.name.trim(),
      amount,
      frequency: form.frequency,
      nextPaymentDate: nextPaymentDate.toISOString(),
    };

    setSaving(true);
    setError(null);
    try {
      if (editing === 'new') {
        await createIncomeSource(payload);
      } else if (editing) {
        await updateIncomeSource(editing, payload);
      }
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save income source.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (source: IncomeSource) => {
    if (
      !confirm(
        `Delete "${source.name}"? Future payments will stop being added automatically; past transactions are kept.`,
      )
    ) {
      return;
    }
    try {
      await deleteIncomeSource(source.id);
      if (editing === source.id) close();
    } catch {
      alert('Failed to delete income source. Please try again.');
    }
  };

  const handleToggleActive = async (source: IncomeSource) => {
    try {
      await updateIncomeSource(source.id, {isActive: !source.isActive});
    } catch {
      alert('Failed to update income source. Please try again.');
    }
  };

  const sourceForm = (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Name
        </label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm({...form, name: e.target.value})}
          placeholder="e.g. Child Support"
          disabled={saving}
          className="w-full py-2.5 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Amount
        </label>
        <div className="flex items-center border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent">
          <span className="px-4 font-medium text-gray-700">$</span>
          <input
            type="number"
            step="0.01"
            value={form.amount}
            onChange={e => setForm({...form, amount: e.target.value})}
            placeholder="0"
            disabled={saving}
            className="flex-1 py-2.5 pr-4 border-0 focus:ring-0 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How often does it arrive?
        </label>
        <div className="flex gap-3">
          {FREQUENCIES.map(frequency => (
            <button
              key={frequency.id}
              type="button"
              onClick={() => setForm({...form, frequency: frequency.id})}
              disabled={saving}
              className={`flex-1 py-2.5 px-2 rounded-lg border-2 transition-colors text-sm font-medium ${
                form.frequency === frequency.id
                  ? 'bg-purple-500 border-purple-500 text-white'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-purple-300'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {frequency.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Next Payment Date
        </label>
        <DatePicker
          value={formatDateForInput(form.nextPaymentDate)}
          onChange={dateValue => {
            if (dateValue) {
              setForm({...form, nextPaymentDate: new Date(dateValue + 'T12:00:00')});
            }
          }}
          disabled={saving}
        />
        <p className="mt-2 text-xs text-gray-500">
          The payment is added to your budget automatically on this date
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={close}
          disabled={saving}
          className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {saving ? 'Saving...' : editing === 'new' ? 'Add Source' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="mt-10 pt-8 border-t border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Additional income sources
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Recurring income besides your pay, like child support or government
          payments. Each payment is added to your budget automatically on its
          due date.
        </p>
      </div>

      {isLoading && incomeSources.length === 0 ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          {incomeSources.map(source =>
            editing === source.id ? (
              <div key={source.id}>{sourceForm}</div>
            ) : (
              <div
                key={source.id}
                className={`bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between ${
                  source.isActive ? '' : 'opacity-60'
                }`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">
                      {source.name}
                    </p>
                    {!source.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        Paused
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    ${source.amount.toFixed(2)} {frequencyLabel(source.frequency).toLowerCase()}
                    {source.isActive && (
                      <> · next {formatDisplayDate(source.nextPaymentDate)}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(source)}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title={source.isActive ? 'Pause automatic payments' : 'Resume automatic payments'}>
                    {source.isActive ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(source)}
                    className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(source)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ),
          )}

          {editing === 'new' ? (
            sourceForm
          ) : (
            <button
              type="button"
              onClick={openAdd}
              className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-purple-300 hover:text-purple-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
              <Plus className="w-4 h-4" />
              Add income source
            </button>
          )}
        </div>
      )}
    </div>
  );
}

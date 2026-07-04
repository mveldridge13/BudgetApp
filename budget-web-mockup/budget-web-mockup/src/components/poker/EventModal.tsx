'use client';

import {useEffect, useState} from 'react';
import {X} from 'lucide-react';
import {DatePicker, CustomSelect} from '@/components/ui';
import {GAME_TYPE_LABELS} from '@/types';
import {lockBodyScroll, unlockBodyScroll} from '@/lib/bodyScrollLock';
import type {GameType, EventInput, PokerTournamentEvent} from '@/types';

interface EventModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: EventInput) => Promise<void>;
  editingEvent?: PokerTournamentEvent | null;
  // Close-out flow: only the result fields are editable and the event is
  // marked closed on save.
  isCloseOut?: boolean;
}

interface FormState {
  eventName: string;
  eventNumber: string;
  gameType: string;
  buyIn: string;
  startingStack: string;
  eventDate: string; // yyyy-mm-dd
  finishPosition: string; // "9" or "9/119"
  prize: string;
}

const EMPTY: FormState = {
  eventName: '',
  eventNumber: '',
  gameType: '',
  buyIn: '',
  startingStack: '',
  eventDate: '',
  finishPosition: '',
  prize: '',
};

const labelClass =
  'text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block';
const inputClass =
  'w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all border-gray-300 disabled:bg-gray-100 disabled:text-gray-500';
const moneyInputClass =
  'w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

const toNum = (v: string): number | undefined => {
  if (v.trim() === '') return undefined;
  const n = parseFloat(v);
  return Number.isNaN(n) ? undefined : n;
};

// Starting stack is `@IsInt` on the backend, so coerce to a whole number.
const toInt = (v: string): number | undefined => {
  if (v.trim() === '') return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
};

// "9/119" -> {position: 9, fieldSize: 119}; "9" -> {position: 9, fieldSize: null}
function parsePosition(input: string): {
  position: number | null;
  fieldSize: number | null;
  valid: boolean;
} {
  if (!input.trim()) return {position: null, fieldSize: null, valid: true};
  if (input.includes('/')) {
    const [p, f] = input.split('/');
    const pos = parseInt(p.trim(), 10);
    const field = parseInt(f.trim(), 10);
    return {
      position: Number.isNaN(pos) ? null : pos,
      fieldSize: Number.isNaN(field) ? null : field,
      valid: !Number.isNaN(pos) && !Number.isNaN(field) && pos > 0 && field > 0 && pos <= field,
    };
  }
  const pos = parseInt(input.trim(), 10);
  return {position: Number.isNaN(pos) ? null : pos, fieldSize: null, valid: !Number.isNaN(pos) && pos > 0};
}

const GAME_TYPES = Object.entries(GAME_TYPE_LABELS) as [GameType, string][];

export default function EventModal({
  visible,
  onClose,
  onSave,
  editingEvent,
  isCloseOut = false,
}: EventModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      unlockBodyScroll();
      return;
    }
    lockBodyScroll();
    if (editingEvent) {
      const pos = editingEvent.finishPosition;
      const field = editingEvent.fieldSize;
      setForm({
        eventName: editingEvent.eventName || '',
        eventNumber: editingEvent.eventNumber || '',
        gameType: editingEvent.gameType || '',
        buyIn: editingEvent.buyIn ? String(editingEvent.buyIn) : '',
        startingStack: editingEvent.startingStack
          ? String(editingEvent.startingStack)
          : '',
        eventDate: editingEvent.eventDate?.split('T')[0] || '',
        finishPosition: pos ? (field ? `${pos}/${field}` : String(pos)) : '',
        prize: editingEvent.winnings ? String(editingEvent.winnings) : '',
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
    setSaving(false);
    return () => {
      unlockBodyScroll();
    };
  }, [visible, editingEvent]);

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({...prev, [field]: value}));
    if (errors[field]) setErrors((prev) => ({...prev, [field]: ''}));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.eventName.trim()) next.eventName = 'Event name is required';
    // Backend requires buyIn >= 0.01 — guard so the event actually persists
    // (and therefore syncs to mobile) instead of 400-ing.
    if ((toNum(form.buyIn) ?? 0) <= 0) {
      next.buyIn = 'Buy-in is required';
    }
    if (form.prize && toNum(form.prize) === undefined) {
      next.prize = 'Prize must be a number';
    }
    if (form.finishPosition && !parsePosition(form.finishPosition).valid) {
      next.finishPosition =
        'Use a number or "place/field", e.g. 9/119 (place ≤ field)';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const pos = parsePosition(form.finishPosition);
    const payload: EventInput = {
      eventName: form.eventName.trim(),
      eventNumber: form.eventNumber.trim() || null,
      gameType: (form.gameType as GameType) || undefined,
      buyIn: toNum(form.buyIn) ?? 0,
      startingStack: toInt(form.startingStack),
      eventDate: form.eventDate
        ? new Date(form.eventDate).toISOString()
        : new Date().toISOString(),
      finishPosition: pos.position,
      fieldSize: pos.fieldSize,
      winnings: toNum(form.prize) ?? 0,
      isClosed: isCloseOut ? true : editingEvent?.isClosed,
      // Re-buys aren't editable in this modal, but the backend update is a full
      // replace (@Put) — carry the existing values through so editing/closing
      // out an event doesn't reset its re-buy count/amount to 0.
      reBuys: editingEvent?.reBuys,
      reBuyAmount: editingEvent?.reBuyAmount,
    };
    try {
      setSaving(true);
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Failed to save event:', err);
      alert('Failed to save event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  const canSave = !!form.eventName.trim() && !saving;
  const title = isCloseOut
    ? 'Close Out Event'
    : editingEvent
      ? 'Edit Event'
      : 'Add Event';
  // In close-out mode, lock the entry fields — only results are editable.
  const detailsDisabled = isCloseOut;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{backgroundColor: '#6366f1'}}>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isCloseOut && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-3">
              Enter your finishing result to close out this event.
            </p>
          )}

          {/* Name + number */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Event Name</label>
              <input
                type="text"
                value={form.eventName}
                onChange={(e) => update('eventName', e.target.value)}
                placeholder="e.g., Event #5 NLH"
                disabled={detailsDisabled}
                className={`${inputClass} ${
                  errors.eventName ? 'border-red-300' : ''
                }`}
                maxLength={80}
              />
              {errors.eventName && (
                <p className="mt-1.5 text-sm text-red-600">{errors.eventName}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Event #</label>
              <input
                type="text"
                value={form.eventNumber}
                onChange={(e) => update('eventNumber', e.target.value)}
                placeholder="5"
                disabled={detailsDisabled}
                className={inputClass}
              />
            </div>
          </div>

          {/* Game type */}
          <div>
            <label className={labelClass}>Game Type</label>
            <div
              className={`w-full border border-gray-300 rounded-lg px-4 py-3 transition-colors ${
                detailsDisabled ? 'bg-gray-100' : 'bg-white hover:border-gray-400'
              }`}>
              <CustomSelect
                value={form.gameType}
                onChange={(val) => update('gameType', val)}
                placeholder="Select game type"
                disabled={detailsDisabled}
                options={GAME_TYPES.map(([value, label]) => ({value, label}))}
              />
            </div>
          </div>

          {/* Buy-in + starting stack */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Buy-in</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  $
                </span>
                <input
                  type="number"
                  value={form.buyIn}
                  onChange={(e) => update('buyIn', e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  disabled={detailsDisabled}
                  className={`${moneyInputClass} ${
                    errors.buyIn ? 'border-red-300' : ''
                  }`}
                />
              </div>
              {errors.buyIn && (
                <p className="mt-1.5 text-sm text-red-600">{errors.buyIn}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Starting Stack</label>
              <input
                type="number"
                value={form.startingStack}
                onChange={(e) => update('startingStack', e.target.value)}
                placeholder="e.g., 30000"
                disabled={detailsDisabled}
                className={inputClass}
              />
            </div>
          </div>

          {/* Event date */}
          <div>
            <label className={labelClass}>Event Date</label>
            <DatePicker
              value={form.eventDate}
              onChange={(val) => update('eventDate', val)}
            />
          </div>

          {/* Results */}
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">Result</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Finish Position</label>
                <input
                  type="text"
                  value={form.finishPosition}
                  onChange={(e) => update('finishPosition', e.target.value)}
                  placeholder="e.g., 9/119"
                  className={`${inputClass} ${
                    errors.finishPosition ? 'border-red-300' : ''
                  }`}
                />
                {errors.finishPosition && (
                  <p className="mt-1.5 text-sm text-red-600">
                    {errors.finishPosition}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Prize</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    value={form.prize}
                    onChange={(e) => update('prize', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className={`${moneyInputClass} ${
                      errors.prize ? 'border-red-300' : ''
                    }`}
                  />
                </div>
                {errors.prize && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.prize}</p>
                )}
              </div>
            </div>
          </div>
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
              : isCloseOut
                ? 'Close Out'
                : editingEvent
                  ? 'Save Changes'
                  : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

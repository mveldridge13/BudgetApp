'use client';

import {useEffect, useMemo, useState} from 'react';
import {Modal, DatePicker} from '@/components/ui';
import type {
  PokerBankroll,
  PokerBankrollTransactionType,
  BankrollTransactionInput,
} from '@/types';

interface BankrollModalProps {
  visible: boolean;
  mode: PokerBankrollTransactionType;
  bankroll: PokerBankroll | null;
  onClose: () => void;
  onSubmit: (data: BankrollTransactionInput) => Promise<void>;
}

const money = (n: number) =>
  `$${Math.abs(n).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const todayISODate = () => new Date().toISOString().split('T')[0];

const moneyInputClass =
  'w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
const labelClass =
  'text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block';

export default function BankrollModal({
  visible,
  mode,
  bankroll,
  onClose,
  onSubmit,
}: BankrollModalProps) {
  const isWithdrawal = mode === 'WITHDRAWAL';
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISODate());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const suggested = bankroll?.suggestedWithdrawal ?? 0;

  useEffect(() => {
    if (!visible) return;
    // Prefill a withdrawal with the advisor's suggestion (#3); user can override.
    setAmount(isWithdrawal && suggested > 0 ? String(suggested) : '');
    setNote('');
    setDate(todayISODate());
    setError('');
    setSaving(false);
  }, [visible, isWithdrawal, suggested]);

  const amountNum = parseFloat(amount);
  const validAmount = !Number.isNaN(amountNum) && amountNum > 0;

  // Guardrail (#4): soft-warn (never block) when a withdrawal exceeds the
  // bankroll, or eats into still-at-risk capital. The cushion you can withdraw
  // without touching at-risk capital is currentBankroll − capitalAtRisk (≈ net profit).
  const warning = useMemo(() => {
    if (!isWithdrawal || !validAmount || !bankroll) return '';
    if (amountNum > bankroll.currentBankroll) {
      return `That's more than your current bankroll of ${money(
        bankroll.currentBankroll,
      )}.`;
    }
    const cushion = Math.max(
      0,
      bankroll.currentBankroll - bankroll.capitalAtRisk,
    );
    if (bankroll.capitalAtRisk > 0 && amountNum > cushion) {
      return `This dips into your at-risk capital — only ${money(
        cushion,
      )} is profit above the ${money(bankroll.capitalAtRisk)} you still have in play.`;
    }
    return '';
  }, [isWithdrawal, validAmount, amountNum, bankroll]);

  const handleSubmit = async () => {
    if (!validAmount) {
      setError('Enter an amount greater than zero.');
      return;
    }
    try {
      setSaving(true);
      await onSubmit({
        type: mode,
        amount: Math.round(amountNum * 100) / 100,
        note: note.trim() || null,
        date: date ? new Date(date).toISOString() : undefined,
      });
      onClose();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={visible}
      onClose={onClose}
      title={isWithdrawal ? 'Withdraw from Bankroll' : 'Deposit to Bankroll'}
      size="md">
      <div className="p-6 space-y-5">
        {/* Amount */}
        <div>
          <label className={labelClass}>Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
              $
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              autoFocus
              className={moneyInputClass}
            />
          </div>
          {isWithdrawal && suggested > 0 && (
            <button
              type="button"
              onClick={() => setAmount(String(suggested))}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-500 font-medium">
              Suggested: {money(suggested)} — pocket profit, keep your capital
              riding
            </button>
          )}
        </div>

        {/* Warning (soft) */}
        {warning && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            {warning}
          </div>
        )}

        {/* Date */}
        <div>
          <label className={labelClass}>Date</label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        {/* Note */}
        <div>
          <label className={labelClass}>Note (Optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isWithdrawal ? 'e.g. Cashed out profit' : 'e.g. Initial roll'}
            maxLength={255}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Footer */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!validAmount || saving}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
              validAmount && !saving
                ? 'text-white hover:opacity-90'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            style={
              validAmount && !saving
                ? {backgroundColor: isWithdrawal ? '#0ea5e9' : '#6366f1'}
                : {}
            }>
            {saving ? 'Saving…' : isWithdrawal ? 'Withdraw' : 'Deposit'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

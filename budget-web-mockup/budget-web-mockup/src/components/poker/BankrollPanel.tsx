'use client';

import {useState} from 'react';
import {
  Wallet,
  Plus,
  Minus,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import {useBankroll} from '@/hooks/useBankroll';
import {Spinner} from '@/components/ui';
import BankrollModal from './BankrollModal';
import BankrollHistoryModal from './BankrollHistoryModal';
import type {
  PokerBankrollStatus,
  PokerBankrollTransactionType,
} from '@/types';

const money = (n: number, signed = false) => {
  const body = `$${Math.abs(n).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  return signed ? `${n >= 0 ? '+' : '-'}${body}` : body;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const STATUS_META: Record<
  PokerBankrollStatus,
  {label: string; chip: string; desc: string}
> = {
  BUILDING: {
    label: 'Building',
    chip: 'bg-slate-100 text-slate-600',
    desc: "You haven't recouped your full capital yet — keep building.",
  },
  IN_PROFIT: {
    label: 'In Profit',
    chip: 'bg-green-100 text-green-700',
    desc: 'You’re in profit. Consider pocketing some and letting your capital ride.',
  },
  FREEROLL: {
    label: 'Freeroll',
    chip: 'bg-indigo-100 text-indigo-700',
    desc: 'Playing on house money — you’ve recouped your entire stake.',
  },
};

function Stat({label, value, valueClass}: {label: string; value: string; valueClass?: string}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`text-base font-semibold ${valueClass ?? 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

export default function BankrollPanel() {
  const {bankroll, isLoading, error, refresh, addTransaction, deleteTransaction} =
    useBankroll();
  const [modal, setModal] = useState<{
    open: boolean;
    mode: PokerBankrollTransactionType;
  }>({open: false, mode: 'DEPOSIT'});
  const [historyOpen, setHistoryOpen] = useState(false);

  const open = (mode: PokerBankrollTransactionType) =>
    setModal({open: true, mode});

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Remove this ledger entry? This only affects your bankroll, not your tournaments.',
      )
    ) {
      return;
    }
    try {
      await deleteTransaction(id);
    } catch {
      alert('Failed to remove the entry. Please try again.');
    }
  };

  if (isLoading && !bankroll) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (error && !bankroll) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-600">Couldn&apos;t load your bankroll.</p>
        <button
          onClick={refresh}
          className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500">
          Retry
        </button>
      </div>
    );
  }

  if (!bankroll) return null;

  const isEmpty =
    bankroll.transactions.length === 0 && bankroll.totalDeposits === 0;
  const meta = STATUS_META[bankroll.status];

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {isEmpty ? (
          // Empty state: the first deposit IS your starting bankroll.
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-6 h-6 text-indigo-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              Set up your bankroll
            </h3>
            <p className="text-sm text-gray-500 mt-1 mb-4 max-w-md mx-auto">
              Deposit the roll you&apos;re putting aside for poker. It stays
              separate from your budget — buy-ins and winnings flow in from your
              tournaments automatically.
            </p>
            <button
              onClick={() => open('DEPOSIT')}
              className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-medium transition-all hover:shadow-lg"
              style={{backgroundColor: '#6366f1'}}>
              <Plus className="w-5 h-5" />
              <span>Set starting bankroll</span>
            </button>
          </div>
        ) : (
          <>
            {/* Header: current bankroll + status */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <Wallet className="w-6 h-6 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Current Bankroll
                  </p>
                  <p
                    className={`text-3xl font-bold ${
                      bankroll.currentBankroll < 0
                        ? 'text-red-600'
                        : 'text-gray-900'
                    }`}>
                    {money(bankroll.currentBankroll)}
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${meta.chip}`}>
                {meta.label}
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-3">{meta.desc}</p>

            {/* Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
              <Stat label="Deposited" value={money(bankroll.totalDeposits)} />
              <Stat label="Withdrawn" value={money(bankroll.totalWithdrawals)} />
              <Stat
                label="Capital Recouped"
                value={money(bankroll.capitalRecouped)}
              />
              <Stat
                label="Capital at Risk"
                value={money(bankroll.capitalAtRisk)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => open('DEPOSIT')}
                className="flex-1 inline-flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-lg font-medium transition-all hover:opacity-90"
                style={{backgroundColor: '#6366f1'}}>
                <Plus className="w-4 h-4" />
                <span>Deposit</span>
              </button>
              <button
                onClick={() => open('WITHDRAWAL')}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                <Minus className="w-4 h-4" />
                <span>Withdraw</span>
              </button>
            </div>

            {/* Ledger — most recent entry only; click to open full history */}
            {bankroll.transactions.length > 0 &&
              (() => {
                const latest = bankroll.transactions[0];
                const isDeposit = latest.type === 'DEPOSIT';
                return (
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(true)}
                    className="group w-full text-left mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Ledger
                      </p>
                      <span className="text-xs font-medium text-gray-400 group-hover:text-indigo-600 inline-flex items-center gap-0.5 transition-colors">
                        {bankroll.transactions.length > 1
                          ? `View all (${bankroll.transactions.length})`
                          : 'View'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg group-hover:bg-gray-50 transition-colors">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isDeposit ? 'bg-indigo-50' : 'bg-sky-50'
                        }`}>
                        {isDeposit ? (
                          <ArrowDownLeft className="w-4 h-4 text-indigo-500" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-sky-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {latest.note || (isDeposit ? 'Deposit' : 'Withdrawal')}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(latest.date)}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          isDeposit ? 'text-gray-900' : 'text-sky-600'
                        }`}>
                        {isDeposit ? '+' : '−'}
                        {money(latest.amount)}
                      </span>
                    </div>
                  </button>
                );
              })()}
          </>
        )}
      </div>

      <BankrollModal
        visible={modal.open}
        mode={modal.mode}
        bankroll={bankroll}
        onClose={() => setModal((m) => ({...m, open: false}))}
        onSubmit={addTransaction}
      />

      <BankrollHistoryModal
        visible={historyOpen}
        transactions={bankroll.transactions}
        onClose={() => setHistoryOpen(false)}
        onDelete={handleDelete}
      />
    </>
  );
}

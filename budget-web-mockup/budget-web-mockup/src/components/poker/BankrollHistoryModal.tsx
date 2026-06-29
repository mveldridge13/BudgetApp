'use client';

import {Trash2, ArrowDownLeft, ArrowUpRight} from 'lucide-react';
import {Modal} from '@/components/ui';
import type {PokerBankrollTransaction} from '@/types';

const money = (n: number) =>
  `$${Math.abs(n).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

interface BankrollHistoryModalProps {
  visible: boolean;
  transactions: PokerBankrollTransaction[];
  onClose: () => void;
  onDelete: (id: string) => void | Promise<void>;
}

export default function BankrollHistoryModal({
  visible,
  transactions,
  onClose,
  onDelete,
}: BankrollHistoryModalProps) {
  return (
    <Modal isOpen={visible} onClose={onClose} title="Bankroll History" size="md">
      <div className="p-6">
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No deposits or withdrawals yet.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((t) => {
              const isDeposit = t.type === 'DEPOSIT';
              return (
                <div key={t.id} className="flex items-center gap-3 py-2.5 group">
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
                      {t.note || (isDeposit ? 'Deposit' : 'Withdrawal')}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(t.date)}</p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      isDeposit ? 'text-gray-900' : 'text-sky-600'
                    }`}>
                    {isDeposit ? '+' : '−'}
                    {money(t.amount)}
                  </span>
                  <button
                    onClick={() => onDelete(t.id)}
                    aria-label="Remove entry"
                    className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

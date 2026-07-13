'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRightCircle, X, ChevronRight, ListChecks, Pencil } from 'lucide-react';
import {formatCurrency} from '@/lib/formatters';
import type { CommittedItem } from '@/services/user.service';

interface RolloverBannerData {
  amount: number;
  fromPeriod?: string;
  date?: string;
}

interface BalanceCardProps {
  balance: number;
  leftToSpend: number;
  totalExpenses: number;
  committedExpenses: number;
  committedItems?: CommittedItem[];
  discretionaryExpenses: number;
  goalsExpenses?: number;
  isLoading: boolean;
  currency?: string;
  rolloverBanner?: RolloverBannerData | null;
  onAllocateRollover?: () => void;
  onDismissRollover?: () => void;
  // Spendable rollover folded into this period's balance (income.rolloverAvailable).
  // Distinct from rolloverBanner (the one-time notification).
  rolloverAvailable?: number;
  baseIncome?: number;
  // Named income-source amounts received this period (income.sources)
  incomeSources?: {id: string; name: string; amount: number}[];
  // Days left in the current pay period; used to show the roll-to-next preview.
  daysRemaining?: number;
  // True while the user is still in their first pay period (backend
  // `!lastRolloverDate`). New users don't roll over their first-period surplus,
  // so the roll-to-next preview must be suppressed for them.
  isNewUser?: boolean;
}

export default function BalanceCard({
  balance,
  leftToSpend,
  totalExpenses,
  committedExpenses,
  committedItems = [],
  discretionaryExpenses,
  goalsExpenses = 0,
  isLoading,
  currency = 'AUD',
  rolloverBanner,
  onAllocateRollover,
  onDismissRollover,
  rolloverAvailable = 0,
  baseIncome = 0,
  incomeSources = [],
  daysRemaining = 0,
  isNewUser = false,
}: BalanceCardProps) {
  const [showCommittedModal, setShowCommittedModal] = useState(false);

  // Get locale based on currency
  const getLocale = (curr: string) => {
    const localeMap: Record<string, string> = {
      AUD: 'en-AU',
      USD: 'en-US',
      GBP: 'en-GB',
      EUR: 'de-DE',
      CAD: 'en-CA',
      NZD: 'en-NZ',
      JPY: 'ja-JP',
      CNY: 'zh-CN',
      INR: 'en-IN',
    };
    return localeMap[curr] || 'en-AU';
  };

  const locale = getLocale(currency);
  const format = (amount: number) => formatCurrency(amount, currency, locale);

  // Committed breakdown derived values (for the modal).
  const committedPaid = committedItems
    .filter((i) => i.status === 'PAID')
    .reduce((sum, i) => sum + i.amount, 0);
  const committedRemaining = committedExpenses - committedPaid;

  const statusMeta = (status: string | null) => {
    switch (status) {
      case 'PAID':
        return { label: 'Paid', dot: '#10B981', text: 'text-emerald-700', bg: 'bg-emerald-50' };
      case 'OVERDUE':
        return { label: 'Overdue', dot: '#EF4444', text: 'text-red-700', bg: 'bg-red-50' };
      default:
        return { label: 'Upcoming', dot: '#F59E0B', text: 'text-amber-700', bg: 'bg-amber-50' };
    }
  };

  const formatBillDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };
  // Calculate percentage remaining (leftToSpend / balance * 100)
  const percentageRemaining =
    balance > 0 ? Math.round((leftToSpend / balance) * 100) : 0;
  const isOverBudget = leftToSpend < 0;
  const isCloseToLimit = percentageRemaining < 20 && percentageRemaining >= 0;
  const isLowBalance = percentageRemaining < 50 && percentageRemaining >= 20;

  // Mirror mobile: surface the spendable rollover folded into this period's
  // balance, and preview the surplus that will roll on the last day of the period.
  const hasRollover = rolloverAvailable > 0;
  const receivedSources = incomeSources.filter(s => s.amount > 0);
  const hasBalanceBreakdown = hasRollover || receivedSources.length > 0;
  // Mirror the backend: a new user (no lastRolloverDate) does not roll over
  // their first-period surplus, so don't preview a rollover that won't happen.
  const shouldShowRolloverPreview =
    daysRemaining === 1 && leftToSpend > 0 && !isNewUser;

  // Determine progress bar color (aligned with mobile app BalanceCard.js)
  const getProgressBarColor = () => {
    if (isOverBudget || isCloseToLimit) {
      return '#FF6B6B'; // Red: < 20% or over budget
    }
    if (isLowBalance) {
      return '#FFB366'; // Orange: 20-50% remaining
    }
    return '#14B8A6'; // Teal: > 50% remaining
  };

  if (isLoading) {
    return (
      <div
        className="bg-white rounded-xl border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg"
        style={{boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)'}}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-1/3"></div>
          <div className="h-12 bg-gray-100 rounded w-1/2"></div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="h-20 bg-gray-100 rounded-xl"></div>
            <div className="h-20 bg-gray-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg"
      style={{boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)'}}>
      {/* Main Balance */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-500">Balance</p>
          {/* Entry point to income editing + income sources (mobile parity) */}
          <Link
            href="/income-setup?edit=true"
            className="p-1.5 -m-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit income & income sources">
            <Pencil className="w-4 h-4" />
          </Link>
        </div>
        <p className="text-4xl font-bold text-gray-900 tracking-tight">
          {format(balance)}
        </p>
        {hasBalanceBreakdown && (
          <p className="text-sm text-gray-500 mt-1">
            {format(baseIncome)}
            {receivedSources.map(source => (
              <span key={source.id}>
                {' '}+ {format(source.amount)} {source.name}
              </span>
            ))}
            {hasRollover && <> + {format(rolloverAvailable)} rollover</>}
          </p>
        )}
      </div>

      {/* Rollover Banner - shown after auto-rollover occurs */}
      {rolloverBanner && rolloverBanner.amount > 0 && (
        <div className="mb-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onAllocateRollover}
              className="text-white hover:text-emerald-100 transition-colors"
              title="Allocate to goals"
            >
              <ArrowRightCircle className="w-6 h-6" />
            </button>
            <p className="flex-1 text-white font-medium text-center">
              {format(rolloverBanner.amount)} has been rolled into this period
            </p>
            {onDismissRollover && (
              <button
                onClick={onDismissRollover}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Left to Spend and Total Expenses */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{backgroundColor: '#EEF2FF'}}>
          <p className="text-xs font-medium text-gray-500 mb-2">
            Left to Spend
          </p>
          <p
            className="text-2xl font-bold mb-4 tracking-tight"
            style={{color: '#6366f1'}}>
            {format(leftToSpend)}
          </p>

          {/* Progress Bar */}
          <div className="bg-white/50 rounded-full h-2 overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.max(0, Math.min(100, percentageRemaining))}%`,
                backgroundColor: getProgressBarColor(),
              }}
            />
          </div>

          {/* Percentage Text */}
          <p className="text-xs text-gray-500 font-medium">
            {percentageRemaining}% of income remaining
          </p>

          {/* Rollover Preview - shown on the last day of the pay period */}
          {shouldShowRolloverPreview && (
            <p className="text-xs font-medium mt-2" style={{color: '#14B8A6'}}>
              {format(leftToSpend)} scheduled to roll to next period
            </p>
          )}
        </div>
        <div className="rounded-xl p-5" style={{backgroundColor: '#FEF2F2'}}>
          <p className="text-xs font-medium text-gray-500 mb-2">
            Total Expenses
          </p>
          <p
            className="text-2xl font-bold tracking-tight"
            style={{color: '#F87171'}}>
            {format(totalExpenses)}
          </p>

          {/* Committed vs Discretionary Breakdown */}
          <div
            className="mt-4 pt-4 space-y-2.5"
            style={{borderTop: '1px solid rgba(254, 202, 202, 0.5)'}}>
            <button
              type="button"
              onClick={() => committedExpenses > 0 && setShowCommittedModal(true)}
              disabled={committedExpenses <= 0}
              className={`group w-full flex justify-between items-center ${
                committedExpenses > 0 ? 'cursor-pointer' : 'cursor-default'
              }`}
              title={committedExpenses > 0 ? 'View committed breakdown' : undefined}>
              <div className="flex items-center">
                <div
                  className="w-2 h-2 rounded-full mr-2.5"
                  style={{backgroundColor: '#F59E0B'}}></div>
                <span className="text-xs text-gray-500 font-medium group-hover:text-gray-700">
                  Committed
                </span>
                {committedExpenses > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 ml-1 group-hover:text-gray-600" />
                )}
              </div>
              <span className="text-xs font-semibold text-gray-900">
                {format(committedExpenses)}
              </span>
            </button>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div
                  className="w-2 h-2 rounded-full mr-2.5"
                  style={{backgroundColor: '#6366f1'}}></div>
                <span className="text-xs text-gray-500 font-medium">
                  Discretionary
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-900">
                {format(discretionaryExpenses)}
              </span>
            </div>
            {goalsExpenses > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div
                    className="w-2 h-2 rounded-full mr-2.5"
                    style={{backgroundColor: '#10B981'}}></div>
                  <span className="text-xs text-gray-500 font-medium">
                    Goals
                  </span>
                </div>
                <span className="text-xs font-semibold text-gray-900">
                  {format(goalsExpenses)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Committed Breakdown Modal */}
      {showCommittedModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ListChecks className="w-5 h-5" style={{ color: '#F59E0B' }} />
                <h3 className="text-lg font-semibold text-gray-900">Committed This Period</h3>
              </div>
              <button
                onClick={() => setShowCommittedModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Summary Stats */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total</p>
                  <p className="text-lg font-semibold text-gray-900">{format(committedExpenses)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Paid</p>
                  <p className="text-lg font-semibold text-gray-900">{format(committedPaid)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Remaining</p>
                  <p className="text-lg font-semibold text-gray-900">{format(committedRemaining)}</p>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6">
              {committedItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ListChecks className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium">No committed bills this period</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {committedItems.map((item) => {
                    const meta = statusMeta(item.status);
                    const dueLabel = formatBillDate(item.dueDate);
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: meta.dot }}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-semibold text-gray-900 truncate">{item.description}</p>
                            <p className="font-semibold text-gray-900 shrink-0">{format(item.amount)}</p>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-xs text-gray-500 truncate">
                              {item.categoryName || 'Uncategorized'}
                              {dueLabel ? ` • Due ${dueLabel}` : ''}
                            </p>
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${meta.bg} ${meta.text}`}>
                              {meta.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowCommittedModal(false)}
                className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

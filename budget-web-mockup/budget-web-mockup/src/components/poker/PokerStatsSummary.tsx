'use client';

import {TrendingUp, TrendingDown} from 'lucide-react';
import type {PokerLifetimeAnalytics} from '@/types';

interface PokerStatsSummaryProps {
  analytics: PokerLifetimeAnalytics;
}

const formatMoney = (amount: number, signed = false) => {
  const body = `$${Math.abs(amount).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  if (!signed) return body;
  return `${amount >= 0 ? '+' : '-'}${body}`;
};

const formatPct = (pct: number) => `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;

export default function PokerStatsSummary({analytics}: PokerStatsSummaryProps) {
  const profitable = analytics.netProfit >= 0;

  const tiles: {label: string; value: string; valueClass?: string}[] = [
    {label: 'Tournaments', value: String(analytics.totalTournaments)},
    {label: 'Events Played', value: String(analytics.totalEventsPlayed)},
    {label: 'Win Rate', value: `${analytics.winRate.toFixed(1)}%`},
    {
      label: 'Total Winnings',
      value: formatMoney(analytics.totalWinnings),
      valueClass: 'text-green-600',
    },
    {label: 'Total Invested', value: formatMoney(analytics.totalInvestment)},
    {
      label: 'Biggest Win',
      value: formatMoney(analytics.biggestWin),
      valueClass: 'text-green-600',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Headline: net profit + ROI */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Lifetime Net Profit
          </p>
          <p
            className={`mt-1 text-3xl font-bold ${
              profitable ? 'text-green-600' : 'text-red-600'
            }`}>
            {formatMoney(analytics.netProfit, true)}
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
            profitable
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}>
          {profitable ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>{formatPct(analytics.overallROI)} ROI</span>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {tiles.map((tile) => (
          <div key={tile.label}>
            <p className="text-xs text-gray-500 mb-1">{tile.label}</p>
            <p
              className={`text-base font-semibold ${
                tile.valueClass || 'text-gray-900'
              }`}>
              {tile.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

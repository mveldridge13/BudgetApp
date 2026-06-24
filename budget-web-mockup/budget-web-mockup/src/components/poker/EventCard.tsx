'use client';

import {Pencil, Trash2, PlusCircle, CheckCircle, Trophy, DollarSign} from 'lucide-react';
import {GAME_TYPE_LABELS} from '@/types';
import type {PokerTournamentEvent} from '@/types';

interface EventCardProps {
  event: PokerTournamentEvent;
  onEdit: (event: PokerTournamentEvent) => void;
  onDelete: (event: PokerTournamentEvent) => void;
  onRebuy: (event: PokerTournamentEvent) => void;
  onCloseOut: (event: PokerTournamentEvent) => void;
}

const formatStack = (stack?: number): string => {
  if (!stack) return '';
  if (stack >= 1_000_000)
    return `${(stack / 1_000_000).toFixed(stack % 1_000_000 === 0 ? 0 : 1)}M`;
  if (stack >= 1000)
    return `${(stack / 1000).toFixed(stack % 1000 === 0 ? 0 : 1)}k`;
  return String(stack);
};

const formatMoney = (amount: number) =>
  `$${Math.abs(amount).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function EventCard({
  event,
  onEdit,
  onDelete,
  onRebuy,
  onCloseOut,
}: EventCardProps) {
  const won = (event.winnings || 0) > 0;
  const showBanner = !!event.finishPosition || won;

  return (
    <div
      className="group relative bg-white rounded-xl border border-gray-100 overflow-hidden"
      style={{boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)'}}>
      <div className="p-5">
        {/* Hover actions */}
        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(event)}
            title="Edit event"
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(event)}
            title="Delete event"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <div className="flex items-center gap-2 pr-16">
          <h4 className="text-base font-semibold text-gray-900 truncate">
            {event.eventName}
          </h4>
          {event.eventNumber && (
            <span className="shrink-0 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              #{event.eventNumber}
            </span>
          )}
          {event.isClosed && (
            <span className="shrink-0 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              Closed
            </span>
          )}
        </div>

        {/* Details */}
        <div className="mt-3 space-y-1.5 text-sm">
          {event.gameType && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Game Type</span>
              <span className="font-medium text-gray-800">
                {GAME_TYPE_LABELS[event.gameType]}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Buy-in</span>
            <span className="font-medium text-gray-800">
              {formatMoney(event.buyIn || 0)}
            </span>
          </div>
          {!!event.startingStack && event.startingStack > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Starting Stack</span>
              <span className="font-medium text-gray-800">
                {formatStack(event.startingStack)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Re-Buy ({event.reBuys || 0})</span>
            <span className="font-medium text-gray-800">
              {formatMoney(event.reBuyAmount || 0)}
            </span>
          </div>
        </div>

        {/* Actions (open events only) */}
        {!event.isClosed && (
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => onRebuy(event)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
              <PlusCircle className="w-4 h-4" />
              Re-Buy
            </button>
            <button
              onClick={() => onCloseOut(event)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
              <CheckCircle className="w-4 h-4" />
              Close Out
            </button>
          </div>
        )}
      </div>

      {/* Results banner */}
      {showBanner && (
        <div
          className="px-5 py-3 flex items-center gap-5"
          style={{backgroundColor: won ? '#52C788' : '#FF6B85'}}>
          {event.finishPosition && (
            <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
              <Trophy className="w-4 h-4" />
              <span>
                Final Position: #{event.finishPosition}
                {event.fieldSize ? `/${event.fieldSize}` : ''}
              </span>
            </div>
          )}
          {won && (
            <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
              <DollarSign className="w-4 h-4" />
              <span>Prize: {formatMoney(event.winnings)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

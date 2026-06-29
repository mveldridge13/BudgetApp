'use client';

import {MapPin, Calendar, Building2, Wallet, Pencil, Trash2} from 'lucide-react';
import {pokerService} from '@/services/poker.service';
import type {PokerTournament, TournamentStatus} from '@/types';

interface TournamentCardProps {
  tournament: PokerTournament;
  onOpen: (tournament: PokerTournament) => void;
  onEdit: (tournament: PokerTournament) => void;
  onDelete: (tournament: PokerTournament) => void;
}

const STATUS_STYLES: Record<
  TournamentStatus,
  {label: string; className: string}
> = {
  active: {label: 'Active', className: 'bg-green-50 text-green-700'},
  upcoming: {label: 'Upcoming', className: 'bg-amber-50 text-amber-700'},
  completed: {label: 'Completed', className: 'bg-gray-100 text-gray-600'},
};

const formatDate = (date?: string) =>
  date
    ? new Date(date).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
      })
    : '';

const formatMoney = (amount: number) =>
  `$${Math.abs(amount).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function TournamentCard({
  tournament,
  onOpen,
  onEdit,
  onDelete,
}: TournamentCardProps) {
  const status = pokerService.getStatus(tournament);
  const statusStyle = STATUS_STYLES[status];
  const budget = pokerService.totalBudget(tournament);
  const dateRange = tournament.dateEnd
    ? `${formatDate(tournament.dateStart)} – ${formatDate(tournament.dateEnd)}`
    : formatDate(tournament.dateStart);

  const hasResults = (tournament.eventsPlayed || 0) > 0;
  const net = tournament.netProfit ?? 0;

  return (
    <div
      onClick={() => onOpen(tournament)}
      className="group relative bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all cursor-pointer"
      style={{boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)'}}>
      {/* Hover actions */}
      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(tournament);
          }}
          title="Edit tournament"
          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(tournament);
          }}
          title="Delete tournament"
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Title + status */}
      <div className="flex items-start justify-between gap-3 pr-16">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {tournament.name}
          </h3>
          {tournament.location && (
            <div className="flex items-center gap-1 mt-0.5 text-sm text-gray-500">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tournament.location}</span>
            </div>
          )}
        </div>
        <span
          className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.className} group-hover:opacity-0 transition-opacity`}>
          {statusStyle.label}
        </span>
      </div>

      {/* Details */}
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <span>{dateRange}</span>
        </div>
        {tournament.venue && (
          <div className="flex items-center gap-2 text-gray-600">
            <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="truncate">{tournament.venue}</span>
          </div>
        )}
      </div>

      {/* Footer: budget + net result */}
      {(budget > 0 || hasResults) && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          {budget > 0 ? (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Wallet className="w-4 h-4 text-gray-400" />
              <span>Budget</span>
              <span className="font-medium text-gray-700">
                {formatMoney(budget)}
              </span>
            </div>
          ) : (
            <span />
          )}
          {hasResults && (
            <div className="text-sm">
              <span className="text-gray-500">Net </span>
              <span
                className={`font-semibold ${
                  net >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {net >= 0 ? '+' : '-'}
                {formatMoney(net)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

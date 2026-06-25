'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {
  ArrowLeft,
  Pencil,
  Plus,
  Trophy,
  MapPin,
  Calendar,
  Building2,
  Wallet,
} from 'lucide-react';
import {usePokerTournament} from '@/hooks/usePokerTournament';
import {pokerService} from '@/services/poker.service';
import {Spinner} from '@/components/ui';
import EventCard from '@/components/poker/EventCard';
import EventModal from '@/components/poker/EventModal';
import TournamentModal from '@/components/poker/TournamentModal';
import type {
  EventInput,
  PokerTournamentEvent,
  TournamentInput,
} from '@/types';

const formatLongDate = (date?: string) =>
  date
    ? new Date(date).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

const formatMoney = (amount: number, signed = false) => {
  const body = `$${Math.abs(amount).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  if (!signed) return body;
  return `${amount >= 0 ? '+' : '-'}${body}`;
};

export default function TournamentDetailPage() {
  const params = useParams();
  const id = String(params.id);

  const {
    tournament,
    events,
    analytics,
    isLoading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    rebuyEvent,
    refresh,
  } = usePokerTournament(id);

  const [tournamentModalOpen, setTournamentModalOpen] = useState(false);
  const [eventModal, setEventModal] = useState<{
    open: boolean;
    editing: PokerTournamentEvent | null;
    isCloseOut: boolean;
  }>({open: false, editing: null, isCloseOut: false});

  // Prefer backend analytics (folds in shared costs); fall back to a basic
  // local roll-up if the analytics call failed.
  const summary = useMemo(() => {
    const buyIns =
      analytics?.totalBuyIns ??
      events.reduce((s, e) => s + (e.buyIn || 0), 0);
    const winnings =
      analytics?.totalWinnings ??
      events.reduce((s, e) => s + (e.winnings || 0), 0);
    const net = analytics?.netProfit ?? winnings - buyIns;
    return {
      events: events.length,
      buyIns,
      winnings,
      net,
      roi: analytics?.roi,
    };
  }, [analytics, events]);

  const budget = tournament ? pokerService.totalBudget(tournament) : 0;

  // Current (running) bankroll = starting roll + net result so far. Derived from
  // the same `summary.net` the page shows, so the two never disagree. Trip costs,
  // buy-ins, rebuys and winnings all roll into it via netProfit.
  const startingBankroll = tournament?.startingBankroll ?? 0;
  const currentBankroll = startingBankroll + summary.net;

  const openAddEvent = () =>
    setEventModal({open: true, editing: null, isCloseOut: false});
  const openEditEvent = (event: PokerTournamentEvent) =>
    setEventModal({open: true, editing: event, isCloseOut: false});
  const openCloseOut = (event: PokerTournamentEvent) =>
    setEventModal({open: true, editing: event, isCloseOut: true});
  const closeEventModal = () =>
    setEventModal({open: false, editing: null, isCloseOut: false});

  const handleEventSave = async (data: EventInput) => {
    if (eventModal.editing) {
      await updateEvent(eventModal.editing.id, data);
    } else {
      await createEvent(data);
    }
  };

  const handleEventDelete = async (event: PokerTournamentEvent) => {
    if (!confirm(`Delete "${event.eventName}"? This can't be undone.`)) return;
    try {
      await deleteEvent(event.id);
    } catch {
      alert('Failed to delete event. Please try again.');
    }
  };

  const handleRebuy = async (event: PokerTournamentEvent) => {
    try {
      await rebuyEvent(event);
    } catch {
      alert('Failed to record re-buy. Please try again.');
    }
  };

  const handleTournamentSave = async (data: TournamentInput) => {
    await pokerService.updateTournament(id, data);
    await refresh();
  };

  if (isLoading && !tournament) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="space-y-6">
        <Link
          href="/poker"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">
          <ArrowLeft className="w-4 h-4" />
          Back to Poker
        </Link>
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
          {error || 'Tournament not found.'}
        </div>
      </div>
    );
  }

  const dateRange = tournament.dateEnd
    ? `${formatLongDate(tournament.dateStart)} – ${formatLongDate(tournament.dateEnd)}`
    : formatLongDate(tournament.dateStart);

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/poker"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">
          <ArrowLeft className="w-4 h-4" />
          Back to Poker
        </Link>
        <button
          onClick={() => setTournamentModalOpen(true)}
          className="inline-flex items-center gap-2 text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-50 hover:shadow-sm">
          <Pencil className="w-4 h-4" />
          Edit
        </button>
      </div>

      {/* Tournament info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 text-indigo-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {tournament.name}
            </h1>
            {tournament.location && (
              <div className="flex items-center gap-1.5 mt-1 text-gray-500">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{tournament.location}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100 space-y-2.5 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{dateRange}</span>
          </div>
          {tournament.venue && (
            <div className="flex items-center gap-2 text-gray-600">
              <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{tournament.venue}</span>
            </div>
          )}
          {budget > 0 && (
            <div className="flex items-center gap-2 text-gray-600">
              <Wallet className="w-4 h-4 text-gray-400 shrink-0" />
              <span>Budget: {formatMoney(budget)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Current bankroll */}
      {startingBankroll > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6 text-indigo-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Current Bankroll
                </p>
                <p
                  className={`text-2xl font-bold ${
                    currentBankroll < 0 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                  {formatMoney(currentBankroll)}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm text-gray-500">
                Started {formatMoney(startingBankroll)}
              </p>
              <p
                className={`text-sm font-semibold ${
                  summary.net >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {formatMoney(summary.net, true)} this trip
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Performance summary */}
      {events.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Performance Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SummaryTile label="Events" value={String(summary.events)} />
            <SummaryTile label="Total Buy-ins" value={formatMoney(summary.buyIns)} />
            <SummaryTile
              label="Total Winnings"
              value={formatMoney(summary.winnings)}
              valueClass="text-green-600"
            />
            <SummaryTile
              label="Net Result"
              value={formatMoney(summary.net, true)}
              valueClass={summary.net >= 0 ? 'text-green-600' : 'text-red-600'}
            />
            {summary.roi !== undefined && (
              <SummaryTile
                label="ROI"
                value={`${summary.roi >= 0 ? '+' : ''}${summary.roi.toFixed(1)}%`}
                valueClass={summary.roi >= 0 ? 'text-green-600' : 'text-red-600'}
              />
            )}
          </div>
        </div>
      )}

      {/* Events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Events</h2>
          <button
            onClick={openAddEvent}
            className="inline-flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all hover:shadow-lg"
            style={{backgroundColor: '#6366f1'}}>
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>

        {events.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-7 h-7 text-indigo-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No events yet</h3>
            <p className="text-gray-500 mt-1">
              Add your first event to start tracking results.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={openEditEvent}
                onDelete={handleEventDelete}
                onRebuy={handleRebuy}
                onCloseOut={openCloseOut}
              />
            ))}
          </div>
        )}
      </div>

      <EventModal
        visible={eventModal.open}
        onClose={closeEventModal}
        onSave={handleEventSave}
        editingEvent={eventModal.editing}
        isCloseOut={eventModal.isCloseOut}
      />

      <TournamentModal
        visible={tournamentModalOpen}
        onClose={() => setTournamentModalOpen(false)}
        onSave={handleTournamentSave}
        editingTournament={tournament}
      />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  valueClass = 'text-gray-900',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

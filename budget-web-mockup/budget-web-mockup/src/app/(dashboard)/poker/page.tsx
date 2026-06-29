'use client';

import {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Plus, Trophy} from 'lucide-react';
import {usePokerTournaments} from '@/hooks/usePokerTournaments';
import {pokerService} from '@/services/poker.service';
import TournamentCard from '@/components/poker/TournamentCard';
import TournamentModal from '@/components/poker/TournamentModal';
import PokerStatsSummary from '@/components/poker/PokerStatsSummary';
import BankrollPanel from '@/components/poker/BankrollPanel';
import {Spinner} from '@/components/ui';
import type {PokerTournament, TournamentInput, TournamentStatus} from '@/types';

const GROUP_ORDER: {status: TournamentStatus; label: string}[] = [
  {status: 'active', label: 'Active'},
  {status: 'upcoming', label: 'Upcoming'},
  {status: 'completed', label: 'Completed'},
];

export default function PokerPage() {
  const router = useRouter();
  const {
    tournaments,
    analytics,
    isLoading,
    error,
    createTournament,
    updateTournament,
    deleteTournament,
    refresh,
  } = usePokerTournaments();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<PokerTournament | null>(null);

  const grouped = useMemo(() => {
    return GROUP_ORDER.map(({status, label}) => ({
      status,
      label,
      items: tournaments.filter((t) => pokerService.getStatus(t) === status),
    })).filter((g) => g.items.length > 0);
  }, [tournaments]);

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (tournament: PokerTournament) => {
    setEditing(tournament);
    setIsModalOpen(true);
  };

  const handleSave = async (data: TournamentInput) => {
    if (editing) {
      await updateTournament(editing.id, data);
    } else {
      await createTournament(data);
    }
  };

  const handleDelete = async (tournament: PokerTournament) => {
    if (
      !confirm(
        `Delete "${tournament.name}"? This also removes its events and can't be undone.`,
      )
    ) {
      return;
    }
    try {
      await deleteTournament(tournament.id);
    } catch {
      alert('Failed to delete tournament. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Poker</h1>
          <p className="text-gray-600 mt-1">
            Track your tournaments, events, and profitability.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all hover:shadow-lg"
          style={{
            backgroundColor: '#6366f1',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)',
          }}>
          <Plus className="w-5 h-5" />
          <span>Add Tournament</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p>{error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-500">
            Retry
          </button>
        </div>
      )}

      {/* Global bankroll — independent of tournaments, always shown */}
      <BankrollPanel />

      {isLoading && tournaments.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : tournaments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-7 h-7 text-indigo-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            No tournaments yet
          </h3>
          <p className="text-gray-500 mt-1 mb-5">
            Add your first tournament to start tracking events and results.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-medium transition-all hover:shadow-lg"
            style={{backgroundColor: '#6366f1'}}>
            <Plus className="w-5 h-5" />
            <span>Add Tournament</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {analytics && analytics.totalTournaments > 0 && (
            <PokerStatsSummary analytics={analytics} />
          )}

          {grouped.map((group) => (
            <section key={group.status}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  {group.label}
                </h2>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">
                  {group.items.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {group.items.map((t) => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    onOpen={() => router.push(`/poker/${t.id}`)}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <TournamentModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingTournament={editing}
      />
    </div>
  );
}

'use client';

import {useState, useCallback, useEffect} from 'react';
import {pokerService} from '@/services/poker.service';
import type {
  PokerTournament,
  TournamentInput,
  PokerLifetimeAnalytics,
} from '@/types';

interface UsePokerTournamentsReturn {
  tournaments: PokerTournament[];
  analytics: PokerLifetimeAnalytics | null;
  isLoading: boolean;
  error: string | null;
  createTournament: (data: TournamentInput) => Promise<PokerTournament>;
  updateTournament: (
    id: string,
    data: Partial<TournamentInput>,
  ) => Promise<PokerTournament>;
  deleteTournament: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePokerTournaments(): UsePokerTournamentsReturn {
  const [tournaments, setTournaments] = useState<PokerTournament[]>([]);
  const [analytics, setAnalytics] = useState<PokerLifetimeAnalytics | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [list, stats] = await Promise.all([
        pokerService.getTournaments(),
        pokerService.getLifetimeAnalytics().catch(() => null),
      ]);
      setTournaments(pokerService.sortByStatus(list));
      setAnalytics(stats);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load tournaments',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  const createTournament = useCallback(
    async (data: TournamentInput) => {
      setError(null);
      const created = await pokerService.createTournament(data);
      setTournaments((prev) =>
        pokerService.sortByStatus([created, ...prev]),
      );
      // Lifetime analytics shifts when a tournament is added.
      pokerService.getLifetimeAnalytics().then(setAnalytics).catch(() => {});
      return created;
    },
    [],
  );

  const updateTournament = useCallback(
    async (id: string, data: Partial<TournamentInput>) => {
      setError(null);
      const updated = await pokerService.updateTournament(id, data);
      setTournaments((prev) =>
        pokerService.sortByStatus(
          prev.map((t) => (t.id === id ? {...t, ...updated} : t)),
        ),
      );
      return updated;
    },
    [],
  );

  const deleteTournament = useCallback(
    async (id: string) => {
      setError(null);
      const previous = tournaments;
      setTournaments((prev) => prev.filter((t) => t.id !== id));
      try {
        await pokerService.deleteTournament(id);
        pokerService.getLifetimeAnalytics().then(setAnalytics).catch(() => {});
      } catch (err) {
        setTournaments(previous); // rollback
        setError(
          err instanceof Error ? err.message : 'Failed to delete tournament',
        );
        throw err;
      }
    },
    [tournaments],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    tournaments,
    analytics,
    isLoading,
    error,
    createTournament,
    updateTournament,
    deleteTournament,
    refresh,
  };
}

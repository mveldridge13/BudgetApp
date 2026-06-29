'use client';

import {useState, useCallback, useEffect} from 'react';
import {pokerService} from '@/services/poker.service';
import type {
  PokerTournament,
  PokerTournamentEvent,
  PokerTournamentAnalytics,
  EventInput,
} from '@/types';

interface UsePokerTournamentReturn {
  tournament: PokerTournament | null;
  events: PokerTournamentEvent[];
  analytics: PokerTournamentAnalytics | null;
  isLoading: boolean;
  error: string | null;
  createEvent: (data: EventInput) => Promise<PokerTournamentEvent>;
  updateEvent: (
    eventId: string,
    data: Partial<EventInput>,
  ) => Promise<PokerTournamentEvent>;
  deleteEvent: (eventId: string) => Promise<void>;
  rebuyEvent: (event: PokerTournamentEvent) => Promise<PokerTournamentEvent>;
  closeOutEvent: (
    eventId: string,
    results: Pick<EventInput, 'finishPosition' | 'fieldSize' | 'winnings'>,
  ) => Promise<PokerTournamentEvent>;
  refresh: () => Promise<void>;
}

export function usePokerTournament(id: string): UsePokerTournamentReturn {
  const [tournament, setTournament] = useState<PokerTournament | null>(null);
  const [events, setEvents] = useState<PokerTournamentEvent[]>([]);
  const [analytics, setAnalytics] = useState<PokerTournamentAnalytics | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [t, evs, stats] = await Promise.all([
        pokerService.getTournament(id),
        pokerService.getEvents(id),
        pokerService.getTournamentAnalytics(id).catch(() => null),
      ]);
      setTournament(t);
      setEvents(evs);
      setAnalytics(stats);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load tournament',
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const refresh = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  // Re-pull tournament + analytics (computed fields shift on any event change).
  const refreshDerived = useCallback(() => {
    pokerService.getTournament(id).then(setTournament).catch(() => {});
    pokerService.getTournamentAnalytics(id).then(setAnalytics).catch(() => {});
  }, [id]);

  const createEvent = useCallback(
    async (data: EventInput) => {
      setError(null);
      const created = await pokerService.createEvent(id, data);
      setEvents((prev) => [...prev, created]);
      refreshDerived();
      return created;
    },
    [id, refreshDerived],
  );

  const updateEvent = useCallback(
    async (eventId: string, data: Partial<EventInput>) => {
      setError(null);
      const updated = await pokerService.updateEvent(eventId, data);
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? {...e, ...updated} : e)),
      );
      refreshDerived();
      return updated;
    },
    [refreshDerived],
  );

  const deleteEvent = useCallback(
    async (eventId: string) => {
      setError(null);
      const previous = events;
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      try {
        await pokerService.deleteEvent(eventId);
        refreshDerived();
      } catch (err) {
        setEvents(previous); // rollback
        setError(err instanceof Error ? err.message : 'Failed to delete event');
        throw err;
      }
    },
    [events, refreshDerived],
  );

  // Re-buy: increment count and add another buy-in to the re-buy total.
  const rebuyEvent = useCallback(
    (event: PokerTournamentEvent) =>
      updateEvent(event.id, {
        reBuys: (event.reBuys || 0) + 1,
        reBuyAmount: (event.reBuyAmount || 0) + (event.buyIn || 0),
      }),
    [updateEvent],
  );

  const closeOutEvent = useCallback(
    (
      eventId: string,
      results: Pick<EventInput, 'finishPosition' | 'fieldSize' | 'winnings'>,
    ) => updateEvent(eventId, {...results, isClosed: true}),
    [updateEvent],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    tournament,
    events,
    analytics,
    isLoading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    rebuyEvent,
    closeOutEvent,
    refresh,
  };
}

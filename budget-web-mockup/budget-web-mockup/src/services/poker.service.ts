import {api} from './api';
import type {
  PokerTournament,
  PokerTournamentEvent,
  TournamentInput,
  EventInput,
  PokerLifetimeAnalytics,
  PokerTournamentAnalytics,
  TournamentStatus,
  PokerBankroll,
  PokerBankrollTransaction,
  BankrollTransactionInput,
} from '@/types';

// Backend responses come in loose envelopes — `{tournament}`, `{event}`,
// `{tournaments}`, `{events}`, `{data}`, or the raw object/array. The shared
// api client only unwraps a few known keys, so normalize the rest here.
function unwrapOne<T>(res: unknown, key: 'tournament' | 'event'): T {
  if (res && typeof res === 'object') {
    const r = res as Record<string, unknown>;
    if (r[key] !== undefined) return r[key] as T;
    if (r.data !== undefined) return r.data as T;
  }
  return res as T;
}

function unwrapList<T>(res: unknown, key: 'tournaments' | 'events'): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object') {
    const r = res as Record<string, unknown>;
    if (Array.isArray(r[key])) return r[key] as T[];
    if (Array.isArray(r.data)) return r.data as T[];
  }
  return [];
}

// Strip undefined values so we never trip the backend's forbidNonWhitelisted
// validation with empty/extra fields.
function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out as Partial<T>;
}

class PokerService {
  // ── Tournaments ──────────────────────────────────────────────────────────
  async getTournaments(): Promise<PokerTournament[]> {
    const res = await api.get<unknown>('/poker/tournaments');
    return unwrapList<PokerTournament>(res, 'tournaments');
  }

  async getTournament(id: string): Promise<PokerTournament> {
    const res = await api.get<unknown>(`/poker/tournaments/${id}`);
    return unwrapOne<PokerTournament>(res, 'tournament');
  }

  async createTournament(data: TournamentInput): Promise<PokerTournament> {
    const res = await api.post<unknown>('/poker/tournaments', clean({...data}));
    return unwrapOne<PokerTournament>(res, 'tournament');
  }

  async updateTournament(
    id: string,
    data: Partial<TournamentInput>,
  ): Promise<PokerTournament> {
    // Backend route is @Put (not PATCH).
    const res = await api.put<unknown>(
      `/poker/tournaments/${id}`,
      clean({...data}),
    );
    return unwrapOne<PokerTournament>(res, 'tournament');
  }

  async deleteTournament(id: string): Promise<void> {
    await api.delete(`/poker/tournaments/${id}`);
  }

  // ── Events ───────────────────────────────────────────────────────────────
  async getEvents(tournamentId: string): Promise<PokerTournamentEvent[]> {
    const res = await api.get<unknown>(
      `/poker/tournaments/${tournamentId}/events`,
    );
    return unwrapList<PokerTournamentEvent>(res, 'events');
  }

  async createEvent(
    tournamentId: string,
    data: EventInput,
  ): Promise<PokerTournamentEvent> {
    const res = await api.post<unknown>(
      `/poker/tournaments/${tournamentId}/events`,
      clean({...data}),
    );
    return unwrapOne<PokerTournamentEvent>(res, 'event');
  }

  // NOTE: event update/delete are NOT nested under the tournament, and update
  // is @Put (not PATCH) on the backend.
  async updateEvent(
    eventId: string,
    data: Partial<EventInput>,
  ): Promise<PokerTournamentEvent> {
    const res = await api.put<unknown>(
      `/poker/tournaments/events/${eventId}`,
      clean({...data}),
    );
    return unwrapOne<PokerTournamentEvent>(res, 'event');
  }

  async deleteEvent(eventId: string): Promise<void> {
    await api.delete(`/poker/tournaments/events/${eventId}`);
  }

  // ── Analytics (backend is source of truth for ROI/netProfit) ─────────────
  async getLifetimeAnalytics(): Promise<PokerLifetimeAnalytics> {
    return api.get<PokerLifetimeAnalytics>('/poker/analytics');
  }

  async getTournamentAnalytics(
    tournamentId: string,
  ): Promise<PokerTournamentAnalytics> {
    return api.get<PokerTournamentAnalytics>(
      `/poker/tournaments/${tournamentId}/analytics`,
    );
  }

  // ── Bankroll (global deposit/withdraw ledger, siloed from budget) ─────────
  async getBankroll(): Promise<PokerBankroll> {
    // skipUnwrap: the response has a `transactions` key, which the api client
    // would otherwise auto-unwrap — returning just the array, not the picture.
    return api.get<PokerBankroll>('/poker/bankroll', undefined, {
      skipUnwrap: true,
    });
  }

  async addBankrollTransaction(
    data: BankrollTransactionInput,
  ): Promise<PokerBankrollTransaction> {
    const res = await api.post<unknown>(
      '/poker/bankroll/transactions',
      clean({...data}),
    );
    // Raw DTO, or {data}-wrapped — normalize either way.
    if (res && typeof res === 'object' && 'data' in res) {
      return (res as {data: PokerBankrollTransaction}).data;
    }
    return res as PokerBankrollTransaction;
  }

  async deleteBankrollTransaction(id: string): Promise<void> {
    await api.delete(`/poker/bankroll/transactions/${id}`);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  getStatus(tournament: Pick<PokerTournament, 'dateStart' | 'dateEnd'>): TournamentStatus {
    const now = new Date();
    const start = new Date(tournament.dateStart);
    const end = tournament.dateEnd ? new Date(tournament.dateEnd) : start;
    if (now >= start && now <= end) return 'active';
    if (now < start) return 'upcoming';
    return 'completed';
  }

  // active → upcoming (soonest first) → completed (most recent first)
  sortByStatus(tournaments: PokerTournament[]): PokerTournament[] {
    const order: Record<TournamentStatus, number> = {
      active: 0,
      upcoming: 1,
      completed: 2,
    };
    return [...tournaments].sort((a, b) => {
      const sa = this.getStatus(a);
      const sb = this.getStatus(b);
      if (order[sa] !== order[sb]) return order[sa] - order[sb];
      const da = new Date(a.dateStart).getTime();
      const db = new Date(b.dateStart).getTime();
      // upcoming soonest-first, everything else most-recent-first
      return sa === 'upcoming' ? da - db : db - da;
    });
  }

  totalBudget(t: Pick<PokerTournament, 'accommodationCost' | 'foodBudget' | 'otherExpenses'>): number {
    return (t.accommodationCost || 0) + (t.foodBudget || 0) + (t.otherExpenses || 0);
  }
}

export const pokerService = new PokerService();

// Poker tournament tracker types — mirrors the backend `/poker` module
// (NestJS PokerTournamentDto / PokerTournamentEventDto).

export type GameType =
  | 'NO_LIMIT_HOLDEM'
  | 'SATELLITE'
  | 'FREEZEOUT'
  | 'BOUNTY'
  | 'TURBO'
  | 'DEEPSTACK'
  | 'TEAM_EVENT';

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  NO_LIMIT_HOLDEM: "No-Limit Hold'em",
  SATELLITE: 'Satellite',
  FREEZEOUT: 'Freezeout',
  BOUNTY: 'Bounty',
  TURBO: 'Turbo',
  DEEPSTACK: 'Deepstack',
  TEAM_EVENT: 'Team Event',
};

// Derived from a tournament's date range (not stored on the backend).
export type TournamentStatus = 'active' | 'upcoming' | 'completed';

export interface PokerTournament {
  id: string;
  userId: string;
  name: string;
  location: string;
  venue?: string;
  dateStart: string; // ISO
  dateEnd?: string; // ISO
  accommodationCost: number;
  foodBudget: number;
  otherExpenses: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;

  // Calculated fields the backend folds in (shared trip costs included in
  // totalInvestment / netProfit / roi). Present on list + detail responses.
  totalSharedCosts?: number;
  totalBuyIns?: number;
  totalInvestment?: number;
  totalWinnings?: number;
  netProfit?: number;
  eventsPlayed?: number;
  eventsWon?: number;
  roi?: number;

  events?: PokerTournamentEvent[];
}

export interface PokerTournamentEvent {
  id: string;
  tournamentId: string;
  userId: string;
  eventName: string;
  eventNumber?: string;
  buyIn: number;
  winnings: number;
  eventDate: string; // ISO
  gameType?: GameType;
  fieldSize?: number;
  finishPosition?: number;
  notes?: string;
  reBuys?: number;
  reBuyAmount?: number;
  startingStack?: number;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Create / update payloads (field names match the backend DTOs) ──────────

export interface TournamentInput {
  name: string;
  location: string;
  venue?: string | null;
  dateStart: string; // ISO
  dateEnd?: string | null; // ISO or null to clear
  accommodationCost?: number;
  foodBudget?: number;
  otherExpenses?: number;
  notes?: string | null;
}

export interface EventInput {
  eventName: string;
  eventNumber?: string | null;
  gameType?: GameType;
  buyIn?: number;
  startingStack?: number;
  eventDate?: string; // ISO
  reBuys?: number;
  reBuyAmount?: number;
  finishPosition?: number | null;
  fieldSize?: number | null;
  winnings?: number;
  isClosed?: boolean;
}

// ── Analytics responses ────────────────────────────────────────────────────

export interface PokerLifetimeAnalytics {
  totalTournaments: number;
  totalInvestment: number;
  totalWinnings: number;
  netProfit: number;
  overallROI: number;
  totalEventsPlayed: number;
  totalEventsWon: number;
  winRate: number;
  averageBuyIn: number;
  averageWinnings: number;
  biggestWin: number;
  biggestLoss: number;
  profitableTournaments: number;
}

export interface PokerTournamentAnalytics {
  tournamentId: string;
  name: string;
  location: string;
  dateStart: string;
  dateEnd?: string;
  sharedCosts: number;
  accommodationCost: number;
  foodBudget: number;
  otherExpenses: number;
  totalBuyIns: number;
  totalWinnings: number;
  totalInvestment: number;
  netProfit: number;
  roi: number;
  eventsPlayed: number;
  eventsWon: number;
  winRate: number;
  averageBuyIn: number;
  averageWinnings: number;
  costPerEvent: number;
  biggestWin: number;
  bestFinish?: number;
  worstFinish?: number;
}

// ── Global bankroll (deposit/withdraw ledger + computed picture) ────────────
// The bankroll is siloed from the budget. The ledger holds ONLY deposits and
// withdrawals; play results (buy-ins/winnings/trip costs) come from the
// tournament tables via the backend. Current bankroll B = D − W + N.

export type PokerBankrollTransactionType = 'DEPOSIT' | 'WITHDRAWAL';

// BUILDING  : net profit below original capital (incl. losses) — keep building.
// IN_PROFIT : recouped capital, profit between 1x and 2x capital.
// FREEROLL  : playing on house money (withdrawals ≥ deposits) OR profit ≥ 2x capital.
export type PokerBankrollStatus = 'BUILDING' | 'IN_PROFIT' | 'FREEROLL';

export interface PokerBankrollTransaction {
  id: string;
  userId: string;
  type: PokerBankrollTransactionType;
  amount: number;
  note?: string;
  date: string; // ISO
  createdAt: string;
  updatedAt: string;
}

export interface PokerBankroll {
  totalDeposits: number; // D
  totalWithdrawals: number; // W
  lifetimeNetProfit: number; // N
  currentBankroll: number; // B = D − W + N
  originalCapital: number; // C = D
  capitalAtRisk: number; // max(0, D − W)
  capitalRecouped: number; // min(W, D)
  status: PokerBankrollStatus;
  isFreerolling: boolean;
  suggestedWithdrawal: number;
  transactions: PokerBankrollTransaction[];
}

export interface BankrollTransactionInput {
  type: PokerBankrollTransactionType;
  amount: number;
  note?: string | null;
  date?: string; // ISO; defaults to now on the server
}

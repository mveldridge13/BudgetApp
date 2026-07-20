/**
 * PayPeriodService - Pay period calculation utilities for web
 * Mirrors the mobile PayPeriodService logic for consistency
 *
 * IMPORTANT: Pay periods run from pay date to the day BEFORE the next pay date
 * Example: If pay day is the 15th, period is Feb 15 - Mar 14
 */

export type FrequencyType = 'weekly' | 'fortnightly' | 'monthly' | 'sixmonths' | 'yearly';

export interface PayPeriodBoundaries {
  start: Date;
  end: Date;
  isNewPeriod: boolean;
}

export interface UserIncomeInfo {
  nextPayDate?: string;
  incomeFrequency?: FrequencyType | string;
}

/**
 * Parse date string to Date object (handles ISO strings)
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Get start of day for a date
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day for a date
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Subtract days from a date
 */
export function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Subtract weeks from a date
 */
export function subWeeks(date: Date, weeks: number): Date {
  return subDays(date, weeks * 7);
}

/**
 * Add weeks to a date
 */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/**
 * Subtract months from a date (handles month-end edge cases)
 */
export function subMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() - months;
  result.setMonth(targetMonth);

  // Handle edge case where day doesn't exist in target month
  // e.g., March 31 - 1 month should be Feb 28/29, not March 2/3
  if (result.getDate() !== date.getDate()) {
    result.setDate(0); // Last day of previous month
  }

  return result;
}

/**
 * Add months to a date (handles month-end edge cases)
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  result.setMonth(targetMonth);

  // Handle edge case where day doesn't exist in target month
  if (result.getDate() !== date.getDate()) {
    result.setDate(0); // Last day of previous month
  }

  return result;
}

/**
 * Calculate the previous pay date based on frequency
 */
export function calculatePreviousPayDate(nextPayDate: Date, frequency: string): Date | null {
  if (!nextPayDate || !frequency) return null;

  const date = new Date(nextPayDate);
  const freq = frequency.toLowerCase();

  switch (freq) {
    case 'weekly':
      return subWeeks(date, 1);
    case 'fortnightly':
      return subWeeks(date, 2);
    case 'monthly':
      return subMonths(date, 1);
    case 'sixmonths':
      return subMonths(date, 6);
    case 'yearly':
      return subMonths(date, 12);
    default:
      return subMonths(date, 1); // Default to monthly
  }
}

/**
 * Calculate the next pay date based on frequency
 */
export function calculateNextPayDate(currentPayDate: Date, frequency: string): Date | null {
  if (!currentPayDate || !frequency) return null;

  const date = new Date(currentPayDate);
  const freq = frequency.toLowerCase();

  switch (freq) {
    case 'weekly':
      return addWeeks(date, 1);
    case 'fortnightly':
      return addWeeks(date, 2);
    case 'monthly':
      return addMonths(date, 1);
    case 'sixmonths':
      return addMonths(date, 6);
    case 'yearly':
      return addMonths(date, 12);
    default:
      return addMonths(date, 1); // Default to monthly
  }
}

/**
 * Check if today is on or after the next pay date (new period has started)
 */
export function isNewPayPeriod(nextPayDateString: string): boolean {
  if (!nextPayDateString) return false;

  const nextPayDate = parseDate(nextPayDateString);
  if (!nextPayDate) return false;

  const todayStart = startOfDay(new Date());
  return todayStart >= startOfDay(nextPayDate);
}

/**
 * Calculate pay period boundaries (start and end dates)
 *
 * CRITICAL: Period ends the day BEFORE the next pay date
 * Example: If next pay date is Mar 15, period ends Mar 14 at 23:59:59
 */
export function calculatePayPeriodBoundaries(
  nextPayDateString: string,
  frequency: string,
  useCurrentPeriodForNewPeriod: boolean = false
): PayPeriodBoundaries | null {
  if (!nextPayDateString || !frequency) return null;

  const nextPayDate = parseDate(nextPayDateString);
  if (!nextPayDate) return null;

  let periodStart: Date;

  // Period ends the day BEFORE the next pay date
  const dayBeforeNextPay = subDays(nextPayDate, 1);
  const periodEnd = endOfDay(dayBeforeNextPay);

  const isNew = isNewPayPeriod(nextPayDateString);

  if (isNew && useCurrentPeriodForNewPeriod) {
    // If we're in a new pay period, period starts TODAY
    periodStart = startOfDay(new Date());
  } else {
    // Calculate the previous pay date - this becomes the start of the current period
    const previousPayDate = calculatePreviousPayDate(nextPayDate, frequency);
    if (!previousPayDate) return null;

    periodStart = startOfDay(previousPayDate);
  }

  return {
    start: periodStart,
    end: periodEnd,
    isNewPeriod: isNew,
  };
}

/**
 * Find the pay period boundaries containing an arbitrary target date - not
 * just "today's" period like calculatePayPeriodBoundaries. Walks forward or
 * backward from nextPayDate one cycle at a time until the target date falls
 * inside a period. Used e.g. to tell whether a date being dragged around a
 * forecast chart has crossed into a different pay period.
 */
export function findPayPeriodContaining(
  targetDate: Date,
  nextPayDateString: string,
  frequency: string
): PayPeriodBoundaries | null {
  const anchor = parseDate(nextPayDateString);
  if (!anchor || !frequency) return null;

  const target = startOfDay(targetDate);
  let periodStart = startOfDay(anchor);
  let guard = 0;

  if (target >= periodStart) {
    while (guard++ < 500) {
      const next = calculateNextPayDate(periodStart, frequency);
      if (!next) break;
      const nextStart = startOfDay(next);
      if (target < nextStart) break;
      periodStart = nextStart;
    }
  } else {
    while (guard++ < 500) {
      const prev = calculatePreviousPayDate(periodStart, frequency);
      if (!prev) break;
      periodStart = startOfDay(prev);
      if (target >= periodStart) break;
    }
  }

  const nextBoundary = calculateNextPayDate(periodStart, frequency);
  if (!nextBoundary) return null;

  return {
    start: periodStart,
    end: endOfDay(subDays(startOfDay(nextBoundary), 1)),
    isNewPeriod: false,
  };
}

/**
 * Get pay period status text for UI display
 */
export function getPayPeriodStatusText(nextPayDateString: string): string | null {
  if (!nextPayDateString) return null;

  const nextPayDate = parseDate(nextPayDateString);
  if (!nextPayDate) return null;

  const today = startOfDay(new Date());
  const nextPayStart = startOfDay(nextPayDate);

  const diffTime = nextPayStart.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Pay day today!';
  if (diffDays === 1) return 'Pay day tomorrow';
  if (diffDays > 1) return `${diffDays} days to pay day`;

  return null;
}

export interface Transaction {
  id: string;
  date: string;
  dueDate?: string;
  amount: number;
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ROLLOVER';
  status?: 'UPCOMING' | 'PAID' | 'OVERDUE';
  description?: string;
  category?: { name: string };
  recurrence?: string;
}

/**
 * Filter transactions to current pay period only
 */
export function filterTransactionsForCurrentPeriod(
  transactions: Transaction[],
  nextPayDateString: string,
  frequency: string,
  transactionType: 'INCOME' | 'EXPENSE' | null = null
): Transaction[] {
  if (!transactions || !Array.isArray(transactions) || !nextPayDateString || !frequency) {
    return [];
  }

  const boundaries = calculatePayPeriodBoundaries(nextPayDateString, frequency, true);
  if (!boundaries) return [];

  const { start: periodStart, end: periodEnd } = boundaries;

  return transactions.filter(transaction => {
    try {
      const transactionDate = new Date(transaction.date);
      if (isNaN(transactionDate.getTime())) return false;

      // Exclude ROLLOVER and TRANSFER transactions
      if (transaction.type === 'ROLLOVER' || transaction.type === 'TRANSFER') {
        return false;
      }

      // If transaction type filter is specified, apply it
      if (transactionType) {
        const matchesType = transactionType === 'EXPENSE'
          ? transaction.type === 'EXPENSE' || !transaction.type
          : transaction.type === transactionType;
        if (!matchesType) return false;
      }

      // Check if date is in period
      const dateInPeriod = transactionDate >= periodStart && transactionDate <= periodEnd;

      // Check due date if applicable
      const dueDate = transaction.dueDate ? new Date(transaction.dueDate) : null;
      const dueDateInPeriod = dueDate && !isNaN(dueDate.getTime()) &&
        dueDate >= periodStart && dueDate <= periodEnd;

      // Smart filtering based on status
      if (transaction.status === 'PAID') {
        return dateInPeriod;
      } else if (transaction.status === 'UPCOMING' || transaction.status === 'OVERDUE') {
        return dueDateInPeriod;
      } else {
        return dateInPeriod;
      }
    } catch {
      return false;
    }
  });
}

/**
 * Process bills analytics from transactions (client-side fallback)
 * Mimics the mobile loadBillsAnalyticsFallback logic
 */
export function processBillsAnalytics(
  transactions: Transaction[],
  nextPayDateString: string,
  frequency: string
): BillsAnalyticsResult {
  const emptyResult: BillsAnalyticsResult = {
    totalBills: 0,
    paidBills: 0,
    unpaidBills: 0,
    overdueBills: 0,
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    overdueAmount: 0,
    upcomingBills: [],
    paidBillsList: [],
    unpaidBillsList: [],
    overdueBillsList: [],
    progress: 0,
  };

  if (!transactions || !Array.isArray(transactions)) {
    return emptyResult;
  }

  // Filter to bill transactions (have dueDate or recurrence)
  const billTransactions = transactions.filter(
    tx => tx.dueDate || (tx.recurrence && tx.recurrence !== 'none')
  );

  // Calculate pay period boundaries
  const boundaries = calculatePayPeriodBoundaries(nextPayDateString, frequency, false);
  if (!boundaries) return emptyResult;

  const { start: periodStart, end: periodEnd } = boundaries;
  const now = new Date();

  // Filter bills for current pay period
  const periodBills = billTransactions.filter(bill => {
    const dueDate = bill.dueDate ? new Date(bill.dueDate) : null;
    if (!dueDate || isNaN(dueDate.getTime())) return false;
    return dueDate >= periodStart && dueDate <= periodEnd;
  });

  // Categorize bills by status
  const paidBillsList: Transaction[] = [];
  const unpaidBillsList: Transaction[] = [];
  const overdueBillsList: Transaction[] = [];
  const upcomingBills: Transaction[] = [];

  periodBills.forEach(bill => {
    const dueDate = bill.dueDate ? new Date(bill.dueDate) : null;

    if (bill.status === 'PAID') {
      paidBillsList.push(bill);
    } else if (dueDate && dueDate < now) {
      overdueBillsList.push(bill);
    } else if (dueDate) {
      // Check if due within 7 days
      const sevenDaysFromNow = addDays(now, 7);
      if (dueDate <= sevenDaysFromNow) {
        upcomingBills.push(bill);
      }
      unpaidBillsList.push(bill);
    }
  });

  // Calculate totals
  const totalAmount = periodBills.reduce((sum, b) => sum + Math.abs(b.amount), 0);
  const paidAmount = paidBillsList.reduce((sum, b) => sum + Math.abs(b.amount), 0);
  const unpaidAmount = unpaidBillsList.reduce((sum, b) => sum + Math.abs(b.amount), 0);
  const overdueAmount = overdueBillsList.reduce((sum, b) => sum + Math.abs(b.amount), 0);

  const progress = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  return {
    totalBills: periodBills.length,
    paidBills: paidBillsList.length,
    unpaidBills: unpaidBillsList.length,
    overdueBills: overdueBillsList.length,
    totalAmount,
    paidAmount,
    unpaidAmount,
    overdueAmount,
    upcomingBills,
    paidBillsList,
    unpaidBillsList,
    overdueBillsList,
    progress,
  };
}

export interface BillsAnalyticsResult {
  totalBills: number;
  paidBills: number;
  unpaidBills: number;
  overdueBills: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  overdueAmount: number;
  upcomingBills: Transaction[];
  paidBillsList: Transaction[];
  unpaidBillsList: Transaction[];
  overdueBillsList: Transaction[];
  progress: number;
}

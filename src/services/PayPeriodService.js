// services/PayPeriodService.js - Pay period calculation service
import DateService from './DateService';
import {subDays, subWeeks, subMonths, subYears, addDays, addWeeks, addMonths, addYears, startOfDay, endOfDay} from 'date-fns';

/**
 * PayPeriodService handles all pay period related calculations and logic
 * Provides timezone-aware date parsing and pay period boundary calculations
 *
 * IMPORTANT: Pay periods run from pay date to the day BEFORE the next pay date
 * Example: If pay day is the 15th, period is Feb 15 - Mar 14
 */
class PayPeriodService {
  /**
   * Parse nextPayDate in user's timezone
   */
  static parseNextPayDate(nextPayDateString) {
    if (!nextPayDateString) {
      return null;
    }

    return DateService.parseInTimezone(nextPayDateString);
  }

  /**
   * Calculate the previous pay date based on frequency
   * Uses date-fns for safe month/year arithmetic (handles edge cases like month-end dates)
   */
  static calculatePreviousPayDate(nextPayDate, frequency) {
    if (!nextPayDate || !frequency) {
      return null;
    }

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
        return subYears(date, 1);
      default:
        // Default to monthly
        return subMonths(date, 1);
    }
  }

  /**
   * Calculate the next pay date by advancing based on frequency
   * Uses date-fns for safe month/year arithmetic (handles edge cases like month-end dates)
   */
  static calculateNextPayDate(currentPayDate, frequency) {
    if (!currentPayDate || !frequency) {
      return null;
    }

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
        return addYears(date, 1);
      default:
        // Default to monthly
        return addMonths(date, 1);
    }
  }

  /**
   * Check if today is on or after the next pay date (new period has started)
   */
  static isNewPayPeriod(nextPayDateString) {
    if (!nextPayDateString) {
      return false;
    }

    const nextPayDate = this.parseNextPayDate(nextPayDateString);
    if (!nextPayDate) {
      return false;
    }

    const todayStart = DateService.startOfToday();
    return DateService.isOnOrAfterInTimezone(todayStart, nextPayDate);
  }

  /**
   * Check if we should show "New period started!" message (within 12 hours of pay day)
   */
  static shouldShowNewPeriodMessage(nextPayDateString, frequency) {
    if (!nextPayDateString || !frequency) {
      return false;
    }

    const nextPayDate = this.parseNextPayDate(nextPayDateString);
    if (!nextPayDate) {
      return false;
    }

    const todayStart = DateService.startOfToday();

    // Calculate what the previous pay date should have been
    const previousPayDate = this.calculatePreviousPayDate(
      nextPayDate,
      frequency,
    );
    if (!previousPayDate) {
      return false;
    }

    // Check if today matches the previous pay date (meaning it's pay day)
    const isPayDay = DateService.isSameDayInTimezone(
      todayStart,
      previousPayDate,
    );

    if (!isPayDay) {
      return false;
    }

    // If it's pay day, only show message for 12 hours
    const now = DateService.now();
    const payPeriodStartTime = new Date(todayStart);
    payPeriodStartTime.setHours(0, 0, 0, 0);

    const twelveHoursLater = new Date(payPeriodStartTime);
    twelveHoursLater.setHours(12, 0, 0, 0);

    return now < twelveHoursLater;
  }

  /**
   * Calculate pay period boundaries (start and end dates)
   *
   * CRITICAL: Period ends the day BEFORE the next pay date
   * Example: If next pay date is Mar 15, period ends Mar 14 at 23:59:59
   * This aligns with backend DateService.calculatePayPeriodBoundaries()
   */
  static calculatePayPeriodBoundaries(
    nextPayDateString,
    frequency,
    useCurrentPeriodForNewPeriod = false,
  ) {
    if (!nextPayDateString || !frequency) {
      return null;
    }

    let nextPayDate = this.parseNextPayDate(nextPayDateString);
    if (!nextPayDate) {
      return null;
    }

    let periodStart, periodEnd;

    const isNewPeriod = this.isNewPayPeriod(nextPayDateString);

    if (isNewPeriod && useCurrentPeriodForNewPeriod) {
      // If we're in a new pay period, we need to calculate the CURRENT period
      // which starts today and ends the day before the NEXT pay date
      periodStart = DateService.startOfToday();

      // Advance to the next pay date to get correct period end
      const newNextPayDate = this.calculateNextPayDate(nextPayDate, frequency);
      if (!newNextPayDate) {
        return null;
      }
      const dayBeforeNewNextPay = subDays(newNextPayDate, 1);
      periodEnd = endOfDay(dayBeforeNewNextPay);
    } else {
      // Calculate the previous pay date - this becomes the start of the current period
      const previousPayDate = this.calculatePreviousPayDate(
        nextPayDate,
        frequency,
      );
      if (!previousPayDate) {
        return null;
      }

      periodStart = startOfDay(previousPayDate);

      // Period ends the day BEFORE the next pay date
      const dayBeforeNextPay = subDays(nextPayDate, 1);
      periodEnd = endOfDay(dayBeforeNextPay);
    }

    return {
      start: periodStart,
      end: periodEnd,
      isNewPeriod,
    };
  }

  /**
   * Get pay period status text for UI display
   */
  static getPayPeriodStatusText(nextPayDateString) {
    if (!nextPayDateString) {
      return null;
    }

    const nextPayDate = this.parseNextPayDate(nextPayDateString);
    if (!nextPayDate) {
      return null;
    }

    const today = DateService.startOfToday();
    const daysDiff = DateService.daysDifferenceInTimezone(nextPayDate, today);

    if (daysDiff === 0) {
      return 'Pay day today!';
    }
    if (daysDiff === 1) {
      return 'Pay day tomorrow';
    }
    if (daysDiff > 1) {
      return `${daysDiff} days to pay day`;
    }

    return null;
  }

  /**
   * Advance the next pay date after a pay period transition
   * Returns the new next pay date string in ISO format
   */
  static advanceNextPayDate(currentNextPayDateString, frequency) {
    if (!currentNextPayDateString || !frequency) {
      return null;
    }

    const currentPayDate = this.parseNextPayDate(currentNextPayDateString);
    if (!currentPayDate) {
      return null;
    }

    const newNextPayDate = this.calculateNextPayDate(currentPayDate, frequency);
    if (!newNextPayDate) {
      return null;
    }

    // Return as ISO string for storage
    return newNextPayDate.toISOString();
  }

  /**
   * Filter transactions to current pay period only
   * Returns array of transactions within the current pay period
   */
  static filterTransactionsForCurrentPeriod(
    transactions,
    nextPayDateString,
    frequency,
    transactionType = null,
  ) {
    if (
      !transactions ||
      !Array.isArray(transactions) ||
      !nextPayDateString ||
      !frequency
    ) {
      return [];
    }

    const payPeriodBoundaries = this.calculatePayPeriodBoundaries(
      nextPayDateString,
      frequency,
      true, // useCurrentPeriodForNewPeriod = true
    );

    if (!payPeriodBoundaries) {
      return [];
    }

    const {start: periodStart, end: periodEnd} = payPeriodBoundaries;

    return transactions.filter(transaction => {
      try {
        const transactionDate = new Date(transaction.date);
        if (isNaN(transactionDate.getTime())) {
          return false;
        }

        // Exclude ROLLOVER transactions - they show in transaction list but don't count as expenses
        // ROLLOVER transactions represent moving rollover funds to goals, not actual spending
        if (transaction.type === 'ROLLOVER') {
          return false;
        }

        // Exclude TRANSFER transactions - they show in transaction list but don't count as expenses
        // TRANSFER transactions represent moving funds to savings goals (already counted in totalIncomePayments)
        if (transaction.type === 'TRANSFER') {
          return false;
        }

        // If transaction type filter is specified, apply it
        if (transactionType) {
          const matchesType =
            transactionType === 'EXPENSE'
              ? transaction.type === 'EXPENSE' || !transaction.type
              : transaction.type === transactionType;
          if (!matchesType) {
            return false;
          }
        }

        // Smart filtering to avoid double-counting:
        // - PAID transactions: use payment date (date field)
        // - UPCOMING/OVERDUE: use dueDate
        // - No status (discretionary): use date
        const dateInPeriod =
          transactionDate >= periodStart && transactionDate <= periodEnd;

        const dueDate = transaction.dueDate
          ? new Date(transaction.dueDate)
          : null;
        const dueDateInPeriod =
          dueDate &&
          !isNaN(dueDate.getTime()) &&
          dueDate >= periodStart &&
          dueDate <= periodEnd;

        if (transaction.status === 'PAID') {
          // PAID: only count if payment DATE is in this period
          return dateInPeriod;
        } else if (
          transaction.status === 'UPCOMING' ||
          transaction.status === 'OVERDUE'
        ) {
          // UPCOMING/OVERDUE: only count if dueDate is in this period
          return dueDateInPeriod;
        } else {
          // No status (discretionary): use date
          return dateInPeriod;
        }
      } catch (error) {
        console.error(
          'PayPeriodService: Error filtering transaction:',
          error,
          transaction,
        );
        return false;
      }
    });
  }

  /**
   * Calculate total expenses for current pay period
   * Returns the sum of all expense transactions in the current pay period
   */
  static calculateTotalExpensesForPeriod(
    transactions,
    nextPayDateString,
    frequency,
  ) {
    const periodTransactions = this.filterTransactionsForCurrentPeriod(
      transactions,
      nextPayDateString,
      frequency,
      'EXPENSE',
    );

    return periodTransactions.reduce((sum, transaction) => {
      try {
        const amount = parseFloat(transaction.amount) || 0;
        return sum + amount;
      } catch (error) {
        console.error(
          'PayPeriodService: Error adding transaction amount:',
          error,
          transaction,
        );
        return sum;
      }
    }, 0);
  }

  /**
   * Calculate total expenses for PREVIOUS pay period
   * Used for rollover calculations when transitioning to new pay period
   * Handles all frequency types: weekly, fortnightly, monthly, sixmonths
   */
  static calculateTotalExpensesForPreviousPeriod(
    transactions,
    nextPayDateString,
    frequency,
  ) {
    if (
      !transactions ||
      !Array.isArray(transactions) ||
      !nextPayDateString ||
      !frequency
    ) {
      return 0;
    }

    // Parse the next pay date
    const nextPayDate = this.parseNextPayDate(nextPayDateString);
    if (!nextPayDate) {
      return 0;
    }

    // Calculate previous pay period boundaries
    const previousPayDate = this.calculatePreviousPayDate(
      nextPayDate,
      frequency,
    );
    if (!previousPayDate) {
      return 0;
    }

    // The "previous period" is the period that just ended
    // It runs from previousPayDate to the day BEFORE nextPayDate
    // FIXED: Use proper date-fns functions instead of subtracting 1ms
    const previousPeriodStart = startOfDay(previousPayDate);
    const dayBeforeNextPay = subDays(nextPayDate, 1);
    const previousPeriodEnd = endOfDay(dayBeforeNextPay);

    // Filter transactions for the previous period
    // Use smarter logic to avoid double-counting:
    // - PAID transactions: count by date (payment date)
    // - UPCOMING/OVERDUE: count by dueDate (when it's due)
    const previousPeriodTransactions = transactions.filter(transaction => {
      try {
        const transactionDate = new Date(transaction.date);
        if (isNaN(transactionDate.getTime())) {
          return false;
        }

        // Only include expense transactions (or transactions without type specified)
        // Exclude ROLLOVER and TRANSFER types as they don't represent actual expenses
        const isExpense =
          (transaction.type === 'EXPENSE' || !transaction.type) &&
          transaction.type !== 'ROLLOVER' &&
          transaction.type !== 'TRANSFER';

        if (!isExpense) {
          return false;
        }

        // Check if date and dueDate are in the period
        const dateInPeriod = DateService.isWithinIntervalInTimezone(
          transactionDate,
          {start: previousPeriodStart, end: previousPeriodEnd},
        );

        const dueDate = transaction.dueDate
          ? new Date(transaction.dueDate)
          : null;
        const dueDateInPeriod =
          dueDate &&
          !isNaN(dueDate.getTime()) &&
          DateService.isWithinIntervalInTimezone(dueDate, {
            start: previousPeriodStart,
            end: previousPeriodEnd,
          });

        // Smart filtering to avoid double-counting:
        // - For PAID transactions: only count if payment DATE is in this period
        // - For UPCOMING/OVERDUE: only count if dueDate is in this period
        let included = false;

        if (transaction.status === 'PAID') {
          // PAID: use payment date (the date field)
          included = dateInPeriod;
        } else if (
          transaction.status === 'UPCOMING' ||
          transaction.status === 'OVERDUE'
        ) {
          // UPCOMING/OVERDUE: use dueDate
          included = dueDateInPeriod;
        } else {
          // No status (discretionary transactions): use date
          included = dateInPeriod;
        }

        return included;
      } catch (error) {
        console.error(
          'PayPeriodService: Error filtering previous period transaction:',
          error,
          transaction,
        );
        return false;
      }
    });

    const totalExpenses = previousPeriodTransactions.reduce(
      (sum, transaction) => {
        try {
          const amount = parseFloat(transaction.amount) || 0;
          return sum + amount;
        } catch (error) {
          console.error(
            'PayPeriodService: Error adding previous period transaction amount:',
            error,
            transaction,
          );
          return sum;
        }
      },
      0,
    );

    return totalExpenses;
  }

  /**
   * Calculate total additional income for current pay period
   * Returns the sum of all income transactions in the current pay period
   */
  static calculateTotalAdditionalIncomeForPeriod(
    transactions,
    nextPayDateString,
    frequency,
  ) {
    const periodTransactions = this.filterTransactionsForCurrentPeriod(
      transactions,
      nextPayDateString,
      frequency,
      'INCOME',
    );

    return periodTransactions.reduce((sum, transaction) => {
      try {
        const amount = parseFloat(transaction.amount) || 0;
        return sum + amount;
      } catch (error) {
        console.error(
          'PayPeriodService: Error adding income transaction amount:',
          error,
          transaction,
        );
        return sum;
      }
    }, 0);
  }

  /**
   * Check if today is the day before pay period ends (rollover availability)
   * Note: The day before pay period ends is 2 days before the next pay date
   * (since period ends the day before pay date)
   */
  static isRolloverAvailable(nextPayDateString, lastRolloverDate = null) {
    if (!nextPayDateString) {
      return false;
    }

    const nextPayDate = this.parseNextPayDate(nextPayDateString);
    if (!nextPayDate) {
      return false;
    }

    const today = DateService.startOfToday();
    const tomorrow = addDays(today, 1);

    // Check if tomorrow is the pay date (today is day before pay date)
    const isDayBeforePayday = DateService.isSameDayInTimezone(
      tomorrow,
      nextPayDate,
    );

    // Also check we haven't already processed rollover for this period
    const hasRecentRollover =
      lastRolloverDate &&
      Math.abs(new Date(lastRolloverDate) - nextPayDate) <
        2 * 24 * 60 * 60 * 1000; // Within 2 days

    return isDayBeforePayday && !hasRecentRollover;
  }

  /**
   * Check if we need to transition to a new pay period and return the new pay date
   * Returns { shouldTransition: boolean, newNextPayDate: string | null }
   */
  static checkPayPeriodTransition(currentNextPayDateString, frequency) {
    if (!currentNextPayDateString || !frequency) {
      return {shouldTransition: false, newNextPayDate: null};
    }

    const nextPayDate = this.parseNextPayDate(currentNextPayDateString);
    if (!nextPayDate) {
      return {shouldTransition: false, newNextPayDate: null};
    }

    const todayStart = DateService.startOfToday();

    // Check if today is on or after the pay date (new period has started)
    if (DateService.isOnOrAfterInTimezone(todayStart, nextPayDate)) {
      // Calculate the next pay date based on frequency
      const newNextPayDate = this.calculateNextPayDate(nextPayDate, frequency);
      if (!newNextPayDate) {
        return {shouldTransition: false, newNextPayDate: null};
      }

      // Don't transition if the dates are the same (prevents infinite loop)
      const currentDateStr = currentNextPayDateString.includes('T')
        ? currentNextPayDateString.split('T')[0]
        : currentNextPayDateString;
      const newDateStr = newNextPayDate.toISOString().split('T')[0];

      if (currentDateStr === newDateStr) {
        return {shouldTransition: false, newNextPayDate: null};
      }

      return {
        shouldTransition: true,
        newNextPayDate: newNextPayDate.toISOString(),
      };
    }

    return {shouldTransition: false, newNextPayDate: null};
  }
}

export default PayPeriodService;

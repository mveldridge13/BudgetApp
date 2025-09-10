// services/PayPeriodService.js - Pay period calculation service

/**
 * PayPeriodService handles all pay period related calculations and logic
 * Provides timezone-aware date parsing and pay period boundary calculations
 */
class PayPeriodService {
  /**
   * Parse nextPayDate as local date (ignoring timezone in stored data)
   */
  static parseNextPayDate(nextPayDateString) {
    if (!nextPayDateString) {
      return null;
    }

    let nextPayDate;
    if (nextPayDateString.includes('T')) {
      const dateOnly = nextPayDateString.split('T')[0];
      nextPayDate = new Date(dateOnly + 'T12:00:00');
    } else {
      nextPayDate = new Date(nextPayDateString + 'T12:00:00');
    }

    return nextPayDate;
  }

  /**
   * Calculate the previous pay date based on frequency
   */
  static calculatePreviousPayDate(nextPayDate, frequency) {
    if (!nextPayDate || !frequency) {
      return null;
    }

    const previousPayDate = new Date(nextPayDate);
    const freq = frequency.toLowerCase();

    switch (freq) {
      case 'weekly':
        previousPayDate.setDate(previousPayDate.getDate() - 7);
        break;
      case 'fortnightly':
        previousPayDate.setDate(previousPayDate.getDate() - 14);
        break;
      case 'monthly':
        previousPayDate.setMonth(previousPayDate.getMonth() - 1);
        break;
      case 'sixmonths':
        previousPayDate.setMonth(previousPayDate.getMonth() - 6);
        break;
      case 'yearly':
        previousPayDate.setFullYear(previousPayDate.getFullYear() - 1);
        break;
      default:
        // Default to monthly
        previousPayDate.setMonth(previousPayDate.getMonth() - 1);
        break;
    }

    return previousPayDate;
  }

  /**
   * Calculate the next pay date by advancing based on frequency
   */
  static calculateNextPayDate(currentPayDate, frequency) {
    if (!currentPayDate || !frequency) {
      return null;
    }

    const nextPayDate = new Date(currentPayDate);
    const freq = frequency.toLowerCase();

    switch (freq) {
      case 'weekly':
        nextPayDate.setDate(nextPayDate.getDate() + 7);
        break;
      case 'fortnightly':
        nextPayDate.setDate(nextPayDate.getDate() + 14);
        break;
      case 'monthly':
        nextPayDate.setMonth(nextPayDate.getMonth() + 1);
        break;
      case 'sixmonths':
        nextPayDate.setMonth(nextPayDate.getMonth() + 6);
        break;
      case 'yearly':
        nextPayDate.setFullYear(nextPayDate.getFullYear() + 1);
        break;
      default:
        // Default to monthly
        nextPayDate.setMonth(nextPayDate.getMonth() + 1);
        break;
    }

    return nextPayDate;
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

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const payDateStart = new Date(
      nextPayDate.getFullYear(),
      nextPayDate.getMonth(),
      nextPayDate.getDate(),
    );

    return todayStart >= payDateStart;
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

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Calculate what the previous pay date should have been
    const previousPayDate = this.calculatePreviousPayDate(
      nextPayDate,
      frequency,
    );
    if (!previousPayDate) {
      return false;
    }

    const previousPayDateStart = new Date(
      previousPayDate.getFullYear(),
      previousPayDate.getMonth(),
      previousPayDate.getDate(),
    );

    // Check if today matches the previous pay date (meaning it's pay day)
    const isPayDay = todayStart.getTime() === previousPayDateStart.getTime();

    if (!isPayDay) {
      return false;
    }

    // If it's pay day, only show message for 12 hours
    const payPeriodStartTime = new Date(todayStart);
    payPeriodStartTime.setHours(0, 0, 0, 0);

    const twelveHoursLater = new Date(payPeriodStartTime);
    twelveHoursLater.setHours(12, 0, 0, 0);

    return now < twelveHoursLater;
  }

  /**
   * Calculate pay period boundaries (start and end dates)
   */
  static calculatePayPeriodBoundaries(
    nextPayDateString,
    frequency,
    useCurrentPeriodForNewPeriod = false,
  ) {
    if (!nextPayDateString || !frequency) {
      return null;
    }

    const nextPayDate = this.parseNextPayDate(nextPayDateString);
    if (!nextPayDate) {
      return null;
    }

    let periodStart, periodEnd;

    // Set period end to the next pay date
    periodEnd = new Date(nextPayDate);
    periodEnd.setHours(23, 59, 59, 999);

    const isNewPeriod = this.isNewPayPeriod(nextPayDateString);

    if (isNewPeriod && useCurrentPeriodForNewPeriod) {
      // If we're in a new pay period, period starts TODAY (not from previous pay date)
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      periodStart = new Date(todayStart);
      periodStart.setHours(0, 0, 0, 0);
    } else {
      // Calculate the previous pay date - this becomes the start of the current period
      const previousPayDate = this.calculatePreviousPayDate(
        nextPayDate,
        frequency,
      );
      if (!previousPayDate) {
        return null;
      }

      periodStart = new Date(previousPayDate);
      periodStart.setHours(0, 0, 0, 0);
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

    const today = new Date();
    const timeDiff = nextPayDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

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

        const inPeriod =
          transactionDate >= periodStart && transactionDate <= periodEnd;

        // If transaction type filter is specified, apply it
        if (transactionType) {
          const matchesType =
            transactionType === 'EXPENSE'
              ? transaction.type === 'EXPENSE' || !transaction.type
              : transaction.type === transactionType;
          return inPeriod && matchesType;
        }

        return inPeriod;
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
    // It runs from previousPayDate to nextPayDate (exclusive)
    const previousPeriodStart = previousPayDate;
    const previousPeriodEnd = new Date(nextPayDate.getTime() - 1); // Subtract 1ms to make it exclusive

    console.log('🔄 Previous period expense calculation:', {
      frequency,
      nextPayDate: nextPayDate.toISOString(),
      previousPayDate: previousPayDate.toISOString(),
      previousPeriodStart: previousPeriodStart.toISOString(),
      previousPeriodEnd: previousPeriodEnd.toISOString(),
      totalTransactions: transactions.length,
    });

    // Filter transactions for the previous period
    const previousPeriodTransactions = transactions.filter(transaction => {
      try {
        const transactionDate = new Date(transaction.date);
        if (isNaN(transactionDate.getTime())) {
          return false;
        }

        const inPreviousPeriod =
          transactionDate >= previousPeriodStart &&
          transactionDate <= previousPeriodEnd;

        // Only include expense transactions (or transactions without type specified)
        const isExpense = transaction.type === 'EXPENSE' || !transaction.type;

        const included = inPreviousPeriod && isExpense;

        if (included) {
          console.log('🔄 Including transaction in previous period:', {
            date: transaction.date,
            amount: transaction.amount,
            type: transaction.type,
          });
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

    console.log('🔄 Previous period expense total:', {
      transactionsInPeriod: previousPeriodTransactions.length,
      totalExpenses,
    });

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
   */
  static isRolloverAvailable(nextPayDateString, lastRolloverDate = null) {
    if (!nextPayDateString) {
      return false;
    }

    const nextPayDate = this.parseNextPayDate(nextPayDateString);
    if (!nextPayDate) {
      return false;
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if tomorrow is the pay date (today is day before)
    const isDayBeforePayday =
      tomorrow.toDateString() === nextPayDate.toDateString();

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

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const payDateStart = new Date(
      nextPayDate.getFullYear(),
      nextPayDate.getMonth(),
      nextPayDate.getDate(),
    );

    // Check if today is on or after the pay date (new period has started)
    if (todayStart >= payDateStart) {
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

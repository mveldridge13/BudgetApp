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
}

export default PayPeriodService;

// services/DateService.js - Global timezone-aware date operations service
import {startOfDay, isWithinInterval, format} from 'date-fns';

/**
 * DateService handles all timezone-aware date operations
 * Provides centralized timezone handling for the frontend application
 */
class DateService {
  // Default timezone - will be set from user profile
  static defaultTimezone = 'UTC';
  static isInitialized = false;

  /**
   * Initialize timezone from user profile
   */
  static initializeFromProfile(userProfile) {
    if (userProfile?.timezone) {
      this.setTimezone(userProfile.timezone);
      this.isInitialized = true;
      console.log(
        'DateService initialized with timezone:',
        userProfile.timezone,
      );
    } else {
      console.warn(
        'No timezone in user profile, using default:',
        this.defaultTimezone,
      );
    }
  }

  /**
   * Set the user's timezone
   */
  static setTimezone(timezone) {
    // Validate timezone
    try {
      Intl.DateTimeFormat(undefined, {timeZone: timezone});
      this.defaultTimezone = timezone;
    } catch (error) {
      console.warn(
        'Invalid timezone provided, falling back to UTC:',
        timezone,
      );
      this.defaultTimezone = 'UTC';
    }
  }

  /**
   * Auto-detect user's timezone using browser/device timezone
   * Returns detected timezone string (e.g., "Australia/Sydney", "America/New_York")
   */
  static detectUserTimezone() {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('🌍 DateService: Auto-detected user timezone:', timezone);
      return timezone;
    } catch (error) {
      console.warn(
        '🌍 DateService: Failed to detect timezone, using UTC fallback:',
        error
      );
      return 'UTC'; // Universal fallback - no geographic assumptions
    }
  }

  /**
   * Get the current timezone
   */
  static getTimezone() {
    return this.defaultTimezone;
  }

  /**
   * Check if DateService has been initialized with user timezone
   */
  static isReady() {
    return this.isInitialized;
  }

  /**
   * Get current date in user's timezone
   */
  static now() {
    // Just return current local date - backend handles timezone conversion
    return new Date();
  }

  /**
   * Get start of today in user's timezone
   */
  static startOfToday() {
    const now = new Date();
    return startOfDay(now);
  }

  /**
   * Convert a date to user's timezone
   */
  static toTimezone(date) {
    if (!date) {
      return null;
    }
    // Just return the date as-is, backend handles timezone conversion
    return date instanceof Date ? date : new Date(date);
  }

  /**
   * Convert a date from user's timezone to UTC
   */
  static toUtc(date) {
    if (!date) {
      return null;
    }
    // Just return the date as-is, backend handles timezone conversion
    return date instanceof Date ? date : new Date(date);
  }

  /**
   * Parse a date string as if it's in the user's timezone
   */
  static parseInTimezone(dateString) {
    if (!dateString) {
      return null;
    }

    try {
      // Create date - backend handles timezone conversion
      if (dateString.includes('T')) {
        return new Date(dateString);
      } else {
        return new Date(dateString + 'T12:00:00');
      }
    } catch (error) {
      console.error('DateService: Error parsing date:', dateString, error);
      return null;
    }
  }

  /**
   * Get start of day for a date in user's timezone
   */
  static startOfDayInTimezone(date) {
    if (!date) {
      return null;
    }
    const dateInTimezone = this.toTimezone(date);
    return startOfDay(dateInTimezone);
  }

  /**
   * Check if a date is within an interval, both in user's timezone
   */
  static isWithinIntervalInTimezone(date, interval) {
    if (!date || !interval?.start || !interval?.end) {
      return false;
    }

    const dateInTimezone = this.startOfDayInTimezone(date);
    const startInTimezone = this.startOfDayInTimezone(interval.start);
    const endInTimezone = this.startOfDayInTimezone(interval.end);

    return isWithinInterval(dateInTimezone, {
      start: startInTimezone,
      end: endInTimezone,
    });
  }

  /**
   * Compare two dates by day in user's timezone
   */
  static isSameDayInTimezone(date1, date2) {
    if (!date1 || !date2) {
      return false;
    }

    const date1InTimezone = this.startOfDayInTimezone(date1);
    const date2InTimezone = this.startOfDayInTimezone(date2);

    return date1InTimezone.getTime() === date2InTimezone.getTime();
  }

  /**
   * Check if date1 is >= date2 by day in user's timezone
   */
  static isOnOrAfterInTimezone(date1, date2) {
    if (!date1 || !date2) {
      return false;
    }

    const date1InTimezone = this.startOfDayInTimezone(date1);
    const date2InTimezone = this.startOfDayInTimezone(date2);

    return date1InTimezone >= date2InTimezone;
  }

  /**
   * Format a date in user's timezone
   */
  static formatInTimezone(date, formatString = 'yyyy-MM-dd') {
    if (!date) {
      return null;
    }
    // Format the date as-is
    const dateObj = date instanceof Date ? date : new Date(date);
    return format(dateObj, formatString);
  }

  /**
   * Calculate days difference between two dates in user's timezone
   */
  static daysDifferenceInTimezone(date1, date2) {
    if (!date1 || !date2) {
      return null;
    }

    const date1InTimezone = this.startOfDayInTimezone(date1);
    const date2InTimezone = this.startOfDayInTimezone(date2);

    const timeDiff = date1InTimezone.getTime() - date2InTimezone.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Prepare a date for backend submission
   * Converts local date to UTC and formats as ISO string
   */
  static prepareForBackend(date) {
    if (!date) {
      return null;
    }

    // Simple conversion - let backend handle timezone
    return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  }

  /**
   * Create a date object that represents "today" in user's timezone
   * Useful for date pickers and transaction creation
   */
  static createTodayInTimezone() {
    // Just return a regular Date for today - let backend handle timezone conversion
    return new Date();
  }

  /**
   * Create a date object from date picker input, accounting for timezone
   */
  static createDateFromPicker(pickerDate) {
    if (!pickerDate) {
      return null;
    }

    // Date picker gives us a local date - return as-is, backend handles timezone
    return pickerDate instanceof Date ? pickerDate : new Date(pickerDate);
  }
}

export default DateService;

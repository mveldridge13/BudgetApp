// services/CurrencyService.js - Frontend currency detection and utilities
import DateService from './DateService';

/**
 * CurrencyService handles currency detection and basic formatting
 * Works with the backend CurrencyService for comprehensive currency operations
 */
class CurrencyService {
  static defaultCurrency = 'USD';
  static isInitialized = false;

  // Simplified timezone to currency mapping for frontend detection
  static timezoneToCountryMap = new Map([
    // Australia & New Zealand
    ['Australia/Sydney', 'AU'],
    ['Australia/Melbourne', 'AU'],
    ['Australia/Brisbane', 'AU'],
    ['Australia/Perth', 'AU'],
    ['Australia/Adelaide', 'AU'],
    ['Pacific/Auckland', 'NZ'],

    // Asia-Pacific
    ['Asia/Manila', 'PH'],
    ['Asia/Tokyo', 'JP'],
    ['Asia/Shanghai', 'CN'],
    ['Asia/Kolkata', 'IN'],
    ['Asia/Singapore', 'SG'],
    ['Asia/Bangkok', 'TH'],
    ['Asia/Kuala_Lumpur', 'MY'],
    ['Asia/Jakarta', 'ID'],
    ['Asia/Ho_Chi_Minh', 'VN'],
    ['Asia/Seoul', 'KR'],
    ['Asia/Hong_Kong', 'HK'],
    ['Asia/Taipei', 'TW'],

    // Americas
    ['America/New_York', 'US'],
    ['America/Los_Angeles', 'US'],
    ['America/Chicago', 'US'],
    ['America/Denver', 'US'],
    ['America/Phoenix', 'US'],
    ['America/Anchorage', 'US'],
    ['Pacific/Honolulu', 'US'],
    ['America/Toronto', 'CA'],
    ['America/Vancouver', 'CA'],
    ['America/Montreal', 'CA'],
    ['America/Calgary', 'CA'],
    ['America/Sao_Paulo', 'BR'],
    ['America/Mexico_City', 'MX'],
    ['America/Buenos_Aires', 'AR'],
    ['America/Santiago', 'CL'],
    ['America/Bogota', 'CO'],
    ['America/Lima', 'PE'],

    // Europe
    ['Europe/London', 'GB'],
    ['Europe/Berlin', 'DE'],
    ['Europe/Paris', 'FR'],
    ['Europe/Madrid', 'ES'],
    ['Europe/Rome', 'IT'],
    ['Europe/Amsterdam', 'NL'],
    ['Europe/Brussels', 'BE'],
    ['Europe/Vienna', 'AT'],
    ['Europe/Dublin', 'IE'],
    ['Europe/Athens', 'GR'],
    ['Europe/Lisbon', 'PT'],
    ['Europe/Helsinki', 'FI'],
    ['Europe/Oslo', 'NO'],
    ['Europe/Stockholm', 'SE'],
    ['Europe/Copenhagen', 'DK'],
    ['Europe/Warsaw', 'PL'],
    ['Europe/Prague', 'CZ'],
    ['Europe/Budapest', 'HU'],
    ['Europe/Zurich', 'CH'],
    ['Europe/Moscow', 'RU'],
    ['Europe/Istanbul', 'TR'],

    // Middle East & Africa
    ['Asia/Dubai', 'AE'],
    ['Asia/Riyadh', 'SA'],
    ['Asia/Jerusalem', 'IL'],
    ['Africa/Johannesburg', 'ZA'],
    ['Africa/Cairo', 'EG'],
    ['Africa/Lagos', 'NG'],
    ['Africa/Nairobi', 'KE'],
    ['Africa/Accra', 'GH'],
  ]);

  // Simplified country to currency mapping for frontend detection
  static countryToCurrencyMap = new Map([
    // Major currencies
    ['AU', 'AUD'],
    ['US', 'USD'],
    ['GB', 'GBP'],
    ['CA', 'CAD'],
    ['JP', 'JPY'],
    ['CN', 'CNY'],
    ['IN', 'INR'],
    ['NZ', 'NZD'],

    // Euro countries
    ['DE', 'EUR'],
    ['FR', 'EUR'],
    ['ES', 'EUR'],
    ['IT', 'EUR'],
    ['NL', 'EUR'],
    ['BE', 'EUR'],
    ['AT', 'EUR'],
    ['IE', 'EUR'],
    ['GR', 'EUR'],
    ['PT', 'EUR'],
    ['FI', 'EUR'],

    // Other currencies
    ['PH', 'PHP'],
    ['SG', 'SGD'],
    ['TH', 'THB'],
    ['MY', 'MYR'],
    ['ID', 'IDR'],
    ['VN', 'VND'],
    ['KR', 'KRW'],
    ['HK', 'HKD'],
    ['TW', 'TWD'],
    ['BR', 'BRL'],
    ['MX', 'MXN'],
    ['AR', 'ARS'],
    ['CL', 'CLP'],
    ['CO', 'COP'],
    ['PE', 'PEN'],
    ['CH', 'CHF'],
    ['NO', 'NOK'],
    ['SE', 'SEK'],
    ['DK', 'DKK'],
    ['PL', 'PLN'],
    ['CZ', 'CZK'],
    ['HU', 'HUF'],
    ['RU', 'RUB'],
    ['TR', 'TRY'],
    ['AE', 'AED'],
    ['SA', 'SAR'],
    ['IL', 'ILS'],
    ['ZA', 'ZAR'],
    ['EG', 'EGP'],
    ['NG', 'NGN'],
    ['KE', 'KES'],
    ['GH', 'GHS'],
  ]);

  /**
   * Initialize currency from user profile
   */
  static initializeFromProfile(userProfile) {
    if (userProfile?.currency) {
      this.setCurrency(userProfile.currency);
      this.isInitialized = true;
      console.log('💰 CurrencyService initialized with currency:', userProfile.currency);
    } else {
      console.warn('💰 No currency in user profile, using default:', this.defaultCurrency);
    }
  }

  /**
   * Set the user's currency
   */
  static setCurrency(currency) {
    if (currency && typeof currency === 'string' && currency.length === 3) {
      this.defaultCurrency = currency.toUpperCase();
    } else {
      console.warn('💰 Invalid currency provided, falling back to USD:', currency);
      this.defaultCurrency = 'USD';
    }
  }

  /**
   * Auto-detect user's currency based on timezone
   * Returns detected currency code (e.g., "USD", "EUR", "AUD")
   */
  static detectUserCurrency() {
    try {
      // First, try to detect timezone
      const timezone = DateService.detectUserTimezone();
      console.log('💰 CurrencyService: Using timezone for detection:', timezone);

      // Map timezone to country
      const countryCode = this.timezoneToCountryMap.get(timezone);
      if (!countryCode) {
        console.log('💰 CurrencyService: Unknown timezone, using USD fallback:', timezone);
        return 'USD';
      }

      // Map country to currency
      const currency = this.countryToCurrencyMap.get(countryCode);
      if (!currency) {
        console.log('💰 CurrencyService: Unknown country, using USD fallback:', countryCode);
        return 'USD';
      }

      console.log(`💰 CurrencyService: Auto-detected currency: ${currency} (${countryCode} from ${timezone})`);
      return currency;
    } catch (error) {
      console.warn('💰 CurrencyService: Failed to detect currency, using USD fallback:', error);
      return 'USD';
    }
  }

  /**
   * Get the current currency
   */
  static getCurrency() {
    return this.defaultCurrency;
  }

  /**
   * Check if CurrencyService has been initialized with user currency
   */
  static isReady() {
    return this.isInitialized;
  }

  /**
   * Simple currency formatting using Intl API
   * For more complex formatting, backend CurrencyService should be used
   */
  static formatAmount(amount, currencyCode = null) {
    const currency = currencyCode || this.defaultCurrency;

    try {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: this.getDecimalPlaces(currency),
        maximumFractionDigits: this.getDecimalPlaces(currency),
      });

      return formatter.format(amount);
    } catch (error) {
      console.warn('💰 CurrencyService: Error formatting currency, using fallback:', error);
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  /**
   * Get decimal places for common currencies
   */
  static getDecimalPlaces(currencyCode) {
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'HUF', 'ISK'];
    return zeroDecimalCurrencies.includes(currencyCode) ? 0 : 2;
  }

  /**
   * Validate if a currency code looks valid
   */
  static isValidCurrencyCode(currencyCode) {
    return (
      currencyCode &&
      typeof currencyCode === 'string' &&
      currencyCode.length === 3 &&
      /^[A-Z]{3}$/.test(currencyCode)
    );
  }

  /**
   * Get currency info for display
   */
  static getCurrencyInfo(currencyCode = null) {
    const currency = currencyCode || this.defaultCurrency;
    return {
      code: currency,
      decimalPlaces: this.getDecimalPlaces(currency),
    };
  }
}

export default CurrencyService;

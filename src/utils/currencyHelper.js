// utils/currencyHelper.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default currency configuration
const DEFAULT_CURRENCY = 'AUD';

// Currency configurations
const CURRENCY_CONFIG = {
  AUD: { symbol: '$', code: 'AUD', name: 'Australian Dollar' },
  USD: { symbol: '$', code: 'USD', name: 'US Dollar' },
  EUR: { symbol: '¬', code: 'EUR', name: 'Euro' },
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound' },
  CAD: { symbol: '$', code: 'CAD', name: 'Canadian Dollar' },
  JPY: { symbol: '¥', code: 'JPY', name: 'Japanese Yen' },
  NZD: { symbol: '$', code: 'NZD', name: 'New Zealand Dollar' },
};

// Cache for current currency
let currentCurrency = null;

/**
 * Get the current currency setting from app settings
 */
export const getCurrentCurrency = async () => {
  try {
    if (currentCurrency) {
      return currentCurrency;
    }

    const appSettings = await AsyncStorage.getItem('appSettings');
    if (appSettings) {
      const settings = JSON.parse(appSettings);
      currentCurrency = settings.currency || DEFAULT_CURRENCY;
    } else {
      currentCurrency = DEFAULT_CURRENCY;
    }

    return currentCurrency;
  } catch (error) {
    console.error('Error getting current currency:', error);
    return DEFAULT_CURRENCY;
  }
};

/**
 * Set the current currency (used when settings change)
 */
export const setCurrentCurrency = (currency) => {
  if (CURRENCY_CONFIG[currency]) {
    currentCurrency = currency;
  }
};

/**
 * Format amount as currency using current currency setting
 */
export const formatCurrency = async (amount, currency = null) => {
  try {
    const currencyCode = currency || await getCurrentCurrency();
    
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(amount || 0);
  } catch (error) {
    console.error('Error formatting currency:', error);
    // Fallback formatting
    return `$${(amount || 0).toFixed(2)}`;
  }
};

/**
 * Synchronous currency formatting (when currency is already known)
 */
export const formatCurrencySync = (amount, currency = DEFAULT_CURRENCY) => {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount || 0);
  } catch (error) {
    console.error('Error formatting currency sync:', error);
    // Fallback formatting
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG[DEFAULT_CURRENCY];
    return `${config.symbol}${(amount || 0).toFixed(2)}`;
  }
};

/**
 * Get currency symbol for current currency
 */
export const getCurrencySymbol = async (currency = null) => {
  try {
    const currencyCode = currency || await getCurrentCurrency();
    const config = CURRENCY_CONFIG[currencyCode];
    return config ? config.symbol : '$';
  } catch (error) {
    console.error('Error getting currency symbol:', error);
    return '$';
  }
};

/**
 * Get currency symbol synchronously
 */
export const getCurrencySymbolSync = (currency = DEFAULT_CURRENCY) => {
  const config = CURRENCY_CONFIG[currency];
  return config ? config.symbol : '$';
};

/**
 * Parse currency string to number
 */
export const parseCurrency = (currencyString) => {
  try {
    if (typeof currencyString === 'number') {
      return currencyString;
    }
    
    // Remove currency symbols and spaces, parse as float
    const numericString = String(currencyString)
      .replace(/[^\d.-]/g, '')
      .trim();
      
    const parsed = parseFloat(numericString);
    return isNaN(parsed) ? 0 : parsed;
  } catch (error) {
    console.error('Error parsing currency:', error);
    return 0;
  }
};

/**
 * Get all available currencies
 */
export const getAvailableCurrencies = () => {
  return Object.values(CURRENCY_CONFIG);
};

/**
 * Validate currency code
 */
export const isValidCurrency = (currency) => {
  return currency && CURRENCY_CONFIG.hasOwnProperty(currency);
};

// Initialize currency on app start
export const initializeCurrency = async () => {
  await getCurrentCurrency();
};
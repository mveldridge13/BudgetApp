// utils/expenseBreakdownCalculator.js - Expense breakdown calculator with cache-first approach

import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache configuration
const CACHE_KEY = 'expense_breakdown_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// In-memory cache for immediate access
let memoryCache = {
  data: null,
  timestamp: null,
  transactionHash: null,
};

/**
 * Generates a simple hash for transactions to detect changes
 */
const generateTransactionHash = transactions => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return 'empty';
  }

  // Create hash based on transaction IDs, amounts, and recurrence
  const hashString = transactions
    .map(t => `${t.id}_${t.amount}_${t.recurrence}`)
    .sort()
    .join('|');

  return hashString.length.toString() + '_' + hashString.slice(0, 10);
};

/**
 * Core expense breakdown calculation logic
 */
const calculateExpenseBreakdown = transactions => {
  try {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return {
        committed: 0,
        discretionary: 0,
        total: 0,
        breakdown: {
          committedTransactions: [],
          discretionaryTransactions: [],
        },
      };
    }

    // Filter expense transactions only
    const expenseTransactions = transactions.filter(
      t => !t.type || t.type === 'EXPENSE',
    );

    // Categorize transactions
    const committedTransactions = expenseTransactions.filter(
      t => t.recurrence && t.recurrence !== 'none',
    );

    const discretionaryTransactions = expenseTransactions.filter(
      t => !t.recurrence || t.recurrence === 'none',
    );

    // Calculate totals
    const committed = committedTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );
    const discretionary = discretionaryTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );
    const total = committed + discretionary;

    console.log('💰 Expense breakdown calculated:', {
      committed,
      discretionary,
      total,
      committedCount: committedTransactions.length,
      discretionaryCount: discretionaryTransactions.length,
    });

    return {
      committed,
      discretionary,
      total,
      breakdown: {
        committedTransactions,
        discretionaryTransactions,
      },
    };
  } catch (error) {
    console.error('💰 Expense breakdown calculation error:', error);
    return {
      committed: 0,
      discretionary: 0,
      total: 0,
      breakdown: {
        committedTransactions: [],
        discretionaryTransactions: [],
      },
    };
  }
};

/**
 * Cache-first expense breakdown with background sync
 */
const getExpenseBreakdown = async transactions => {
  try {
    const transactionHash = generateTransactionHash(transactions);
    const now = Date.now();

    // Check memory cache first (fastest)
    if (
      memoryCache.data &&
      memoryCache.transactionHash === transactionHash &&
      memoryCache.timestamp &&
      now - memoryCache.timestamp < CACHE_TTL
    ) {
      console.log('💰 Using memory cache for expense breakdown');
      return memoryCache.data;
    }

    // Check persistent cache (AsyncStorage)
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (
          parsed.transactionHash === transactionHash &&
          parsed.timestamp &&
          now - parsed.timestamp < CACHE_TTL
        ) {
          console.log('💰 Using persistent cache for expense breakdown');

          // Update memory cache
          memoryCache = {
            data: parsed.data,
            timestamp: parsed.timestamp,
            transactionHash,
          };

          return parsed.data;
        }
      }
    } catch (cacheError) {
      console.log(
        '💰 Cache read error, continuing with calculation:',
        cacheError.message,
      );
    }

    // Calculate fresh data
    console.log('💰 Calculating fresh expense breakdown');
    const freshData = calculateExpenseBreakdown(transactions);

    // Update both caches in background (don't wait)
    const cacheData = {
      data: freshData,
      timestamp: now,
      transactionHash,
    };

    // Update memory cache immediately
    memoryCache = cacheData;

    // Update persistent cache in background
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData)).catch(error =>
      console.log('💰 Cache write error:', error.message),
    );

    return freshData;
  } catch (error) {
    console.error('💰 getExpenseBreakdown error:', error);
    // Fallback to direct calculation
    return calculateExpenseBreakdown(transactions);
  }
};

/**
 * Synchronous version for immediate use (uses memory cache only)
 */
const getExpenseBreakdownSync = transactions => {
  const transactionHash = generateTransactionHash(transactions);
  const now = Date.now();

  // Check memory cache
  if (
    memoryCache.data &&
    memoryCache.transactionHash === transactionHash &&
    memoryCache.timestamp &&
    now - memoryCache.timestamp < CACHE_TTL
  ) {
    return memoryCache.data;
  }

  // Calculate and cache immediately
  const freshData = calculateExpenseBreakdown(transactions);

  memoryCache = {
    data: freshData,
    timestamp: now,
    transactionHash,
  };

  return freshData;
};

/**
 * Clear all caches (useful for testing or data reset)
 */
const clearExpenseBreakdownCache = async () => {
  try {
    memoryCache = {
      data: null,
      timestamp: null,
      transactionHash: null,
    };

    await AsyncStorage.removeItem(CACHE_KEY);
    console.log('💰 Expense breakdown cache cleared');
  } catch (error) {
    console.error('💰 Cache clear error:', error);
  }
};

export {
  getExpenseBreakdown,
  getExpenseBreakdownSync,
  clearExpenseBreakdownCache,
  calculateExpenseBreakdown,
};

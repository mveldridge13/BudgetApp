// services/TransactionCache.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = 'transactions_cache_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (transactions change frequently)

class TransactionCache {
  getCacheKey(userId) {
    if (!userId) {
      throw new Error(
        'TransactionCache: userId is required for user-specific cache',
      );
    }
    return `${CACHE_KEY_PREFIX}${userId}`;
  }

  /**
   * Get cached transaction data for a specific user
   * @param {string} userId - ID of the user
   * @returns {Promise<{data: array, timestamp: number, age: number, isStale: boolean} | null>}
   */
  async get(userId) {
    try {
      const cacheKey = this.getCacheKey(userId);
      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) {
        return null;
      }

      const {data, timestamp} = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const isStale = age > CACHE_TTL;

      console.log('💳 TransactionCache: Retrieved cache', {
        userId,
        age: Math.round(age / 1000), // seconds
        isStale,
        transactionCount: data?.length || 0,
      });

      return {
        data: data || [],
        timestamp,
        age,
        isStale,
      };
    } catch (error) {
      console.error('💳 TransactionCache: Get error:', error);
      return null;
    }
  }

  /**
   * Set transaction data in cache for a specific user
   * @param {string} userId - ID of the user
   * @param {array} data - Transaction data to cache
   * @returns {Promise<boolean>}
   */
  async set(userId, data) {
    try {
      const cacheKey = this.getCacheKey(userId);
      const cacheData = {
        data: data || [],
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('💳 TransactionCache: Data cached successfully', {
        userId,
        timestamp: cacheData.timestamp,
        transactionCount: data?.length || 0,
        dataSize: JSON.stringify(data).length,
      });
      return true;
    } catch (error) {
      console.error('💳 TransactionCache: Set error:', error);
      return false;
    }
  }

  /**
   * Clear transaction cache for a specific user
   * @param {string} userId - ID of the user
   * @returns {Promise<boolean>}
   */
  async clear(userId) {
    try {
      const cacheKey = this.getCacheKey(userId);
      await AsyncStorage.removeItem(cacheKey);
      console.log('💳 TransactionCache: Cache cleared for user', userId);
      return true;
    } catch (error) {
      console.error('💳 TransactionCache: Clear error:', error);
      return false;
    }
  }

  /**
   * Check if cached data exists and is fresh for a specific user
   * @param {string} userId - ID of the user
   * @returns {Promise<boolean>}
   */
  async isFresh(userId) {
    const cached = await this.get(userId);
    return cached && !cached.isStale;
  }

  /**
   * Get cache age in seconds
   * @param {string} userId - ID of the user
   * @returns {Promise<number | null>}
   */
  async getAge(userId) {
    const cached = await this.get(userId);
    return cached ? Math.round(cached.age / 1000) : null;
  }

  /**
   * Invalidate cache by setting timestamp to 0
   * This keeps the data but marks it as stale for background refresh
   * @param {string} userId - ID of the user
   * @returns {Promise<boolean>}
   */
  async invalidate(userId) {
    try {
      const cacheKey = this.getCacheKey(userId);
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const {data} = JSON.parse(cached);
        const cacheData = {
          data: data || [],
          timestamp: 0, // Mark as stale but keep data
        };

        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('💳 TransactionCache: Cache invalidated for user', userId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('💳 TransactionCache: Invalidate error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics for debugging
   * @param {string} userId - ID of the user
   * @returns {Promise<object>}
   */
  async getStats(userId) {
    try {
      const cached = await this.get(userId);
      if (!cached) {
        return {
          exists: false,
          age: null,
          isStale: null,
          size: null,
          transactionCount: 0,
          incomeCount: 0,
          expenseCount: 0,
        };
      }

      const size = JSON.stringify(cached.data).length;
      const incomeTransactions = cached.data?.filter(t => t.type === 'INCOME') || [];
      const expenseTransactions = cached.data?.filter(t => t.type === 'EXPENSE') || [];

      return {
        exists: true,
        age: Math.round(cached.age / 1000), // seconds
        isStale: cached.isStale,
        size,
        ttlMinutes: CACHE_TTL / 1000 / 60,
        lastUpdated: new Date(cached.timestamp).toISOString(),
        transactionCount: cached.data?.length || 0,
        incomeCount: incomeTransactions.length,
        expenseCount: expenseTransactions.length,
        totalIncome: incomeTransactions.reduce(
          (sum, t) => sum + (parseFloat(t.amount) || 0),
          0,
        ),
        totalExpense: expenseTransactions.reduce(
          (sum, t) => sum + (parseFloat(t.amount) || 0),
          0,
        ),
      };
    } catch (error) {
      console.error('💳 TransactionCache: Stats error:', error);
      return {
        exists: false,
        error: error.message,
        transactionCount: 0,
        incomeCount: 0,
        expenseCount: 0,
      };
    }
  }

  /**
   * Add or update a transaction in cache
   * Useful for optimistic updates after creation/editing
   * @param {string} userId - ID of the user
   * @param {object} transaction - Transaction data to add/update
   * @returns {Promise<boolean>}
   */
  async upsertTransaction(userId, transaction) {
    try {
      const cached = await this.get(userId);
      let transactions = cached?.data || [];

      // Find existing transaction by ID
      const existingIndex = transactions.findIndex(t => t.id === transaction.id);

      if (existingIndex >= 0) {
        // Update existing transaction
        transactions[existingIndex] = {
          ...transactions[existingIndex],
          ...transaction,
        };
        console.log(
          '💳 TransactionCache: Transaction updated in cache:',
          transaction.id,
        );
      } else {
        // Add new transaction at the beginning (most recent first)
        transactions.unshift(transaction);
        console.log(
          '💳 TransactionCache: Transaction added to cache:',
          transaction.id,
        );
      }

      return await this.set(userId, transactions);
    } catch (error) {
      console.error('💳 TransactionCache: Upsert error:', error);
      return false;
    }
  }

  /**
   * Remove a transaction from cache
   * @param {string} userId - ID of the user
   * @param {string|number} transactionId - ID of transaction to remove
   * @returns {Promise<boolean>}
   */
  async removeTransaction(userId, transactionId) {
    try {
      const cached = await this.get(userId);
      let transactions = cached?.data || [];

      const filteredTransactions = transactions.filter(
        t => t.id !== transactionId,
      );

      if (filteredTransactions.length !== transactions.length) {
        console.log(
          '💳 TransactionCache: Transaction removed from cache:',
          transactionId,
        );
        return await this.set(userId, filteredTransactions);
      }

      console.log(
        '💳 TransactionCache: Transaction not found in cache:',
        transactionId,
      );
      return true;
    } catch (error) {
      console.error('💳 TransactionCache: Remove error:', error);
      return false;
    }
  }

  /**
   * Replace a temporary transaction ID with the real backend ID
   * Used for optimistic updates - replace temp ID after API returns real ID
   * @param {string} userId - ID of the user
   * @param {string} tempId - Temporary transaction ID (e.g., 'temp_12345')
   * @param {object} realTransaction - Real transaction with backend ID
   * @returns {Promise<boolean>}
   */
  async replaceTempTransaction(userId, tempId, realTransaction) {
    try {
      const cached = await this.get(userId);
      let transactions = cached?.data || [];

      const tempIndex = transactions.findIndex(t => t.id === tempId);

      if (tempIndex >= 0) {
        // Replace temp transaction with real one
        transactions[tempIndex] = realTransaction;
        console.log(
          '💳 TransactionCache: Replaced temp transaction',
          tempId,
          'with real ID',
          realTransaction.id,
        );
        return await this.set(userId, transactions);
      }

      console.log(
        '💳 TransactionCache: Temp transaction not found in cache:',
        tempId,
      );
      return false;
    } catch (error) {
      console.error('💳 TransactionCache: Replace temp error:', error);
      return false;
    }
  }

  /**
   * Clear all transaction caches (useful for logout)
   * @returns {Promise<boolean>}
   */
  async clearAll() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const transactionKeys = allKeys.filter(key =>
        key.startsWith(CACHE_KEY_PREFIX),
      );

      if (transactionKeys.length > 0) {
        await AsyncStorage.multiRemove(transactionKeys);
        console.log(
          '💳 TransactionCache: All transaction caches cleared',
          transactionKeys.length,
        );
      }
      return true;
    } catch (error) {
      console.error('💳 TransactionCache: Clear all error:', error);
      return false;
    }
  }
}

// Export singleton instance (following existing cache pattern)
const transactionCache = new TransactionCache();
export default transactionCache;

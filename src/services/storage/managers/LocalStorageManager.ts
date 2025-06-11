import AsyncStorage from '@react-native-async-storage/async-storage';
import {ILocalStorage} from '../interfaces';

/**
 * LocalStorageManager - Simple wrapper around AsyncStorage
 * Handles all local storage operations with consistent error handling
 */
export class LocalStorageManager implements ILocalStorage {
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) {
        return null;
      }

      try {
        return JSON.parse(value);
      } catch (parseError) {
        console.error(
          `Failed to parse local value for key ${key}:`,
          parseError,
        );
        // Remove corrupted local data
        await this.removeItem(key);
        return null;
      }
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  async getAllKeys(): Promise<readonly string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  }

  /**
   * Get multiple items at once for better performance
   * @param keys Array of keys to retrieve
   * @returns Record of key-value pairs
   */
  async getMultiple<T = any>(
    keys: string[],
  ): Promise<Record<string, T | null>> {
    try {
      const keyValuePairs = await AsyncStorage.multiGet(keys);
      const result: Record<string, T | null> = {};

      keyValuePairs.forEach(([key, value]) => {
        if (value === null) {
          result[key] = null;
        } else {
          try {
            result[key] = JSON.parse(value);
          } catch (parseError) {
            console.error(`Failed to parse value for key ${key}:`, parseError);
            result[key] = null;
            // Remove corrupted data in background
            this.removeItem(key).catch(console.error);
          }
        }
      });

      return result;
    } catch (error) {
      console.error('Error getting multiple items:', error);
      // Return empty result with null values for all requested keys
      return keys.reduce((acc, key) => ({...acc, [key]: null}), {});
    }
  }

  /**
   * Set multiple items at once for better performance
   * @param items Array of [key, value] pairs
   */
  async setMultiple<T = any>(items: Array<[string, T]>): Promise<void> {
    try {
      const keyValuePairs: readonly [string, string][] = items.map(
        ([key, value]) => [key, JSON.stringify(value)],
      );
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (error) {
      console.error('Error setting multiple items:', error);
      throw error;
    }
  }

  /**
   * Remove multiple items at once for better performance
   * @param keys Array of keys to remove
   */
  async removeMultiple(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error removing multiple items:', error);
      throw error;
    }
  }

  /**
   * Check if a key exists in storage
   * @param key The key to check
   * @returns true if key exists, false otherwise
   */
  async hasKey(key: string): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value !== null;
    } catch (error) {
      console.error(`Error checking if key ${key} exists:`, error);
      return false;
    }
  }

  /**
   * Get storage usage information
   * @returns Object with storage statistics
   */
  async getStorageInfo(): Promise<{
    totalKeys: number;
    estimatedSize: number; // in bytes
  }> {
    try {
      const keys = await this.getAllKeys();
      let estimatedSize = 0;

      // Get a sample of items to estimate total size
      const sampleSize = Math.min(keys.length, 10);
      const sampleKeys = keys.slice(0, sampleSize);

      if (sampleKeys.length > 0) {
        const sampleItems = await AsyncStorage.multiGet(sampleKeys);
        const avgItemSize =
          sampleItems.reduce((total, [key, value]) => {
            return total + key.length + (value?.length || 0);
          }, 0) / sampleItems.length;

        estimatedSize = Math.round(avgItemSize * keys.length);
      }

      return {
        totalKeys: keys.length,
        estimatedSize,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        totalKeys: 0,
        estimatedSize: 0,
      };
    }
  }
}

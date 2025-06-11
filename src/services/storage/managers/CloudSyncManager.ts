import {uploadData, remove, downloadData} from 'aws-amplify/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ICloudSync, SyncStatus, QueueItem} from '../interfaces';
import {StorageConstants} from '../constants';
import {SyncQueue} from './SyncQueue';
import {STORAGE_KEYS} from '../../../data/schema';

/**
 * CloudSyncManager - Handles all AWS cloud synchronization operations
 * Manages sync queue, retry mechanisms, and sync status tracking
 */
export class CloudSyncManager implements ICloudSync {
  private syncQueue: SyncQueue;
  private syncStatus: SyncStatus;
  private isOnline: boolean = true;
  private isSyncInProgress: boolean = false;
  private syncTimeout: NodeJS.Timeout | null = null;
  private periodicSyncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.syncQueue = new SyncQueue();
    this.syncStatus = {
      lastSynced: '',
      status: 'pending',
    };
    this.initializeSync();
  }

  /**
   * Initialize sync manager - load status and start periodic sync
   * @private
   */
  private async initializeSync(): Promise<void> {
    // Load sync status from local storage
    const savedSyncStatus = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    if (savedSyncStatus) {
      try {
        this.syncStatus = JSON.parse(savedSyncStatus);
      } catch (error) {
        console.error('Failed to parse saved sync status:', error);
        // Keep default status if parsing fails
      }
    }

    // Start periodic sync
    this.startPeriodicSync();
  }

  /**
   * Start periodic sync every 5 minutes if online and not already syncing
   * @private
   */
  private startPeriodicSync(): void {
    // Clear any existing interval
    if (this.periodicSyncInterval) {
      clearInterval(this.periodicSyncInterval);
    }

    this.periodicSyncInterval = setInterval(async () => {
      if (
        this.isOnline &&
        !this.isSyncInProgress &&
        !this.syncQueue.isEmpty()
      ) {
        await this.debouncedSync();
      }
    }, StorageConstants.PERIODIC_SYNC_INTERVAL);
  }

  /**
   * Add an operation to the sync queue
   * @param operation The sync operation to queue
   */
  addToQueue(operation: QueueItem): void {
    // Check if queue is at capacity
    if (this.syncQueue.isAtCapacity()) {
      console.warn('Sync queue at capacity, forcing immediate sync');
      this.forceSyncNow().catch(error => {
        console.error('Force sync failed:', error);
      });
    }

    // Add to queue (will automatically deduplicate)
    this.syncQueue.add(operation);

    // Trigger debounced sync if online
    if (this.isOnline) {
      this.debouncedSync().catch(error => {
        console.error('Debounced sync failed:', error);
      });
    }
  }

  /**
   * Perform debounced sync to prevent multiple concurrent syncs
   * @private
   */
  private debouncedSync(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clear existing timeout
      if (this.syncTimeout) {
        clearTimeout(this.syncTimeout);
      }

      // Set new timeout
      this.syncTimeout = setTimeout(async () => {
        try {
          await this.syncWithCloudRetry();
          resolve();
        } catch (error) {
          reject(error);
        }
      }, StorageConstants.SYNC_DEBOUNCE_MS);
    });
  }

  /**
   * Sync with cloud with retry mechanism
   * @param retryCount Current retry attempt
   * @private
   */
  private async syncWithCloudRetry(retryCount = 0): Promise<void> {
    if (this.isSyncInProgress) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    try {
      this.isSyncInProgress = true;
      await this.performSync();
    } catch (error) {
      console.error(`Sync attempt ${retryCount + 1} failed:`, error);

      if (retryCount < StorageConstants.MAX_SYNC_RETRIES) {
        // Exponential backoff: wait 2^retryCount seconds
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.syncWithCloudRetry(retryCount + 1);
      } else {
        // Max retries reached, update sync status with error
        await this.updateSyncStatus({
          lastSynced: new Date().toISOString(),
          status: 'error',
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error after max retries',
        });
        throw error;
      }
    } finally {
      this.isSyncInProgress = false;
    }
  }

  /**
   * Perform the actual sync operation
   * @private
   */
  private async performSync(): Promise<void> {
    if (this.syncQueue.isEmpty()) {
      return; // Nothing to sync
    }

    try {
      let processedCount = 0;

      while (
        !this.syncQueue.isEmpty() &&
        processedCount < StorageConstants.SYNC_BATCH_SIZE
      ) {
        const batch = this.syncQueue.getBatch(StorageConstants.SYNC_BATCH_SIZE);

        if (batch.length === 0) {
          break; // No more items to process
        }

        // Process batch with Promise.allSettled for better error handling
        const results = await Promise.allSettled(
          batch.map(async item => {
            if (item.operation === 'set') {
              await uploadData({
                key: `data/${item.key}`,
                data: JSON.stringify(item.value),
                options: {
                  contentType: 'application/json',
                },
              }).result;
            } else {
              await remove({key: `data/${item.key}`});
            }
            return item;
          }),
        );

        // Track failed items to re-add to queue
        const failedItems: QueueItem[] = [];
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(
              `Failed to sync item ${batch[index].key}:`,
              result.reason,
            );
            failedItems.push(batch[index]);
          }
        });

        // Re-add failed items to queue
        if (failedItems.length > 0) {
          this.syncQueue.requeueFailedItems(failedItems);
        }

        processedCount += batch.length;

        // If we have failures and more items, break to avoid infinite loop
        if (failedItems.length > 0 && !this.syncQueue.isEmpty()) {
          break;
        }
      }

      // Update sync status
      await this.updateSyncStatus({
        lastSynced: new Date().toISOString(),
        status: this.syncQueue.isEmpty() ? 'synced' : 'pending',
      });

      console.log(
        `Successfully processed ${processedCount} sync items, ${this.syncQueue.getLength()} remaining`,
      );
    } catch (error: unknown) {
      console.error('Sync error:', error);
      await this.updateSyncStatus({
        lastSynced: new Date().toISOString(),
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update and persist sync status
   * @param newStatus New sync status
   * @private
   */
  private async updateSyncStatus(newStatus: SyncStatus): Promise<void> {
    this.syncStatus = newStatus;
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_SYNC,
        JSON.stringify(this.syncStatus),
      );
    } catch (error) {
      console.error('Failed to save sync status:', error);
    }
  }

  /**
   * Manual sync trigger - forces immediate sync
   */
  async forceSyncNow(): Promise<void> {
    // Clear any pending debounced sync
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }

    await this.syncWithCloudRetry();
  }

  /**
   * Perform a full sync operation
   */
  async sync(): Promise<void> {
    await this.forceSyncNow();
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return {...this.syncStatus};
  }

  /**
   * Get detailed sync queue status
   */
  getSyncQueueStatus(): {
    queueLength: number;
    isSyncInProgress: boolean;
    hasPendingSync: boolean;
  } {
    return {
      queueLength: this.syncQueue.getLength(),
      isSyncInProgress: this.isSyncInProgress,
      hasPendingSync: this.syncTimeout !== null,
    };
  }

  /**
   * Set online status and trigger sync if coming online
   * @param isOnline Whether the device is online
   */
  setOnlineStatus(isOnline: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = isOnline;

    // If coming back online and have items to sync, trigger sync
    if (
      isOnline &&
      wasOffline &&
      !this.isSyncInProgress &&
      !this.syncQueue.isEmpty()
    ) {
      this.debouncedSync().catch(error => {
        console.error('Sync on online status change failed:', error);
      });
    }
  }

  /**
   * Download data from cloud storage
   * @param key The key to download
   * @returns The downloaded data or null if not found
   */
  async downloadFromCloud<T>(key: string): Promise<T | null> {
    if (!this.isOnline) {
      return null;
    }

    try {
      const {body} = await downloadData({key: `data/${key}`}).result;
      const cloudValue = await body.text();

      if (cloudValue) {
        try {
          return JSON.parse(cloudValue);
        } catch (parseError) {
          console.error(
            `Failed to parse cloud value for key ${key}:`,
            parseError,
          );
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error(`Cloud fetch error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Clear all cloud data (dangerous operation)
   * @param prefix The prefix to clear (defaults to 'data/')
   */
  async clearCloudData(prefix: string = 'data/'): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot clear cloud data while offline');
    }

    try {
      await remove({key: prefix});
      console.log(`Cleared cloud data with prefix: ${prefix}`);
    } catch (error) {
      console.error('Error clearing cloud data:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive sync manager status for monitoring
   */
  getDetailedStatus(): {
    syncStatus: SyncStatus;
    queueStatus: ReturnType<SyncQueue['getStatus']>;
    isOnline: boolean;
    isSyncInProgress: boolean;
    hasPendingSync: boolean;
  } {
    return {
      syncStatus: this.getSyncStatus(),
      queueStatus: this.syncQueue.getStatus(),
      isOnline: this.isOnline,
      isSyncInProgress: this.isSyncInProgress,
      hasPendingSync: this.syncTimeout !== null,
    };
  }

  /**
   * Clean up resources and stop all intervals
   */
  destroy(): void {
    // Clear sync timeout
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }

    // Clear periodic sync interval
    if (this.periodicSyncInterval) {
      clearInterval(this.periodicSyncInterval);
      this.periodicSyncInterval = null;
    }

    // Destroy sync queue
    this.syncQueue.destroy();
  }
}

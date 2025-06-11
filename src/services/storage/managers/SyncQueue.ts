import {QueueItem} from '../interfaces';
import {StorageConstants} from '../constants';

/**
 * SyncQueue - Manages the queue of operations waiting to be synced to cloud
 * Handles deduplication, cleanup, batching, and queue size management
 */
export class SyncQueue {
  private queue: QueueItem[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startPeriodicCleanup();
  }

  /**
   * Add an operation to the sync queue
   * Automatically deduplicates by removing existing entries for the same key
   * @param item The queue item to add
   */
  add(item: QueueItem): void {
    // Deduplicate - remove existing entries for the same key
    this.queue = this.queue.filter(existing => existing.key !== item.key);

    // Add new item to the end of queue
    this.queue.push(item);

    // Log queue status for debugging
    console.log(
      `Added ${item.operation} operation for key ${item.key}. Queue length: ${this.queue.length}`,
    );
  }

  /**
   * Remove a specific key from the queue
   * @param key The key to remove from queue
   */
  remove(key: string): void {
    const originalLength = this.queue.length;
    this.queue = this.queue.filter(item => item.key !== key);

    if (this.queue.length !== originalLength) {
      console.log(
        `Removed key ${key} from sync queue. Queue length: ${this.queue.length}`,
      );
    }
  }

  /**
   * Get a batch of items from the front of the queue
   * @param size Maximum number of items to return
   * @returns Array of queue items (removed from queue)
   */
  getBatch(size: number = StorageConstants.SYNC_BATCH_SIZE): QueueItem[] {
    if (this.queue.length === 0) {
      return [];
    }

    const batchSize = Math.min(size, this.queue.length);
    const batch = this.queue.splice(0, batchSize);

    console.log(
      `Retrieved batch of ${batch.length} items. Remaining in queue: ${this.queue.length}`,
    );
    return batch;
  }

  /**
   * Peek at the next batch without removing items from queue
   * @param size Maximum number of items to peek at
   * @returns Array of queue items (not removed from queue)
   */
  peekBatch(size: number = StorageConstants.SYNC_BATCH_SIZE): QueueItem[] {
    const batchSize = Math.min(size, this.queue.length);
    return this.queue.slice(0, batchSize);
  }

  /**
   * Re-add failed items to the front of the queue with updated timestamp
   * @param items Array of items that failed to sync
   */
  requeueFailedItems(items: QueueItem[]): void {
    if (items.length === 0) {
      return;
    }

    // Update timestamps to current time
    const updatedItems = items.map(item => ({
      ...item,
      timestamp: Date.now(),
    }));

    // Add to front of queue
    this.queue.unshift(...updatedItems);

    console.log(
      `Re-queued ${items.length} failed items. Queue length: ${this.queue.length}`,
    );
  }

  /**
   * Get the current queue length
   * @returns Number of items in queue
   */
  getLength(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   * @returns true if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Check if queue is at or near capacity
   * @returns true if queue is at or above the max size limit
   */
  isAtCapacity(): boolean {
    return this.queue.length >= StorageConstants.MAX_QUEUE_SIZE;
  }

  /**
   * Get queue status information
   * @returns Object with queue statistics
   */
  getStatus(): {
    length: number;
    isAtCapacity: boolean;
    oldestItemAge: number | null;
    newestItemAge: number | null;
  } {
    const now = Date.now();
    const timestamps = this.queue.map(item => item.timestamp);

    return {
      length: this.queue.length,
      isAtCapacity: this.isAtCapacity(),
      oldestItemAge:
        timestamps.length > 0 ? now - Math.min(...timestamps) : null,
      newestItemAge:
        timestamps.length > 0 ? now - Math.max(...timestamps) : null,
    };
  }

  /**
   * Clear all items from the queue
   */
  clear(): void {
    const clearedCount = this.queue.length;
    this.queue = [];
    console.log(`Cleared ${clearedCount} items from sync queue`);
  }

  /**
   * Clean up old items from the queue
   * Removes items older than MAX_QUEUE_AGE_MS
   */
  cleanup(): void {
    const now = Date.now();
    const originalLength = this.queue.length;

    this.queue = this.queue.filter(item => {
      const age = now - item.timestamp;
      return age < StorageConstants.MAX_QUEUE_AGE_MS;
    });

    const removedCount = originalLength - this.queue.length;
    if (removedCount > 0) {
      console.log(
        `Cleaned up ${removedCount} old sync queue items. Remaining: ${this.queue.length}`,
      );
    }
  }

  /**
   * Get all items in the queue (for debugging/monitoring)
   * @returns Copy of all queue items
   */
  getAllItems(): QueueItem[] {
    return [...this.queue];
  }

  /**
   * Get items by operation type
   * @param operation The operation type to filter by
   * @returns Array of items with the specified operation
   */
  getItemsByOperation(operation: 'set' | 'remove'): QueueItem[] {
    return this.queue.filter(item => item.operation === operation);
  }

  /**
   * Check if a specific key is in the queue
   * @param key The key to search for
   * @returns true if key exists in queue
   */
  hasKey(key: string): boolean {
    return this.queue.some(item => item.key === key);
  }

  /**
   * Get the queue item for a specific key (most recent)
   * @param key The key to search for
   * @returns The queue item or null if not found
   */
  getItemByKey(key: string): QueueItem | null {
    // Find the last occurrence (most recent) since we deduplicate
    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (this.queue[i].key === key) {
        return this.queue[i];
      }
    }
    return null;
  }

  /**
   * Force cleanup of items based on custom criteria
   * @param predicate Function that returns true for items to keep
   */
  customCleanup(predicate: (item: QueueItem) => boolean): void {
    const originalLength = this.queue.length;
    this.queue = this.queue.filter(predicate);

    const removedCount = originalLength - this.queue.length;
    if (removedCount > 0) {
      console.log(
        `Custom cleanup removed ${removedCount} items. Remaining: ${this.queue.length}`,
      );
    }
  }

  /**
   * Start periodic cleanup of old queue items
   * @private
   */
  private startPeriodicCleanup(): void {
    // Clear any existing interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Start new cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, StorageConstants.QUEUE_CLEANUP_INTERVAL);
  }

  /**
   * Stop periodic cleanup (call when destroying the queue)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

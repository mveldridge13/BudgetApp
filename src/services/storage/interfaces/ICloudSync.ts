import {SyncStatus, QueueItem} from './StorageTypes';

export interface ICloudSync {
  sync(): Promise<void>;
  addToQueue(operation: QueueItem): void;
  getSyncStatus(): SyncStatus;
  forceSyncNow(): Promise<void>;
  setOnlineStatus(isOnline: boolean): void;
  getSyncQueueStatus(): {
    queueLength: number;
    isSyncInProgress: boolean;
    hasPendingSync: boolean;
  };
  downloadFromCloud<T>(key: string): Promise<T | null>;
  clearCloudData(prefix?: string): Promise<void>;
}

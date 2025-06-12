import {
  ILocalStorage,
  ICloudSync,
  IBackupManager,
  SyncStatus,
  BackupConfig,
  BackupItem,
  QueueItem,
} from './interfaces';
import {LocalStorageManager} from './managers/LocalStorageManager';
import {CloudSyncManager} from './managers/CloudSyncManager';
import {BackupManager} from './managers/BackupManager';
import {UserStorageManager} from './managers/UserStorageManager';

export class StorageCoordinator {
  private static instance: StorageCoordinator;

  private localStorage: ILocalStorage;
  private cloudSync: ICloudSync;
  private backupManager: IBackupManager;
  private userStorageManager?: UserStorageManager;
  private currentUserId?: string;

  private constructor() {
    this.localStorage = new LocalStorageManager();
    this.cloudSync = new CloudSyncManager();
    this.backupManager = new BackupManager(this.localStorage);
  }

  static getInstance(): StorageCoordinator {
    if (!StorageCoordinator.instance) {
      StorageCoordinator.instance = new StorageCoordinator();
    }
    return StorageCoordinator.instance;
  }

  async initializeUserStorage(userId: string): Promise<UserStorageManager> {
    try {
      this.currentUserId = userId;
      this.userStorageManager = new UserStorageManager(this, userId);

      await this.userStorageManager.migrateLegacyData();

      return this.userStorageManager;
    } catch (error) {
      throw error;
    }
  }

  getUserStorageManager(): UserStorageManager | null {
    if (!this.userStorageManager) {
      return null;
    }
    return this.userStorageManager;
  }

  isUserStorageInitialized(): boolean {
    return !!this.userStorageManager && !!this.currentUserId;
  }

  clearUserStorage(): void {
    this.userStorageManager = undefined;
    this.currentUserId = undefined;
  }

  getCurrentUserId(): string | undefined {
    return this.currentUserId;
  }

  async getUserData(dataType: string): Promise<any> {
    if (!this.userStorageManager) {
      return null;
    }
    return this.userStorageManager.getUserData(dataType);
  }

  async setUserData(dataType: string, data: any): Promise<boolean> {
    if (!this.userStorageManager) {
      return false;
    }
    return this.userStorageManager.setUserData(dataType, data);
  }

  async hasUserData(): Promise<boolean> {
    if (!this.userStorageManager) {
      return false;
    }
    const existingData = await this.userStorageManager.hasExistingData();
    return existingData.hasData;
  }

  async getUserProfile() {
    if (!this.userStorageManager) {
      return null;
    }
    return this.userStorageManager.getUserProfile();
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const localValue = await this.localStorage.getItem<T>(key);
      if (localValue !== null) {
        return localValue;
      }

      const cloudValue = await this.cloudSync.downloadFromCloud<T>(key);
      if (cloudValue !== null) {
        await this.localStorage.setItem(key, cloudValue);
        return cloudValue;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await this.localStorage.setItem(key, value);

      const queueItem: QueueItem = {
        key,
        value,
        operation: 'set',
        timestamp: Date.now(),
      };
      this.cloudSync.addToQueue(queueItem);
    } catch (error) {
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.localStorage.removeItem(key);

      const queueItem: QueueItem = {
        key,
        value: null,
        operation: 'remove',
        timestamp: Date.now(),
      };
      this.cloudSync.addToQueue(queueItem);
    } catch (error) {
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.localStorage.clear();
      await this.cloudSync.clearCloudData();

      if (this.userStorageManager) {
        await this.userStorageManager.deleteAllUserData();
      }
    } catch (error) {
      throw error;
    }
  }

  async getAllKeys(): Promise<readonly string[]> {
    return this.localStorage.getAllKeys();
  }

  async getMultiple<T = any>(
    keys: string[],
  ): Promise<Record<string, T | null>> {
    if ('getMultiple' in this.localStorage) {
      return (this.localStorage as LocalStorageManager).getMultiple<T>(keys);
    }

    const result: Record<string, T | null> = {};
    await Promise.allSettled(
      keys.map(async key => {
        result[key] = await this.getItem<T>(key);
      }),
    );
    return result;
  }

  async setMultiple<T = any>(items: Array<[string, T]>): Promise<void> {
    if ('setMultiple' in this.localStorage) {
      await (this.localStorage as LocalStorageManager).setMultiple(items);

      items.forEach(([key, value]) => {
        const queueItem: QueueItem = {
          key,
          value,
          operation: 'set',
          timestamp: Date.now(),
        };
        this.cloudSync.addToQueue(queueItem);
      });
    } else {
      await Promise.allSettled(
        items.map(([key, value]) => this.setItem(key, value)),
      );
    }
  }

  async removeMultiple(keys: string[]): Promise<void> {
    if ('removeMultiple' in this.localStorage) {
      await (this.localStorage as LocalStorageManager).removeMultiple(keys);

      keys.forEach(key => {
        const queueItem: QueueItem = {
          key,
          value: null,
          operation: 'remove',
          timestamp: Date.now(),
        };
        this.cloudSync.addToQueue(queueItem);
      });
    } else {
      await Promise.allSettled(keys.map(key => this.removeItem(key)));
    }
  }

  async forceSyncNow(): Promise<void> {
    return this.cloudSync.forceSyncNow();
  }

  getSyncStatus(): SyncStatus {
    return this.cloudSync.getSyncStatus();
  }

  getSyncQueueStatus(): {
    queueLength: number;
    isSyncInProgress: boolean;
    hasPendingSync: boolean;
  } {
    return this.cloudSync.getSyncQueueStatus();
  }

  setOnlineStatus(isOnline: boolean): void {
    this.cloudSync.setOnlineStatus(isOnline);
  }

  async createBackup(): Promise<void> {
    return this.backupManager.createBackup();
  }

  async restoreFromBackup(
    backupId: string,
    source: 'aws' | 'icloud' = 'aws',
  ): Promise<void> {
    return this.backupManager.restoreFromBackup(backupId, source);
  }

  async listBackups(
    source: 'aws' | 'icloud' = 'aws',
    limit = 20,
  ): Promise<BackupItem[]> {
    return this.backupManager.listBackups(source, limit);
  }

  async deleteBackup(
    backupId: string,
    source: 'aws' | 'icloud' = 'aws',
  ): Promise<void> {
    if ('deleteBackup' in this.backupManager) {
      return (this.backupManager as BackupManager).deleteBackup(
        backupId,
        source,
      );
    }
    throw new Error('Delete backup operation not supported');
  }

  async updateBackupConfig(config: Partial<BackupConfig>): Promise<void> {
    return this.backupManager.updateBackupConfig(config);
  }

  getBackupConfig(): BackupConfig {
    return this.backupManager.getBackupConfig();
  }

  async getBackupStats(): Promise<{
    totalBackups: number;
    lastBackup: string | null;
    backupSources: ('aws' | 'icloud')[];
    estimatedSize: number;
  }> {
    if ('getBackupStats' in this.backupManager) {
      return (this.backupManager as BackupManager).getBackupStats();
    }

    const backups = await this.listBackups('aws', 50);
    const lastBackup = backups.length > 0 ? backups[0].timestamp : null;

    return {
      totalBackups: backups.length,
      lastBackup,
      backupSources: backups.length > 0 ? ['aws'] : [],
      estimatedSize: backups.length * 1024 * 100,
    };
  }

  async hasKey(key: string): Promise<boolean> {
    if ('hasKey' in this.localStorage) {
      return (this.localStorage as LocalStorageManager).hasKey(key);
    }

    const value = await this.getItem(key);
    return value !== null;
  }

  async getStorageInfo(): Promise<{
    totalKeys: number;
    estimatedSize: number;
  }> {
    if ('getStorageInfo' in this.localStorage) {
      return (this.localStorage as LocalStorageManager).getStorageInfo();
    }

    const keys = await this.getAllKeys();
    return {
      totalKeys: keys.length,
      estimatedSize: keys.length * 1024,
    };
  }

  async getComprehensiveStatus(): Promise<{
    localStorage: {
      totalKeys: number;
      estimatedSize: number;
    };
    cloudSync: {
      syncStatus: SyncStatus;
      queueStatus: ReturnType<ICloudSync['getSyncQueueStatus']>;
    };
    backup: {
      config: BackupConfig;
      stats: Awaited<ReturnType<StorageCoordinator['getBackupStats']>>;
    };
    userStorage: {
      isInitialized: boolean;
      currentUserId?: string;
      hasUserData: boolean;
      userProfile?: any;
    };
  }> {
    const [storageInfo, backupStats] = await Promise.all([
      this.getStorageInfo(),
      this.getBackupStats(),
    ]);

    let userStorageStatus: {
      isInitialized: boolean;
      currentUserId?: string;
      hasUserData: boolean;
      userProfile?: any;
    } = {
      isInitialized: this.isUserStorageInitialized(),
      currentUserId: this.currentUserId,
      hasUserData: false,
      userProfile: undefined,
    };

    if (this.userStorageManager) {
      try {
        const hasData = await this.hasUserData();
        userStorageStatus.hasUserData = hasData;

        try {
          const profile = await this.getUserProfile();
          userStorageStatus.userProfile = profile;
        } catch (profileError) {
          userStorageStatus.userProfile = null;
        }
      } catch (error) {
        // Handle error silently
      }
    }

    return {
      localStorage: storageInfo,
      cloudSync: {
        syncStatus: this.getSyncStatus(),
        queueStatus: this.getSyncQueueStatus(),
      },
      backup: {
        config: this.getBackupConfig(),
        stats: backupStats,
      },
      userStorage: userStorageStatus,
    };
  }

  async healthCheck(): Promise<{
    overall: 'healthy' | 'warning' | 'error';
    localStorage: 'healthy' | 'error';
    cloudSync: 'healthy' | 'warning' | 'error';
    backup: 'healthy' | 'warning' | 'error';
    userStorage: 'healthy' | 'warning' | 'error' | 'not_initialized';
    details: string[];
  }> {
    const details: string[] = [];
    let localStorage: 'healthy' | 'error' = 'healthy';
    let cloudSync: 'healthy' | 'warning' | 'error' = 'healthy';
    let backup: 'healthy' | 'warning' | 'error' = 'healthy';
    let userStorage: 'healthy' | 'warning' | 'error' | 'not_initialized' =
      'not_initialized';

    try {
      const testKey = '__health_check__';
      const testValue = {timestamp: Date.now()};
      await this.localStorage.setItem(testKey, testValue);
      const retrieved = await this.localStorage.getItem(testKey);
      await this.localStorage.removeItem(testKey);

      if (
        !retrieved ||
        typeof retrieved !== 'object' ||
        (retrieved as any).timestamp !== testValue.timestamp
      ) {
        localStorage = 'error';
        details.push('Local storage read/write test failed');
      }
    } catch (error) {
      localStorage = 'error';
      details.push(
        `Local storage error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }

    const syncStatus = this.getSyncStatus();
    if (syncStatus.status === 'error') {
      cloudSync = 'error';
      details.push(`Cloud sync error: ${syncStatus.error || 'Unknown error'}`);
    } else if (syncStatus.status === 'pending') {
      const queueStatus = this.getSyncQueueStatus();
      if (queueStatus.queueLength > 50) {
        cloudSync = 'warning';
        details.push(`Large sync queue: ${queueStatus.queueLength} items`);
      }
    }

    try {
      const backupConfig = this.getBackupConfig();
      if (backupConfig.autoBackup && backupConfig.lastBackup) {
        const lastBackupDate = new Date(backupConfig.lastBackup);
        const daysSinceBackup =
          (Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceBackup > 7) {
          backup = 'warning';
          details.push(
            `Last backup was ${Math.round(daysSinceBackup)} days ago`,
          );
        }
      } else if (backupConfig.autoBackup && !backupConfig.lastBackup) {
        backup = 'warning';
        details.push('No backups found but auto-backup is enabled');
      }
    } catch (error) {
      backup = 'error';
      details.push(
        `Backup system error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }

    if (this.isUserStorageInitialized()) {
      try {
        if (this.userStorageManager) {
          const profile = await this.userStorageManager.getUserProfile();
          if (profile && profile.userId === this.currentUserId) {
            userStorage = 'healthy';
            details.push(
              `User storage healthy for user: ${this.currentUserId}`,
            );
          } else {
            userStorage = 'warning';
            details.push('User storage profile mismatch');
          }
        } else {
          userStorage = 'error';
          details.push('User storage initialized but manager is null');
        }
      } catch (error) {
        userStorage = 'error';
        details.push(
          `User storage error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    } else {
      userStorage = 'not_initialized';
      details.push(
        'User storage not initialized (normal if no user logged in)',
      );
    }

    let overall: 'healthy' | 'warning' | 'error' = 'healthy';
    if (
      localStorage === 'error' ||
      cloudSync === 'error' ||
      backup === 'error' ||
      userStorage === 'error'
    ) {
      overall = 'error';
    } else if (
      cloudSync === 'warning' ||
      backup === 'warning' ||
      userStorage === 'warning'
    ) {
      overall = 'warning';
    }

    if (details.length === 0) {
      details.push('All storage systems are functioning normally');
    }

    return {
      overall,
      localStorage,
      cloudSync,
      backup,
      userStorage,
      details,
    };
  }

  destroy(): void {
    this.clearUserStorage();

    if ('destroy' in this.cloudSync) {
      (this.cloudSync as CloudSyncManager).destroy();
    }

    StorageCoordinator.instance = null as any;
  }
}

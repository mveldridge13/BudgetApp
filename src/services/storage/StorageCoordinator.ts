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

/**
 * StorageCoordinator - Main orchestrator for all storage operations
 * Replaces the original StorageService with a clean, modular architecture
 * Coordinates between local storage, cloud sync, backup operations, and user-specific storage
 */
export class StorageCoordinator {
  private static instance: StorageCoordinator;

  private localStorage: ILocalStorage;
  private cloudSync: ICloudSync;
  private backupManager: IBackupManager;

  // NEW: User-specific storage management
  private userStorageManager?: UserStorageManager;
  private currentUserId?: string;

  private constructor() {
    // Initialize all managers
    this.localStorage = new LocalStorageManager();
    this.cloudSync = new CloudSyncManager();
    this.backupManager = new BackupManager(this.localStorage);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): StorageCoordinator {
    if (!StorageCoordinator.instance) {
      StorageCoordinator.instance = new StorageCoordinator();
    }
    return StorageCoordinator.instance;
  }

  // ===========================================
  // USER STORAGE MANAGEMENT
  // ===========================================

  /**
   * Initialize user-specific storage manager
   */
  async initializeUserStorage(userId: string): Promise<UserStorageManager> {
    try {
      console.log(
        '🔑 StorageCoordinator: Initializing user storage for:',
        userId,
      );

      this.currentUserId = userId;
      this.userStorageManager = new UserStorageManager(this, userId);

      // Attempt to migrate any legacy data
      console.log('🔄 StorageCoordinator: Starting data migration...');
      const migrationResults =
        await this.userStorageManager.migrateLegacyData();

      const migratedCount = Object.values(migrationResults).filter(
        result => result === true,
      ).length;
      if (migratedCount > 0) {
        console.log(
          `✅ StorageCoordinator: Migrated ${migratedCount} data items for user ${userId}`,
        );
      } else {
        console.log('ℹ️ StorageCoordinator: No legacy data found to migrate');
      }

      console.log(
        '✅ StorageCoordinator: User storage initialized and migration completed',
      );
      return this.userStorageManager;
    } catch (error) {
      console.error(
        '❌ StorageCoordinator: Failed to initialize user storage:',
        error,
      );
      throw error;
    }
  }

  /**
   * Get the current user storage manager
   */
  getUserStorageManager(): UserStorageManager | null {
    if (!this.userStorageManager) {
      console.warn(
        '⚠️ StorageCoordinator: User storage manager not initialized',
      );
      return null;
    }
    return this.userStorageManager;
  }

  /**
   * Check if user storage is initialized
   */
  isUserStorageInitialized(): boolean {
    return !!this.userStorageManager && !!this.currentUserId;
  }

  /**
   * Clear user storage manager (for logout)
   */
  clearUserStorage(): void {
    console.log('🧹 StorageCoordinator: Clearing user storage manager');
    this.userStorageManager = undefined;
    this.currentUserId = undefined;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | undefined {
    return this.currentUserId;
  }

  /**
   * Get user-specific data (convenience method)
   */
  async getUserData(dataType: string): Promise<any> {
    if (!this.userStorageManager) {
      console.warn(
        '⚠️ StorageCoordinator: User storage not initialized, cannot get user data',
      );
      return null;
    }
    return this.userStorageManager.getUserData(dataType);
  }

  /**
   * Set user-specific data (convenience method)
   */
  async setUserData(dataType: string, data: any): Promise<boolean> {
    if (!this.userStorageManager) {
      console.warn(
        '⚠️ StorageCoordinator: User storage not initialized, cannot set user data',
      );
      return false;
    }
    return this.userStorageManager.setUserData(dataType, data);
  }

  /**
   * Check if current user has existing data
   */
  async hasUserData(): Promise<boolean> {
    if (!this.userStorageManager) {
      return false;
    }
    const existingData = await this.userStorageManager.hasExistingData();
    return existingData.hasData;
  }

  /**
   * Get current user profile
   */
  async getUserProfile() {
    if (!this.userStorageManager) {
      console.warn(
        '⚠️ StorageCoordinator: User storage not initialized, cannot get user profile',
      );
      return null;
    }
    return this.userStorageManager.getUserProfile();
  }

  // ===========================================
  // LOCAL STORAGE OPERATIONS
  // ===========================================

  /**
   * Get an item from storage
   * First checks local storage, then falls back to cloud if online and not found locally
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      // Try to get from local storage first
      const localValue = await this.localStorage.getItem<T>(key);
      if (localValue !== null) {
        return localValue;
      }

      // If not in local storage and online, try to get from cloud
      const cloudValue = await this.cloudSync.downloadFromCloud<T>(key);
      if (cloudValue !== null) {
        // Save the cloud value to local storage for future access
        await this.localStorage.setItem(key, cloudValue);
        return cloudValue;
      }

      return null;
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  }

  /**
   * Set an item in storage
   * Saves locally immediately, then queues for cloud sync
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      // Save to local storage immediately
      await this.localStorage.setItem(key, value);

      // Add to cloud sync queue
      const queueItem: QueueItem = {
        key,
        value,
        operation: 'set',
        timestamp: Date.now(),
      };
      this.cloudSync.addToQueue(queueItem);
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove an item from storage
   * Removes locally immediately, then queues for cloud sync
   */
  async removeItem(key: string): Promise<void> {
    try {
      // Remove from local storage immediately
      await this.localStorage.removeItem(key);

      // Add to cloud sync queue
      const queueItem: QueueItem = {
        key,
        value: null,
        operation: 'remove',
        timestamp: Date.now(),
      };
      this.cloudSync.addToQueue(queueItem);
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all storage
   * Clears local storage and cloud storage
   */
  async clear(): Promise<void> {
    try {
      await this.localStorage.clear();
      await this.cloudSync.clearCloudData();

      // Also clear user storage if initialized
      if (this.userStorageManager) {
        console.log(
          '🧹 StorageCoordinator: Clearing user data as part of full clear',
        );
        await this.userStorageManager.deleteAllUserData();
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  /**
   * Get all storage keys
   */
  async getAllKeys(): Promise<readonly string[]> {
    return this.localStorage.getAllKeys();
  }

  // ===========================================
  // BATCH OPERATIONS (Performance optimized)
  // ===========================================

  /**
   * Get multiple items at once
   */
  async getMultiple<T = any>(
    keys: string[],
  ): Promise<Record<string, T | null>> {
    if ('getMultiple' in this.localStorage) {
      return (this.localStorage as LocalStorageManager).getMultiple<T>(keys);
    }

    // Fallback for other ILocalStorage implementations
    const result: Record<string, T | null> = {};
    await Promise.allSettled(
      keys.map(async key => {
        result[key] = await this.getItem<T>(key);
      }),
    );
    return result;
  }

  /**
   * Set multiple items at once
   */
  async setMultiple<T = any>(items: Array<[string, T]>): Promise<void> {
    if ('setMultiple' in this.localStorage) {
      // Use optimized batch operation if available
      await (this.localStorage as LocalStorageManager).setMultiple(items);

      // Queue all items for sync
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
      // Fallback to individual operations
      await Promise.allSettled(
        items.map(([key, value]) => this.setItem(key, value)),
      );
    }
  }

  /**
   * Remove multiple items at once
   */
  async removeMultiple(keys: string[]): Promise<void> {
    if ('removeMultiple' in this.localStorage) {
      // Use optimized batch operation if available
      await (this.localStorage as LocalStorageManager).removeMultiple(keys);

      // Queue all items for sync
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
      // Fallback to individual operations
      await Promise.allSettled(keys.map(key => this.removeItem(key)));
    }
  }

  // ===========================================
  // CLOUD SYNC OPERATIONS
  // ===========================================

  /**
   * Force immediate sync to cloud
   */
  async forceSyncNow(): Promise<void> {
    return this.cloudSync.forceSyncNow();
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return this.cloudSync.getSyncStatus();
  }

  /**
   * Get detailed sync queue status
   */
  getSyncQueueStatus(): {
    queueLength: number;
    isSyncInProgress: boolean;
    hasPendingSync: boolean;
  } {
    return this.cloudSync.getSyncQueueStatus();
  }

  /**
   * Set online/offline status
   */
  setOnlineStatus(isOnline: boolean): void {
    this.cloudSync.setOnlineStatus(isOnline);
  }

  // ===========================================
  // BACKUP OPERATIONS
  // ===========================================

  /**
   * Create a backup of all data
   */
  async createBackup(): Promise<void> {
    return this.backupManager.createBackup();
  }

  /**
   * Restore from a backup
   */
  async restoreFromBackup(
    backupId: string,
    source: 'aws' | 'icloud' = 'aws',
  ): Promise<void> {
    return this.backupManager.restoreFromBackup(backupId, source);
  }

  /**
   * List available backups
   */
  async listBackups(
    source: 'aws' | 'icloud' = 'aws',
    limit = 20,
  ): Promise<BackupItem[]> {
    return this.backupManager.listBackups(source, limit);
  }

  /**
   * Delete a backup
   */
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

  /**
   * Update backup configuration
   */
  async updateBackupConfig(config: Partial<BackupConfig>): Promise<void> {
    return this.backupManager.updateBackupConfig(config);
  }

  /**
   * Get backup configuration
   */
  getBackupConfig(): BackupConfig {
    return this.backupManager.getBackupConfig();
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    lastBackup: string | null;
    backupSources: ('aws' | 'icloud')[];
    estimatedSize: number;
  }> {
    if ('getBackupStats' in this.backupManager) {
      return (this.backupManager as BackupManager).getBackupStats();
    }

    // Fallback implementation
    const backups = await this.listBackups('aws', 50);
    const lastBackup = backups.length > 0 ? backups[0].timestamp : null;

    return {
      totalBackups: backups.length,
      lastBackup,
      backupSources: backups.length > 0 ? ['aws'] : [],
      estimatedSize: backups.length * 1024 * 100, // Rough estimate
    };
  }

  // ===========================================
  // UTILITY OPERATIONS
  // ===========================================

  /**
   * Check if a key exists in storage
   */
  async hasKey(key: string): Promise<boolean> {
    if ('hasKey' in this.localStorage) {
      return (this.localStorage as LocalStorageManager).hasKey(key);
    }

    // Fallback implementation
    const value = await this.getItem(key);
    return value !== null;
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<{
    totalKeys: number;
    estimatedSize: number;
  }> {
    if ('getStorageInfo' in this.localStorage) {
      return (this.localStorage as LocalStorageManager).getStorageInfo();
    }

    // Fallback implementation
    const keys = await this.getAllKeys();
    return {
      totalKeys: keys.length,
      estimatedSize: keys.length * 1024, // Rough estimate
    };
  }

  /**
   * Get comprehensive status of all storage systems
   */
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

    // Get user storage status
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

        // Safely try to get user profile
        try {
          const profile = await this.getUserProfile();
          userStorageStatus.userProfile = profile; // profile can be null, which is fine
        } catch (profileError) {
          console.warn(
            '⚠️ StorageCoordinator: Failed to get user profile:',
            profileError,
          );
          userStorageStatus.userProfile = null;
        }
      } catch (error) {
        console.warn(
          '⚠️ StorageCoordinator: Failed to get user storage status:',
          error,
        );
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

  /**
   * Health check for all storage systems
   */
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
      // Test local storage
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

    // Check cloud sync status
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

    // Check backup status
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

    // Check user storage status
    if (this.isUserStorageInitialized()) {
      try {
        if (this.userStorageManager) {
          // Test user storage operations
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

    // Determine overall health
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

  /**
   * Clean up resources and stop all managers
   */
  destroy(): void {
    // Clear user storage
    this.clearUserStorage();

    if ('destroy' in this.cloudSync) {
      (this.cloudSync as CloudSyncManager).destroy();
    }

    // Clear the singleton instance
    StorageCoordinator.instance = null as any;
  }
}

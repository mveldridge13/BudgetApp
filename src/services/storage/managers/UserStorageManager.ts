// src/services/storage/managers/UserStorageManager.ts

export interface UserProfile {
  userId: string;
  hasCompletedSetup: boolean;
  setupData?: any;
  transactionCount: number;
  hasCategories: boolean;
  hasSeenWelcome: boolean;
  lastActivity?: string;
}

export interface ExistingDataCheck {
  hasData: boolean;
  setupData?: any;
  transactionData?: any;
  categoryData?: any;
}

export interface MigrationResult {
  [key: string]: boolean;
}

export class UserStorageManager {
  private storage: any; // StorageCoordinator type
  private userId: string;
  private keyPrefix: string;

  constructor(storageCoordinator: any, userId: string) {
    this.storage = storageCoordinator;
    this.userId = userId;
    this.keyPrefix = `user_${userId}`;

    console.log('🔑 UserStorageManager initialized for:', userId);
  }

  /**
   * Generate user-specific storage keys
   */
  private getUserKey(dataType: string): string {
    return `${this.keyPrefix}_${dataType}`;
  }

  /**
   * Get user-specific data
   */
  async getUserData(dataType: string): Promise<any> {
    const key = this.getUserKey(dataType);
    try {
      const data = await this.storage.getItem(key);
      console.log(`📖 Retrieved ${dataType} for user ${this.userId}:`, !!data);
      return data;
    } catch (error) {
      console.error(
        `❌ Failed to get ${dataType} for user ${this.userId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Set user-specific data
   */
  async setUserData(dataType: string, data: any): Promise<boolean> {
    const key = this.getUserKey(dataType);
    try {
      const enrichedData = {
        ...data,
        userId: this.userId,
        lastUpdated: new Date().toISOString(),
      };

      await this.storage.setItem(key, enrichedData);
      console.log(`💾 Saved ${dataType} for user ${this.userId}`);
      return true;
    } catch (error) {
      console.error(
        `❌ Failed to save ${dataType} for user ${this.userId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Remove user-specific data
   */
  async removeUserData(dataType: string): Promise<boolean> {
    const key = this.getUserKey(dataType);
    try {
      await this.storage.removeItem(key);
      console.log(`🗑️ Removed ${dataType} for user ${this.userId}`);
      return true;
    } catch (error) {
      console.error(
        `❌ Failed to remove ${dataType} for user ${this.userId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if user has existing data
   */
  async hasExistingData(): Promise<ExistingDataCheck> {
    try {
      console.log('🔍 Checking for existing user data...');

      const [setupData, transactionData, categoryData] = await Promise.all([
        this.getUserData('user_setup'),
        this.getUserData('transactions'),
        this.getUserData('categories'),
      ]);

      const hasData = !!(setupData || transactionData || categoryData);

      console.log('📊 User data check:', {
        hasSetup: !!setupData,
        hasTransactions: !!transactionData,
        hasCategories: !!categoryData,
        hasAnyData: hasData,
      });

      return {
        hasData,
        setupData,
        transactionData,
        categoryData,
      };
    } catch (error) {
      console.error('❌ Failed to check existing data:', error);
      return {hasData: false};
    }
  }

  /**
   * Migrate from legacy storage keys
   */
  async migrateLegacyData(): Promise<MigrationResult> {
    console.log('🔄 Attempting to migrate legacy data...');

    const legacyMappings = [
      {legacy: '@fintech_app_user_setup', new: 'user_setup'},
      {legacy: '@fintech_app_transactions', new: 'transactions'},
      {legacy: '@fintech_app_categories', new: 'categories'},
      {legacy: 'fintech_app_user_setup', new: 'user_setup'},
      {legacy: 'fintech_app_transactions', new: 'transactions'},
      {legacy: 'fintech_app_categories', new: 'categories'},
    ];

    const migrationResults: MigrationResult = {};
    let anyDataMigrated = false;

    for (const mapping of legacyMappings) {
      try {
        const legacyData = await this.storage.getItem(mapping.legacy);

        if (legacyData) {
          // Check if we already have data in the new format
          const existingNewData = await this.getUserData(mapping.new);

          if (!existingNewData) {
            const migrated = await this.setUserData(mapping.new, legacyData);
            migrationResults[mapping.new] = migrated;

            if (migrated) {
              console.log(`✅ Migrated ${mapping.new} from ${mapping.legacy}`);
              anyDataMigrated = true;

              // Create backup of legacy data
              await this.storage.setItem(
                `${mapping.legacy}_backup_${Date.now()}`,
                {
                  ...legacyData,
                  migratedAt: new Date().toISOString(),
                  migratedTo: this.getUserKey(mapping.new),
                  originalUserId: this.userId,
                },
              );

              console.log(`📦 Created backup of ${mapping.legacy}`);
            }
          } else {
            console.log(
              `ℹ️ ${mapping.new} already exists in new format, skipping migration`,
            );
            migrationResults[mapping.new] = true;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to migrate ${mapping.legacy}:`, error);
        migrationResults[mapping.legacy] = false;
      }
    }

    console.log('📊 Migration results:', migrationResults);

    if (anyDataMigrated) {
      console.log('✅ Legacy data migration completed successfully');
    } else {
      console.log('ℹ️ No legacy data found to migrate');
    }

    return migrationResults;
  }

  /**
   * Get comprehensive user profile
   */
  async getUserProfile(): Promise<UserProfile> {
    try {
      const [setupData, transactionData, categories] = await Promise.all([
        this.getUserData('user_setup'),
        this.getUserData('transactions'),
        this.getUserData('categories'),
      ]);

      // Check welcome status (might be global or user-specific)
      let hasSeenWelcome = false;
      try {
        const userWelcome = await this.getUserData('has_seen_welcome');
        const globalWelcome = await this.storage.getItem('app.hasSeenWelcome');
        hasSeenWelcome = userWelcome === true || globalWelcome === true;
      } catch (error) {
        console.warn('⚠️ Could not check welcome status:', error);
      }

      const transactionCount = this.getTransactionCount(transactionData);
      const lastActivity = this.getLastActivity(
        setupData,
        transactionData,
        categories,
      );

      return {
        userId: this.userId,
        hasCompletedSetup: !!setupData,
        setupData,
        transactionCount,
        hasCategories: !!categories,
        hasSeenWelcome,
        lastActivity,
      };
    } catch (error) {
      console.error('❌ Failed to get user profile:', error);
      return {
        userId: this.userId,
        hasCompletedSetup: false,
        transactionCount: 0,
        hasCategories: false,
        hasSeenWelcome: false,
      };
    }
  }

  /**
   * Set welcome status for user
   */
  async setWelcomeComplete(): Promise<void> {
    try {
      await this.setUserData('has_seen_welcome', true);
      // Also set global for backward compatibility
      await this.storage.setItem('app.hasSeenWelcome', true);
      console.log('✅ Welcome status saved for user');
    } catch (error) {
      console.error('❌ Failed to save welcome status:', error);
    }
  }

  /**
   * Helper: Get transaction count from transaction data
   */
  private getTransactionCount(transactionData: any): number {
    if (!transactionData) {
      return 0;
    }

    if (Array.isArray(transactionData)) {
      return transactionData.length;
    }

    if (
      transactionData.transactions &&
      Array.isArray(transactionData.transactions)
    ) {
      return transactionData.transactions.length;
    }

    return 0;
  }

  /**
   * Helper: Get last activity timestamp
   */
  private getLastActivity(...dataObjects: any[]): string | undefined {
    const timestamps: string[] = [];

    for (const data of dataObjects) {
      if (data?.lastUpdated) {
        timestamps.push(data.lastUpdated);
      }
      if (data?.createdAt) {
        timestamps.push(data.createdAt);
      }
      if (data?.updatedAt) {
        timestamps.push(data.updatedAt);
      }
    }

    if (timestamps.length === 0) {
      return undefined;
    }

    // Return the most recent timestamp
    return timestamps.sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    )[0];
  }

  /**
   * Delete all user data (for account deletion)
   */
  async deleteAllUserData(): Promise<boolean> {
    try {
      console.log('🗑️ Deleting all user data...');

      const dataTypes = [
        'user_setup',
        'transactions',
        'categories',
        'has_seen_welcome',
      ];

      const deletePromises = dataTypes.map(dataType =>
        this.removeUserData(dataType),
      );
      const results = await Promise.all(deletePromises);

      const allDeleted = results.every(result => result === true);

      if (allDeleted) {
        console.log('✅ All user data deleted successfully');
      } else {
        console.warn('⚠️ Some user data may not have been deleted');
      }

      return allDeleted;
    } catch (error) {
      console.error('❌ Failed to delete user data:', error);
      return false;
    }
  }
}

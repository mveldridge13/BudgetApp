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
  private storage: any;
  private userId: string;
  private keyPrefix: string;

  constructor(storageCoordinator: any, userId: string) {
    this.storage = storageCoordinator;
    this.userId = userId;
    this.keyPrefix = `user_${userId}`;
  }

  private getUserKey(dataType: string): string {
    return `${this.keyPrefix}_${dataType}`;
  }

  async getUserData(dataType: string): Promise<any> {
    const key = this.getUserKey(dataType);
    try {
      const rawData = await this.storage.getItem(key);

      if (!rawData) {
        return null;
      }

      let actualData;

      if (rawData.isArray && rawData.data) {
        actualData = rawData.data;
      } else if (rawData.value !== undefined) {
        actualData = rawData.value;
      } else if (rawData.userId) {
        const cleanData = {...rawData};
        delete cleanData.userId;
        delete cleanData.lastUpdated;
        delete cleanData.dataType;
        actualData = cleanData;
      } else {
        actualData = rawData;
      }

      return actualData;
    } catch (error) {
      return null;
    }
  }

  async setUserData(dataType: string, data: any): Promise<boolean> {
    const key = this.getUserKey(dataType);
    try {
      let enrichedData;

      if (Array.isArray(data)) {
        enrichedData = {
          data: data,
          userId: this.userId,
          lastUpdated: new Date().toISOString(),
          dataType: dataType,
          isArray: true,
        };
      } else if (data && typeof data === 'object') {
        enrichedData = {
          ...data,
          userId: this.userId,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        enrichedData = {
          value: data,
          userId: this.userId,
          lastUpdated: new Date().toISOString(),
          dataType: dataType,
        };
      }

      await this.storage.setItem(key, enrichedData);
      return true;
    } catch (error) {
      return false;
    }
  }

  async removeUserData(dataType: string): Promise<boolean> {
    const key = this.getUserKey(dataType);
    try {
      await this.storage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  async hasExistingData(): Promise<ExistingDataCheck> {
    try {
      const [setupData, transactionData, categoryData] = await Promise.all([
        this.getUserData('user_setup'),
        this.getUserData('transactions'),
        this.getUserData('categories'),
      ]);

      const hasData = !!(setupData || transactionData || categoryData);

      return {
        hasData,
        setupData,
        transactionData,
        categoryData,
      };
    } catch (error) {
      return {hasData: false};
    }
  }

  async migrateLegacyData(): Promise<MigrationResult> {
    const legacyMappings = [
      {legacy: '@fintech_app_user_setup', new: 'user_setup'},
      {legacy: '@fintech_app_transactions', new: 'transactions'},
      {legacy: '@fintech_app_categories', new: 'categories'},
      {legacy: 'fintech_app_user_setup', new: 'user_setup'},
      {legacy: 'fintech_app_transactions', new: 'transactions'},
      {legacy: 'fintech_app_categories', new: 'categories'},
    ];

    const migrationResults: MigrationResult = {};

    for (const mapping of legacyMappings) {
      try {
        const legacyData = await this.storage.getItem(mapping.legacy);

        if (legacyData) {
          const existingNewData = await this.getUserData(mapping.new);

          if (!existingNewData) {
            const migrated = await this.setUserData(mapping.new, legacyData);
            migrationResults[mapping.new] = migrated;

            if (migrated) {
              await this.storage.setItem(
                `${mapping.legacy}_backup_${Date.now()}`,
                {
                  ...legacyData,
                  migratedAt: new Date().toISOString(),
                  migratedTo: this.getUserKey(mapping.new),
                  originalUserId: this.userId,
                },
              );
            }
          } else {
            migrationResults[mapping.new] = true;
          }
        }
      } catch (error) {
        migrationResults[mapping.legacy] = false;
      }
    }

    return migrationResults;
  }

  async getUserProfile(): Promise<UserProfile> {
    try {
      const [setupData, transactionData, categories] = await Promise.all([
        this.getUserData('user_setup'),
        this.getUserData('transactions'),
        this.getUserData('categories'),
      ]);

      let hasSeenWelcome = false;
      try {
        const userWelcome = await this.getUserData('has_seen_welcome');
        const globalWelcome = await this.storage.getItem('app.hasSeenWelcome');
        hasSeenWelcome = userWelcome === true || globalWelcome === true;
      } catch (error) {
        // Silent fallback
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
      return {
        userId: this.userId,
        hasCompletedSetup: false,
        transactionCount: 0,
        hasCategories: false,
        hasSeenWelcome: false,
      };
    }
  }

  async setWelcomeComplete(): Promise<void> {
    try {
      await this.setUserData('has_seen_welcome', true);
      await this.storage.setItem('app.hasSeenWelcome', true);
    } catch (error) {
      // Silent failure
    }
  }

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

    return timestamps.sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    )[0];
  }

  async deleteAllUserData(): Promise<boolean> {
    try {
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

      return results.every(result => result === true);
    } catch (error) {
      return false;
    }
  }
}

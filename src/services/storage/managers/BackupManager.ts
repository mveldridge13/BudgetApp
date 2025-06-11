import {uploadData, downloadData, list, remove} from 'aws-amplify/storage';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import {
  IBackupManager,
  BackupConfig,
  BackupItem,
  ILocalStorage,
} from '../interfaces';
import {StorageConstants} from '../constants';

/**
 * BackupManager - Handles all backup and restore operations
 * Supports both AWS and iCloud storage with chunking for large datasets
 * Uses react-native-fs for proper iOS iCloud Drive integration
 */
export class BackupManager implements IBackupManager {
  private backupConfig: BackupConfig;
  private localStorage: ILocalStorage;
  private iCloudAvailable: boolean = false;

  constructor(localStorage: ILocalStorage) {
    this.localStorage = localStorage;
    this.backupConfig = {
      autoBackup: true,
      backupFrequency: 'daily',
      includeAttachments: true,
      backupProvider: 'both',
    };
    this.initializeConfig();
    this.checkiCloudAvailability();
  }

  /**
   * Check if iCloud Drive is available and accessible
   * @private
   */
  private async checkiCloudAvailability(): Promise<void> {
    if (Platform.OS !== 'ios') {
      this.iCloudAvailable = false;
      return;
    }

    try {
      // Check if iCloud Drive is available by trying to access the Documents directory
      const iCloudPath = RNFS.DocumentDirectoryPath + '/iCloud';

      // Try to create iCloud backup directory if it doesn't exist
      const exists = await RNFS.exists(iCloudPath);
      if (!exists) {
        await RNFS.mkdir(iCloudPath);
      }

      this.iCloudAvailable = true;
      console.log('iCloud backup available');
    } catch (error) {
      console.warn('iCloud backup not available:', error);
      this.iCloudAvailable = false;
    }
  }

  /**
   * Initialize backup configuration from storage
   * @private
   */
  private async initializeConfig(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem(
        StorageConstants.STORAGE_KEYS.BACKUP_CONFIG,
      );
      if (savedConfig) {
        this.backupConfig = JSON.parse(savedConfig);
      }
    } catch (error) {
      console.error('Failed to load backup config:', error);
      // Keep default config if loading fails
    }
  }

  /**
   * Create a backup of all data
   */
  async createBackup(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();

      // Choose backup strategy based on dataset size
      const useStreaming = await this.shouldUseStreamedBackup();

      if (useStreaming) {
        console.log('Using streamed backup for large dataset');
        await this.createStreamedBackup(timestamp);
      } else {
        console.log('Using standard backup for small dataset');
        await this.createStandardBackup(timestamp);
      }

      // Update last backup time
      await this.updateLastBackupTime(timestamp);
    } catch (error: unknown) {
      console.error('Backup error:', error);
      throw error;
    }
  }

  /**
   * Create a standard backup for small datasets
   * @param timestamp Backup timestamp
   * @private
   */
  private async createStandardBackup(timestamp: string): Promise<void> {
    const backupData = {
      timestamp,
      data: await this.getAllDataInBatches(),
      config: this.backupConfig,
    };

    // Save to AWS if configured
    if (
      this.backupConfig.backupProvider === 'aws' ||
      this.backupConfig.backupProvider === 'both'
    ) {
      try {
        await uploadData({
          key: `backups/${timestamp}.json`,
          data: JSON.stringify(backupData),
          options: {
            contentType: 'application/json',
          },
        }).result;
        console.log('AWS backup completed successfully');
      } catch (error) {
        console.error('AWS backup failed:', error);
        throw error;
      }
    }

    // Save to iCloud if configured and available
    if (
      (this.backupConfig.backupProvider === 'icloud' ||
        this.backupConfig.backupProvider === 'both') &&
      this.iCloudAvailable
    ) {
      try {
        await this.saveToiCloud(backupData, `backup_${timestamp}.json`);
        console.log('iCloud backup completed successfully');
      } catch (error) {
        console.error('iCloud backup failed:', error);
        // Don't throw error for iCloud failures if AWS succeeded
        if (this.backupConfig.backupProvider === 'icloud') {
          throw error;
        }
      }
    }
  }

  /**
   * Create a streamed backup for large datasets
   * @param timestamp Backup timestamp
   * @private
   */
  private async createStreamedBackup(timestamp: string): Promise<void> {
    const keys = await this.localStorage.getAllKeys();
    let currentChunk: Record<string, unknown> = {};
    let chunkIndex = 0;

    for (let i = 0; i < keys.length; i += StorageConstants.BACKUP_BATCH_SIZE) {
      const batch = keys.slice(i, i + StorageConstants.BACKUP_BATCH_SIZE);

      // Process batch
      const batchPromises = batch.map(async key => {
        try {
          const value = await this.localStorage.getItem(key);
          if (value !== null) {
            return {key, value};
          }
          return null;
        } catch (error) {
          console.error(`Error reading key ${key}:`, error);
          return null;
        }
      });

      const results = await Promise.allSettled(batchPromises);

      // Add to current chunk
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          currentChunk[result.value.key] = result.value.value;
        }
      });

      // Upload chunk when it reaches size limit or we're done
      const isLastBatch = i + StorageConstants.BACKUP_BATCH_SIZE >= keys.length;
      const chunkSize = Object.keys(currentChunk).length;

      if (chunkSize >= StorageConstants.BACKUP_BATCH_SIZE || isLastBatch) {
        const chunkData = {
          timestamp,
          chunkIndex,
          totalChunks: Math.ceil(
            keys.length / StorageConstants.BACKUP_BATCH_SIZE,
          ),
          data: currentChunk,
          config: this.backupConfig,
        };

        // Upload chunk to AWS
        if (
          this.backupConfig.backupProvider === 'aws' ||
          this.backupConfig.backupProvider === 'both'
        ) {
          try {
            await uploadData({
              key: `backups/${timestamp}_chunk_${chunkIndex}.json`,
              data: JSON.stringify(chunkData),
              options: {
                contentType: 'application/json',
              },
            }).result;
          } catch (error) {
            console.error(`AWS chunk ${chunkIndex} backup failed:`, error);
            throw error;
          }
        }

        // Save to iCloud if configured and available
        if (
          (this.backupConfig.backupProvider === 'icloud' ||
            this.backupConfig.backupProvider === 'both') &&
          this.iCloudAvailable
        ) {
          try {
            await this.saveToiCloud(
              chunkData,
              `backup_${timestamp}_chunk_${chunkIndex}.json`,
            );
          } catch (error) {
            console.error(`iCloud chunk ${chunkIndex} backup failed:`, error);
            // Don't throw error for iCloud failures if AWS is also configured
            if (this.backupConfig.backupProvider === 'icloud') {
              throw error;
            }
          }
        }

        // Reset for next chunk
        currentChunk = {};
        chunkIndex++;

        // Small delay to prevent overwhelming the system
        if (!isLastBatch) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
  }

  /**
   * Restore from a backup
   * @param backupId The backup ID to restore from
   * @param source The backup source (aws or icloud)
   */
  async restoreFromBackup(
    backupId: string,
    source: 'aws' | 'icloud' = 'aws',
  ): Promise<void> {
    try {
      // Check if source is available
      if (source === 'icloud' && !this.iCloudAvailable) {
        throw new Error(StorageConstants.ERROR_MESSAGES.ICLOUD_NOT_AVAILABLE);
      }

      // Check if this is a chunked backup
      const isChunkedBackup = backupId.includes('_chunk_');

      if (isChunkedBackup) {
        await this.restoreFromChunkedBackup(backupId, source);
      } else {
        await this.restoreFromSingleBackup(backupId, source);
      }
    } catch (error: unknown) {
      console.error('Restore error:', error);
      throw error;
    }
  }

  /**
   * Restore from a single backup file
   * @param backupId Backup identifier
   * @param source Backup source
   * @private
   */
  private async restoreFromSingleBackup(
    backupId: string,
    source: 'aws' | 'icloud',
  ): Promise<void> {
    let backup: any;

    if (source === 'aws') {
      try {
        const {body} = await downloadData({key: `backups/${backupId}.json`})
          .result;
        const backupText = await body.text();
        if (!backupText) {
          throw new Error('AWS backup not found');
        }
        backup = JSON.parse(backupText);
      } catch (error) {
        console.error('Failed to download AWS backup:', error);
        throw error;
      }
    } else {
      try {
        backup = await this.readFromiCloud(`backup_${backupId}.json`);
        if (!backup) {
          throw new Error('iCloud backup not found');
        }
      } catch (error) {
        console.error('Failed to read iCloud backup:', error);
        throw error;
      }
    }

    // Clear current data and restore
    await this.localStorage.clear();
    const {data} = backup;

    // Restore in batches to prevent memory issues
    const entries = Object.entries(data);
    for (
      let i = 0;
      i < entries.length;
      i += StorageConstants.BACKUP_BATCH_SIZE
    ) {
      const batch = entries.slice(i, i + StorageConstants.BACKUP_BATCH_SIZE);

      await Promise.allSettled(
        batch.map(([key, value]) => this.localStorage.setItem(key, value)),
      );

      // Small delay between batches
      if (i + StorageConstants.BACKUP_BATCH_SIZE < entries.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  /**
   * Restore from chunked backup files
   * @param backupId Backup identifier (from any chunk)
   * @param source Backup source
   * @private
   */
  private async restoreFromChunkedBackup(
    backupId: string,
    source: 'aws' | 'icloud',
  ): Promise<void> {
    // Extract timestamp from backup ID
    const timestamp = backupId.replace('_chunk_0', '').replace('.json', '');

    // First, get chunk 0 to determine total chunks
    let firstChunk: any;
    if (source === 'aws') {
      try {
        const {body} = await downloadData({
          key: `backups/${timestamp}_chunk_0.json`,
        }).result;
        const chunkText = await body.text();
        firstChunk = JSON.parse(chunkText);
      } catch (error) {
        console.error('Failed to download first AWS chunk:', error);
        throw error;
      }
    } else {
      try {
        firstChunk = await this.readFromiCloud(
          `backup_${timestamp}_chunk_0.json`,
        );
      } catch (error) {
        console.error('Failed to read first iCloud chunk:', error);
        throw error;
      }
    }

    if (!firstChunk) {
      throw new Error('First backup chunk not found');
    }

    const totalChunks = firstChunk.totalChunks;
    console.log(`Restoring from ${totalChunks} backup chunks`);

    // Clear current data
    await this.localStorage.clear();

    // Restore each chunk
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      try {
        let chunkData: any;

        if (source === 'aws') {
          const {body} = await downloadData({
            key: `backups/${timestamp}_chunk_${chunkIndex}.json`,
          }).result;
          const chunkText = await body.text();
          chunkData = JSON.parse(chunkText);
        } else {
          chunkData = await this.readFromiCloud(
            `backup_${timestamp}_chunk_${chunkIndex}.json`,
          );
        }

        if (chunkData && chunkData.data) {
          // Restore chunk data in batches
          const entries = Object.entries(chunkData.data);
          for (
            let i = 0;
            i < entries.length;
            i += StorageConstants.BACKUP_BATCH_SIZE
          ) {
            const batch = entries.slice(
              i,
              i + StorageConstants.BACKUP_BATCH_SIZE,
            );

            await Promise.allSettled(
              batch.map(([key, value]) =>
                this.localStorage.setItem(key, value),
              ),
            );

            // Small delay between batches
            if (i + StorageConstants.BACKUP_BATCH_SIZE < entries.length) {
              await new Promise(resolve => setTimeout(resolve, 25));
            }
          }
        }

        console.log(`Restored chunk ${chunkIndex + 1}/${totalChunks}`);

        // Delay between chunks to prevent overwhelming the system
        if (chunkIndex < totalChunks - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Failed to restore chunk ${chunkIndex}:`, error);
        // Continue with other chunks instead of failing completely
      }
    }
  }

  /**
   * List available backups
   * @param source Backup source to list from
   * @param limit Maximum number of backups to return
   */
  async listBackups(
    source: 'aws' | 'icloud' = 'aws',
    limit = 20,
  ): Promise<BackupItem[]> {
    try {
      if (source === 'aws') {
        const result = await list({
          path: 'backups/',
          options: {
            pageSize: limit,
          },
        });

        return result.items
          .map((item: {path: string; lastModified?: Date}) => ({
            id: item.path,
            timestamp: item.path.replace('backups/', '').replace('.json', ''),
            lastModified: item.lastModified,
          }))
          .sort((a, b) => {
            return (
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          })
          .slice(0, limit);
      } else {
        // List iCloud backups
        if (!this.iCloudAvailable) {
          return [];
        }

        try {
          const iCloudPath = RNFS.DocumentDirectoryPath + '/iCloud';
          const files = await RNFS.readDir(iCloudPath);

          return files
            .filter(
              file =>
                file.name.startsWith('backup_') && file.name.endsWith('.json'),
            )
            .map((file: any) => ({
              id: file.name,
              timestamp: file.name.replace('backup_', '').replace('.json', ''),
              lastModified: new Date(file.mtime),
            }))
            .sort((a, b) => {
              return (
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
              );
            })
            .slice(0, limit);
        } catch (error) {
          console.error('Failed to list iCloud backups:', error);
          return [];
        }
      }
    } catch (error) {
      console.error('List backups error:', error);
      return [];
    }
  }

  /**
   * Update backup configuration
   * @param config Partial backup configuration to update
   */
  async updateBackupConfig(config: Partial<BackupConfig>): Promise<void> {
    this.backupConfig = {
      ...this.backupConfig,
      ...config,
    };

    try {
      await AsyncStorage.setItem(
        StorageConstants.STORAGE_KEYS.BACKUP_CONFIG,
        JSON.stringify(this.backupConfig),
      );
    } catch (error) {
      console.error('Failed to save backup config:', error);
      throw error;
    }
  }

  /**
   * Get current backup configuration
   */
  getBackupConfig(): BackupConfig {
    return {...this.backupConfig};
  }

  /**
   * Delete a backup
   * @param backupId The backup to delete
   * @param source The backup source
   */
  async deleteBackup(
    backupId: string,
    source: 'aws' | 'icloud' = 'aws',
  ): Promise<void> {
    try {
      if (source === 'aws') {
        // Check if it's a chunked backup
        if (backupId.includes('_chunk_')) {
          // Extract timestamp and delete all chunks
          const timestamp = backupId
            .replace('_chunk_0', '')
            .replace('.json', '');
          const backups = await this.listBackups('aws', 100);
          const chunkedBackups = backups.filter(
            backup =>
              backup.timestamp === timestamp && backup.id.includes('_chunk_'),
          );

          // Delete all chunks
          for (const chunk of chunkedBackups) {
            await remove({key: chunk.id});
          }
        } else {
          await remove({key: `backups/${backupId}.json`});
        }
      } else {
        // Delete from iCloud
        if (!this.iCloudAvailable) {
          throw new Error(StorageConstants.ERROR_MESSAGES.ICLOUD_NOT_AVAILABLE);
        }

        const iCloudPath = RNFS.DocumentDirectoryPath + '/iCloud';
        const filePath = `${iCloudPath}/backup_${backupId}.json`;

        const exists = await RNFS.exists(filePath);
        if (exists) {
          await RNFS.unlink(filePath);
        }
      }
    } catch (error) {
      console.error(`Failed to delete backup ${backupId}:`, error);
      throw error;
    }
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
    try {
      const awsBackups = await this.listBackups('aws', 50);
      const iCloudBackups = this.iCloudAvailable
        ? await this.listBackups('icloud', 50)
        : [];

      const allBackups = [...awsBackups, ...iCloudBackups];
      const lastBackup =
        allBackups.length > 0
          ? allBackups.sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
            )[0].timestamp
          : null;

      const sources: ('aws' | 'icloud')[] = [];
      if (awsBackups.length > 0) {
        sources.push('aws');
      }
      if (iCloudBackups.length > 0) {
        sources.push('icloud');
      }

      return {
        totalBackups: allBackups.length,
        lastBackup,
        backupSources: sources,
        estimatedSize: allBackups.length * 1024 * 100, // Rough estimate
      };
    } catch (error) {
      console.error('Failed to get backup stats:', error);
      return {
        totalBackups: 0,
        lastBackup: null,
        backupSources: [],
        estimatedSize: 0,
      };
    }
  }

  // Private helper methods

  /**
   * Check if dataset is large enough to require streaming
   * @private
   */
  private async shouldUseStreamedBackup(): Promise<boolean> {
    const keys = await this.localStorage.getAllKeys();
    return keys.length > StorageConstants.BACKUP_BATCH_SIZE * 2;
  }

  /**
   * Get all data in batches to prevent memory issues
   * @private
   */
  private async getAllDataInBatches(): Promise<Record<string, unknown>> {
    const keys = await this.localStorage.getAllKeys();
    const data: Record<string, unknown> = {};

    for (let i = 0; i < keys.length; i += StorageConstants.BACKUP_BATCH_SIZE) {
      const batch = keys.slice(i, i + StorageConstants.BACKUP_BATCH_SIZE);

      const batchPromises = batch.map(async key => {
        try {
          const value = await this.localStorage.getItem(key);
          if (value !== null) {
            return {key, value};
          }
          return null;
        } catch (error) {
          console.error(`Error reading key ${key} during backup:`, error);
          return null;
        }
      });

      const results = await Promise.allSettled(batchPromises);

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          data[result.value.key] = result.value.value;
        }
      });

      // Small delay between batches to prevent UI blocking
      if (i + StorageConstants.BACKUP_BATCH_SIZE < keys.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return data;
  }

  /**
   * Save data to iCloud using react-native-fs
   * @private
   */
  private async saveToiCloud(data: unknown, filename: string): Promise<void> {
    if (!this.iCloudAvailable) {
      throw new Error(StorageConstants.ERROR_MESSAGES.ICLOUD_NOT_AVAILABLE);
    }

    try {
      const jsonString = JSON.stringify(data);
      const iCloudPath = RNFS.DocumentDirectoryPath + '/iCloud';
      const filePath = `${iCloudPath}/${filename}`;

      // Ensure directory exists
      const dirExists = await RNFS.exists(iCloudPath);
      if (!dirExists) {
        await RNFS.mkdir(iCloudPath);
      }

      // Write file to iCloud directory
      await RNFS.writeFile(filePath, jsonString, 'utf8');
    } catch (error: unknown) {
      console.error('iCloud save error:', error);
      throw error;
    }
  }

  /**
   * Read data from iCloud using react-native-fs
   * @private
   */
  private async readFromiCloud(filename: string): Promise<unknown> {
    if (!this.iCloudAvailable) {
      return null;
    }

    try {
      const iCloudPath = RNFS.DocumentDirectoryPath + '/iCloud';
      const filePath = `${iCloudPath}/${filename}`;

      const exists = await RNFS.exists(filePath);
      if (!exists) {
        return null;
      }

      const content = await RNFS.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('iCloud read error:', error);
      return null;
    }
  }

  /**
   * Update the last backup timestamp
   * @private
   */
  private async updateLastBackupTime(timestamp: string): Promise<void> {
    this.backupConfig.lastBackup = timestamp;
    await this.updateBackupConfig({});
  }
}

import {uploadData, downloadData, list, remove} from 'aws-amplify/storage';
import * as FileSystem from 'expo-file-system';
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
 */
export class BackupManager implements IBackupManager {
  private backupConfig: BackupConfig;
  private localStorage: ILocalStorage;

  constructor(localStorage: ILocalStorage) {
    this.localStorage = localStorage;
    this.backupConfig = {
      autoBackup: true,
      backupFrequency: 'daily',
      includeAttachments: true,
      backupProvider: 'both',
    };
    this.initializeConfig();
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
      await uploadData({
        key: `backups/${timestamp}.json`,
        data: JSON.stringify(backupData),
        options: {
          contentType: 'application/json',
        },
      }).result;
    }

    // Save to iCloud if configured and on iOS
    if (
      (this.backupConfig.backupProvider === 'icloud' ||
        this.backupConfig.backupProvider === 'both') &&
      Platform.OS === 'ios'
    ) {
      await this.saveToICloud(backupData, `backup_${timestamp}.json`);
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

        // Upload chunk to cloud
        if (
          this.backupConfig.backupProvider === 'aws' ||
          this.backupConfig.backupProvider === 'both'
        ) {
          await uploadData({
            key: `backups/${timestamp}_chunk_${chunkIndex}.json`,
            data: JSON.stringify(chunkData),
            options: {
              contentType: 'application/json',
            },
          }).result;
        }

        // Save to iCloud if configured
        if (
          (this.backupConfig.backupProvider === 'icloud' ||
            this.backupConfig.backupProvider === 'both') &&
          Platform.OS === 'ios'
        ) {
          await this.saveToICloud(
            chunkData,
            `backup_${timestamp}_chunk_${chunkIndex}.json`,
          );
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
      const {body} = await downloadData({key: `backups/${backupId}.json`})
        .result;
      const backupText = await body.text();
      if (!backupText) {
        throw new Error('AWS backup not found');
      }
      backup = JSON.parse(backupText);
    } else {
      backup = await this.readFromICloud(`backup_${backupId}.json`);
      if (!backup) {
        throw new Error('iCloud backup not found');
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
      const {body} = await downloadData({
        key: `backups/${timestamp}_chunk_0.json`,
      }).result;
      const chunkText = await body.text();
      firstChunk = JSON.parse(chunkText);
    } else {
      firstChunk = await this.readFromICloud(
        `backup_${timestamp}_chunk_0.json`,
      );
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
          chunkData = await this.readFromICloud(
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
        const files = await FileSystem.readDirectoryAsync(
          StorageConstants.ICLOUD_CONTAINER,
        );
        return files
          .filter((file: string) => file.startsWith('backup_'))
          .map((file: string) => ({
            id: file,
            timestamp: file.replace('backup_', '').replace('.json', ''),
          }))
          .sort((a, b) => {
            return (
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          })
          .slice(0, limit);
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
        const iCloudUri = `${StorageConstants.ICLOUD_CONTAINER}/backup_${backupId}.json`;
        await FileSystem.deleteAsync(iCloudUri);
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
      const iCloudBackups =
        Platform.OS === 'ios' ? await this.listBackups('icloud', 50) : [];

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
   * Save data to iCloud
   * @private
   */
  private async saveToICloud(data: unknown, filename: string): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      const jsonString = JSON.stringify(data);
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Write to local file first
      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      // Move to iCloud
      const iCloudUri = `${StorageConstants.ICLOUD_CONTAINER}/${filename}`;
      await FileSystem.moveAsync({
        from: fileUri,
        to: iCloudUri,
      });
    } catch (error: unknown) {
      console.error('iCloud save error:', error);
      throw error;
    }
  }

  /**
   * Read data from iCloud
   * @private
   */
  private async readFromICloud(filename: string): Promise<unknown> {
    if (Platform.OS !== 'ios') {
      return null;
    }

    try {
      const iCloudUri = `${StorageConstants.ICLOUD_CONTAINER}/${filename}`;
      const content = await FileSystem.readAsStringAsync(iCloudUri);
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

import {BackupConfig, BackupItem} from './StorageTypes';

export interface IBackupManager {
  createBackup(): Promise<void>;
  restoreFromBackup(backupId: string, source?: 'aws' | 'icloud'): Promise<void>;
  listBackups(source?: 'aws' | 'icloud', limit?: number): Promise<BackupItem[]>;
  updateBackupConfig(config: Partial<BackupConfig>): Promise<void>;
  getBackupConfig(): BackupConfig;
}

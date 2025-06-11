export interface SyncStatus {
  lastSynced: string;
  status: 'synced' | 'pending' | 'error';
  error?: string;
}

export interface BackupConfig {
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  lastBackup?: string;
  includeAttachments: boolean;
  backupProvider: 'aws' | 'icloud' | 'both';
}

export interface BackupItem {
  id: string;
  timestamp: string;
  lastModified?: Date;
}

export interface QueueItem {
  key: string;
  value: any;
  operation: 'set' | 'remove';
  timestamp: number;
}

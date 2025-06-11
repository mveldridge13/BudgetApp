export class StorageConstants {
  // Sync settings
  static readonly SYNC_DEBOUNCE_MS = 1000;
  static readonly MAX_SYNC_RETRIES = 3;
  static readonly PERIODIC_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  static readonly SYNC_BATCH_SIZE = 20;

  // Queue settings
  static readonly MAX_QUEUE_SIZE = 100;
  static readonly QUEUE_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
  static readonly MAX_QUEUE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  // Backup settings
  static readonly BACKUP_BATCH_SIZE = 50;
  static readonly BACKUP_CHUNK_SIZE = 1000; // Number of items per backup chunk
  static readonly BACKUP_DELAY_MS = 50; // Delay between backup batches
  static readonly BACKUP_RETRY_DELAY_MS = 100; // Delay between backup retries

  // Storage keys
  static readonly STORAGE_KEYS = {
    LAST_SYNC: '@last_sync',
    BACKUP_CONFIG: '@backup_config',
    SYNC_QUEUE: '@sync_queue',
    SYNC_STATUS: '@sync_status',
  };

  // iCloud settings
  static readonly ICLOUD_CONTAINER = 'iCloud.com.yourapp.budgetapp';
  static readonly ICLOUD_BACKUP_PREFIX = 'backup_';
  static readonly ICLOUD_BACKUP_EXTENSION = '.json';

  // AWS Storage paths
  static readonly STORAGE_PATHS = {
    DATA_PREFIX: 'data/',
    BACKUP_PREFIX: 'backups/',
  };

  // Error messages
  static readonly ERROR_MESSAGES = {
    SYNC_FAILED: 'Failed to sync with cloud',
    BACKUP_FAILED: 'Failed to create backup',
    RESTORE_FAILED: 'Failed to restore from backup',
    ICLOUD_NOT_AVAILABLE: 'iCloud is not available on this device',
  };
}

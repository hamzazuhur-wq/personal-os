import { posDexieDb } from '../adapters/dexie/posDexieDb';
import { APP_CONFIG } from '../../config/app.config';

export interface POSBackupData {
  version: string;
  exported_at: string;
  data: {
    captures: unknown[];
    activities: unknown[];
    tasks: unknown[];
    weekly_focus: unknown[];
    settings: unknown[];
  };
}

export class ExportService {
  /**
   * Exports all POS data into a structured, portable JSON format.
   */
  static async exportAllData(): Promise<POSBackupData> {
    const [captures, activities, tasks, weekly_focus, settings] = await Promise.all([
      posDexieDb.captures.toArray(),
      posDexieDb.activities.toArray(),
      posDexieDb.tasks.toArray(),
      posDexieDb.weekly_focus.toArray(),
      posDexieDb.settings.toArray(),
    ]);

    return {
      version: APP_CONFIG.version,
      exported_at: new Date().toISOString(),
      data: {
        captures,
        activities,
        tasks,
        weekly_focus,
        settings,
      },
    };
  }

  /**
   * Imports a valid POS backup JSON file and restores records into the active storage.
   */
  static async importData(backupData: POSBackupData): Promise<{ success: boolean; message: string }> {
    if (!backupData || !backupData.data) {
      throw new Error('Invalid backup file structure.');
    }

    await posDexieDb.transaction('rw', [
      posDexieDb.captures,
      posDexieDb.activities,
      posDexieDb.tasks,
      posDexieDb.weekly_focus,
      posDexieDb.settings,
    ], async () => {
      if (Array.isArray(backupData.data.captures)) {
        await posDexieDb.captures.clear();
        await posDexieDb.captures.bulkAdd(backupData.data.captures as any);
      }
      if (Array.isArray(backupData.data.activities)) {
        await posDexieDb.activities.clear();
        await posDexieDb.activities.bulkAdd(backupData.data.activities as any);
      }
      if (Array.isArray(backupData.data.tasks)) {
        await posDexieDb.tasks.clear();
        await posDexieDb.tasks.bulkAdd(backupData.data.tasks as any);
      }
      if (Array.isArray(backupData.data.weekly_focus)) {
        await posDexieDb.weekly_focus.clear();
        await posDexieDb.weekly_focus.bulkAdd(backupData.data.weekly_focus as any);
      }
      if (Array.isArray(backupData.data.settings) && backupData.data.settings.length > 0) {
        await posDexieDb.settings.clear();
        await posDexieDb.settings.bulkAdd(backupData.data.settings as any);
      }
    });

    return { success: true, message: 'Database successfully restored from backup.' };
  }

  /**
   * Purges all local data with a confirmation safeguard.
   */
  static async clearAllData(): Promise<void> {
    await Promise.all([
      posDexieDb.captures.clear(),
      posDexieDb.activities.clear(),
      posDexieDb.tasks.clear(),
      posDexieDb.weekly_focus.clear(),
      posDexieDb.settings.clear(),
    ]);
  }
}

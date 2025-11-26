// フォールバックストレージサービス
// Phase 3-4: IndexedDB非対応・障害時の代替保存

import { db } from './database';
import { logger } from './errors';
import type { DatabaseResult, FishingRecord } from '../types';

export type StorageMode = 'indexeddb' | 'localstorage' | 'sessionstorage' | 'memory';

export interface StorageQuota {
  used: number;
  total: number;
  percentage: number;
  isNearLimit: boolean; // 80%以上
  isFull: boolean; // 100%
}

export interface MigrationResult {
  success: boolean;
  migratedRecords: number;
  errors: string[];
}

export class FallbackStorageService {
  private static readonly LOCALSTORAGE_KEY = 'bite-note-fishing-records';
  private static readonly LOCALSTORAGE_LIMIT = 5 * 1024 * 1024; // 5MB
  private static readonly WARNING_THRESHOLD = 0.8; // 80%

  /**
   * IndexedDB対応状況の確認
   */
  static isIndexedDBAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
    } catch {
      return false;
    }
  }

  /**
   * IndexedDB動作確認（実際に使用可能か）
   */
  static async testIndexedDB(): Promise<boolean> {
    try {
      // プライベートモード等で例外が発生する可能性があるため、実際に操作してテスト
      await db.fishing_records.limit(1).count();
      return true;
    } catch (error) {
      logger.error('[FallbackStorage] IndexedDB test failed', { error });
      return false;
    }
  }

  /**
   * localStorage対応状況の確認
   */
  static isLocalStorageAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return false;
      }

      // 書き込みテスト
      const testKey = '__bite_note_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 最適なストレージモードの決定
   */
  static async determineStorageMode(): Promise<StorageMode> {
    // IndexedDBを最優先
    if (this.isIndexedDBAvailable()) {
      const isWorking = await this.testIndexedDB();
      if (isWorking) {
        return 'indexeddb';
      }
    }

    // localStorageをフォールバック（IndexedDBが使えない場合のみ）
    if (this.isLocalStorageAvailable()) {
      return 'localstorage';
    }

    // localStorageも使えない場合のフォールバック（エラー状態）
    return 'localstorage';
  }

  /**
   * localStorageの使用量を取得
   */
  static getLocalStorageUsage(): StorageQuota {
    let used = 0;

    try {
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          const value = localStorage[key];
          // UTF-16エンコーディングのため、文字数 × 2バイトで計算
          used += (key.length + value.length) * 2;
        }
      }
    } catch (error) {
      logger.error('[FallbackStorage] Failed to calculate localStorage usage', { error });
    }

    const total = this.LOCALSTORAGE_LIMIT;
    const percentage = (used / total) * 100;
    const isNearLimit = percentage >= this.WARNING_THRESHOLD * 100;
    const isFull = percentage >= 100;

    return {
      used,
      total,
      percentage,
      isNearLimit,
      isFull,
    };
  }

  /**
   * localStorageに釣果記録を保存
   */
  static async saveToLocalStorage(records: FishingRecord[]): Promise<DatabaseResult<void>> {
    try {
      // 容量チェック
      const quota = this.getLocalStorageUsage();
      if (quota.isFull) {
        return {
          success: false,
          error: {
            code: 'STORAGE_FULL',
            message: 'localStorage is full. Please export or delete old records.',
            details: quota,
          },
        };
      }

      // JSONに変換して保存
      const jsonData = JSON.stringify(records);
      localStorage.setItem(this.LOCALSTORAGE_KEY, jsonData);

      return { success: true };
    } catch (error) {
      // QuotaExceededError等
      logger.error('[FallbackStorage] Failed to save to localStorage', { error });

      return {
        success: false,
        error: {
          code: 'SAVE_FAILED',
          message: 'Failed to save data to localStorage',
          details: error,
        },
      };
    }
  }

  /**
   * localStorageから釣果記録を読み込み
   */
  static async loadFromLocalStorage(): Promise<DatabaseResult<FishingRecord[]>> {
    try {
      const jsonData = localStorage.getItem(this.LOCALSTORAGE_KEY);
      if (!jsonData) {
        return {
          success: true,
          data: [],
        };
      }

      const records: FishingRecord[] = JSON.parse(jsonData);

      // 日付オブジェクトの復元
      records.forEach((record) => {
        if (typeof record.date === 'string') {
          record.date = new Date(record.date);
        }
        if (typeof record.createdAt === 'string') {
          record.createdAt = new Date(record.createdAt);
        }
        if (typeof record.updatedAt === 'string') {
          record.updatedAt = new Date(record.updatedAt);
        }
      });

      return {
        success: true,
        data: records,
      };
    } catch (error) {
      logger.error('[FallbackStorage] Failed to load from localStorage', { error });

      return {
        success: false,
        error: {
          code: 'LOAD_FAILED',
          message: 'Failed to load data from localStorage',
          details: error,
        },
      };
    }
  }

  /**
   * localStorageからIndexedDBへデータを移行
   */
  static async migrateToIndexedDB(): Promise<DatabaseResult<MigrationResult>> {
    try {
      // localStorageからデータ読み込み
      const loadResult = await this.loadFromLocalStorage();
      if (!loadResult.success || !loadResult.data) {
        return {
          success: false,
          error: {
            code: 'MIGRATION_FAILED',
            message: 'Failed to load data from localStorage',
            details: loadResult.error,
          },
        };
      }

      const records = loadResult.data;
      if (records.length === 0) {
        return {
          success: true,
          data: {
            success: true,
            migratedRecords: 0,
            errors: [],
          },
        };
      }

      // IndexedDBに移行（トランザクション）
      let migratedRecords = 0;
      const errors: string[] = [];

      try {
        await db.transaction('rw', db.fishing_records, async () => {
          for (const record of records) {
            try {
              // IDを除外して追加（新しいIDが生成される）
              const { id, ...recordData } = record;
              await db.fishing_records.add({
                ...recordData,
                id: crypto.randomUUID(), // 新しいIDを生成
              });
              migratedRecords++;
            } catch (error) {
              const errorMsg = `Failed to migrate record ${record.id}: ${error}`;
              logger.error(errorMsg, { recordId: record.id, error });
              errors.push(errorMsg);
            }
          }
        });
      } catch (error) {
        logger.error('[FallbackStorage] Migration transaction failed', { error });
        return {
          success: false,
          error: {
            code: 'MIGRATION_FAILED',
            message: 'Migration transaction failed',
            details: error,
          },
        };
      }

      // 移行成功後、localStorageをクリア
      if (errors.length === 0) {
        localStorage.removeItem(this.LOCALSTORAGE_KEY);
      }

      const result: MigrationResult = {
        success: errors.length === 0,
        migratedRecords,
        errors,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error('[FallbackStorage] Migration failed', { error });
      return {
        success: false,
        error: {
          code: 'MIGRATION_FAILED',
          message: 'Failed to migrate data to IndexedDB',
          details: error,
        },
      };
    }
  }

  /**
   * localStorageにデータが存在するか確認
   */
  static hasLocalStorageData(): boolean {
    try {
      const jsonData = localStorage.getItem(this.LOCALSTORAGE_KEY);
      return jsonData !== null && jsonData !== '';
    } catch {
      return false;
    }
  }

  /**
   * localStorageのデータをクリア
   */
  static clearLocalStorage(): void {
    try {
      localStorage.removeItem(this.LOCALSTORAGE_KEY);
    } catch (error) {
      logger.error('[FallbackStorage] Failed to clear localStorage', { error });
    }
  }

  /**
   * 容量警告が必要か判定
   */
  static needsQuotaWarning(): boolean {
    const quota = this.getLocalStorageUsage();
    return quota.isNearLimit;
  }

  /**
   * 容量エラーか判定
   */
  static isQuotaExceeded(): boolean {
    const quota = this.getLocalStorageUsage();
    return quota.isFull;
  }

  /**
   * 残り容量を取得（バイト）
   */
  static getRemainingQuota(): number {
    const quota = this.getLocalStorageUsage();
    return Math.max(0, quota.total - quota.used);
  }

  /**
   * 残り容量を取得（MB）
   */
  static getRemainingQuotaMB(): number {
    return this.getRemainingQuota() / (1024 * 1024);
  }
}

// サービスインスタンスはstatic methodsのため不要
export const fallbackStorageService = FallbackStorageService;

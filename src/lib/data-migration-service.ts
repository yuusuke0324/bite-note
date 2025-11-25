/**
 * DataMigrationService.ts - データマイグレーション管理
 * スキーマバージョン管理とデータ移行処理
 */

import { db } from './database';
import type { DatabaseResult } from '../types/database';
import { AppError, ErrorSeverity, ErrorCategory } from './errors/ErrorTypes';
import { dataValidationService } from './data-validation-service';
import type { Migration, DataVersion } from './data-validation-service';
import type { PhotoData } from '../types';

/**
 * マイグレーション実行結果
 */
export interface MigrationResult {
  success: boolean;
  appliedMigrations: string[];
  skippedMigrations: string[];
  errors: string[];
}

/**
 * データマイグレーションサービス
 */
export class DataMigrationService {
  private migrations: Migration[] = [];
  private readonly CURRENT_SCHEMA_VERSION = 1;

  constructor() {
    this.registerMigrations();
  }

  /**
   * マイグレーション登録
   * 新しいマイグレーションはここにthis.migrations.push()で追加
   */
  private registerMigrations(): void {
    // 現在登録されているマイグレーションはなし
  }

  /**
   * マイグレーション追加（外部から登録可能）
   */
  registerMigration(migration: Migration): void {
    // 既存のマイグレーションと重複しないかチェック
    if (this.migrations.some((m) => m.id === migration.id)) {
      throw new Error(`Migration with id "${migration.id}" already registered`);
    }

    this.migrations.push(migration);
  }

  /**
   * 未適用のマイグレーション取得
   */
  async getPendingMigrations(): Promise<DatabaseResult<Migration[]>> {
    try {
      const versionResult = await dataValidationService.getDataVersion();

      if (!versionResult.success || !versionResult.data) {
        return {
          success: true,
          data: this.migrations
        };
      }

      const appliedMigrationIds = versionResult.data.migrationsApplied;
      const pendingMigrations = this.migrations.filter(
        (m) => !appliedMigrationIds.includes(m.id)
      );

      return {
        success: true,
        data: pendingMigrations
      };
    } catch (error) {
      return {
        success: false,
        error: new AppError({
          code: 'PENDING_MIGRATIONS_GET_FAILED',
          message: '未適用のマイグレーション取得に失敗しました',
          userMessage: 'マイグレーション情報の取得中にエラーが発生しました',
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.STORAGE,
          cause: error instanceof Error ? error : undefined
        })
      };
    }
  }

  /**
   * マイグレーション実行
   */
  async runMigrations(options: { dryRun?: boolean } = {}): Promise<DatabaseResult<MigrationResult>> {
    const { dryRun = false } = options;
    const appliedMigrations: string[] = [];
    const skippedMigrations: string[] = [];
    const errors: string[] = [];

    try {
      // 未適用のマイグレーションを取得
      const pendingResult = await this.getPendingMigrations();
      if (!pendingResult.success || !pendingResult.data) {
        return {
          success: false,
          error: new AppError({
            code: 'MIGRATION_FAILED',
            message: '未適用のマイグレーション取得に失敗しました',
            userMessage: 'マイグレーション実行中にエラーが発生しました',
            severity: ErrorSeverity.ERROR,
            category: ErrorCategory.STORAGE
          })
        };
      }

      const pendingMigrations = pendingResult.data;

      if (pendingMigrations.length === 0) {
        return {
          success: true,
          data: {
            success: true,
            appliedMigrations: [],
            skippedMigrations: [],
            errors: []
          }
        };
      }

      // トランザクション開始
      if (!dryRun) {
        await db.transaction('rw', [db.fishing_records, db.photos, db.app_settings], async () => {
          for (const migration of pendingMigrations) {
            try {
              // マイグレーション実行
              await migration.up();

              appliedMigrations.push(migration.id);
            } catch (error) {
              const errorMessage = `${migration.id}: ${error instanceof Error ? error.message : String(error)}`;
              errors.push(errorMessage);
              throw error; // トランザクションをロールバック
            }
          }
        });

        // バージョン情報を更新
        const versionResult = await dataValidationService.getDataVersion();
        if (versionResult.success && versionResult.data) {
          const updatedVersion: DataVersion = {
            ...versionResult.data,
            schemaVersion: this.CURRENT_SCHEMA_VERSION,
            migrationsApplied: [
              ...versionResult.data.migrationsApplied,
              ...appliedMigrations
            ],
            lastMigrationDate: new Date()
          };

          await dataValidationService.updateDataVersion(updatedVersion);
        }
      } else {
        // Dry Run
        for (const migration of pendingMigrations) {
          skippedMigrations.push(migration.id);
        }
      }

      return {
        success: true,
        data: {
          success: errors.length === 0,
          appliedMigrations,
          skippedMigrations,
          errors
        }
      };
    } catch (error) {
      return {
        success: false,
        error: new AppError({
          code: 'MIGRATION_EXECUTION_FAILED',
          message: 'マイグレーション実行中にエラーが発生しました',
          userMessage: 'データ移行中にエラーが発生しました。変更はロールバックされました。',
          severity: ErrorSeverity.CRITICAL,
          category: ErrorCategory.STORAGE,
          cause: error instanceof Error ? error : undefined,
          context: {
            appliedMigrations,
            errors
          }
        })
      };
    }
  }

  /**
   * マイグレーションロールバック
   */
  async rollbackMigration(migrationId: string): Promise<DatabaseResult<void>> {
    try {
      const migration = this.migrations.find((m) => m.id === migrationId);

      if (!migration) {
        return {
          success: false,
          error: new AppError({
            code: 'MIGRATION_NOT_FOUND',
            message: `マイグレーション "${migrationId}" が見つかりません`,
            userMessage: '指定されたマイグレーションが見つかりません',
            severity: ErrorSeverity.WARNING,
            category: ErrorCategory.VALIDATION
          })
        };
      }

      if (!migration.down) {
        return {
          success: false,
          error: new AppError({
            code: 'ROLLBACK_NOT_SUPPORTED',
            message: `マイグレーション "${migrationId}" はロールバックをサポートしていません`,
            userMessage: 'このマイグレーションはロールバックできません',
            severity: ErrorSeverity.WARNING,
            category: ErrorCategory.VALIDATION
          })
        };
      }

      // トランザクション内でロールバック実行
      await db.transaction('rw', [db.fishing_records, db.photos, db.app_settings], async () => {
        await migration.down!();
      });

      // バージョン情報からマイグレーションIDを削除
      const versionResult = await dataValidationService.getDataVersion();
      if (versionResult.success && versionResult.data) {
        const updatedVersion: DataVersion = {
          ...versionResult.data,
          migrationsApplied: versionResult.data.migrationsApplied.filter((id: string) => id !== migrationId)
        };

        await dataValidationService.updateDataVersion(updatedVersion);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: new AppError({
          code: 'ROLLBACK_FAILED',
          message: 'ロールバック実行中にエラーが発生しました',
          userMessage: 'マイグレーションのロールバック中にエラーが発生しました',
          severity: ErrorSeverity.CRITICAL,
          category: ErrorCategory.STORAGE,
          cause: error instanceof Error ? error : undefined
        })
      };
    }
  }

  /**
   * データ整合性チェック
   */
  async checkDataIntegrity(): Promise<DatabaseResult<{
    isValid: boolean;
    orphanedPhotos: number;
    invalidRecords: number;
    issues: string[];
  }>> {
    try {
      const issues: string[] = [];
      let orphanedPhotosCount = 0;
      let invalidRecordsCount = 0;

      // 1. 孤立した写真をチェック
      const orphanedPhotosResult = await dataValidationService.findOrphanedPhotos();
      if (orphanedPhotosResult.success && orphanedPhotosResult.data) {
        orphanedPhotosCount = orphanedPhotosResult.data.length;
        if (orphanedPhotosCount > 0) {
          issues.push(`孤立した写真: ${orphanedPhotosCount}件`);
        }
      }

      // 2. 全記録の検証
      const allRecords = await db.fishing_records.toArray();
      for (const record of allRecords) {
        const validationResult = await dataValidationService.validateFishingRecord(record, {
          checkReferences: true,
          strict: true
        });

        if (!validationResult.isValid) {
          invalidRecordsCount++;
          const errors = validationResult.fields
            .filter((f) => !f.isValid)
            .map((f) => f.error)
            .join(', ');
          issues.push(`記録 ${record.id}: ${errors}`);
        }
      }

      const isValid = issues.length === 0;

      return {
        success: true,
        data: {
          isValid,
          orphanedPhotos: orphanedPhotosCount,
          invalidRecords: invalidRecordsCount,
          issues
        }
      };
    } catch (error) {
      return {
        success: false,
        error: new AppError({
          code: 'INTEGRITY_CHECK_FAILED',
          message: 'データ整合性チェックに失敗しました',
          userMessage: 'データの整合性確認中にエラーが発生しました',
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.STORAGE,
          cause: error instanceof Error ? error : undefined
        })
      };
    }
  }

  /**
   * データクリーンアップ - 孤立した写真を削除
   */
  async cleanupOrphanedPhotos(options: { dryRun?: boolean } = {}): Promise<DatabaseResult<{
    deletedCount: number;
    deletedIds: string[];
  }>> {
    const { dryRun = false } = options;

    try {
      const orphanedPhotosResult = await dataValidationService.findOrphanedPhotos();

      if (!orphanedPhotosResult.success || !orphanedPhotosResult.data) {
        return {
          success: false,
          error: orphanedPhotosResult.error
        };
      }

      const orphanedPhotos = orphanedPhotosResult.data;
      const deletedIds = orphanedPhotos.map((p: PhotoData) => p.id);

      if (!dryRun) {
        await db.photos.bulkDelete(deletedIds);
      }

      return {
        success: true,
        data: {
          deletedCount: orphanedPhotos.length,
          deletedIds
        }
      };
    } catch (error) {
      return {
        success: false,
        error: new AppError({
          code: 'CLEANUP_FAILED',
          message: '孤立した写真の削除に失敗しました',
          userMessage: 'データクリーンアップ中にエラーが発生しました',
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.STORAGE,
          cause: error instanceof Error ? error : undefined
        })
      };
    }
  }
}

// シングルトンインスタンス
export const dataMigrationService = new DataMigrationService();

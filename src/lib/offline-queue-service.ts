// オフライン書き込みキューサービス

import { db } from './database';
import { logger } from './errors';
import type {
  OfflineQueueItem,
  ErrorInfo,
  SyncResult,
} from '../types/offline-queue';

/**
 * オフライン書き込みキューサービス
 * オフライン時のデータ書き込みをキューに保存し、オンライン復帰時に同期する
 */
export class OfflineQueueService {
  private readonly MAX_RETRY_COUNT = 5;
  private readonly RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // 指数バックオフ
  private readonly MAX_QUEUE_SIZE = 200; // キュー上限
  private readonly QUEUE_WARNING_SIZE = 150; // 警告閾値
  private syncInProgress = false;

  /**
   * キューに追加
   */
  async enqueue(item: Omit<OfflineQueueItem, 'id'>): Promise<void> {
    const count = await db.offline_queue.where('status').equals('pending').count();

    if (count >= this.MAX_QUEUE_SIZE) {
      throw new Error('QUEUE_FULL');
    }

    if (count >= this.QUEUE_WARNING_SIZE) {
      logger.warn('[OfflineQueue] Queue is 75% full', { count });
      // NOTE: ユーザーに警告表示（useStoreで管理）
    }

    await db.offline_queue.add(item);
  }

  /**
   * キュー全体を同期
   */
  async syncQueue(onProgress?: (synced: number, total: number) => void): Promise<SyncResult> {
    if (this.syncInProgress) {
      return { success: false, error: 'SYNC_IN_PROGRESS' };
    }

    this.syncInProgress = true;

    try {
      const pendingItems = await db.offline_queue.where('status').equals('pending').toArray();

      let successCount = 0;
      let failedCount = 0;

      // バッチ処理（10件ずつ並列実行）
      const batches = this.createBatches(pendingItems, 10);

      for (const batch of batches) {
        const results = await Promise.allSettled(batch.map((item) => this.syncItemWithRetry(item)));

        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            successCount++;
          } else {
            failedCount++;
          }
          onProgress?.(successCount + failedCount, pendingItems.length);
        });
      }

      return {
        success: true,
        syncedCount: successCount,
        failedCount,
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 単一アイテムを同期（指数バックオフ付き）
   */
  private async syncItemWithRetry(item: OfflineQueueItem): Promise<boolean> {
    for (let i = 0; i <= this.MAX_RETRY_COUNT; i++) {
      try {
        // ステータスを 'syncing' に更新
        await db.offline_queue.update(item.id!, {
          status: 'syncing',
          lastAttemptAt: Date.now(),
        });

        // 実際の同期処理
        await this.syncItem(item);

        // 成功したらキューから削除
        await db.offline_queue.delete(item.id!);
        return true;
      } catch (error) {
        const errorInfo = this.categorizeError(error);

        // リトライ不要なエラー（4xx）
        if (!errorInfo.shouldRetry) {
          await db.offline_queue.update(item.id!, {
            status: 'failed',
            errorCode: errorInfo.code,
            errorMessage: errorInfo.message,
            retryCount: i + 1,
          });

          // エラーログに記録
          await this.logError(item, errorInfo);
          return false;
        }

        // リトライ回数上限
        if (i === this.MAX_RETRY_COUNT) {
          await db.offline_queue.update(item.id!, {
            status: 'failed',
            errorCode: errorInfo.code,
            errorMessage: errorInfo.message,
            retryCount: i + 1,
          });

          // エラーログに記録
          await this.logError(item, errorInfo);
          return false;
        }

        // 指数バックオフで待機
        await this.delay(this.RETRY_DELAYS[i]);

        // リトライ回数を記録
        await db.offline_queue.update(item.id!, {
          retryCount: i + 1,
          status: 'pending', // リトライ待ちに戻す
        });
      }
    }

    return false;
  }

  /**
   * 実際の同期処理（エンティティタイプ別）
   */
  private async syncItem(item: OfflineQueueItem): Promise<void> {
    const payload = JSON.parse(item.payload);

    switch (item.entityType) {
      case 'fishingRecords':
        return this.syncFishingRecord(item.type, payload, item.entityId);
      case 'fishingSpots':
        return this.syncFishingSpot(item.type, payload, item.entityId);
      case 'photos':
        return this.syncPhoto(item.type, payload, item.entityId);
      default:
        throw new Error(`Unknown entity type: ${item.entityType}`);
    }
  }

  /**
   * 釣果記録の同期
   * 現在はIndexedDBのみのローカル実装のため、操作のログのみ記録
   */
  private async syncFishingRecord(
    _type: OfflineQueueItem['type'],
    _payload: any,
    _entityId?: string
  ): Promise<void> {
    // IndexedDBローカル実装のため、同期処理は不要
    // 将来的にクラウド同期を実装する場合はここにAPI呼び出しを追加
  }

  /**
   * 釣り場の同期
   * 現在はIndexedDBのみのローカル実装
   */
  private async syncFishingSpot(
    _type: OfflineQueueItem['type'],
    _payload: any,
    _entityId?: string
  ): Promise<void> {
    // IndexedDBローカル実装のため、同期処理は不要
  }

  /**
   * 写真の同期
   * 現在はIndexedDBのみのローカル実装
   */
  private async syncPhoto(
    _type: OfflineQueueItem['type'],
    _payload: any,
    _entityId?: string
  ): Promise<void> {
    // IndexedDBローカル実装のため、同期処理は不要
  }

  /**
   * キュー内のアイテムを手動で削除
   */
  async deleteQueueItem(itemId: number): Promise<void> {
    await db.offline_queue.delete(itemId);
  }

  /**
   * キューのステータスを取得
   */
  async getQueueStatus() {
    const pendingCount = await db.offline_queue.where('status').equals('pending').count();
    const syncingCount = await db.offline_queue.where('status').equals('syncing').count();
    const failedCount = await db.offline_queue.where('status').equals('failed').count();

    return {
      pendingCount,
      syncingCount,
      failedCount,
      isQueueFull: pendingCount >= this.QUEUE_WARNING_SIZE,
      isSyncing: this.syncInProgress,
    };
  }

  /**
   * すべてのキューアイテムを取得
   */
  async getAllQueueItems(): Promise<OfflineQueueItem[]> {
    return db.offline_queue.toArray();
  }

  /**
   * 失敗したアイテムのみを取得
   */
  async getFailedItems(): Promise<OfflineQueueItem[]> {
    return db.offline_queue.where('status').equals('failed').toArray();
  }

  /**
   * バッチ作成
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 待機
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * エラーを分類（リトライ可否判定）
   */
  private categorizeError(error: any): ErrorInfo {
    // ネットワークエラー → リトライ推奨
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'ネットワークエラー',
        shouldRetry: true,
      };
    }

    // HTTPステータスコード別
    if (error.status) {
      if (error.status >= 400 && error.status < 500) {
        // クライアントエラー → リトライ不要
        return {
          code: `HTTP_${error.status}`,
          message: error.message || 'クライアントエラー',
          shouldRetry: false,
        };
      }
      if (error.status >= 500) {
        // サーバーエラー → リトライ推奨
        return {
          code: `HTTP_${error.status}`,
          message: error.message || 'サーバーエラー',
          shouldRetry: true,
        };
      }
    }

    // その他のエラー → リトライ推奨
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || '不明なエラー',
      shouldRetry: true,
    };
  }

  /**
   * エラーログに記録
   */
  private async logError(item: OfflineQueueItem, errorInfo: ErrorInfo): Promise<void> {
    await db.sync_error_log.add({
      timestamp: Date.now(),
      entityType: item.entityType,
      errorCode: errorInfo.code as any,
      errorMessage: errorInfo.message,
      itemPayload: item.payload,
    });

    // エラーログが100件を超えたら古いログを削除
    const logCount = await db.sync_error_log.count();
    if (logCount > 100) {
      const oldestLogs = await db.sync_error_log.orderBy('timestamp').limit(logCount - 100).toArray();
      await db.sync_error_log.bulkDelete(oldestLogs.map((log) => log.id!));
    }
  }
}

// シングルトンインスタンス
export const offlineQueueService = new OfflineQueueService();

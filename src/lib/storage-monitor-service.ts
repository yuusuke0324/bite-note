/**
 * Storage Monitor Service (Issue #155 Phase 3-3)
 * ストレージ使用状況の監視と警告機能を提供
 *
 * Features:
 * - Storage Manager API統合
 * - 警告閾値（80%, 90%）管理
 * - Toast通知連携
 * - 定期的な使用状況チェック
 */

import { useEffect } from 'react';
import { useToastStore } from '../stores/toast-store';
import { logger } from './errors';

export interface StorageEstimate {
  usage: number; // Bytes used
  quota: number; // Bytes available
  usagePercent: number; // 0-100
}

export interface StorageMonitorConfig {
  warningThreshold: number; // Default: 80%
  criticalThreshold: number; // Default: 90%
  checkInterval: number; // Milliseconds, default: 60000 (1 minute)
  enableNotifications: boolean; // Default: true
}

const DEFAULT_CONFIG: StorageMonitorConfig = {
  warningThreshold: 80,
  criticalThreshold: 90,
  checkInterval: 60000,
  enableNotifications: true,
};

class StorageMonitorService {
  private config: StorageMonitorConfig = DEFAULT_CONFIG;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastNotificationLevel: 'none' | 'warning' | 'critical' = 'none';
  private navigationHandler: ((path: string) => void) | null = null;

  /**
   * ストレージ使用状況を取得
   */
  async getStorageEstimate(): Promise<StorageEstimate | null> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      logger.warn('[StorageMonitor] Storage Manager API not supported');
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;

      return {
        usage,
        quota,
        usagePercent,
      };
    } catch (error) {
      logger.error('[StorageMonitor] Failed to estimate storage', { error });
      return null;
    }
  }

  /**
   * ストレージ状態のチェックと通知
   */
  private async checkStorageStatus(): Promise<void> {
    const estimate = await this.getStorageEstimate();
    if (!estimate || !this.config.enableNotifications) return;

    const { usagePercent } = estimate;

    // 閾値判定
    if (usagePercent >= this.config.criticalThreshold) {
      // 重大な警告（90%以上）
      if (this.lastNotificationLevel !== 'critical') {
        this.showCriticalWarning(usagePercent);
        this.lastNotificationLevel = 'critical';
      }
    } else if (usagePercent >= this.config.warningThreshold) {
      // 警告（80%以上）
      if (this.lastNotificationLevel === 'none') {
        this.showWarning(usagePercent);
        this.lastNotificationLevel = 'warning';
      }
    } else {
      // 正常範囲に戻った
      this.lastNotificationLevel = 'none';
    }
  }

  /**
   * ナビゲーションハンドラーを設定
   */
  setNavigationHandler(handler: (path: string) => void): void {
    this.navigationHandler = handler;
  }

  /**
   * 警告トーストを表示
   */
  private showWarning(usagePercent: number): void {
    const navigateToDataManagement = () => {
      if (this.navigationHandler) {
        this.navigationHandler('/data-management');
      } else {
        // フォールバック: React Router未設定時はフルページリロード
        window.location.href = '/data-management';
      }
    };

    useToastStore.getState().showToast({
      type: 'warning',
      message: `ストレージ使用量が${usagePercent.toFixed(1)}%に達しています。データの整理を検討してください。`,
      actions: [
        {
          label: 'データを管理',
          handler: navigateToDataManagement,
          primary: true,
        },
      ],
    });
  }

  /**
   * 重大な警告トーストを表示
   */
  private showCriticalWarning(usagePercent: number): void {
    const navigateToDataManagement = () => {
      if (this.navigationHandler) {
        this.navigationHandler('/data-management');
      } else {
        // フォールバック: React Router未設定時はフルページリロード
        window.location.href = '/data-management';
      }
    };

    useToastStore.getState().showToast({
      type: 'error',
      message: `⚠️ ストレージ容量が不足しています（${usagePercent.toFixed(1)}%）。不要なデータを削除してください。`,
      actions: [
        {
          label: 'データを管理',
          handler: navigateToDataManagement,
          primary: true,
        },
      ],
    });
  }

  /**
   * 監視を開始
   */
  start(config?: Partial<StorageMonitorConfig>): void {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 既存の監視を停止
    if (this.intervalId) {
      this.stop();
    }

    // 初回チェック
    this.checkStorageStatus();

    // 定期チェック開始
    this.intervalId = setInterval(() => {
      this.checkStorageStatus();
    }, this.config.checkInterval);

    logger.debug('[StorageMonitor] Started with config', { config: this.config });
  }

  /**
   * 監視を停止
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.debug('[StorageMonitor] Stopped');
    }
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<StorageMonitorConfig>): void {
    this.config = { ...this.config, ...config };
    logger.debug('[StorageMonitor] Config updated', { config: this.config });

    // 監視中の場合は再起動
    if (this.intervalId) {
      this.start();
    }
  }

  /**
   * 通知を有効化
   */
  enableNotifications(): void {
    this.config.enableNotifications = true;
  }

  /**
   * 通知を無効化
   */
  disableNotifications(): void {
    this.config.enableNotifications = false;
  }

  /**
   * 手動でストレージ状態をチェック
   */
  async checkNow(): Promise<StorageEstimate | null> {
    await this.checkStorageStatus();
    return this.getStorageEstimate();
  }

  /**
   * ストレージ情報をフォーマット
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * ストレージ状態のサマリーを取得
   */
  async getStatusSummary(): Promise<{
    estimate: StorageEstimate | null;
    level: 'normal' | 'warning' | 'critical';
    message: string;
  }> {
    const estimate = await this.getStorageEstimate();

    if (!estimate) {
      return {
        estimate: null,
        level: 'normal',
        message: 'ストレージ情報を取得できません',
      };
    }

    const { usagePercent } = estimate;
    let level: 'normal' | 'warning' | 'critical' = 'normal';
    let message = `ストレージ使用量: ${usagePercent.toFixed(1)}%`;

    if (usagePercent >= this.config.criticalThreshold) {
      level = 'critical';
      message = `⚠️ ストレージ容量が不足しています（${usagePercent.toFixed(1)}%）`;
    } else if (usagePercent >= this.config.warningThreshold) {
      level = 'warning';
      message = `警告: ストレージ使用量が${usagePercent.toFixed(1)}%に達しています`;
    }

    return {
      estimate,
      level,
      message,
    };
  }
}

// シングルトンインスタンス
export const storageMonitorService = new StorageMonitorService();

/**
 * React Hook: ストレージ監視を自動起動
 * アプリケーションのルートコンポーネントで使用
 */
export const useStorageMonitor = (config?: Partial<StorageMonitorConfig>) => {
  useEffect(() => {
    storageMonitorService.start(config);

    return () => {
      storageMonitorService.stop();
    };
  }, [config]);

  return storageMonitorService;
};

// セッション管理サービス
// Phase 3-4: セッション管理機能実装

import { db } from './database';
import type { DatabaseResult } from '../types';

export interface SessionState {
  status: 'active' | 'expired' | 'reconnecting';
  lastActivityAt: number;
  timeoutDuration: number;
}

export interface SessionConfig {
  timeoutMs: number;
  heartbeatIntervalMs: number;
  warningThresholdMs: number;
}

export class SessionService {
  private lastActivityAt: number;
  private heartbeatIntervalId: number | null = null;
  private activityListeners: (() => void)[] = [];
  private readonly config: SessionConfig;

  // デフォルト設定
  private static readonly DEFAULT_CONFIG: SessionConfig = {
    timeoutMs: 30 * 60 * 1000, // 30分
    heartbeatIntervalMs: 15 * 60 * 1000, // 15分
    warningThresholdMs: 25 * 60 * 1000, // 25分（Phase 2で使用）
  };

  // アクティビティ検出対象イベント
  private static readonly ACTIVITY_EVENTS = [
    'click',
    'keydown',
    'scroll',
    'touchstart',
    'mousemove', // デスクトップのみ
  ] as const;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      ...SessionService.DEFAULT_CONFIG,
      ...config,
    };
    this.lastActivityAt = Date.now();
  }

  /**
   * セッション管理の開始
   */
  start(): void {
    console.log('[SessionService] Starting session management');

    // 初期化
    this.lastActivityAt = Date.now();

    // アクティビティ監視の開始
    this.startActivityMonitoring();

    // Heartbeatの開始
    this.startHeartbeat();
  }

  /**
   * セッション管理の停止
   */
  stop(): void {
    console.log('[SessionService] Stopping session management');

    // アクティビティ監視の停止
    this.stopActivityMonitoring();

    // Heartbeatの停止
    this.stopHeartbeat();
  }

  /**
   * アクティビティ監視の開始
   */
  private startActivityMonitoring(): void {
    SessionService.ACTIVITY_EVENTS.forEach((eventType) => {
      // デスクトップ環境の判定（タッチデバイスかどうか）
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // mousemoveはデスクトップのみ
      if (eventType === 'mousemove' && isTouchDevice) {
        return;
      }

      // mousemoveイベントのみスロットル処理を適用（1秒間に最大1回）
      let throttleTimer: number | null = null;
      const handler =
        eventType === 'mousemove'
          ? () => {
              if (throttleTimer !== null) return;

              this.updateLastActivity();
              throttleTimer = window.setTimeout(() => {
                throttleTimer = null;
              }, 1000); // 1秒間隔
            }
          : () => this.updateLastActivity();

      window.addEventListener(eventType, handler, { passive: true });

      // クリーンアップ用にハンドラーを保存
      this.activityListeners.push(() => {
        window.removeEventListener(eventType, handler);
        if (throttleTimer !== null) {
          window.clearTimeout(throttleTimer);
        }
      });
    });
  }

  /**
   * アクティビティ監視の停止
   */
  private stopActivityMonitoring(): void {
    this.activityListeners.forEach((cleanup) => cleanup());
    this.activityListeners = [];
  }

  /**
   * 最終アクティビティ時刻の更新
   */
  private updateLastActivity(): void {
    this.lastActivityAt = Date.now();
  }

  /**
   * Heartbeatの開始
   */
  private startHeartbeat(): void {
    this.heartbeatIntervalId = window.setInterval(async () => {
      console.log('[SessionService] Heartbeat: Checking session validity');

      const isValid = await this.checkSession();
      if (!isValid) {
        console.warn('[SessionService] Session expired detected by heartbeat');
        // セッション期限切れイベントを発火
        this.dispatchSessionExpiredEvent();
      }
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Heartbeatの停止
   */
  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId !== null) {
      window.clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  /**
   * セッション有効性チェック
   * @returns セッションが有効かどうか
   */
  async checkSession(): Promise<boolean> {
    // タイムアウトチェック
    const elapsed = Date.now() - this.lastActivityAt;
    if (elapsed > this.config.timeoutMs) {
      console.warn('[SessionService] Session timeout detected', {
        elapsed,
        timeout: this.config.timeoutMs,
      });
      return false;
    }

    // IndexedDB接続チェック
    const isConnected = await this.checkIndexedDBConnection();
    if (!isConnected) {
      console.warn('[SessionService] IndexedDB connection lost');
      return false;
    }

    return true;
  }

  /**
   * IndexedDB接続確認
   * @returns 接続が有効かどうか
   */
  async checkIndexedDBConnection(): Promise<boolean> {
    try {
      // 軽量な確認クエリ（1件だけカウント）
      await db.fishing_records.limit(1).count();
      return true;
    } catch (error) {
      console.error('[SessionService] IndexedDB connection check failed', error);
      return false;
    }
  }

  /**
   * IndexedDB再接続処理
   * @returns 再接続結果
   */
  async reconnect(): Promise<DatabaseResult<void>> {
    try {
      console.log('[SessionService] Attempting to reconnect to IndexedDB');

      // 接続確認
      const isConnected = await this.checkIndexedDBConnection();
      if (!isConnected) {
        // 再接続を試みる（Dexieは自動的に再接続を試みる）
        await db.open();

        // 再度確認
        const isReconnected = await this.checkIndexedDBConnection();
        if (!isReconnected) {
          return {
            success: false,
            error: {
              code: 'RECONNECT_FAILED',
              message: 'Failed to reconnect to IndexedDB',
            },
          };
        }
      }

      // 最終アクティビティ時刻を更新
      this.updateLastActivity();

      console.log('[SessionService] Reconnection successful');
      return { success: true };
    } catch (error) {
      console.error('[SessionService] Reconnection failed', error);
      return {
        success: false,
        error: {
          code: 'RECONNECT_FAILED',
          message: 'Failed to reconnect to IndexedDB',
          details: error,
        },
      };
    }
  }

  /**
   * セッション状態の取得
   */
  getSessionState(): SessionState {
    const elapsed = Date.now() - this.lastActivityAt;
    const isExpired = elapsed > this.config.timeoutMs;

    return {
      status: isExpired ? 'expired' : 'active',
      lastActivityAt: this.lastActivityAt,
      timeoutDuration: this.config.timeoutMs,
    };
  }

  /**
   * 最終アクティビティからの経過時間を取得（ミリ秒）
   */
  getElapsedTime(): number {
    return Date.now() - this.lastActivityAt;
  }

  /**
   * タイムアウトまでの残り時間を取得（ミリ秒）
   */
  getRemainingTime(): number {
    const remaining = this.config.timeoutMs - this.getElapsedTime();
    return Math.max(0, remaining);
  }

  /**
   * セッション期限切れイベントの発火
   */
  private dispatchSessionExpiredEvent(): void {
    const event = new CustomEvent('session_expired', {
      detail: {
        lastActivityAt: this.lastActivityAt,
        elapsedTime: this.getElapsedTime(),
      },
    });
    window.dispatchEvent(event);
  }

  /**
   * IndexedDB対応状況の確認
   */
  static isIndexedDBSupported(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }
}

// サービスインスタンスのシングルトン
export const sessionService = new SessionService();

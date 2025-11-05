/**
 * ErrorManager.ts - 統一エラー管理システム
 * アプリケーション全体のエラーハンドリングを一元管理
 */

import { AppError } from './ErrorTypes';
import type {
  ErrorDisplayOptions,
  ErrorSeverity,
  RecoveryStrategy,
} from './ErrorTypes';
import { ErrorLogger } from './ErrorLogger';

/**
 * エラー表示コールバック
 */
export type ErrorDisplayCallback = (
  error: AppError | Error,
  options: ErrorDisplayOptions
) => void;

/**
 * エラーマネージャー設定
 */
export interface ErrorManagerConfig {
  /** エラーロガー */
  logger?: ErrorLogger;

  /** エラー表示コールバック */
  onDisplayError?: ErrorDisplayCallback;

  /** デフォルト表示オプション */
  defaultDisplayOptions?: Partial<ErrorDisplayOptions>;
}

/**
 * エラーマネージャー
 */
export class ErrorManager {
  private logger: ErrorLogger;
  private displayCallbacks: ErrorDisplayCallback[] = [];
  private defaultDisplayOptions: ErrorDisplayOptions;

  constructor(config?: ErrorManagerConfig) {
    this.logger = config?.logger || new ErrorLogger();
    this.defaultDisplayOptions = {
      displayType: 'toast',
      autoHideDuration: 5000,
      showIcon: true,
      showStackTrace: import.meta.env.DEV,
      ...config?.defaultDisplayOptions,
    };

    if (config?.onDisplayError) {
      this.displayCallbacks.push(config.onDisplayError);
    }

    // グローバルエラーハンドラーを設定
    this.setupGlobalHandlers();
  }

  /**
   * グローバルエラーハンドラーを設定
   */
  private setupGlobalHandlers(): void {
    // window.onerrorを設定
    window.addEventListener('error', (event) => {
      const error = event.error || new Error(event.message);
      this.handleError(error, {
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // unhandledrejectionを設定
    window.addEventListener('unhandledrejection', (event) => {
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));

      this.handleError(error, {
        context: {
          type: 'unhandledPromiseRejection',
          reason: event.reason,
        },
      });
    });
  }

  /**
   * エラーを処理
   */
  handleError(
    error: AppError | Error,
    options?: {
      context?: Record<string, unknown>;
      displayOptions?: Partial<ErrorDisplayOptions>;
      suppressDisplay?: boolean;
    }
  ): void {
    // ログに記録
    this.logger.log(error, options?.context);

    // 表示が抑制されていなければ表示
    if (!options?.suppressDisplay) {
      this.displayError(error, options?.displayOptions);
    }

    // リカバリー戦略を実行
    if (error instanceof AppError && error.recovery) {
      this.executeRecovery(error.recovery, error);
    }
  }

  /**
   * エラーを表示
   */
  private displayError(
    error: AppError | Error,
    options?: Partial<ErrorDisplayOptions>
  ): void {
    const displayOptions: ErrorDisplayOptions = {
      ...this.defaultDisplayOptions,
      ...options,
    };

    // AppErrorの場合は重要度に応じて表示タイプを調整
    if (error instanceof AppError) {
      displayOptions.displayType = this.getDisplayTypeForSeverity(
        error.severity
      );
      displayOptions.autoHideDuration = this.getAutoHideDurationForSeverity(
        error.severity
      );
    }

    // 登録されたコールバックを実行
    this.displayCallbacks.forEach((callback) => {
      callback(error, displayOptions);
    });
  }

  /**
   * 重要度に応じた表示タイプを取得
   */
  private getDisplayTypeForSeverity(
    severity: ErrorSeverity
  ): ErrorDisplayOptions['displayType'] {
    switch (severity) {
      case 'info':
      case 'warning':
        return 'toast';
      case 'error':
        return 'modal';
      case 'critical':
        return 'boundary';
      default:
        return 'toast';
    }
  }

  /**
   * 重要度に応じた自動非表示時間を取得
   */
  private getAutoHideDurationForSeverity(
    severity: ErrorSeverity
  ): number | null {
    switch (severity) {
      case 'info':
        return 3000;
      case 'warning':
        return 5000;
      case 'error':
      case 'critical':
        return null; // 手動で閉じる
      default:
        return 5000;
    }
  }

  /**
   * リカバリー戦略を実行
   */
  private async executeRecovery(
    recovery: RecoveryStrategy,
    error: AppError
  ): Promise<void> {
    // 自動再試行
    if (recovery.autoRetry && error.retryable) {
      await this.executeAutoRetry(recovery.autoRetry, recovery.fallback);
    }
  }

  /**
   * 自動再試行を実行
   */
  private async executeAutoRetry(
    retryConfig: NonNullable<RecoveryStrategy['autoRetry']>,
    fallback?: () => Promise<void>
  ): Promise<void> {
    const { maxAttempts, delayMs, exponentialBackoff } = retryConfig;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (fallback) {
          await fallback();
        }
        // 成功したら終了
        return;
      } catch (error) {
        // 最後の試行でも失敗した場合
        if (attempt === maxAttempts) {
          console.error('Auto-retry failed after max attempts:', error);
          return;
        }

        // 次の試行まで待機
        const delay = exponentialBackoff
          ? delayMs * Math.pow(2, attempt - 1)
          : delayMs;

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * エラー表示コールバックを登録
   */
  registerDisplayCallback(callback: ErrorDisplayCallback): () => void {
    this.displayCallbacks.push(callback);

    // アンレジスター関数を返す
    return () => {
      const index = this.displayCallbacks.indexOf(callback);
      if (index > -1) {
        this.displayCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * ログを取得
   */
  getLogs() {
    return this.logger.getLogs();
  }

  /**
   * ログをクリア
   */
  clearLogs() {
    this.logger.clearLogs();
  }

  /**
   * エラー統計を取得
   */
  getStatistics() {
    return this.logger.getStatistics();
  }
}

// シングルトンインスタンス
export const errorManager = new ErrorManager();

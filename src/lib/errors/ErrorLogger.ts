/**
 * ErrorLogger.ts - エラーロギングシステム
 * エラーの記録、保存、外部サービスへの送信を管理
 */

import { AppError } from './ErrorTypes';
import type { ErrorLogEntry } from './ErrorTypes';

/**
 * エラーロガー設定
 */
export interface ErrorLoggerConfig {
  /** コンソールに出力するか */
  console: boolean;

  /** ローカルストレージに保存するか */
  localStorage: boolean;

  /** 外部サービスに送信するか（Sentry等） */
  remote: boolean;

  /** リモートエンドポイント */
  remoteEndpoint?: string;

  /** 最大ログ保持数 */
  maxLogs: number;

  /** 開発環境でのみ詳細ログを出力 */
  verbose: boolean;
}

/**
 * エラーロガー
 */
export class ErrorLogger {
  private config: ErrorLoggerConfig;
  private logs: ErrorLogEntry[] = [];
  private readonly STORAGE_KEY = 'app-error-logs';

  constructor(config?: Partial<ErrorLoggerConfig>) {
    this.config = {
      console: true,
      localStorage: true,
      remote: false,
      maxLogs: 50,
      verbose: import.meta.env.DEV,
      ...config,
    };

    // ローカルストレージから既存ログを読み込み
    this.loadLogsFromStorage();
  }

  /**
   * エラーをログに記録
   */
  log(error: AppError | Error, context?: Record<string, unknown>): ErrorLogEntry {
    const entry: ErrorLogEntry = {
      id: this.generateId(),
      error,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      context,
      handled: error instanceof AppError,
    };

    // ログ配列に追加
    this.logs.unshift(entry);

    // 最大数を超えたら古いログを削除
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(0, this.config.maxLogs);
    }

    // 各種ログ出力
    if (this.config.console) {
      this.logToConsole(entry);
    }

    if (this.config.localStorage) {
      this.saveLogsToStorage();
    }

    if (this.config.remote && this.config.remoteEndpoint) {
      this.sendToRemote(entry);
    }

    return entry;
  }

  /**
   * コンソールに出力
   */
  private logToConsole(entry: ErrorLogEntry): void {
    const { error, timestamp, context } = entry;

    const timeStr = timestamp.toISOString();
    const errorType = error instanceof AppError ? error.severity : 'ERROR';

    // 重要度に応じた出力
    const logMethod = this.getConsoleMethod(errorType);

    logMethod(
      `[${timeStr}] ${errorType}:`,
      error.message,
      error instanceof AppError ? `\nUser Message: ${error.userMessage}` : ''
    );

    if (this.config.verbose) {
      console.group('Error Details');
      console.log('Error Object:', error);
      if (context) {
        console.log('Context:', context);
      }
      if (error.stack) {
        console.log('Stack Trace:', error.stack);
      }
      console.groupEnd();
    }
  }

  /**
   * 重要度に応じたコンソールメソッドを取得
   */
  private getConsoleMethod(errorType: string): typeof console.log {
    switch (errorType) {
      case 'info':
        return console.info;
      case 'warning':
        return console.warn;
      case 'error':
      case 'critical':
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * ローカルストレージに保存
   */
  private saveLogsToStorage(): void {
    try {
      // エラーオブジェクトを JSON.stringify できる形式に変換
      const serializedLogs = this.logs.map((entry) => ({
        id: entry.id,
        error: {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack,
          ...(entry.error instanceof AppError && {
            code: entry.error.code,
            severity: entry.error.severity,
            category: entry.error.category,
            userMessage: entry.error.userMessage,
          }),
        },
        timestamp: entry.timestamp.toISOString(),
        userAgent: entry.userAgent,
        url: entry.url,
        context: entry.context,
        handled: entry.handled,
      }));

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serializedLogs));
    } catch (error) {
      console.warn('Failed to save error logs to localStorage:', error);
    }
  }

  /**
   * ローカルストレージから読み込み
   */
  private loadLogsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      // タイムスタンプを Date オブジェクトに戻す
      this.logs = (parsed as Array<Omit<ErrorLogEntry, 'timestamp'> & { timestamp: string }>).map(entry => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));
    } catch (error) {
      console.warn('Failed to load error logs from localStorage:', error);
    }
  }

  /**
   * リモートサービスに送信（Sentry等）
   */
  private async sendToRemote(entry: ErrorLogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: entry.id,
          error: {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.error.stack,
            ...(entry.error instanceof AppError && {
              code: entry.error.code,
              severity: entry.error.severity,
              category: entry.error.category,
            }),
          },
          timestamp: entry.timestamp.toISOString(),
          userAgent: entry.userAgent,
          url: entry.url,
          context: entry.context,
        }),
      });
    } catch (error) {
      console.warn('Failed to send error log to remote:', error);
    }
  }

  /**
   * ユニークIDを生成
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 全ログを取得
   */
  getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  /**
   * ログをクリア
   */
  clearLogs(): void {
    this.logs = [];
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear error logs:', error);
    }
  }

  /**
   * 特定の期間のログを取得
   */
  getLogsByDateRange(start: Date, end: Date): ErrorLogEntry[] {
    return this.logs.filter(
      (entry) => entry.timestamp >= start && entry.timestamp <= end
    );
  }

  /**
   * カテゴリー別にログを取得
   */
  getLogsByCategory(category: string): ErrorLogEntry[] {
    return this.logs.filter(
      (entry) =>
        entry.error instanceof AppError && entry.error.category === category
    );
  }

  /**
   * 重要度別にログを取得
   */
  getLogsBySeverity(severity: string): ErrorLogEntry[] {
    return this.logs.filter(
      (entry) =>
        entry.error instanceof AppError && entry.error.severity === severity
    );
  }

  /**
   * エラー統計を取得
   */
  getStatistics(): {
    total: number;
    handled: number;
    unhandled: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const stats = {
      total: this.logs.length,
      handled: 0,
      unhandled: 0,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
    };

    this.logs.forEach((entry) => {
      if (entry.handled) {
        stats.handled++;
      } else {
        stats.unhandled++;
      }

      if (entry.error instanceof AppError) {
        // カテゴリー別
        const category = entry.error.category;
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

        // 重要度別
        const severity = entry.error.severity;
        stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
      }
    });

    return stats;
  }
}

// シングルトンインスタンス
export const errorLogger = new ErrorLogger();

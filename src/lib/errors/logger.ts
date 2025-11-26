/**
 * logger.ts - 統一ロギングラッパー
 * console出力の代わりに使用する軽量なロガー
 * 本番環境ではdebugログを抑制し、開発環境では詳細ログを出力
 */

import { errorLogger } from './ErrorLogger';
import { AppError, ErrorSeverity, ErrorCategory } from './ErrorTypes';

/**
 * ログコンテキスト型
 */
export type LogContext = Record<string, unknown>;

/**
 * 内部ヘルパー: AppErrorを作成してErrorLoggerに送信
 */
function logWithSeverity(
  severity: ErrorSeverity,
  message: string,
  context?: LogContext
): void {
  const error = new AppError({
    code: 'LOG',
    message,
    userMessage: message,
    severity,
    category: ErrorCategory.SYSTEM,
    context,
    retryable: false,
  });
  errorLogger.log(error, context);
}

/**
 * 統一ロガー
 * console.error/warn/log/info/debugの代替として使用
 */
export const logger = {
  /**
   * エラーレベルのログ
   * 重大なエラーや例外の記録に使用
   */
  error: (message: string, context?: LogContext): void => {
    logWithSeverity(ErrorSeverity.ERROR, message, context);
  },

  /**
   * 警告レベルのログ
   * 潜在的な問題や非推奨の使用方法の記録に使用
   */
  warn: (message: string, context?: LogContext): void => {
    logWithSeverity(ErrorSeverity.WARNING, message, context);
  },

  /**
   * 情報レベルのログ
   * 重要な処理の完了や状態変化の記録に使用
   */
  info: (message: string, context?: LogContext): void => {
    logWithSeverity(ErrorSeverity.INFO, message, context);
  },

  /**
   * デバッグレベルのログ
   * 開発時のみ出力（本番環境では抑制）
   */
  debug: (message: string, context?: LogContext): void => {
    if (import.meta.env.DEV) {
      logWithSeverity(ErrorSeverity.INFO, `[DEBUG] ${message}`, context);
    }
  },
};

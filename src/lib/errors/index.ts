/**
 * エラーハンドリングシステム - エクスポート
 */

// 型定義
export * from './ErrorTypes';

// エラーロガー
export { ErrorLogger, errorLogger } from './ErrorLogger';
export type { ErrorLoggerConfig } from './ErrorLogger';

// エラーマネージャー
export { ErrorManager, errorManager } from './ErrorManager';
export type { ErrorManagerConfig, ErrorDisplayCallback } from './ErrorManager';

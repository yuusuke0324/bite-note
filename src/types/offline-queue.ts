// オフライン書き込みキューの型定義

/**
 * オフライン書き込みキューアイテムの型
 */
export type OfflineQueueItemType = 'CREATE' | 'UPDATE' | 'DELETE';

/**
 * オフライン書き込みキューのエンティティタイプ
 */
export type OfflineQueueEntityType = 'fishingRecords' | 'fishingSpots' | 'photos';

/**
 * オフライン書き込みキューのステータス
 */
export type OfflineQueueStatus = 'pending' | 'syncing' | 'failed';

/**
 * オフライン書き込みキューアイテム
 */
export interface OfflineQueueItem {
  id?: number; // auto-increment
  type: OfflineQueueItemType;
  entityType: OfflineQueueEntityType;
  entityId?: string; // UPDATE/DELETE時に使用
  payload: string; // JSON文字列化したデータ
  createdAt: number; // Date.now()
  retryCount: number;
  status: OfflineQueueStatus;
  errorCode?: string;
  errorMessage?: string;
  lastAttemptAt?: number; // 最終リトライ日時
}

/**
 * エラーコード定数
 */
export const ERROR_CODES = {
  // ネットワークエラー（リトライ推奨）
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  ABORT_ERROR: 'ABORT_ERROR',

  // サーバーエラー（リトライ推奨）
  HTTP_500: 'HTTP_500',
  HTTP_502: 'HTTP_502',
  HTTP_503: 'HTTP_503',
  HTTP_504: 'HTTP_504',

  // クライアントエラー（リトライ不要）
  HTTP_400: 'HTTP_400', // Bad Request → データ不正
  HTTP_401: 'HTTP_401', // Unauthorized → 認証エラー
  HTTP_403: 'HTTP_403', // Forbidden → 権限エラー
  HTTP_404: 'HTTP_404', // Not Found → 削除済み
  HTTP_409: 'HTTP_409', // Conflict → 競合

  // その他
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  QUEUE_FULL: 'QUEUE_FULL',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * ユーザー向けエラーメッセージ
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  NETWORK_ERROR: 'ネットワーク接続を確認してください',
  TIMEOUT_ERROR: 'タイムアウトしました。もう一度お試しください',
  ABORT_ERROR: '処理がキャンセルされました',
  HTTP_500: 'サーバーエラーが発生しました',
  HTTP_502: 'サーバーが応答しません',
  HTTP_503: 'サービスが一時的に利用できません',
  HTTP_504: 'サーバーがタイムアウトしました',
  HTTP_400: 'データが不正です',
  HTTP_401: '認証が必要です',
  HTTP_403: '権限がありません',
  HTTP_404: 'データが見つかりません',
  HTTP_409: 'データが競合しています',
  UNKNOWN_ERROR: '予期しないエラーが発生しました',
  QUEUE_FULL: 'オフライン書き込みキューがいっぱいです',
};

/**
 * 同期エラーログ
 */
export interface SyncErrorLog {
  id?: number;
  timestamp: number;
  entityType: string;
  errorCode: ErrorCode;
  errorMessage: string;
  itemPayload: string; // デバッグ用
}

/**
 * 同期進捗情報
 */
export interface SyncProgress {
  current: number;
  total: number;
  percentage: number;
  estimatedTimeRemaining: number; // ミリ秒
}

/**
 * キューステータス情報
 */
export interface QueueStatus {
  pendingCount: number;
  syncingCount: number;
  failedCount: number;
  isQueueFull: boolean; // 150件以上
  isSyncing: boolean;
}

/**
 * 同期結果
 */
export interface SyncResult {
  success: boolean;
  syncedCount?: number;
  failedCount?: number;
  error?: string;
}

/**
 * エラー情報
 */
export interface ErrorInfo {
  code: string;
  message: string;
  shouldRetry: boolean;
}

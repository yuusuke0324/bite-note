/**
 * ValidationOptions.ts - 検証オプション型定義
 * TASK-101: TideDataValidator実装
 */

/**
 * 検証オプション
 */
export interface ValidationOptions {
  enableWarnings: boolean;          // 警告検証の有効/無効
  strictMode: boolean;              // 厳密モード
  performanceMode: boolean;         // パフォーマンス優先モード
  maxRecords?: number;              // 最大処理レコード数
  timeoutMs?: number;               // タイムアウト時間
}
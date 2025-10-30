/**
 * ValidationResult.ts - 検証結果型定義
 * TASK-101: TideDataValidator実装
 */

import type { TideChartData } from '../../../utils/validation/types';

/**
 * エラータイプ定義
 */
export const ErrorType = {
  // Critical: グラフ描画不可
  STRUCTURE_ERROR: 'STRUCTURE_ERROR',        // データ構造エラー
  EMPTY_DATA: 'EMPTY_DATA',                  // 空データ
  CORRUPTED_DATA: 'CORRUPTED_DATA',          // 破損データ

  // Error: 部分的な問題
  INVALID_TIME_FORMAT: 'INVALID_TIME_FORMAT', // 時刻形式エラー
  TIDE_OUT_OF_RANGE: 'TIDE_OUT_OF_RANGE',    // 潮位範囲外
  DUPLICATE_TIMESTAMP: 'DUPLICATE_TIMESTAMP', // 重複タイムスタンプ

  // Warning: 軽微な問題
  TIME_SEQUENCE_WARNING: 'TIME_SEQUENCE_WARNING', // 時系列順序警告
  UNUSUAL_TIDE_VALUE: 'UNUSUAL_TIDE_VALUE',       // 異常な潮位値
  SPARSE_DATA: 'SPARSE_DATA'                      // データ密度低下
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

/**
 * 警告タイプ定義
 */
export const WarningType = {
  DATA_QUALITY: 'DATA_QUALITY',           // データ品質警告
  PERFORMANCE: 'PERFORMANCE',             // パフォーマンス警告
  USABILITY: 'USABILITY'                  // ユーザビリティ警告
} as const;

export type WarningType = typeof WarningType[keyof typeof WarningType];

/**
 * 検証エラー
 */
export interface ValidationError {
  type: ErrorType;                         // エラー種別
  severity: 'critical' | 'error' | 'warning'; // 重要度
  message: string;                         // ユーザー向けメッセージ
  field?: string;                          // エラー発生フィールド
  index?: number;                          // エラー発生インデックス
  context?: any;                           // 追加コンテキスト情報
}

/**
 * 検証警告
 */
export interface ValidationWarning {
  type: WarningType;                       // 警告種別
  message: string;                         // ユーザー向けメッセージ
  field?: string;                          // 警告発生フィールド
  index?: number;                          // 警告発生インデックス
  suggestion?: string;                     // 改善提案
}

/**
 * 検証サマリー
 */
export interface ValidationSummary {
  totalRecords: number;                    // 総レコード数
  validRecords: number;                    // 有効レコード数
  errorRecords: number;                    // エラーレコード数
  warningRecords: number;                  // 警告レコード数
  processingTime: number;                  // 処理時間（ms）
}

/**
 * 検証結果
 */
export interface ValidationResult {
  isValid: boolean;                        // 全体の検証結果
  errors: ValidationError[];               // エラー一覧
  warnings: ValidationWarning[];           // 警告一覧
  data?: TideChartData[];                  // 検証済みデータ（成功時）
  summary: ValidationSummary;              // 検証サマリー
}
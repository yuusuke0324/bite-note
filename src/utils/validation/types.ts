/**
 * データ検証・変換ユーティリティ - 型定義
 * TASK-002: データ検証・変換ユーティリティ実装
 */

// ==========================================
// 入力データ型定義
// ==========================================

/**
 * 外部APIからの生の潮汐データ
 */
export interface RawTideData {
  /** ISO 8601形式の時刻文字列 */
  time: string;
  /** 潮位値（メートル） */
  tide: number;
}

// ==========================================
// 出力データ型定義
// ==========================================

/**
 * チャート描画用の潮汐データ
 */
export interface TideChartData {
  /** Unix timestamp（ミリ秒） */
  x: number;
  /** 潮位値 */
  y: number;
  /** Date オブジェクト */
  timestamp: Date;
}

// ==========================================
// エラーコード定義
// ==========================================

/**
 * 検証エラーコード
 */
export type ValidationErrorCode =
  | 'INVALID_TIME_FORMAT'
  | 'TIDE_OUT_OF_RANGE'
  | 'EMPTY_DATA'
  | 'DUPLICATE_TIMESTAMP'
  | 'STRUCTURE_ERROR'
  | 'DATA_QUALITY_WARNING'
  | 'PROCESSING_TIMEOUT'
  | 'TIDE_PRECISION_ERROR'
  | 'TIMEZONE_ERROR';

// ==========================================
// エラーコンテキスト型定義
// ==========================================

/**
 * エラー発生時のコンテキスト情報
 */
export interface ErrorContext {
  /** エラー発生箇所のインデックス */
  index?: number;
  /** エラーとなった時刻値 */
  timeValue?: string;
  /** エラーとなった潮位値 */
  tideValue?: number;
  /** タイムアウト時間（ミリ秒） */
  timeoutMs?: number;
  /** 追加のメタデータ */
  metadata?: Record<string, unknown>;
  /** 任意の追加プロパティを許可 */
  [key: string]: unknown;
}

// ==========================================
// バリデーション設定
// ==========================================

/**
 * 潮位検証の設定値
 */
export const TIDE_VALIDATION = {
  /** 最小潮位（メートル） */
  MIN_TIDE: -3.0,
  /** 最大潮位（メートル） */
  MAX_TIDE: 5.0
} as const;

// ==========================================
// インターフェース定義
// ==========================================

/**
 * 潮汐データバリデーターインターフェース
 */
export interface ITideDataValidator {
  /**
   * 時刻フォーマットを検証
   * @param time 時刻文字列
   * @returns 有効な場合true
   */
  validateTimeFormat(time: string): boolean;

  /**
   * 潮位範囲を検証
   * @param tide 潮位値
   * @returns 有効な場合true
   */
  validateTideRange(tide: number): boolean;

  /**
   * データ配列を検証
   * @param data 潮汐データ配列
   * @throws {TideValidationError} 検証失敗時
   */
  validateDataArray(data: RawTideData[]): void;
}

/**
 * 潮汐データトランスフォーマーインターフェース
 */
export interface ITideDataTransformer {
  /**
   * 生データをチャート形式に変換
   * @param rawData 生の潮汐データ
   * @returns チャート用データ
   */
  transform(rawData: RawTideData[]): TideChartData[];

  /**
   * 検証してから変換
   * @param rawData 生の潮汐データ
   * @returns チャート用データ
   * @throws {TideValidationError} 検証失敗時
   */
  validateAndTransform(rawData: RawTideData[]): TideChartData[];
}
/**
 * エラーハンドリング型定義
 * TASK-102: TideChartErrorHandler実装
 */

import type { ValidationResult, ValidationError, ValidationWarning } from '../types';
import type { TideChartData } from '../../../utils/validation/types';

/**
 * エラー表示情報
 */
export interface ErrorDisplayInfo {
  /** エラーレベル */
  level: 'critical' | 'error' | 'warning' | 'info';
  /** エラータイトル */
  title: string;
  /** ユーザー向けメッセージ */
  message: string;
  /** 解決方法の提案 */
  suggestion?: string;
  /** フォールバック表示タイプ */
  fallbackType: 'table' | 'partial-chart' | 'simple-chart' | 'none';
  /** 技術詳細（開発用） */
  debugInfo?: string;
}

/**
 * フォールバック表示タイプ
 */
export type FallbackType = 'table' | 'partial-chart' | 'simple-chart' | 'none';

/**
 * エラー処理オプション
 */
export interface ErrorProcessingOptions {
  /** 言語設定 */
  locale?: 'ja' | 'en';
  /** デバッグ情報の含有 */
  includeDebugInfo?: boolean;
  /** 最大メッセージ長 */
  maxMessageLength?: number;
}

/**
 * エラーメッセージテンプレート
 */
export interface ErrorMessageTemplate {
  title: string;
  message: string;
  suggestion?: string;
}

/**
 * 言語別メッセージリソース
 */
export interface MessageResources {
  ja: {
    critical: ErrorMessageTemplate;
    error: ErrorMessageTemplate;
    warning: ErrorMessageTemplate;
    multipleErrors: ErrorMessageTemplate;
  };
  en: {
    critical: ErrorMessageTemplate;
    error: ErrorMessageTemplate;
    warning: ErrorMessageTemplate;
    multipleErrors: ErrorMessageTemplate;
  };
}
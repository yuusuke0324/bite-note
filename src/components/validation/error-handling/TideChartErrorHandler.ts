/**
 * TideChartErrorHandler.ts - エラー処理専用ハンドラー
 * TASK-102: TideChartErrorHandler実装
 *
 * Green Phase: 最小実装
 */

import type { ValidationResult, ValidationError } from '../types';
import type { TideChartData } from '../../../utils/validation/types';
import { ErrorType, WarningType } from '../types';
import type {
  ErrorDisplayInfo,
  FallbackType,
  ErrorProcessingOptions,
  MessageResources
} from './types';

/**
 * TideChartErrorHandler - エラー処理専用ハンドラー
 *
 * Green Phase: 最小実装
 * - 基本的なエラーメッセージ生成
 * - フォールバック判定ロジック
 * - 多言語対応の基礎
 */
export class TideChartErrorHandler {

  /**
   * 包括的エラー処理
   * @param result 検証結果
   * @param options 処理オプション
   * @returns エラー表示情報配列
   */
  processError(
    result: ValidationResult | null | undefined,
    options?: ErrorProcessingOptions
  ): ErrorDisplayInfo[] {
    // null/undefined ハンドリング
    if (!result) {
      return [{
        level: 'critical',
        title: 'データ読み込みエラー',
        message: '潮汐データの読み込みに失敗しました。',
        suggestion: 'データ形式を確認するか、時間をおいて再試行してください。',
        fallbackType: 'table'
      }];
    }

    // 不正な構造のハンドリング
    if (typeof result.isValid !== 'boolean' || !Array.isArray(result.errors)) {
      return [{
        level: 'critical',
        title: 'データ読み込みエラー',
        message: '潮汐データの読み込みに失敗しました。',
        suggestion: 'データ形式を確認するか、時間をおいて再試行してください。',
        fallbackType: 'table'
      }];
    }

    const locale = options?.locale || 'ja';
    const messageResources = this.getMessageResources();
    const messages = messageResources[locale] || messageResources.ja;

    // エラーがある場合
    if (result.errors && result.errors.length > 0) {
      const errorLevel = this.determineErrorLevel(result.errors);

      if (errorLevel === 'critical') {
        return [{
          level: 'critical',
          title: messages.critical.title,
          message: messages.critical.message,
          suggestion: messages.critical.suggestion,
          fallbackType: 'table',
          debugInfo: options?.includeDebugInfo ? this.generateDebugInfo(result, true) : undefined
        }];
      }

      // 複数エラーの場合
      if (result.errors.length > 1) {
        const errorCount = result.errors.length;
        const statsString = this.generateErrorStatsString(errorCount, locale);

        return [{
          level: 'error',
          title: messages.multipleErrors.title || messages.error.title,
          message: `複数のデータに異常があります（${statsString}）`,
          suggestion: messages.error.suggestion,
          fallbackType: this.determineFallbackFromSummary(result),
          debugInfo: options?.includeDebugInfo ? this.generateDebugInfo(result, true) : undefined
        }];
      }

      // 単一エラーの場合
      return [{
        level: 'error',
        title: messages.error.title,
        message: messages.error.message,
        suggestion: messages.error.suggestion,
        fallbackType: this.determineFallbackFromSummary(result),
        debugInfo: options?.includeDebugInfo ? this.generateDebugInfo(result, true) : undefined
      }];
    }

    // 警告のみの場合
    if (result.warnings && result.warnings.length > 0) {
      return [{
        level: 'warning',
        title: messages.warning.title,
        message: messages.warning.message,
        suggestion: messages.warning.suggestion,
        fallbackType: 'simple-chart',
        debugInfo: options?.includeDebugInfo ? this.generateDebugInfo(result, true) : undefined
      }];
    }

    // エラーなしの場合は空配列を返す
    return [];
  }

  /**
   * フォールバック表示方式の判定
   * @param validData 有効データ
   * @param errors エラー一覧
   * @returns フォールバック方式
   */
  determineFallback(validData: TideChartData[], errors: ValidationError[]): FallbackType {
    const validityPercentage = this.calculateDataValidityPercentage(validData, errors);

    if (validityPercentage > 80) {
      return 'none'; // 通常グラフ表示
    } else if (validityPercentage >= 50) {
      return 'partial-chart';
    } else if (validityPercentage >= 20) {
      return 'simple-chart';
    } else {
      return 'table';
    }
  }

  /**
   * サマリー情報を使ったフォールバック判定
   * @param result 検証結果
   * @returns フォールバック方式
   */
  private determineFallbackFromSummary(result: ValidationResult): FallbackType {
    const summary = result.summary;
    if (!summary || typeof summary.validRecords !== 'number' || typeof summary.totalRecords !== 'number') {
      // サマリーがない場合は従来の方法を使用
      return this.determineFallback(result.data || [], result.errors || []);
    }

    const validityPercentage = summary.totalRecords > 0
      ? (summary.validRecords / summary.totalRecords) * 100
      : 0;

    if (validityPercentage > 80) {
      return 'none'; // 通常グラフ表示
    } else if (validityPercentage >= 50) {
      return 'partial-chart';
    } else if (validityPercentage >= 20) {
      return 'simple-chart';
    } else {
      return 'table';
    }
  }

  /**
   * メッセージリソース取得（private）
   */
  private getMessageResources(): MessageResources {
    return {
      ja: {
        critical: {
          title: 'データ読み込みエラー',
          message: '潮汐データの読み込みに失敗しました。',
          suggestion: 'データ形式を確認するか、時間をおいて再試行してください。'
        },
        error: {
          title: 'データ異常',
          message: '潮汐データに異常な値が含まれています。',
          suggestion: '一部のデータを除外してグラフを表示します。'
        },
        warning: {
          title: 'データ品質注意',
          message: '一部のデータに軽微な問題があります。',
          suggestion: 'グラフは正常に表示されますが、精度が低下する可能性があります。'
        },
        multipleErrors: {
          title: 'データ異常',
          message: '複数のデータに異常があります。',
          suggestion: '問題のあるデータを除外してグラフを表示します。'
        }
      },
      en: {
        critical: {
          title: 'Data Loading Error',
          message: 'Failed to load tide data.',
          suggestion: 'Please check the data format or try again later.'
        },
        error: {
          title: 'Data Anomaly',
          message: 'Abnormal values found in tide data.',
          suggestion: 'Chart will be displayed excluding problematic data.'
        },
        warning: {
          title: 'Data Quality Notice',
          message: 'Minor issues found in some data.',
          suggestion: 'Chart will be displayed normally but accuracy may be reduced.'
        },
        multipleErrors: {
          title: 'Data Anomaly',
          message: 'Multiple data anomalies detected.',
          suggestion: 'Chart will be displayed excluding problematic data.'
        }
      }
    };
  }

  /**
   * エラーレベル判定（private）
   */
  private determineErrorLevel(errors: ValidationError[]): 'critical' | 'error' | 'warning' {
    // Critical レベルがあれば最優先
    if (errors.some(e => e.severity === 'critical')) {
      return 'critical';
    }
    // Error レベルがあれば優先
    if (errors.some(e => e.severity === 'error')) {
      return 'error';
    }
    // それ以外はwarning
    return 'warning';
  }

  /**
   * データ有効性計算（private）
   */
  private calculateDataValidityPercentage(validData: TideChartData[], errors: ValidationError[]): number {
    // validDataの長さがエラー除外後の有効データ数
    // エラー数は実際のエラー数
    const validCount = validData.length;
    const errorCount = errors.length;
    const totalCount = validCount + errorCount;

    if (totalCount === 0) {
      return 0;
    }

    return (validCount / totalCount) * 100;
  }

  /**
   * メッセージの長さ制限（private）
   */
  private truncateMessage(message: string, maxLength: number = 500): string {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength - 3) + '...';
  }

  /**
   * エラー統計文字列生成（private）
   */
  private generateErrorStatsString(errorCount: number, locale: 'ja' | 'en' = 'ja'): string {
    if (locale === 'en') {
      if (errorCount >= 1000) {
        return 'many errors';
      }
      return `${errorCount} error${errorCount > 1 ? 's' : ''}`;
    }

    // 日本語
    if (errorCount >= 1000) {
      return '多数のエラー';
    }
    return `${errorCount}件のエラー`;
  }

  /**
   * デバッグ情報生成（private）
   */
  private generateDebugInfo(
    result: ValidationResult,
    includeDebugInfo: boolean = false
  ): string | undefined {
    if (!includeDebugInfo) {
      return undefined;
    }

    try {
      return JSON.stringify({
        errorCount: result.errors?.length || 0,
        warningCount: result.warnings?.length || 0,
        validRecords: result.summary?.validRecords || 0,
        totalRecords: result.summary?.totalRecords || 0,
        processingTime: result.summary?.processingTime || 0
      });
    } catch {
      return 'Debug info generation failed';
    }
  }
}
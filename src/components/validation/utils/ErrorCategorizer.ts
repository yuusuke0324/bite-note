/**
 * ErrorCategorizer.ts - エラー分類ユーティリティ
 * TASK-101: TideDataValidator実装
 */

import type { ValidationError } from '../types';
import { ErrorType } from '../types';
import type { TideValidationError } from '../../../utils/validation/errors';

/**
 * エラー分類ユーティリティ
 */
export class ErrorCategorizer {
  /**
   * エラーを分類・優先度付けする
   * @param errors 基本エラー一覧
   * @returns 分類済みエラー
   */
  static categorize(errors: TideValidationError[]): ValidationError[] {
    if (!errors || errors.length === 0) {
      return [];
    }

    const categorizedErrors: ValidationError[] = errors.map(error => {
      const validationError: ValidationError = {
        type: this.mapToErrorType(error),
        severity: this.determineSeverity(error),
        message: this.createUserFriendlyMessage(error),
        field: this.extractField(error),
        index: this.extractIndex(error),
        context: this.extractContext(error)
      };

      return validationError;
    });

    // 重要度順でソート（critical > error > warning）
    return categorizedErrors.sort((a, b) => {
      const severityOrder = { critical: 0, error: 1, warning: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * TASK-002エラーをTASK-101エラータイプにマッピング
   */
  private static mapToErrorType(error: TideValidationError): ErrorType {
    switch (error.code) {
      case 'EMPTY_DATA':
        return ErrorType.EMPTY_DATA;
      case 'INVALID_TIME_FORMAT':
        return ErrorType.INVALID_TIME_FORMAT;
      case 'TIDE_OUT_OF_RANGE':
        return ErrorType.TIDE_OUT_OF_RANGE;
      case 'DUPLICATE_TIMESTAMP':
        return ErrorType.DUPLICATE_TIMESTAMP;
      default:
        return ErrorType.STRUCTURE_ERROR;
    }
  }

  /**
   * エラーの重要度を判定
   */
  private static determineSeverity(error: TideValidationError): 'critical' | 'error' | 'warning' {
    switch (error.code) {
      case 'EMPTY_DATA':
      case 'STRUCTURE_ERROR':
        return 'critical';
      case 'INVALID_TIME_FORMAT':
      case 'TIDE_OUT_OF_RANGE':
      case 'DUPLICATE_TIMESTAMP':
        return 'error';
      case 'DATA_QUALITY_WARNING':
      case 'PROCESSING_TIMEOUT':
        return 'warning';
      default:
        return 'error';
    }
  }

  /**
   * ユーザーフレンドリーなメッセージを作成
   */
  private static createUserFriendlyMessage(error: TideValidationError): string {
    // TASK-101用の日本語メッセージに変換
    switch (error.code) {
      case 'INVALID_TIME_FORMAT':
        return `時刻形式が正しくありません: ${error.context?.timeValue || '不明'}`;
      case 'TIDE_OUT_OF_RANGE':
        return `潮位値が範囲外です: ${error.context?.tideValue || '不明'}m`;
      case 'DUPLICATE_TIMESTAMP':
        return `重複するタイムスタンプです: ${error.context?.timeValue || '不明'}`;
      case 'EMPTY_DATA':
        return '潮汐データが空です';
      case 'STRUCTURE_ERROR':
        return 'データ構造にエラーがあります';
      default:
        return error.message;
    }
  }

  /**
   * エラーフィールドを抽出
   */
  private static extractField(error: TideValidationError): string | undefined {
    switch (error.code) {
      case 'INVALID_TIME_FORMAT':
      case 'DUPLICATE_TIMESTAMP':
        return 'time';
      case 'TIDE_OUT_OF_RANGE':
        return 'tide';
      default:
        return undefined;
    }
  }

  /**
   * エラーインデックスを抽出
   */
  private static extractIndex(error: TideValidationError): number | undefined {
    return error.context?.index;
  }

  /**
   * エラーコンテキストを抽出
   */
  private static extractContext(error: TideValidationError): any {
    return error.context;
  }
}
/**
 * データ検証エラークラス定義
 * TASK-002: データ検証・変換ユーティリティ実装
 */

import type { ValidationErrorCode, ErrorContext } from './types';

/**
 * 潮汐データ検証エラーの基底クラス
 */
export class TideValidationError extends Error {
  /** エラーコード */
  public readonly code: ValidationErrorCode;

  /** エラーコンテキスト */
  public readonly context: ErrorContext;

  constructor(
    message: string,
    code: ValidationErrorCode,
    context: ErrorContext = {}
  ) {
    super(message);
    this.name = 'TideValidationError';
    this.code = code;
    this.context = context;

    // Error クラスの prototype チェーンを維持
    Object.setPrototypeOf(this, TideValidationError.prototype);
  }
}

/**
 * 無効な時刻フォーマットエラー
 */
export class InvalidTimeFormatError extends TideValidationError {
  constructor(timeValue: string, index?: number) {
    const message = `Invalid time format: "${timeValue}". Expected ISO 8601 format (e.g., "2025-01-29T12:00:00Z").`;
    const context: ErrorContext = {
      timeValue,
      index
    };

    super(message, 'INVALID_TIME_FORMAT', context);
    this.name = 'InvalidTimeFormatError';

    // Error クラスの prototype チェーンを維持
    Object.setPrototypeOf(this, InvalidTimeFormatError.prototype);
  }
}

/**
 * 潮位範囲外エラー
 */
export class TideOutOfRangeError extends TideValidationError {
  constructor(tideValue: number, index?: number) {
    const message = `Tide value ${tideValue} is out of valid range (-3.0 to 5.0 meters).`;
    const context: ErrorContext = {
      tideValue,
      index
    };

    super(message, 'TIDE_OUT_OF_RANGE', context);
    this.name = 'TideOutOfRangeError';

    // Error クラスの prototype チェーンを維持
    Object.setPrototypeOf(this, TideOutOfRangeError.prototype);
  }
}

/**
 * 空データエラー
 */
export class EmptyDataError extends TideValidationError {
  constructor() {
    const message = 'Data array is empty. At least one tide data point is required.';

    super(message, 'EMPTY_DATA', {});
    this.name = 'EmptyDataError';

    // Error クラスの prototype チェーンを維持
    Object.setPrototypeOf(this, EmptyDataError.prototype);
  }
}
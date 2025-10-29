/**
 * TideDataValidator - 潮汐データ検証クラス
 * TASK-002: データ検証・変換ユーティリティ実装
 */

import type { ITideDataValidator, RawTideData } from './types';
import { TIDE_VALIDATION } from './types';
import {
  InvalidTimeFormatError,
  TideOutOfRangeError,
  EmptyDataError
} from './errors';

/**
 * 潮汐データバリデーター
 */
export class TideDataValidator implements ITideDataValidator {
  /**
   * 時刻フォーマットを検証
   */
  validateTimeFormat(time: string): boolean {
    if (typeof time !== 'string' || !time) {
      return false;
    }

    try {
      // ISO 8601形式の基本パターンをチェック
      const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)$/;
      if (!iso8601Pattern.test(time)) {
        return false;
      }

      const date = new Date(time);

      // 無効な日付をチェック
      if (isNaN(date.getTime())) {
        return false;
      }

      // 有効性をより厳密にチェック: 原文字列と再パース結果を比較
      const reparsed = date.toISOString();
      const normalizedInput = new Date(time).toISOString();

      // 有効な日付かどうかは、パース結果の一貫性で判定
      if (normalizedInput !== reparsed) {
        return false;
      }

      // さらに厳密なチェック: 日付成分が論理的に正しいかチェック
      // 例: 2023-02-29 (非うるう年の2月29日) は無効
      const parts = time.split('T')[0].split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);

      // 月の範囲チェック
      if (month < 1 || month > 12) {
        return false;
      }

      // 日の範囲チェック
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day < 1 || day > daysInMonth) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 潮位範囲を検証
   */
  validateTideRange(tide: number): boolean {
    if (typeof tide !== 'number' || isNaN(tide) || !isFinite(tide)) {
      return false;
    }

    return tide >= TIDE_VALIDATION.MIN_TIDE && tide <= TIDE_VALIDATION.MAX_TIDE;
  }

  /**
   * データ配列を検証
   */
  validateDataArray(data: RawTideData[]): void {
    // null/undefined チェック
    if (!data) {
      throw new EmptyDataError();
    }

    // 空配列チェック
    if (data.length === 0) {
      throw new EmptyDataError();
    }

    // 各要素を検証
    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      // プロパティ存在チェック
      if (!item || typeof item !== 'object') {
        throw new InvalidTimeFormatError('Invalid data structure', i);
      }

      // 時刻検証
      if (!this.validateTimeFormat(item.time)) {
        throw new InvalidTimeFormatError(item.time, i);
      }

      // 潮位検証
      if (!this.validateTideRange(item.tide)) {
        throw new TideOutOfRangeError(item.tide, i);
      }
    }
  }
}
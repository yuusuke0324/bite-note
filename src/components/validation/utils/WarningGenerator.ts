/**
 * WarningGenerator.ts - 警告生成ユーティリティ
 * TASK-101: TideDataValidator実装
 */

import type { ValidationWarning } from '../types';
import { WarningType } from '../types';
import type { RawTideData } from '../../../utils/validation/types';
import { TIDE_VALIDATION } from '../../../utils/validation/types';

/**
 * 警告生成ユーティリティ
 */
export class WarningGenerator {
  /**
   * データから警告を生成する
   * @param data 潮汐データ
   * @returns 警告一覧
   */
  static generate(data: RawTideData[]): ValidationWarning[] {
    if (!data || data.length === 0) {
      return [];
    }

    const warnings: ValidationWarning[] = [];

    // 境界値警告
    warnings.push(...this.checkBoundaryValues(data));

    // 時系列順序警告
    warnings.push(...this.checkTimeSequence(data));

    // データ密度警告
    warnings.push(...this.checkDataDensity(data));

    return warnings;
  }

  /**
   * 境界値警告をチェック
   */
  private static checkBoundaryValues(data: RawTideData[]): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const warningThreshold = 0.1; // 境界値から0.1以内で警告

    data.forEach((item, index) => {
      if (typeof item.tide === 'number' && !isNaN(item.tide)) {
        // 上限近く
        if (item.tide > TIDE_VALIDATION.MAX_TIDE - warningThreshold) {
          warnings.push({
            type: WarningType.DATA_QUALITY,
            message: `潮位値 ${item.tide}m が上限値 ${TIDE_VALIDATION.MAX_TIDE}m に近すぎます`,
            field: 'tide',
            index,
            suggestion: '測定値の精度を確認してください'
          });
        }
        // 下限近く
        else if (item.tide < TIDE_VALIDATION.MIN_TIDE + warningThreshold) {
          warnings.push({
            type: WarningType.DATA_QUALITY,
            message: `潮位値 ${item.tide}m が下限値 ${TIDE_VALIDATION.MIN_TIDE}m に近すぎます`,
            field: 'tide',
            index,
            suggestion: '測定値の精度を確認してください'
          });
        }
      }
    });

    return warnings;
  }

  /**
   * 時系列順序警告をチェック
   */
  private static checkTimeSequence(data: RawTideData[]): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (data.length < 2) {
      return warnings;
    }

    for (let i = 1; i < data.length; i++) {
      const prevTime = new Date(data[i - 1].time);
      const currentTime = new Date(data[i].time);

      // 時系列が逆順の場合
      if (currentTime < prevTime) {
        warnings.push({
          type: WarningType.DATA_QUALITY,
          message: `時系列データが逆順になっています（インデックス ${i - 1} → ${i}）`,
          field: 'time',
          index: i,
          suggestion: 'データを時刻順にソートしてください'
        });
      }
    }

    return warnings;
  }

  /**
   * データ密度警告をチェック
   */
  private static checkDataDensity(data: RawTideData[]): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (data.length < 2) {
      return warnings;
    }

    const maxGapHours = 6; // 6時間以上の間隔で警告

    for (let i = 1; i < data.length; i++) {
      const prevTime = new Date(data[i - 1].time);
      const currentTime = new Date(data[i].time);
      const gapHours = (currentTime.getTime() - prevTime.getTime()) / (1000 * 60 * 60);

      if (gapHours > maxGapHours) {
        warnings.push({
          type: WarningType.DATA_QUALITY,
          message: `データ間隔が ${gapHours.toFixed(1)} 時間と長すぎます`,
          field: 'time',
          index: i,
          suggestion: 'データの取得頻度を確認してください'
        });
      }
    }

    return warnings;
  }
}
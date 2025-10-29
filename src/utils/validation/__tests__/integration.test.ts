/**
 * 統合テスト - データ検証・変換ユーティリティ
 * TASK-002: データ検証・変換ユーティリティ実装
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { TideDataValidator } from '../TideDataValidator';
import { TideDataTransformer } from '../TideDataTransformer';
import {
  TideValidationError,
  InvalidTimeFormatError,
  TideOutOfRangeError,
  EmptyDataError
} from '../errors';
import type { RawTideData } from '../types';

describe('Validation Integration', () => {
  let validator: TideDataValidator;
  let transformer: TideDataTransformer;

  beforeEach(() => {
    validator = new TideDataValidator();
    transformer = new TideDataTransformer();
  });

  test('should process complete tide data workflow', () => {
    const rawData: RawTideData[] = [
      { time: '2025-01-29T12:00:00Z', tide: 2.5 },
      { time: '2025-01-29T13:00:00Z', tide: 3.0 },
      { time: '2025-01-29T14:00:00Z', tide: 1.5 }
    ];

    // 検証段階
    expect(() => validator.validateDataArray(rawData)).not.toThrow();

    // 変換段階
    const result = transformer.transform(rawData);

    // 結果検証
    expect(result).toHaveLength(3);
    expect(result.every(item =>
      typeof item.x === 'number' &&
      typeof item.y === 'number' &&
      item.timestamp instanceof Date
    )).toBe(true);

    // 時刻順ソート確認
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].x).toBeLessThanOrEqual(result[i + 1].x);
    }
  });

  test('should handle real-world tide data scenario', () => {
    // 実際の潮汐データを模した複雑なケース
    const rawData: RawTideData[] = [
      { time: '2025-01-29T06:00:00Z', tide: -1.2 },  // 干潮
      { time: '2025-01-29T12:00:00Z', tide: 4.5 },   // 満潮
      { time: '2025-01-29T18:00:00Z', tide: -0.8 },  // 干潮
      { time: '2025-01-29T23:30:00Z', tide: 3.9 }    // 満潮
    ];

    // 統合処理
    const result = transformer.validateAndTransform(rawData);

    expect(result).toHaveLength(4);
    expect(result[0].y).toBe(-1.2);
    expect(result[1].y).toBe(4.5);
    expect(result[2].y).toBe(-0.8);
    expect(result[3].y).toBe(3.9);

    // 時系列順確認（UTCで確認）
    expect(result[0].timestamp.getUTCHours()).toBe(6);
    expect(result[1].timestamp.getUTCHours()).toBe(12);
    expect(result[2].timestamp.getUTCHours()).toBe(18);
    expect(result[3].timestamp.getUTCHours()).toBe(23);
  });

  test('should handle timezone conversion correctly', () => {
    const rawData: RawTideData[] = [
      { time: '2025-01-29T15:00:00+09:00', tide: 2.0 },  // JST
      { time: '2025-01-29T06:00:00Z', tide: 2.5 },       // UTC
      { time: '2025-01-29T01:00:00-05:00', tide: 3.0 }   // EST
    ];

    const result = transformer.validateAndTransform(rawData);

    // 全て同じUTC時刻（06:00 UTC）になるはず
    expect(result).toHaveLength(3);
    expect(result[0].x).toBe(result[1].x);
    expect(result[1].x).toBe(result[2].x);
  });

  test('should maintain data integrity through workflow', () => {
    const rawData: RawTideData[] = [
      { time: '2025-01-29T12:00:00Z', tide: -3.0 },  // 境界値
      { time: '2025-01-29T13:00:00Z', tide: 5.0 },   // 境界値
      { time: '2025-01-29T14:00:00Z', tide: 0.0 }    // ゼロ値
    ];

    // 個別検証
    rawData.forEach(item => {
      expect(validator.validateTimeFormat(item.time)).toBe(true);
      expect(validator.validateTideRange(item.tide)).toBe(true);
    });

    // 配列検証
    expect(() => validator.validateDataArray(rawData)).not.toThrow();

    // 変換処理
    const result = transformer.transform(rawData);

    // データ完整性確認
    expect(result).toHaveLength(3);
    expect(result[0].y).toBe(-3.0);
    expect(result[1].y).toBe(5.0);
    expect(result[2].y).toBe(0.0);
  });
});

describe('error chain processing', () => {
  let transformer: TideDataTransformer;

  beforeEach(() => {
    transformer = new TideDataTransformer();
  });

  test('should handle multiple validation errors', () => {
    const invalidData: RawTideData[] = [
      { time: 'invalid1', tide: 2.5 },      // 時刻エラー
      { time: '2025-01-29T12:00:00Z', tide: 10.0 },  // 範囲エラー
      { time: 'invalid2', tide: -5.0 }      // 両方エラー
    ];

    expect(() => transformer.validateAndTransform(invalidData))
      .toThrow(TideValidationError);
  });

  test('should report first error encountered', () => {
    const invalidData: RawTideData[] = [
      { time: 'first-error', tide: 2.5 },   // 最初のエラー
      { time: 'second-error', tide: 10.0 }
    ];

    try {
      transformer.validateAndTransform(invalidData);
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error).toBeInstanceOf(InvalidTimeFormatError);
      expect(error.context.index).toBe(0);
      expect(error.context.timeValue).toBe('first-error');
    }
  });

  test('should handle empty data error', () => {
    expect(() => transformer.validateAndTransform([]))
      .toThrow(EmptyDataError);
  });

  test('should handle null/undefined input', () => {
    expect(() => transformer.validateAndTransform(null as any))
      .toThrow();
    expect(() => transformer.validateAndTransform(undefined as any))
      .toThrow();
  });
});

describe('performance integration', () => {
  let transformer: TideDataTransformer;

  beforeEach(() => {
    transformer = new TideDataTransformer();
  });

  test('should handle large dataset efficiently', () => {
    const largeData: RawTideData[] = Array.from({ length: 5000 }, (_, i) => ({
      time: new Date(Date.now() + i * 60000).toISOString(),
      tide: Math.sin(i * 0.1) * 2.5  // -2.5 to 2.5の範囲（有効範囲内）
    }));

    const startTime = performance.now();
    const result = transformer.validateAndTransform(largeData);
    const endTime = performance.now();

    expect(result).toHaveLength(5000);
    expect(endTime - startTime).toBeLessThan(50); // 50ms以内
  });

  test('should maintain performance with mixed timezones', () => {
    const timezones = ['+09:00', '-05:00', '+01:00', 'Z'];
    const mixedData: RawTideData[] = Array.from({ length: 1000 }, (_, i) => ({
      time: `2025-01-29T${String(12 + (i % 12)).padStart(2, '0')}:00:00${timezones[i % 4]}`,
      tide: (i % 8) - 3
    }));

    const startTime = performance.now();
    const result = transformer.validateAndTransform(mixedData);
    const endTime = performance.now();

    expect(result).toHaveLength(1000);
    expect(endTime - startTime).toBeLessThan(20);
  });
});

describe('data consistency validation', () => {
  let validator: TideDataValidator;
  let transformer: TideDataTransformer;

  beforeEach(() => {
    validator = new TideDataValidator();
    transformer = new TideDataTransformer();
  });

  test('should ensure transform output matches validation rules', () => {
    const testData: RawTideData[] = [
      { time: '2025-01-29T12:00:00Z', tide: 2.5 }
    ];

    // 検証で通るデータは変換でも成功するはず
    expect(() => validator.validateDataArray(testData)).not.toThrow();

    const result = transformer.validateAndTransform(testData);
    expect(result).toHaveLength(1);

    // 変換後のデータも妥当性を保つ
    expect(result[0].y).toBe(2.5);
    expect(result[0].x).toBeGreaterThan(0);
    expect(result[0].timestamp instanceof Date).toBe(true);
  });

  test('should reject invalid data consistently', () => {
    const invalidCases = [
      [{ time: 'invalid', tide: 2.5 }],
      [{ time: '2025-01-29T12:00:00Z', tide: 10.0 }],
      []
    ];

    invalidCases.forEach(invalidData => {
      // バリデーターでエラーになるデータは
      let validatorThrows = false;
      try {
        validator.validateDataArray(invalidData as any);
      } catch {
        validatorThrows = true;
      }

      // トランスフォーマーでもエラーになるはず
      let transformerThrows = false;
      try {
        transformer.validateAndTransform(invalidData as any);
      } catch {
        transformerThrows = true;
      }

      expect(validatorThrows).toBe(transformerThrows);
    });
  });
});
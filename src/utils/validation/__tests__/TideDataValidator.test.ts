/**
 * TideDataValidator テスト
 * TASK-002: データ検証・変換ユーティリティ実装
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { TideDataValidator } from '../TideDataValidator';
import {
  InvalidTimeFormatError,
  TideOutOfRangeError,
  EmptyDataError
} from '../errors';
import type { RawTideData } from '../types';

describe('TideDataValidator', () => {
  let validator: TideDataValidator;

  beforeEach(() => {
    validator = new TideDataValidator();
  });

  describe('validateTimeFormat', () => {
    test('should accept valid ISO 8601 formats', () => {
      expect(validator.validateTimeFormat('2025-01-29T12:00:00Z')).toBe(true);
      expect(validator.validateTimeFormat('2025-01-29T12:00:00+09:00')).toBe(true);
      expect(validator.validateTimeFormat('2025-01-29T12:00:00-05:00')).toBe(true);
      expect(validator.validateTimeFormat('2025-01-29T12:00:00.123Z')).toBe(true);
      expect(validator.validateTimeFormat('2025-12-31T23:59:59Z')).toBe(true);
    });

    test('should reject invalid time formats', () => {
      expect(validator.validateTimeFormat('invalid')).toBe(false);
      expect(validator.validateTimeFormat('2025-13-01T12:00:00Z')).toBe(false);
      expect(validator.validateTimeFormat('2025-01-32T12:00:00Z')).toBe(false);
      expect(validator.validateTimeFormat('2025-01-01T25:00:00Z')).toBe(false);
      expect(validator.validateTimeFormat('2025-01-01T12:60:00Z')).toBe(false);
      expect(validator.validateTimeFormat('2025-01-01T12:00:60Z')).toBe(false);
      expect(validator.validateTimeFormat('')).toBe(false);
      expect(validator.validateTimeFormat('2025-01-01')).toBe(false);
      expect(validator.validateTimeFormat('12:00:00')).toBe(false);
    });

    test('should handle null and undefined', () => {
      expect(validator.validateTimeFormat(null as any)).toBe(false);
      expect(validator.validateTimeFormat(undefined as any)).toBe(false);
    });

    test('should handle non-string types', () => {
      expect(validator.validateTimeFormat(123 as any)).toBe(false);
      expect(validator.validateTimeFormat(new Date() as any)).toBe(false);
      expect(validator.validateTimeFormat([] as any)).toBe(false);
      expect(validator.validateTimeFormat({} as any)).toBe(false);
    });

    test('should handle edge cases', () => {
      // うるう年
      expect(validator.validateTimeFormat('2024-02-29T12:00:00Z')).toBe(true);
      expect(validator.validateTimeFormat('2023-02-29T12:00:00Z')).toBe(false);

      // 境界値
      expect(validator.validateTimeFormat('2025-01-01T00:00:00Z')).toBe(true);
      expect(validator.validateTimeFormat('2025-12-31T23:59:59Z')).toBe(true);
    });
  });

  describe('validateTideRange', () => {
    test('should accept valid tide range', () => {
      expect(validator.validateTideRange(0)).toBe(true);
      expect(validator.validateTideRange(-3.0)).toBe(true);  // 下限境界値
      expect(validator.validateTideRange(5.0)).toBe(true);   // 上限境界値
      expect(validator.validateTideRange(2.5)).toBe(true);
      expect(validator.validateTideRange(-1.5)).toBe(true);
      expect(validator.validateTideRange(4.9)).toBe(true);
      expect(validator.validateTideRange(-2.9)).toBe(true);
    });

    test('should reject out of range tides', () => {
      expect(validator.validateTideRange(-3.1)).toBe(false);
      expect(validator.validateTideRange(5.1)).toBe(false);
      expect(validator.validateTideRange(-10)).toBe(false);
      expect(validator.validateTideRange(10)).toBe(false);
      expect(validator.validateTideRange(-100)).toBe(false);
      expect(validator.validateTideRange(100)).toBe(false);
    });

    test('should reject invalid tide types', () => {
      expect(validator.validateTideRange(NaN)).toBe(false);
      expect(validator.validateTideRange(Infinity)).toBe(false);
      expect(validator.validateTideRange(-Infinity)).toBe(false);
      expect(validator.validateTideRange(null as any)).toBe(false);
      expect(validator.validateTideRange(undefined as any)).toBe(false);
      expect(validator.validateTideRange('2.5' as any)).toBe(false);
      expect(validator.validateTideRange([] as any)).toBe(false);
      expect(validator.validateTideRange({} as any)).toBe(false);
    });

    test('should handle floating point precision', () => {
      expect(validator.validateTideRange(-3.0000000001)).toBe(false);
      expect(validator.validateTideRange(5.0000000001)).toBe(false);
      expect(validator.validateTideRange(-2.9999999999)).toBe(true);
      expect(validator.validateTideRange(4.9999999999)).toBe(true);
    });
  });

  describe('validateDataArray', () => {
    test('should accept valid data array', () => {
      const validData: RawTideData[] = [
        { time: '2025-01-29T12:00:00Z', tide: 2.5 },
        { time: '2025-01-29T13:00:00Z', tide: 3.0 }
      ];
      expect(() => validator.validateDataArray(validData)).not.toThrow();
    });

    test('should accept single item array', () => {
      const validData: RawTideData[] = [
        { time: '2025-01-29T12:00:00Z', tide: 2.5 }
      ];
      expect(() => validator.validateDataArray(validData)).not.toThrow();
    });

    test('should reject empty array', () => {
      expect(() => validator.validateDataArray([])).toThrow(EmptyDataError);
    });

    test('should reject null or undefined', () => {
      expect(() => validator.validateDataArray(null as any)).toThrow();
      expect(() => validator.validateDataArray(undefined as any)).toThrow();
    });

    test('should reject invalid time format in data', () => {
      const invalidData: RawTideData[] = [
        { time: 'invalid', tide: 2.5 }
      ];
      expect(() => validator.validateDataArray(invalidData))
        .toThrow(InvalidTimeFormatError);
    });

    test('should reject out of range tide in data', () => {
      const invalidData: RawTideData[] = [
        { time: '2025-01-29T12:00:00Z', tide: 10.0 }
      ];
      expect(() => validator.validateDataArray(invalidData))
        .toThrow(TideOutOfRangeError);
    });

    test('should provide error context with index for time error', () => {
      const invalidData: RawTideData[] = [
        { time: '2025-01-29T12:00:00Z', tide: 2.5 },
        { time: 'invalid', tide: 3.0 }  // index 1で無効
      ];

      try {
        validator.validateDataArray(invalidData);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(InvalidTimeFormatError);
        expect(error.context.index).toBe(1);
        expect(error.context.timeValue).toBe('invalid');
      }
    });

    test('should provide error context with index for tide error', () => {
      const invalidData: RawTideData[] = [
        { time: '2025-01-29T12:00:00Z', tide: 2.5 },
        { time: '2025-01-29T13:00:00Z', tide: 10.0 }  // index 1で無効
      ];

      try {
        validator.validateDataArray(invalidData);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(TideOutOfRangeError);
        expect(error.context.index).toBe(1);
        expect(error.context.tideValue).toBe(10.0);
      }
    });

    test('should validate all items and report first error', () => {
      const invalidData: RawTideData[] = [
        { time: 'invalid1', tide: 2.5 },     // 最初のエラー
        { time: '2025-01-29T12:00:00Z', tide: 10.0 },
        { time: 'invalid2', tide: -5.0 }
      ];

      try {
        validator.validateDataArray(invalidData);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(InvalidTimeFormatError);
        expect(error.context.index).toBe(0);
      }
    });

    test('should handle missing properties', () => {
      const invalidData = [
        { time: '2025-01-29T12:00:00Z' },  // tide missing
        { tide: 2.5 }  // time missing
      ] as any[];

      expect(() => validator.validateDataArray(invalidData)).toThrow();
    });

    test('should handle wrong property types', () => {
      const invalidData = [
        { time: 123, tide: '2.5' }  // 型が逆
      ] as any[];

      expect(() => validator.validateDataArray(invalidData)).toThrow();
    });

    test('should handle boundary values in array', () => {
      const boundaryData: RawTideData[] = [
        { time: '2025-01-29T12:00:00Z', tide: -3.0 },  // 下限
        { time: '2025-01-29T13:00:00Z', tide: 5.0 }    // 上限
      ];

      expect(() => validator.validateDataArray(boundaryData)).not.toThrow();
    });

    test('should handle large array', () => {
      const largeData: RawTideData[] = Array.from({ length: 1000 }, (_, i) => ({
        time: new Date(Date.now() + i * 60000).toISOString(),
        tide: (i % 8) - 3  // -3 to 4の範囲
      }));

      expect(() => validator.validateDataArray(largeData)).not.toThrow();
    });
  });
});
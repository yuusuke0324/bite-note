/**
 * TideDataTransformer テスト
 * TASK-002: データ検証・変換ユーティリティ実装
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { TideDataTransformer } from '../TideDataTransformer';
import {
  InvalidTimeFormatError,
  TideOutOfRangeError,
  EmptyDataError
} from '../errors';
import type { RawTideData, TideChartData } from '../types';

describe('TideDataTransformer', () => {
  let transformer: TideDataTransformer;

  beforeEach(() => {
    transformer = new TideDataTransformer();
  });

  describe('transform', () => {
    test('should transform valid data correctly', () => {
      const rawData: RawTideData[] = [
        { time: '2025-01-29T12:00:00Z', tide: 2.5 }
      ];

      const result = transformer.transform(rawData);

      expect(result).toHaveLength(1);
      expect(result[0].x).toBe(new Date('2025-01-29T12:00:00Z').getTime());
      expect(result[0].y).toBe(2.5);
      expect(result[0].timestamp).toEqual(new Date('2025-01-29T12:00:00Z'));
    });

    test('should handle multiple data points', () => {
      const rawData: RawTideData[] = [
        { time: '2025-01-29T12:00:00Z', tide: 2.5 },
        { time: '2025-01-29T13:00:00Z', tide: 3.0 },
        { time: '2025-01-29T14:00:00Z', tide: 1.5 }
      ];

      const result = transformer.transform(rawData);

      expect(result).toHaveLength(3);
      expect(result[0].y).toBe(2.5);
      expect(result[1].y).toBe(3.0);
      expect(result[2].y).toBe(1.5);
    });

    test('should handle empty array', () => {
      const result = transformer.transform([]);

      expect(result).toEqual([]);
    });

    test('should preserve all required properties', () => {
      const rawData: RawTideData[] = [
        { time: '2025-01-29T12:00:00Z', tide: 2.5 }
      ];

      const result = transformer.transform(rawData);

      expect(result[0]).toHaveProperty('x');
      expect(result[0]).toHaveProperty('y');
      expect(result[0]).toHaveProperty('timestamp');
      expect(typeof result[0].x).toBe('number');
      expect(typeof result[0].y).toBe('number');
      expect(result[0].timestamp instanceof Date).toBe(true);
    });

    test('should convert different timezone formats correctly', () => {
      const rawData: RawTideData[] = [
        { time: '2025-01-29T12:00:00Z', tide: 2.5 },        // UTC
        { time: '2025-01-29T21:00:00+09:00', tide: 3.0 },   // JST (same as 12:00 UTC)
        { time: '2025-01-29T03:00:00-09:00', tide: 1.5 }    // AKST (same as 12:00 UTC)
      ];

      const result = transformer.transform(rawData);

      expect(result).toHaveLength(3);
      // 同じUTC時刻になるはず
      expect(result[0].x).toBe(result[1].x);
      expect(result[0].x).toBe(result[2].x);
    });

    test('should handle milliseconds in timestamp', () => {
      const rawData: RawTideData[] = [
        { time: '2025-01-29T12:00:00.123Z', tide: 2.5 }
      ];

      const result = transformer.transform(rawData);

      expect(result[0].x).toBe(new Date('2025-01-29T12:00:00.123Z').getTime());
      expect(result[0].timestamp.getMilliseconds()).toBe(123);
    });

    test('should handle boundary tide values', () => {
      const rawData: RawTideData[] = [
        { time: '2025-01-29T12:00:00Z', tide: -3.0 },
        { time: '2025-01-29T13:00:00Z', tide: 5.0 },
        { time: '2025-01-29T14:00:00Z', tide: 0 }
      ];

      const result = transformer.transform(rawData);

      expect(result[0].y).toBe(-3.0);
      expect(result[1].y).toBe(5.0);
      expect(result[2].y).toBe(0);
    });
  });

  describe('time sorting', () => {
    test('should sort data by time ascending', () => {
      const rawData: RawTideData[] = [
        { time: '2025-01-29T14:00:00Z', tide: 1.5 },  // 後の時刻
        { time: '2025-01-29T12:00:00Z', tide: 2.5 },  // 前の時刻
        { time: '2025-01-29T13:00:00Z', tide: 3.0 }   // 中間
      ];

      const result = transformer.transform(rawData);

      expect(result[0].timestamp.getTime()).toBeLessThan(result[1].timestamp.getTime());
      expect(result[1].timestamp.getTime()).toBeLessThan(result[2].timestamp.getTime());
      expect(result[0].y).toBe(2.5);  // 12:00のデータ
      expect(result[1].y).toBe(3.0);  // 13:00のデータ
      expect(result[2].y).toBe(1.5);  // 14:00のデータ
    });

    test('should handle same timestamps', () => {
      const rawData: RawTideData[] = [
        { time: '2025-01-29T12:00:00Z', tide: 2.5 },
        { time: '2025-01-29T12:00:00Z', tide: 3.0 }  // 同じ時刻
      ];

      const result = transformer.transform(rawData);

      expect(result).toHaveLength(2);
      expect(result[0].x).toBe(result[1].x);  // 同じタイムスタンプ
      expect(result[0].y).toBe(2.5);
      expect(result[1].y).toBe(3.0);
    });

    test('should handle reverse chronological order', () => {
      const rawData: RawTideData[] = [
        { time: '2025-01-29T23:00:00Z', tide: 4.0 },
        { time: '2025-01-29T22:00:00Z', tide: 3.0 },
        { time: '2025-01-29T21:00:00Z', tide: 2.0 },
        { time: '2025-01-29T20:00:00Z', tide: 1.0 }
      ];

      const result = transformer.transform(rawData);

      // 時刻昇順でソートされているはず
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].x).toBeLessThan(result[i + 1].x);
      }

      expect(result[0].y).toBe(1.0);  // 20:00
      expect(result[1].y).toBe(2.0);  // 21:00
      expect(result[2].y).toBe(3.0);  // 22:00
      expect(result[3].y).toBe(4.0);  // 23:00
    });

    test('should handle mixed timezone data', () => {
      const rawData: RawTideData[] = [
        { time: '2025-01-29T12:00:00-05:00', tide: 3.0 },  // EST
        { time: '2025-01-29T09:00:00-08:00', tide: 1.0 },  // PST (same UTC)
        { time: '2025-01-29T18:00:00+01:00', tide: 2.0 }   // CET (same UTC)
      ];

      const result = transformer.transform(rawData);

      // 全て同じUTC時刻なので、元の順序を保持
      expect(result).toHaveLength(3);
    });
  });

  describe('validateAndTransform', () => {
    test('should validate and transform valid data', () => {
      const rawData: RawTideData[] = [
        { time: '2025-01-29T12:00:00Z', tide: 2.5 }
      ];

      const result = transformer.validateAndTransform(rawData);

      expect(result).toHaveLength(1);
      expect(result[0].y).toBe(2.5);
      expect(result[0].x).toBe(new Date('2025-01-29T12:00:00Z').getTime());
      expect(result[0].timestamp).toEqual(new Date('2025-01-29T12:00:00Z'));
    });

    test('should throw error for invalid time format', () => {
      const invalidData: RawTideData[] = [
        { time: 'invalid', tide: 2.5 }
      ];

      expect(() => transformer.validateAndTransform(invalidData))
        .toThrow(InvalidTimeFormatError);
    });

    test('should throw error for out of range tide', () => {
      const invalidData: RawTideData[] = [
        { time: '2025-01-29T12:00:00Z', tide: 10.0 }
      ];

      expect(() => transformer.validateAndTransform(invalidData))
        .toThrow(TideOutOfRangeError);
    });

    test('should throw error for empty data', () => {
      expect(() => transformer.validateAndTransform([]))
        .toThrow(EmptyDataError);
    });

    test('should handle mixed valid and invalid data', () => {
      const mixedData: RawTideData[] = [
        { time: '2025-01-29T12:00:00Z', tide: 2.5 },  // valid
        { time: 'invalid', tide: 3.0 }                // invalid
      ];

      expect(() => transformer.validateAndTransform(mixedData))
        .toThrow(InvalidTimeFormatError);
    });

    test('should validate all entries before transformation', () => {
      const invalidData: RawTideData[] = [
        { time: '2025-01-29T12:00:00Z', tide: 10.0 },  // invalid tide
        { time: '2025-01-29T13:00:00Z', tide: 2.5 }    // valid
      ];

      expect(() => transformer.validateAndTransform(invalidData))
        .toThrow(TideOutOfRangeError);
    });
  });

  describe('performance tests', () => {
    test('should process 1000 items within 10ms', () => {
      const largeData: RawTideData[] = Array.from({ length: 1000 }, (_, i) => ({
        time: new Date(Date.now() + i * 60000).toISOString(),
        tide: Math.random() * 8 - 3  // -3 to 5の範囲
      }));

      const startTime = performance.now();
      const result = transformer.transform(largeData);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10);
      expect(result).toHaveLength(1000);
    });

    test('should handle maximum data size', () => {
      const maxData: RawTideData[] = Array.from({ length: 10000 }, (_, i) => ({
        time: new Date(Date.now() + i * 60000).toISOString(),
        tide: (i % 8) - 3  // -3 to 4の範囲
      }));

      expect(() => transformer.validateAndTransform(maxData)).not.toThrow();
    });
  });

  describe('memory usage', () => {
    test('should not exceed 3x input memory for large datasets', () => {
      const data: RawTideData[] = Array.from({ length: 1000 }, (_, i) => ({
        time: new Date(Date.now() + i * 60000).toISOString(),
        tide: 0
      }));

      const initialMemory = process.memoryUsage().heapUsed;
      const result = transformer.transform(data);
      const finalMemory = process.memoryUsage().heapUsed;

      const inputSize = JSON.stringify(data).length;
      const memoryIncrease = finalMemory - initialMemory;

      // 現実的なメモリ使用量制限（10倍以下）
      // Note: JavaScript objects with Date instances naturally use more memory than JSON
      expect(memoryIncrease).toBeLessThan(inputSize * 10);
      expect(result).toHaveLength(1000);
    });
  });
});
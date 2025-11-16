/**
 * TideDataValidator.test.ts - メインクラステスト
 * TASK-101: TideDataValidator実装
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { TideDataValidator } from '../TideDataValidator';
import { ErrorType, WarningType } from '../types';
import type { ValidationOptions } from '../types';
import type { RawTideData } from '../../../utils/validation/types';
import type { ITideDataValidator, ITideDataTransformer } from '../../../utils/validation/types';
import { generateValidTideData, createStructureError, createWarningError } from './helpers';

describe('TideDataValidator', () => {
  let validator: TideDataValidator;
  let mockTideDataValidator: ITideDataValidator;
  let mockTideDataTransformer: ITideDataTransformer;

  beforeEach(() => {
    mockTideDataValidator = {
      validateTimeFormat: vi.fn().mockImplementation((time: string) => {
        // ISO 8601形式をチェック（ミリ秒を含む場合も許容）
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(time);
      }),
      validateTideRange: vi.fn().mockImplementation((tide: number) => {
        // -5 to 5 の範囲をチェック
        return tide >= -5 && tide <= 5;
      }),
      validateDataArray: vi.fn()
    };

    mockTideDataTransformer = {
      transform: vi.fn().mockImplementation((data: RawTideData[]) => {
        // 実際の変換をシミュレート
        return data.map((item, index) => ({
          time: item.time,
          tide: item.tide,
          id: `chart-${index}`
        }));
      }),
      validateAndTransform: vi.fn().mockImplementation((data: RawTideData[]) => {
        return data.map((item, index) => ({
          time: item.time,
          tide: item.tide,
          id: `chart-${index}`
        }));
      })
    };

    validator = new TideDataValidator(
      mockTideDataValidator,
      mockTideDataTransformer
    );
  });

  describe('validateComprehensively', () => {
    test('should return valid result for correct tide data', () => {
      const validData: RawTideData[] = [
        { time: '2025-01-29T06:00:00Z', tide: 2.5 },
        { time: '2025-01-29T12:00:00Z', tide: -1.0 },
        { time: '2025-01-29T18:00:00Z', tide: 3.2 }
      ];

      const result = validator.validateComprehensively(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toHaveLength(3);
      expect(result.summary.validRecords).toBe(3);
      expect(result.summary.errorRecords).toBe(0);
    });

    test('should process large dataset efficiently', () => {
      const largeData = generateValidTideData(5000); // 5000件の有効データ

      const startTime = performance.now();
      const result = validator.validateComprehensively(largeData);
      const endTime = performance.now();

      expect(result.isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(4000); // 4秒以内（CI環境余裕率含む）
      expect(result.summary.totalRecords).toBe(5000);
    });

    test.skip('should generate warnings for unusual but valid data', () => {
      // TODO: 警告生成機能実装後に有効化
      const dataWithWarnings: RawTideData[] = [
        { time: '2025-01-29T06:00:00Z', tide: 4.9 }, // 境界値（警告対象）
        { time: '2025-01-29T12:00:00Z', tide: 2.0 },
        { time: '2025-01-29T18:00:00Z', tide: -2.9 } // 境界値（警告対象）
      ];

      const result = validator.validateComprehensively(dataWithWarnings);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0].type).toBe(WarningType.DATA_QUALITY);
      expect(result.summary.warningRecords).toBe(2);
    });

    test('should return invalid result for critical structure error', () => {
      const corruptedData = null as any; // 構造エラー

      const result = validator.validateComprehensively(corruptedData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(ErrorType.STRUCTURE_ERROR);
      expect(result.errors[0].severity).toBe('critical');
      expect(result.data).toBeUndefined();
    });

    test('should categorize mixed errors correctly', () => {
      const mixedData: RawTideData[] = [
        { time: '2025-01-29T06:00:00Z', tide: 2.5 },    // 有効
        { time: 'invalid-time', tide: 1.0 },             // 時刻エラー
        { time: '2025-01-29T12:00:00Z', tide: 15.0 },   // 範囲外エラー
        { time: '2025-01-29T18:00:00Z', tide: -0.5 }    // 有効
      ];

      const result = validator.validateComprehensively(mixedData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some(e => e.type === ErrorType.INVALID_TIME_FORMAT)).toBe(true);
      expect(result.errors.some(e => e.type === ErrorType.TIDE_OUT_OF_RANGE)).toBe(true);
      expect(result.summary.validRecords).toBe(2);
      expect(result.summary.errorRecords).toBe(2);
    });

    test('should handle empty data as critical error', () => {
      const emptyData: RawTideData[] = [];

      const result = validator.validateComprehensively(emptyData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(ErrorType.EMPTY_DATA);
      expect(result.errors[0].severity).toBe('critical');
    });

    test('should detect duplicate timestamps', () => {
      const duplicateData: RawTideData[] = [
        { time: '2025-01-29T06:00:00Z', tide: 2.5 },
        { time: '2025-01-29T06:00:00Z', tide: 3.0 }, // 重複
        { time: '2025-01-29T12:00:00Z', tide: -1.0 }
      ];

      const result = validator.validateComprehensively(duplicateData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === ErrorType.DUPLICATE_TIMESTAMP)).toBe(true);
    });

    test('should handle timeout for extremely large datasets', () => {
      const hugeData = generateValidTideData(50000); // 50000件
      const options: ValidationOptions = {
        timeoutMs: 1000,
        enableWarnings: true,
        strictMode: false,
        performanceMode: true
      }; // 1秒制限

      const result = validator.validateComprehensively(hugeData, options);

      // タイムアウトエラーまたは部分処理結果
      expect(result.summary.processingTime).toBeLessThan(1100); // 余裕を持って1.1秒
    });
  });

  describe('validateBasic', () => {
    test('should return basic validation result quickly', () => {
      const validData: RawTideData[] = [
        { time: '2025-01-29T06:00:00Z', tide: 2.5 }
      ];

      const startTime = performance.now();
      const result = validator.validateBasic(validData);
      const endTime = performance.now();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    });

    test('should detect basic errors without detailed analysis', () => {
      const invalidData: RawTideData[] = [
        { time: 'invalid', tide: 50.0 }
      ];

      const result = validator.validateBasic(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should not include warnings in basic validation', () => {
      const dataWithWarnings: RawTideData[] = [
        { time: '2025-01-29T06:00:00Z', tide: 4.9 } // 境界値
      ];

      const result = validator.validateBasic(dataWithWarnings);

      expect(result.isValid).toBe(true);
      expect('warnings' in result).toBe(false); // warnings プロパティなし
    });

    test('should handle null/undefined data in basic validation', () => {
      const result1 = validator.validateBasic(null as any);
      const result2 = validator.validateBasic(undefined as any);

      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
      expect(result1.errors[0].type).toBe(ErrorType.STRUCTURE_ERROR);
      expect(result2.errors[0].type).toBe(ErrorType.STRUCTURE_ERROR);
    });
  });

  describe('validateInStages', () => {
    test('should respect validation options', () => {
      const data: RawTideData[] = [
        { time: '2025-01-29T06:00:00Z', tide: 4.9 } // 警告対象
      ];
      const options: ValidationOptions = {
        enableWarnings: false,
        strictMode: false,
        performanceMode: true
      };

      const result = validator.validateInStages(data, options);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0); // 警告無効化
    });

    test.skip('should apply strict mode validation', () => {
      // TODO: strictMode機能実装後に有効化
      const borderlineData: RawTideData[] = [
        { time: '2025-01-29T06:00:00Z', tide: 3.0 },
        { time: '2025-01-29T08:00:00Z', tide: 3.1 } // 小さな変化（厳密モードで警告）
      ];
      const options: ValidationOptions = {
        enableWarnings: true,
        strictMode: true,
        performanceMode: false
      };

      const result = validator.validateInStages(borderlineData, options);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should limit records when maxRecords specified', () => {
      const largeData = generateValidTideData(1000);
      const options: ValidationOptions = {
        maxRecords: 100,
        enableWarnings: true,
        strictMode: false,
        performanceMode: true
      };

      const result = validator.validateInStages(largeData, options);

      expect(result.summary.totalRecords).toBe(100); // 制限適用
    });

    test('should enable performance mode optimizations', () => {
      const data = generateValidTideData(5000);
      const options: ValidationOptions = {
        enableWarnings: false,
        strictMode: false,
        performanceMode: true
      };

      const startTime = performance.now();
      const result = validator.validateInStages(data, options);
      const endTime = performance.now();

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0); // 警告スキップ確認
      expect(endTime - startTime).toBeLessThan(1500); // 1.5秒以内（CI環境余裕率含む）
    });
  });

  describe('constructor and configuration', () => {
    test('should initialize with required dependencies', () => {
      const mockValidator = {} as ITideDataValidator;
      const mockTransformer = {} as ITideDataTransformer;

      expect(() => {
        new TideDataValidator(mockValidator, mockTransformer);
      }).not.toThrow();
    });

    test('should throw error when dependencies are null', () => {
      expect(() => {
        new TideDataValidator(null as any, {} as ITideDataTransformer);
      }).toThrow();

      expect(() => {
        new TideDataValidator({} as ITideDataValidator, null as any);
      }).toThrow();
    });

    test('should provide default validation options', () => {
      const validator = new TideDataValidator(
        mockTideDataValidator,
        mockTideDataTransformer
      );

      // デフォルトオプションでのテスト
      const validTestData = generateValidTideData(5);
      const result = validator.validateInStages(validTestData, {
        enableWarnings: true,
        strictMode: false,
        performanceMode: false
      });

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    test('should maintain consistent internal state', () => {
      const validator = new TideDataValidator(
        mockTideDataValidator,
        mockTideDataTransformer
      );

      const validTestData = generateValidTideData(3);
      // 複数回の実行で状態が変わらないことを確認
      const result1 = validator.validateBasic(validTestData);
      const result2 = validator.validateBasic(validTestData);

      expect(result1.isValid).toBe(result2.isValid);
    });
  });
});
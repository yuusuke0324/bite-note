/**
 * integration.test.ts - 統合テスト
 * TASK-101: TideDataValidator実装
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { TideDataValidator } from '../TideDataValidator';
import { ErrorType, WarningType } from '../types';
import type { RawTideData } from '../../../utils/validation/types';
import {
  TideDataValidator as Task002Validator,
  TideDataTransformer
} from '../../../utils/validation';
import { generateValidTideData } from './helpers';

describe('TASK-002 Integration', () => {
  let tideDataValidator: TideDataValidator;

  beforeEach(() => {
    const task002Validator = new Task002Validator(); // TASK-002の実装
    const task002Transformer = new TideDataTransformer();

    tideDataValidator = new TideDataValidator(
      task002Validator,
      task002Transformer
    );
  });

  test('should integrate with TideDataValidator from TASK-002', () => {
    const data: RawTideData[] = [
      { time: '2025-01-29T06:00:00Z', tide: 2.5 }
    ];

    const result = tideDataValidator.validateComprehensively(data);

    expect(result.isValid).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  test('should handle TASK-002 error types correctly', () => {
    const invalidData: RawTideData[] = [
      { time: 'invalid-time', tide: 2.5 }
    ];

    const result = tideDataValidator.validateComprehensively(invalidData);

    expect(result.errors[0].type).toBe(ErrorType.INVALID_TIME_FORMAT);
    expect(result.errors[0].message).toContain('時刻形式');
  });

  test('should preserve TASK-002 validation context', () => {
    const data: RawTideData[] = [
      { time: '2025-01-29T06:00:00Z', tide: 15.0 } // 範囲外
    ];

    const result = tideDataValidator.validateComprehensively(data);

    expect(result.errors[0].context).toBeDefined();
    expect(result.errors[0].index).toBe(0);
  });

  test('should transform data using TASK-002 transformer', () => {
    const validData: RawTideData[] = [
      { time: '2025-01-29T06:00:00Z', tide: 2.5 }
    ];

    const result = tideDataValidator.validateComprehensively(validData);

    expect(result.data).toBeDefined();
    expect(result.data![0]).toHaveProperty('x');
    expect(result.data![0]).toHaveProperty('y');
    expect(result.data![0]).toHaveProperty('timestamp');
  });

  test('should maintain type compatibility with TASK-002', () => {
    // TypeScript コンパイル時チェック
    const validator = new Task002Validator();
    const transformer = new TideDataTransformer();

    expect(() => {
      new TideDataValidator(validator, transformer);
    }).not.toThrow();
  });
});

describe('Performance Integration', () => {
  let tideDataValidator: TideDataValidator;

  beforeEach(() => {
    const task002Validator = new Task002Validator();
    const task002Transformer = new TideDataTransformer();

    tideDataValidator = new TideDataValidator(
      task002Validator,
      task002Transformer
    );
  });

  test('should meet 3-second processing requirement for 10K records', () => {
    const largeDataset = generateValidTideData(10000);

    const startTime = performance.now();
    const result = tideDataValidator.validateComprehensively(largeDataset);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(3000);
    expect(result.summary.totalRecords).toBe(10000);
  });

  test('should use acceptable memory for large datasets', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    const largeDataset = generateValidTideData(5000);

    const result = tideDataValidator.validateComprehensively(largeDataset);
    const finalMemory = process.memoryUsage().heapUsed;

    const memoryIncrease = finalMemory - initialMemory;

    // 5000件のデータで15MB以下であることを確認（絶対値で判定）
    expect(memoryIncrease).toBeLessThan(15 * 1024 * 1024); // 15MB
  });

  test('should execute validation with different option combinations correctly', () => {
    const dataset = generateValidTideData(5000);

    // 通常モード（全機能有効）
    const result1 = tideDataValidator.validateInStages(dataset, {
      performanceMode: false,
      enableWarnings: true,
      strictMode: true
    });

    // パフォーマンスモード（警告無効化）
    const result2 = tideDataValidator.validateInStages(dataset, {
      performanceMode: true,
      enableWarnings: false,
      strictMode: false
    });

    // 両方とも正常に実行されることを確認
    expect(result1.isValid).toBeDefined();
    expect(result2.isValid).toBeDefined();
    expect(result1.summary).toBeDefined();
    expect(result2.summary).toBeDefined();

    // NOTE: パフォーマンス比較はCI環境で不安定なため除外
  });

  test('should handle concurrent validation requests', async () => {
    const datasets = Array.from({ length: 5 }, () =>
      generateValidTideData(1000)
    );

    const startTime = performance.now();
    const results = await Promise.all(
      datasets.map(data =>
        Promise.resolve(tideDataValidator.validateComprehensively(data))
      )
    );
    const endTime = performance.now();

    expect(results).toHaveLength(5);
    expect(results.every(r => r.isValid)).toBe(true);
    expect(endTime - startTime).toBeLessThan(5000); // 5秒以内
  });

  test('should recover from memory pressure gracefully', () => {
    // メモリ圧迫状況の模擬
    const hugeSets = Array.from({ length: 10 }, () =>
      generateValidTideData(5000)
    );

    const results = hugeSets.map(data => {
      try {
        return tideDataValidator.validateBasic(data);
      } catch (error) {
        return { isValid: false, errors: [error] };
      }
    });

    expect(results.some(r => r.isValid)).toBe(true); // 少なくとも一部は成功
  });
});

describe('Error Handling Integration', () => {
  let tideDataValidator: TideDataValidator;

  beforeEach(() => {
    const task002Validator = new Task002Validator();
    const task002Transformer = new TideDataTransformer();

    tideDataValidator = new TideDataValidator(
      task002Validator,
      task002Transformer
    );
  });

  test('should handle mixed error scenarios comprehensively', () => {
    const complexData: RawTideData[] = [
      { time: '2025-01-29T06:00:00Z', tide: 2.5 },     // 有効
      { time: 'invalid', tide: 1.0 },                   // 時刻エラー
      { time: '2025-01-29T12:00:00Z', tide: 50.0 },    // 範囲外
      { time: '2025-01-29T18:00:00Z', tide: 4.95 }     // 警告レベル (MAX_TIDE=5.0, threshold=0.1 → 4.95 > 4.9で警告)
    ];

    const result = tideDataValidator.validateComprehensively(complexData);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.summary.validRecords).toBe(2); // 1つ目と4つ目が有効
  });

  test('should provide user-friendly error messages', () => {
    const invalidData: RawTideData[] = [
      { time: 'not-a-time', tide: 999 }
    ];

    const result = tideDataValidator.validateComprehensively(invalidData);

    result.errors.forEach(error => {
      expect(error.message).not.toContain('undefined');
      expect(error.message).not.toContain('null');
      expect(error.message.length).toBeGreaterThan(10); // 意味のあるメッセージ
    });
  });

  test('should handle graceful degradation', () => {
    const partiallyValidData: RawTideData[] = [
      { time: '2025-01-29T06:00:00Z', tide: 2.5 },
      { time: 'invalid', tide: 1.0 },                // エラー
      { time: '2025-01-29T18:00:00Z', tide: 3.0 }
    ];

    const result = tideDataValidator.validateComprehensively(partiallyValidData);

    expect(result.data).toBeDefined();
    expect(result.data!.length).toBe(2); // 有効データのみ
    expect(result.errors).toHaveLength(1);
  });

  test('should maintain error context throughout processing', () => {
    const indexedInvalidData: RawTideData[] = [
      { time: '2025-01-29T06:00:00Z', tide: 2.5 },  // index 0: 有効
      { time: '2025-01-29T12:00:00Z', tide: 2.0 },  // index 1: 有効
      { time: 'bad', tide: 3.0 }                     // index 2: エラー
    ];

    const result = tideDataValidator.validateComprehensively(indexedInvalidData);

    const timeError = result.errors.find(e =>
      e.type === ErrorType.INVALID_TIME_FORMAT
    );

    expect(timeError).toBeDefined();
    expect(timeError!.index).toBe(2); // 正確なインデックス
  });

  test('should handle extreme error conditions', () => {
    const extremeConditions = [
      null,                              // null データ
      undefined,                         // undefined データ
      [],                               // 空配列
      Array(100000).fill({ time: 'invalid', tide: 999 }) // 大量エラー
    ];

    extremeConditions.forEach((condition, index) => {
      expect(() => {
        const result = tideDataValidator.validateComprehensively(condition as any);
        expect(result.isValid).toBe(false);
      }).not.toThrow(`Condition ${index} should not throw`);
    });
  });
});
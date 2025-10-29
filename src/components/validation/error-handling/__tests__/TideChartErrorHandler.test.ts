/**
 * TideChartErrorHandler.test.ts - エラーハンドラーテスト
 * TASK-102: TideChartErrorHandler実装
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { TideChartErrorHandler } from '../TideChartErrorHandler';
import { ErrorType, WarningType } from '../../types';
import type { ValidationResult, ValidationError, ValidationWarning } from '../../types';
import type { TideChartData } from '../../../../utils/validation/types';
import type { ErrorDisplayInfo, FallbackType, ErrorProcessingOptions } from '../types';
import { generateValidTideData } from '../../__tests__/helpers';

describe('TideChartErrorHandler', () => {
  let errorHandler: TideChartErrorHandler;

  beforeEach(() => {
    errorHandler = new TideChartErrorHandler();
  });

  describe('processError - Critical Level', () => {
    test('should generate critical error message for structure error', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: [{
          type: ErrorType.STRUCTURE_ERROR,
          severity: 'critical',
          message: 'データ構造にエラーがあります',
          field: undefined,
          index: undefined,
          context: {}
        }],
        warnings: [],
        summary: {
          totalRecords: 1,
          validRecords: 0,
          errorRecords: 1,
          warningRecords: 0,
          processingTime: 10
        }
      };

      const result = errorHandler.processError(validationResult);

      expect(result[0].level).toBe('critical');
      expect(result[0].title).toBe('データ読み込みエラー');
      expect(result[0].message).toBe('潮汐データの読み込みに失敗しました。');
      expect(result[0].suggestion).toBe('データ形式を確認するか、時間をおいて再試行してください。');
      expect(result[0].fallbackType).toBe('table');
    });

    test('should generate critical error message for empty data', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: [{
          type: ErrorType.EMPTY_DATA,
          severity: 'critical',
          message: '潮汐データが空です',
          field: undefined,
          index: undefined,
          context: {}
        }],
        warnings: [],
        summary: {
          totalRecords: 0,
          validRecords: 0,
          errorRecords: 1,
          warningRecords: 0,
          processingTime: 5
        }
      };

      const result = errorHandler.processError(validationResult);

      expect(result[0].level).toBe('critical');
      expect(result[0].fallbackType).toBe('table');
    });
  });

  describe('processError - Error Level', () => {
    test('should generate error message for invalid time format', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: [{
          type: ErrorType.INVALID_TIME_FORMAT,
          severity: 'error',
          message: '時刻形式が正しくありません: invalid-time',
          field: 'time',
          index: 3,
          context: { timeValue: 'invalid-time', index: 3 }
        }],
        warnings: [],
        data: generateValidTideData(8), // 80%有効データ
        summary: {
          totalRecords: 10,
          validRecords: 8,
          errorRecords: 2,
          warningRecords: 0,
          processingTime: 15
        }
      };

      const result = errorHandler.processError(validationResult);

      expect(result[0].level).toBe('error');
      expect(result[0].title).toBe('データ異常');
      expect(result[0].message).toBe('潮汐データに異常な値が含まれています。');
      expect(result[0].suggestion).toBe('一部のデータを除外してグラフを表示します。');
      expect(result[0].fallbackType).toBe('partial-chart');
    });

    test('should generate error message for tide out of range', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: [{
          type: ErrorType.TIDE_OUT_OF_RANGE,
          severity: 'error',
          message: '潮位値が範囲外です: 15.0m',
          field: 'tide',
          index: 5,
          context: { tideValue: 15.0, index: 5 }
        }],
        warnings: [],
        data: generateValidTideData(6), // 60%有効データ
        summary: {
          totalRecords: 10,
          validRecords: 6,
          errorRecords: 4,
          warningRecords: 0,
          processingTime: 20
        }
      };

      const result = errorHandler.processError(validationResult);

      expect(result[0].level).toBe('error');
      expect(result[0].fallbackType).toBe('partial-chart');
    });
  });

  describe('processError - Warning Level', () => {
    test('should generate warning message for data quality issues', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [{
          type: WarningType.DATA_QUALITY,
          message: '潮位値 4.9m が上限値 5.0m に近すぎます',
          field: 'tide',
          index: 2,
          suggestion: '測定値の精度を確認してください'
        }],
        data: generateValidTideData(10),
        summary: {
          totalRecords: 10,
          validRecords: 10,
          errorRecords: 0,
          warningRecords: 1,
          processingTime: 12
        }
      };

      const result = errorHandler.processError(validationResult);

      expect(result[0].level).toBe('warning');
      expect(result[0].title).toBe('データ品質注意');
      expect(result[0].message).toBe('一部のデータに軽微な問題があります。');
      expect(result[0].suggestion).toBe('グラフは正常に表示されますが、精度が低下する可能性があります。');
      expect(result[0].fallbackType).toBe('simple-chart');
    });

    test('should generate warning message for time sequence anomalies', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [{
          type: WarningType.DATA_QUALITY,
          message: '時系列データが逆順になっています（インデックス 2 → 3）',
          field: 'time',
          index: 3,
          suggestion: 'データを時刻順にソートしてください'
        }],
        data: generateValidTideData(10),
        summary: {
          totalRecords: 10,
          validRecords: 10,
          errorRecords: 0,
          warningRecords: 1,
          processingTime: 8
        }
      };

      const result = errorHandler.processError(validationResult);

      expect(result[0].level).toBe('warning');
      expect(result[0].fallbackType).toBe('simple-chart');
    });
  });

  describe('determineFallback', () => {
    test('should return normal chart for 80%+ valid data', () => {
      const validData = generateValidTideData(85);
      const errors = generateValidationErrors(15); // 15%エラー

      const fallback = errorHandler.determineFallback(validData, errors);

      expect(fallback).toBe('none'); // 通常グラフ表示
    });

    test('should return partial chart for 50-79% valid data', () => {
      const validData = generateValidTideData(65);
      const errors = generateValidationErrors(35); // 35%エラー

      const fallback = errorHandler.determineFallback(validData, errors);

      expect(fallback).toBe('partial-chart');
    });

    test('should return simple chart for 20-49% valid data', () => {
      const validData = generateValidTideData(35);
      const errors = generateValidationErrors(65); // 65%エラー

      const fallback = errorHandler.determineFallback(validData, errors);

      expect(fallback).toBe('simple-chart');
    });

    test('should return table for <20% valid data', () => {
      const validData = generateValidTideData(15);
      const errors = generateValidationErrors(85); // 85%エラー

      const fallback = errorHandler.determineFallback(validData, errors);

      expect(fallback).toBe('table');
    });

    test('should handle empty valid data', () => {
      const validData: TideChartData[] = [];
      const errors = generateValidationErrors(100);

      const fallback = errorHandler.determineFallback(validData, errors);

      expect(fallback).toBe('table');
    });

    test('should handle no errors case', () => {
      const validData = generateValidTideData(100);
      const errors: ValidationError[] = [];

      const fallback = errorHandler.determineFallback(validData, errors);

      expect(fallback).toBe('none');
    });
  });

  describe('processError - Mixed Error Levels', () => {
    test('should prioritize critical errors over others', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: [
          { type: ErrorType.STRUCTURE_ERROR, severity: 'critical', message: 'Critical', field: undefined, index: undefined, context: {} },
          { type: ErrorType.INVALID_TIME_FORMAT, severity: 'error', message: 'Error 1', field: 'time', index: 1, context: {} },
          { type: ErrorType.TIDE_OUT_OF_RANGE, severity: 'error', message: 'Error 2', field: 'tide', index: 2, context: {} }
        ],
        warnings: [
          { type: WarningType.DATA_QUALITY, message: 'Warning message', field: 'tide', index: 3, suggestion: 'Fix this' }
        ],
        summary: {
          totalRecords: 4,
          validRecords: 2,
          errorRecords: 3,
          warningRecords: 1,
          processingTime: 25
        }
      };

      const result = errorHandler.processError(validationResult);

      expect(result[0].level).toBe('critical');
      expect(result).toHaveLength(1); // Critical優先で他は省略
    });

    test('should handle multiple errors of same level', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: [
          { type: ErrorType.INVALID_TIME_FORMAT, severity: 'error', message: 'Error 1', field: 'time', index: 1, context: {} },
          { type: ErrorType.TIDE_OUT_OF_RANGE, severity: 'error', message: 'Error 2', field: 'tide', index: 3, context: {} },
          { type: ErrorType.DUPLICATE_TIMESTAMP, severity: 'error', message: 'Error 3', field: 'time', index: 5, context: {} }
        ],
        warnings: [],
        summary: {
          totalRecords: 10,
          validRecords: 7,
          errorRecords: 3,
          warningRecords: 0,
          processingTime: 18
        }
      };

      const result = errorHandler.processError(validationResult);

      expect(result).toHaveLength(1); // まとめて1つのメッセージ
      expect(result[0].level).toBe('error');
      expect(result[0].message).toContain('複数のデータ');
    });

    test('should handle warnings with no errors', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [
          { type: WarningType.DATA_QUALITY, message: 'Warning 1', field: 'tide', index: 1, suggestion: 'Fix 1' },
          { type: WarningType.DATA_QUALITY, message: 'Warning 2', field: 'time', index: 2, suggestion: 'Fix 2' }
        ],
        summary: {
          totalRecords: 10,
          validRecords: 10,
          errorRecords: 0,
          warningRecords: 2,
          processingTime: 10
        }
      };

      const result = errorHandler.processError(validationResult);

      expect(result).toHaveLength(1);
      expect(result[0].level).toBe('warning');
    });
  });

  describe('processError - Error Statistics', () => {
    test('should include error count in message', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: generateValidationErrors(5),
        warnings: [],
        summary: {
          totalRecords: 15,
          validRecords: 10,
          errorRecords: 5,
          warningRecords: 0,
          processingTime: 30
        }
      };

      const result = errorHandler.processError(validationResult);

      expect(result[0].message).toContain('5件');
    });

    test('should handle large number of errors gracefully', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: generateValidationErrors(1000),
        warnings: [],
        summary: {
          totalRecords: 1100,
          validRecords: 100,
          errorRecords: 1000,
          warningRecords: 0,
          processingTime: 100
        }
      };

      const result = errorHandler.processError(validationResult);

      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('多数');
    });
  });

  describe('processError - Internationalization', () => {
    test('should generate Japanese messages by default', () => {
      const validationResult = createCriticalError();

      const result = errorHandler.processError(validationResult);

      expect(result[0].title).toBe('データ読み込みエラー');
      expect(result[0].message).toMatch(/潮汐データ/);
    });

    test('should generate English messages when specified', () => {
      const validationResult = createCriticalError();
      const options: ErrorProcessingOptions = { locale: 'en' };

      const result = errorHandler.processError(validationResult, options);

      expect(result[0].title).toBe('Data Loading Error');
      expect(result[0].message).toMatch(/tide data/i);
    });

    test('should fallback to default language for unsupported locale', () => {
      const validationResult = createCriticalError();
      const options: ErrorProcessingOptions = { locale: 'fr' as any };

      const result = errorHandler.processError(validationResult, options);

      expect(result[0].title).toBe('データ読み込みエラー'); // Fallback to Japanese
    });

    test('should handle missing translation gracefully', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: [{
          type: 'UNKNOWN_ERROR_TYPE' as any,
          severity: 'error',
          message: 'Unknown error',
          field: undefined,
          index: undefined,
          context: {}
        }],
        warnings: [],
        summary: {
          totalRecords: 1,
          validRecords: 0,
          errorRecords: 1,
          warningRecords: 0,
          processingTime: 5
        }
      };

      const result = errorHandler.processError(validationResult);

      expect(result[0].title).toBeDefined();
      expect(result[0].message).toBeDefined();
    });
  });

  describe('processError - Performance', () => {
    test('should process single error within 10ms', () => {
      const validationResult = createSingleError();

      const startTime = performance.now();
      const result = errorHandler.processError(validationResult);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10);
      expect(result).toBeDefined();
    });

    test('should process multiple errors within 50ms', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: generateValidationErrors(100),
        warnings: generateValidationWarnings(50),
        summary: {
          totalRecords: 1000,
          validRecords: 850,
          errorRecords: 100,
          warningRecords: 50,
          processingTime: 150
        }
      };

      const startTime = performance.now();
      const result = errorHandler.processError(validationResult);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
      expect(result).toBeDefined();
    });

    test('should handle extremely large error count efficiently', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: generateValidationErrors(10000),
        warnings: [],
        summary: {
          totalRecords: 10000,
          validRecords: 0,
          errorRecords: 10000,
          warningRecords: 0,
          processingTime: 500
        }
      };

      const startTime = performance.now();
      const result = errorHandler.processError(validationResult);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(result).toHaveLength(1); // Should summarize large errors
    });

    test('should not cause memory leaks during processing', () => {
      // Note: This is a simplified memory test
      const results = [];

      // Process many error sets
      for (let i = 0; i < 100; i++) { // Reduced from 1000 for practical testing
        const validationResult = createRandomErrors();
        const result = errorHandler.processError(validationResult);
        results.push(result);
      }

      expect(results.length).toBe(100);
      // Memory test is simplified - actual memory testing requires more sophisticated tools
    });
  });

  describe('processError - Edge Cases', () => {
    test('should handle null/undefined validation result', () => {
      expect(() => errorHandler.processError(null as any)).not.toThrow();
      expect(() => errorHandler.processError(undefined as any)).not.toThrow();

      const nullResult = errorHandler.processError(null as any);
      expect(nullResult[0].level).toBe('critical');
      expect(nullResult[0].fallbackType).toBe('table');
    });

    test('should handle malformed validation result', () => {
      const malformedResult = {
        isValid: 'not-boolean',
        errors: 'not-array',
        warnings: null,
        summary: { validRecords: -1, errorRecords: 'invalid' }
      } as any;

      expect(() => errorHandler.processError(malformedResult)).not.toThrow();

      const result = errorHandler.processError(malformedResult);
      expect(result[0].level).toBe('critical');
    });

    test('should handle circular reference in error objects', () => {
      const circularError: any = {
        type: ErrorType.STRUCTURE_ERROR,
        severity: 'critical',
        message: 'Circular error',
        field: undefined,
        index: undefined,
        context: {}
      };
      circularError.circular = circularError;

      const validationResult: ValidationResult = {
        isValid: false,
        errors: [circularError],
        warnings: [],
        summary: {
          totalRecords: 1,
          validRecords: 0,
          errorRecords: 1,
          warningRecords: 0,
          processingTime: 5
        }
      };

      expect(() => errorHandler.processError(validationResult)).not.toThrow();
    });

    test('should handle very long error messages gracefully', () => {
      const longMessage = 'A'.repeat(10000);
      const validationResult: ValidationResult = {
        isValid: false,
        errors: [{
          type: ErrorType.STRUCTURE_ERROR,
          severity: 'critical',
          message: longMessage,
          field: undefined,
          index: undefined,
          context: {}
        }],
        warnings: [],
        summary: {
          totalRecords: 1,
          validRecords: 0,
          errorRecords: 1,
          warningRecords: 0,
          processingTime: 5
        }
      };

      const result = errorHandler.processError(validationResult);

      expect(result[0].message.length).toBeLessThan(500); // Should be truncated
    });
  });
});

// ============================================================================
// Test Helper Functions
// ============================================================================

function generateValidationErrors(count: number): ValidationError[] {
  const errorTypes = [
    ErrorType.INVALID_TIME_FORMAT,
    ErrorType.TIDE_OUT_OF_RANGE,
    ErrorType.DUPLICATE_TIMESTAMP
  ];

  return Array.from({ length: count }, (_, i) => ({
    type: errorTypes[i % errorTypes.length],
    severity: 'error' as const,
    message: `Error ${i + 1}`,
    field: 'test',
    index: i,
    context: { testValue: `test-${i}`, index: i }
  }));
}

function generateValidationWarnings(count: number): ValidationWarning[] {
  return Array.from({ length: count }, (_, i) => ({
    type: WarningType.DATA_QUALITY,
    message: `Warning ${i + 1}`,
    field: 'test',
    index: i,
    suggestion: 'Fix this issue'
  }));
}

function createCriticalError(): ValidationResult {
  return {
    isValid: false,
    errors: [{
      type: ErrorType.STRUCTURE_ERROR,
      severity: 'critical',
      message: 'データ構造にエラーがあります',
      field: undefined,
      index: undefined,
      context: {}
    }],
    warnings: [],
    summary: {
      totalRecords: 1,
      validRecords: 0,
      errorRecords: 1,
      warningRecords: 0,
      processingTime: 5
    }
  };
}

function createSingleError(): ValidationResult {
  return {
    isValid: false,
    errors: [{
      type: ErrorType.INVALID_TIME_FORMAT,
      severity: 'error',
      message: 'Single error',
      field: 'time',
      index: 0,
      context: { timeValue: 'invalid', index: 0 }
    }],
    warnings: [],
    summary: {
      totalRecords: 1,
      validRecords: 0,
      errorRecords: 1,
      warningRecords: 0,
      processingTime: 3
    }
  };
}

function createRandomErrors(): ValidationResult {
  const errorCount = Math.floor(Math.random() * 10) + 1;
  const warningCount = Math.floor(Math.random() * 5);

  return {
    isValid: errorCount === 0,
    errors: generateValidationErrors(errorCount),
    warnings: generateValidationWarnings(warningCount),
    summary: {
      totalRecords: errorCount + warningCount + 10,
      validRecords: 10,
      errorRecords: errorCount,
      warningRecords: warningCount,
      processingTime: Math.random() * 50
    }
  };
}
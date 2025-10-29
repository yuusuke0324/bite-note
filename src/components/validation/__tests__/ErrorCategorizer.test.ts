/**
 * ErrorCategorizer.test.ts - エラー分類テスト
 * TASK-101: TideDataValidator実装
 */

import { describe, test, expect } from 'vitest';
import { ErrorCategorizer } from '../utils/ErrorCategorizer';
import { ErrorType } from '../types';
import {
  EmptyDataError,
  InvalidTimeFormatError,
  TideOutOfRangeError
} from '../../../utils/validation/errors';
import { createStructureError, createWarningError } from './helpers';

describe('ErrorCategorizer', () => {
  test('should categorize critical errors correctly', () => {
    const errors = [
      new EmptyDataError(),
      createStructureError()
    ];

    const categorized = ErrorCategorizer.categorize(errors);

    expect(categorized.filter(e => e.severity === 'critical')).toHaveLength(2);
  });

  test('should categorize error level issues', () => {
    const errors = [
      new InvalidTimeFormatError('invalid', 0),
      new TideOutOfRangeError(15.0, 1)
    ];

    const categorized = ErrorCategorizer.categorize(errors);

    expect(categorized.filter(e => e.severity === 'error')).toHaveLength(2);
  });

  test('should provide context information', () => {
    const error = new InvalidTimeFormatError('bad-time', 5);
    const categorized = ErrorCategorizer.categorize([error]);

    expect(categorized[0].index).toBe(5);
    expect(categorized[0].context.timeValue).toBe('bad-time');
  });

  test('should sort errors by severity', () => {
    const mixedErrors = [
      new InvalidTimeFormatError('test', 0), // error
      new EmptyDataError(),                  // critical
      createWarningError()                   // warning
    ];

    const sorted = ErrorCategorizer.categorize(mixedErrors);

    expect(sorted[0].severity).toBe('critical');
    expect(sorted[1].severity).toBe('error');
    expect(sorted[2].severity).toBe('warning');
  });

  test('should handle unknown error types gracefully', () => {
    const unknownError = new Error('Unknown error') as any;
    unknownError.code = 'UNKNOWN_CODE';

    const categorized = ErrorCategorizer.categorize([unknownError]);

    expect(categorized[0].type).toBe(ErrorType.STRUCTURE_ERROR);
    expect(categorized[0].severity).toBe('error');
  });

  test('should preserve original error information', () => {
    const originalError = new TideOutOfRangeError(100, 3);
    const categorized = ErrorCategorizer.categorize([originalError]);

    expect(categorized[0].message).toContain('100');
    expect(categorized[0].index).toBe(3);
  });
});
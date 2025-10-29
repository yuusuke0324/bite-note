/**
 * エラーハンドリングテスト
 * TASK-002: データ検証・変換ユーティリティ実装
 */

import { describe, test, expect } from 'vitest';
import {
  TideValidationError,
  InvalidTimeFormatError,
  TideOutOfRangeError,
  EmptyDataError
} from '../errors';

describe('TideValidationError', () => {
  test('should create error with message and code', () => {
    const error = new TideValidationError('Test message', 'EMPTY_DATA');

    expect(error.message).toBe('Test message');
    expect(error.code).toBe('EMPTY_DATA');
    expect(error.name).toBe('TideValidationError');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof TideValidationError).toBe(true);
  });

  test('should include context information', () => {
    const context = { timeValue: 'invalid', index: 0 };
    const error = new TideValidationError('Test', 'INVALID_TIME_FORMAT', context);

    expect(error.context).toEqual(context);
  });

  test('should handle empty context', () => {
    const error = new TideValidationError('Test', 'EMPTY_DATA');

    expect(error.context).toEqual({});
  });
});

describe('InvalidTimeFormatError', () => {
  test('should create with correct code and message', () => {
    const error = new InvalidTimeFormatError('invalid-time');

    expect(error.code).toBe('INVALID_TIME_FORMAT');
    expect(error.name).toBe('InvalidTimeFormatError');
    expect(error.message).toContain('invalid-time');
    expect(error.message).toContain('ISO 8601');
    expect(error instanceof TideValidationError).toBe(true);
  });

  test('should include time value in context', () => {
    const timeValue = '2025-13-01';
    const error = new InvalidTimeFormatError(timeValue);

    expect(error.context.timeValue).toBe(timeValue);
    expect(error.context.index).toBeUndefined();
  });

  test('should include index in context when provided', () => {
    const error = new InvalidTimeFormatError('invalid', 5);

    expect(error.context.timeValue).toBe('invalid');
    expect(error.context.index).toBe(5);
  });
});

describe('TideOutOfRangeError', () => {
  test('should create with correct code and tide value', () => {
    const tideValue = 10.5;
    const error = new TideOutOfRangeError(tideValue);

    expect(error.code).toBe('TIDE_OUT_OF_RANGE');
    expect(error.name).toBe('TideOutOfRangeError');
    expect(error.context.tideValue).toBe(tideValue);
    expect(error instanceof TideValidationError).toBe(true);
  });

  test('should include valid range in message', () => {
    const error = new TideOutOfRangeError(-5.0);

    expect(error.message).toMatch(/-3\.0.*5\.0/);
    expect(error.message).toContain('-5');
  });

  test('should include index when provided', () => {
    const error = new TideOutOfRangeError(8.0, 3);

    expect(error.context.tideValue).toBe(8.0);
    expect(error.context.index).toBe(3);
  });

  test('should handle negative values', () => {
    const error = new TideOutOfRangeError(-10.0);

    expect(error.context.tideValue).toBe(-10.0);
    expect(error.message).toContain('-10');
  });
});

describe('EmptyDataError', () => {
  test('should create with empty data message', () => {
    const error = new EmptyDataError();

    expect(error.code).toBe('EMPTY_DATA');
    expect(error.name).toBe('EmptyDataError');
    expect(error.message).toContain('empty');
    expect(error.message).toContain('required');
    expect(error instanceof TideValidationError).toBe(true);
  });

  test('should have empty context', () => {
    const error = new EmptyDataError();

    expect(error.context).toEqual({});
  });
});

// エラーの継承チェーンテスト
describe('Error inheritance chain', () => {
  test('all custom errors should be instanceof Error', () => {
    const baseError = new TideValidationError('test', 'EMPTY_DATA');
    const timeError = new InvalidTimeFormatError('invalid');
    const tideError = new TideOutOfRangeError(10);
    const emptyError = new EmptyDataError();

    expect(baseError instanceof Error).toBe(true);
    expect(timeError instanceof Error).toBe(true);
    expect(tideError instanceof Error).toBe(true);
    expect(emptyError instanceof Error).toBe(true);
  });

  test('all custom errors should be instanceof TideValidationError', () => {
    const timeError = new InvalidTimeFormatError('invalid');
    const tideError = new TideOutOfRangeError(10);
    const emptyError = new EmptyDataError();

    expect(timeError instanceof TideValidationError).toBe(true);
    expect(tideError instanceof TideValidationError).toBe(true);
    expect(emptyError instanceof TideValidationError).toBe(true);
  });

  test('should maintain proper prototype chain', () => {
    const error = new InvalidTimeFormatError('test');

    expect(Object.getPrototypeOf(error)).toBe(InvalidTimeFormatError.prototype);
    expect(Object.getPrototypeOf(Object.getPrototypeOf(error))).toBe(TideValidationError.prototype);
  });
});
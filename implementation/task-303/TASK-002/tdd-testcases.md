# TASK-002: データ検証・変換ユーティリティ実装 - テストケース設計（Test Cases Design）

## テストケース構成概要

**総テストケース数**: 45個
**テストカテゴリ**: 4カテゴリ（エラー処理、バリデーター、トランスフォーマー、統合）

## 1. エラーハンドリングテスト（errors.test.ts）

### EC-001: TideValidationError基底クラス
```typescript
describe('TideValidationError', () => {
  test('should create error with message and code', () => {
    const error = new TideValidationError('Test message', 'TEST_CODE');
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error instanceof Error).toBe(true);
  });

  test('should include context information', () => {
    const context = { value: 'invalid', index: 0 };
    const error = new TideValidationError('Test', 'TEST', context);
    expect(error.context).toEqual(context);
  });
});
```

### EC-002: InvalidTimeFormatError
```typescript
describe('InvalidTimeFormatError', () => {
  test('should create with correct code and message', () => {
    const error = new InvalidTimeFormatError('invalid-time');
    expect(error.code).toBe('INVALID_TIME_FORMAT');
    expect(error.message).toContain('invalid-time');
  });

  test('should include time value in context', () => {
    const error = new InvalidTimeFormatError('2025-13-01');
    expect(error.context.timeValue).toBe('2025-13-01');
  });
});
```

### EC-003: TideOutOfRangeError
```typescript
describe('TideOutOfRangeError', () => {
  test('should create with correct code and tide value', () => {
    const error = new TideOutOfRangeError(10.5);
    expect(error.code).toBe('TIDE_OUT_OF_RANGE');
    expect(error.context.tideValue).toBe(10.5);
  });

  test('should include valid range in message', () => {
    const error = new TideOutOfRangeError(-5.0);
    expect(error.message).toMatch(/-3\.0.*5\.0/);
  });
});
```

### EC-004: EmptyDataError
```typescript
describe('EmptyDataError', () => {
  test('should create with empty data message', () => {
    const error = new EmptyDataError();
    expect(error.code).toBe('EMPTY_DATA');
    expect(error.message).toContain('empty');
  });
});
```

## 2. データ検証テスト（TideDataValidator.test.ts）

### VD-001: 時刻フォーマット検証
```typescript
describe('TideDataValidator', () => {
  describe('validateTimeFormat', () => {
    test('should accept valid ISO 8601 formats', () => {
      const validator = new TideDataValidator();
      expect(validator.validateTimeFormat('2025-01-29T12:00:00Z')).toBe(true);
      expect(validator.validateTimeFormat('2025-01-29T12:00:00+09:00')).toBe(true);
      expect(validator.validateTimeFormat('2025-01-29T12:00:00.123Z')).toBe(true);
    });

    test('should reject invalid time formats', () => {
      const validator = new TideDataValidator();
      expect(validator.validateTimeFormat('invalid')).toBe(false);
      expect(validator.validateTimeFormat('2025-13-01T25:00:00Z')).toBe(false);
      expect(validator.validateTimeFormat('2025-01-32T12:00:00Z')).toBe(false);
      expect(validator.validateTimeFormat('')).toBe(false);
    });

    test('should handle null and undefined', () => {
      const validator = new TideDataValidator();
      expect(validator.validateTimeFormat(null as any)).toBe(false);
      expect(validator.validateTimeFormat(undefined as any)).toBe(false);
    });
  });
});
```

### VD-002: 潮位範囲検証
```typescript
describe('validateTideRange', () => {
  test('should accept valid tide range', () => {
    const validator = new TideDataValidator();
    expect(validator.validateTideRange(0)).toBe(true);
    expect(validator.validateTideRange(-3.0)).toBe(true);  // 境界値
    expect(validator.validateTideRange(5.0)).toBe(true);   // 境界値
    expect(validator.validateTideRange(2.5)).toBe(true);
  });

  test('should reject out of range tides', () => {
    const validator = new TideDataValidator();
    expect(validator.validateTideRange(-3.1)).toBe(false);
    expect(validator.validateTideRange(5.1)).toBe(false);
    expect(validator.validateTideRange(-10)).toBe(false);
    expect(validator.validateTideRange(10)).toBe(false);
  });

  test('should reject invalid tide types', () => {
    const validator = new TideDataValidator();
    expect(validator.validateTideRange(NaN)).toBe(false);
    expect(validator.validateTideRange(Infinity)).toBe(false);
    expect(validator.validateTideRange(-Infinity)).toBe(false);
    expect(validator.validateTideRange(null as any)).toBe(false);
    expect(validator.validateTideRange(undefined as any)).toBe(false);
    expect(validator.validateTideRange('2.5' as any)).toBe(false);
  });
});
```

### VD-003: データ配列検証
```typescript
describe('validateDataArray', () => {
  test('should accept valid data array', () => {
    const validator = new TideDataValidator();
    const validData = [
      { time: '2025-01-29T12:00:00Z', tide: 2.5 },
      { time: '2025-01-29T13:00:00Z', tide: 3.0 }
    ];
    expect(() => validator.validateDataArray(validData)).not.toThrow();
  });

  test('should reject empty array', () => {
    const validator = new TideDataValidator();
    expect(() => validator.validateDataArray([])).toThrow(EmptyDataError);
  });

  test('should reject null or undefined', () => {
    const validator = new TideDataValidator();
    expect(() => validator.validateDataArray(null as any)).toThrow();
    expect(() => validator.validateDataArray(undefined as any)).toThrow();
  });

  test('should reject invalid time format in data', () => {
    const validator = new TideDataValidator();
    const invalidData = [
      { time: 'invalid', tide: 2.5 }
    ];
    expect(() => validator.validateDataArray(invalidData)).toThrow(InvalidTimeFormatError);
  });

  test('should reject out of range tide in data', () => {
    const validator = new TideDataValidator();
    const invalidData = [
      { time: '2025-01-29T12:00:00Z', tide: 10.0 }
    ];
    expect(() => validator.validateDataArray(invalidData)).toThrow(TideOutOfRangeError);
  });

  test('should provide error context with index', () => {
    const validator = new TideDataValidator();
    const invalidData = [
      { time: '2025-01-29T12:00:00Z', tide: 2.5 },
      { time: 'invalid', tide: 3.0 }  // index 1で無効
    ];
    try {
      validator.validateDataArray(invalidData);
    } catch (error: any) {
      expect(error.context.index).toBe(1);
    }
  });
});
```

## 3. データ変換テスト（TideDataTransformer.test.ts）

### TR-001: 基本変換機能
```typescript
describe('TideDataTransformer', () => {
  describe('transform', () => {
    test('should transform valid data correctly', () => {
      const transformer = new TideDataTransformer();
      const rawData = [
        { time: '2025-01-29T12:00:00Z', tide: 2.5 }
      ];

      const result = transformer.transform(rawData);

      expect(result).toHaveLength(1);
      expect(result[0].x).toBe(new Date('2025-01-29T12:00:00Z').getTime());
      expect(result[0].y).toBe(2.5);
      expect(result[0].timestamp).toEqual(new Date('2025-01-29T12:00:00Z'));
    });

    test('should handle multiple data points', () => {
      const transformer = new TideDataTransformer();
      const rawData = [
        { time: '2025-01-29T12:00:00Z', tide: 2.5 },
        { time: '2025-01-29T13:00:00Z', tide: 3.0 },
        { time: '2025-01-29T14:00:00Z', tide: 1.5 }
      ];

      const result = transformer.transform(rawData);

      expect(result).toHaveLength(3);
      expect(result[1].y).toBe(3.0);
      expect(result[2].y).toBe(1.5);
    });
  });
});
```

### TR-002: 時刻ソート機能
```typescript
describe('time sorting', () => {
  test('should sort data by time ascending', () => {
    const transformer = new TideDataTransformer();
    const rawData = [
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
    const transformer = new TideDataTransformer();
    const rawData = [
      { time: '2025-01-29T12:00:00Z', tide: 2.5 },
      { time: '2025-01-29T12:00:00Z', tide: 3.0 }  // 同じ時刻
    ];

    const result = transformer.transform(rawData);

    expect(result).toHaveLength(2);
    expect(result[0].x).toBe(result[1].x);  // 同じタイムスタンプ
  });
});
```

### TR-003: 統合検証・変換
```typescript
describe('validateAndTransform', () => {
  test('should validate and transform valid data', () => {
    const transformer = new TideDataTransformer();
    const rawData = [
      { time: '2025-01-29T12:00:00Z', tide: 2.5 }
    ];

    const result = transformer.validateAndTransform(rawData);

    expect(result).toHaveLength(1);
    expect(result[0].y).toBe(2.5);
  });

  test('should throw error for invalid data', () => {
    const transformer = new TideDataTransformer();
    const invalidData = [
      { time: 'invalid', tide: 2.5 }
    ];

    expect(() => transformer.validateAndTransform(invalidData))
      .toThrow(InvalidTimeFormatError);
  });

  test('should throw error for empty data', () => {
    const transformer = new TideDataTransformer();

    expect(() => transformer.validateAndTransform([]))
      .toThrow(EmptyDataError);
  });
});
```

## 4. 統合テスト（integration.test.ts）

### IN-001: エンドツーエンド処理
```typescript
describe('Validation Integration', () => {
  test('should process complete tide data workflow', () => {
    const validator = new TideDataValidator();
    const transformer = new TideDataTransformer();

    const rawData = [
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
  });
});
```

### IN-002: エラーチェーン処理
```typescript
describe('error chain processing', () => {
  test('should handle multiple validation errors', () => {
    const transformer = new TideDataTransformer();
    const invalidData = [
      { time: 'invalid1', tide: 2.5 },     // 時刻エラー
      { time: '2025-01-29T12:00:00Z', tide: 10.0 },  // 範囲エラー
      { time: 'invalid2', tide: -5.0 }     // 両方エラー
    ];

    expect(() => transformer.validateAndTransform(invalidData))
      .toThrow(TideValidationError);
  });
});
```

### IN-003: パフォーマンステスト
```typescript
describe('performance tests', () => {
  test('should process 1000 items within 10ms', () => {
    const transformer = new TideDataTransformer();
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
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
    const transformer = new TideDataTransformer();
    const maxData = Array.from({ length: 10000 }, (_, i) => ({
      time: new Date(Date.now() + i * 60000).toISOString(),
      tide: i % 8 - 3
    }));

    expect(() => transformer.validateAndTransform(maxData)).not.toThrow();
  });
});
```

## 5. 境界値・エッジケーステスト

### ED-001: タイムゾーン境界
```typescript
describe('timezone edge cases', () => {
  test('should handle different timezone formats', () => {
    const validator = new TideDataValidator();
    const timezones = [
      '2025-01-29T12:00:00Z',          // UTC
      '2025-01-29T21:00:00+09:00',     // JST
      '2025-01-29T03:00:00-09:00',     // AKST
      '2025-01-29T12:00:00.000Z'       // ミリ秒付き
    ];

    timezones.forEach(time => {
      expect(validator.validateTimeFormat(time)).toBe(true);
    });
  });
});
```

### ED-002: 潮位境界値
```typescript
describe('tide boundary values', () => {
  test('should handle exact boundary values', () => {
    const validator = new TideDataValidator();

    expect(validator.validateTideRange(-3.0)).toBe(true);   // 下限
    expect(validator.validateTideRange(5.0)).toBe(true);    // 上限
    expect(validator.validateTideRange(-3.0000001)).toBe(false);  // 下限超
    expect(validator.validateTideRange(5.0000001)).toBe(false);   // 上限超
  });
});
```

### ED-003: メモリ使用量テスト
```typescript
describe('memory usage', () => {
  test('should not exceed 3x input memory', () => {
    const transformer = new TideDataTransformer();
    const data = Array.from({ length: 1000 }, (_, i) => ({
      time: new Date(Date.now() + i * 60000).toISOString(),
      tide: 0
    }));

    const initialMemory = process.memoryUsage().heapUsed;
    const result = transformer.transform(data);
    const finalMemory = process.memoryUsage().heapUsed;

    const inputSize = JSON.stringify(data).length;
    const memoryIncrease = finalMemory - initialMemory;

    expect(memoryIncrease).toBeLessThan(inputSize * 3);
  });
});
```

## テスト実行計画

### Phase 1: Red Phase (失敗テスト作成)
1. エラークラステスト → 実装なしで失敗確認
2. バリデーターテスト → 実装なしで失敗確認
3. トランスフォーマーテスト → 実装なしで失敗確認
4. 統合テスト → 実装なしで失敗確認

### Phase 2: Green Phase (最小実装)
1. エラークラス実装 → エラーテスト通過
2. バリデーター実装 → バリデーターテスト通過
3. トランスフォーマー実装 → トランスフォーマーテスト通過
4. 統合機能実装 → 全テスト通過

### Phase 3: Refactor Phase (品質向上)
1. パフォーマンス最適化
2. エラーメッセージ改善
3. 型安全性強化
4. ドキュメント整備

## 期待テスト結果

- **総テストケース**: 45個
- **成功率目標**: 100%
- **実行時間目標**: 全テスト500ms以内
- **カバレッジ目標**: 95%以上
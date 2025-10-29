# TASK-102: TideChartErrorHandler実装 - テストケース定義

## テストスイート概要

**総テストケース数**: 32個
**カテゴリ**: 6個
**実行時間目標**: 500ms以内

## カテゴリ1: エラーメッセージ生成テスト (8個)

### TC-102-001: Critical レベルエラーメッセージ生成
```typescript
describe('processError - Critical Level', () => {
  test('should generate critical error message for structure error', () => {
    const validationResult = {
      isValid: false,
      errors: [{
        type: ErrorType.STRUCTURE_ERROR,
        severity: 'critical',
        message: 'データ構造にエラーがあります'
      }],
      warnings: [],
      summary: { validRecords: 0, errorRecords: 1 }
    };

    const result = errorHandler.processError(validationResult);

    expect(result[0].level).toBe('critical');
    expect(result[0].title).toBe('データ読み込みエラー');
    expect(result[0].message).toBe('潮汐データの読み込みに失敗しました。');
    expect(result[0].suggestion).toBe('データ形式を確認するか、時間をおいて再試行してください。');
    expect(result[0].fallbackType).toBe('table');
  });

  test('should generate critical error message for empty data', () => {
    const validationResult = {
      isValid: false,
      errors: [{
        type: ErrorType.EMPTY_DATA,
        severity: 'critical',
        message: '潮汐データが空です'
      }],
      warnings: [],
      summary: { validRecords: 0, errorRecords: 1 }
    };

    const result = errorHandler.processError(validationResult);

    expect(result[0].level).toBe('critical');
    expect(result[0].fallbackType).toBe('table');
  });
});
```

### TC-102-002: Error レベルメッセージ生成
```typescript
describe('processError - Error Level', () => {
  test('should generate error message for invalid time format', () => {
    const validationResult = {
      isValid: false,
      errors: [{
        type: ErrorType.INVALID_TIME_FORMAT,
        severity: 'error',
        message: '時刻形式が正しくありません: invalid-time',
        field: 'time',
        index: 3
      }],
      warnings: [],
      data: generateValidTideData(8), // 80%有効データ
      summary: { validRecords: 8, errorRecords: 2 }
    };

    const result = errorHandler.processError(validationResult);

    expect(result[0].level).toBe('error');
    expect(result[0].title).toBe('データ異常');
    expect(result[0].message).toBe('潮汐データに異常な値が含まれています。');
    expect(result[0].suggestion).toBe('一部のデータを除外してグラフを表示します。');
    expect(result[0].fallbackType).toBe('partial-chart');
  });

  test('should generate error message for tide out of range', () => {
    const validationResult = {
      isValid: false,
      errors: [{
        type: ErrorType.TIDE_OUT_OF_RANGE,
        severity: 'error',
        message: '潮位値が範囲外です: 15.0m',
        field: 'tide',
        context: { tideValue: 15.0, index: 5 }
      }],
      warnings: [],
      data: generateValidTideData(6), // 60%有効データ
      summary: { validRecords: 6, errorRecords: 4 }
    };

    const result = errorHandler.processError(validationResult);

    expect(result[0].level).toBe('error');
    expect(result[0].fallbackType).toBe('partial-chart');
  });
});
```

### TC-102-003: Warning レベルメッセージ生成
```typescript
describe('processError - Warning Level', () => {
  test('should generate warning message for data quality issues', () => {
    const validationResult = {
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
      summary: { validRecords: 10, errorRecords: 0, warningRecords: 1 }
    };

    const result = errorHandler.processError(validationResult);

    expect(result[0].level).toBe('warning');
    expect(result[0].title).toBe('データ品質注意');
    expect(result[0].message).toBe('一部のデータに軽微な問題があります。');
    expect(result[0].suggestion).toBe('グラフは正常に表示されますが、精度が低下する可能性があります。');
    expect(result[0].fallbackType).toBe('simple-chart');
  });

  test('should generate warning message for time sequence anomalies', () => {
    const validationResult = {
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
      summary: { validRecords: 10, errorRecords: 0, warningRecords: 1 }
    };

    const result = errorHandler.processError(validationResult);

    expect(result[0].level).toBe('warning');
    expect(result[0].fallbackType).toBe('simple-chart');
  });
});
```

## カテゴリ2: フォールバック判定テスト (6個)

### TC-102-004: データ量に基づくフォールバック判定
```typescript
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
```

## カテゴリ3: 複数エラー同時処理テスト (6個)

### TC-102-005: 混在エラーレベル処理
```typescript
describe('processError - Mixed Error Levels', () => {
  test('should prioritize critical errors over others', () => {
    const validationResult = {
      isValid: false,
      errors: [
        { type: ErrorType.STRUCTURE_ERROR, severity: 'critical' },
        { type: ErrorType.INVALID_TIME_FORMAT, severity: 'error' },
        { type: ErrorType.TIDE_OUT_OF_RANGE, severity: 'error' }
      ],
      warnings: [
        { type: WarningType.DATA_QUALITY, message: 'Warning message' }
      ],
      summary: { validRecords: 2, errorRecords: 3, warningRecords: 1 }
    };

    const result = errorHandler.processError(validationResult);

    expect(result[0].level).toBe('critical');
    expect(result).toHaveLength(1); // Critical優先で他は省略
  });

  test('should handle multiple errors of same level', () => {
    const validationResult = {
      isValid: false,
      errors: [
        { type: ErrorType.INVALID_TIME_FORMAT, severity: 'error', index: 1 },
        { type: ErrorType.TIDE_OUT_OF_RANGE, severity: 'error', index: 3 },
        { type: ErrorType.DUPLICATE_TIMESTAMP, severity: 'error', index: 5 }
      ],
      warnings: [],
      summary: { validRecords: 7, errorRecords: 3 }
    };

    const result = errorHandler.processError(validationResult);

    expect(result).toHaveLength(1); // まとめて1つのメッセージ
    expect(result[0].level).toBe('error');
    expect(result[0].message).toContain('複数のデータ');
  });

  test('should handle warnings with no errors', () => {
    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [
        { type: WarningType.DATA_QUALITY, message: 'Warning 1' },
        { type: WarningType.DATA_QUALITY, message: 'Warning 2' }
      ],
      summary: { validRecords: 10, errorRecords: 0, warningRecords: 2 }
    };

    const result = errorHandler.processError(validationResult);

    expect(result).toHaveLength(1);
    expect(result[0].level).toBe('warning');
  });
});
```

### TC-102-006: エラー統計処理
```typescript
describe('processError - Error Statistics', () => {
  test('should include error count in message', () => {
    const validationResult = {
      isValid: false,
      errors: generateValidationErrors(5),
      warnings: [],
      summary: { validRecords: 10, errorRecords: 5 }
    };

    const result = errorHandler.processError(validationResult);

    expect(result[0].message).toContain('5件');
  });

  test('should handle large number of errors gracefully', () => {
    const validationResult = {
      isValid: false,
      errors: generateValidationErrors(1000),
      warnings: [],
      summary: { validRecords: 100, errorRecords: 1000 }
    };

    const result = errorHandler.processError(validationResult);

    expect(result).toHaveLength(1);
    expect(result[0].message).toContain('多数');
  });
});
```

## カテゴリ4: 多言語対応テスト (4個)

### TC-102-007: 言語切り替えテスト
```typescript
describe('processError - Internationalization', () => {
  test('should generate Japanese messages by default', () => {
    const validationResult = createCriticalError();

    const result = errorHandler.processError(validationResult);

    expect(result[0].title).toBe('データ読み込みエラー');
    expect(result[0].message).toMatch(/潮汐データ/);
  });

  test('should generate English messages when specified', () => {
    const validationResult = createCriticalError();

    const result = errorHandler.processError(validationResult, { locale: 'en' });

    expect(result[0].title).toBe('Data Loading Error');
    expect(result[0].message).toMatch(/tide data/i);
  });

  test('should fallback to default language for unsupported locale', () => {
    const validationResult = createCriticalError();

    const result = errorHandler.processError(validationResult, { locale: 'fr' });

    expect(result[0].title).toBe('データ読み込みエラー'); // Fallback to Japanese
  });

  test('should handle missing translation gracefully', () => {
    const validationResult = {
      isValid: false,
      errors: [{ type: 'UNKNOWN_ERROR_TYPE', severity: 'error' }],
      warnings: [],
      summary: { validRecords: 0, errorRecords: 1 }
    };

    const result = errorHandler.processError(validationResult);

    expect(result[0].title).toBeDefined();
    expect(result[0].message).toBeDefined();
  });
});
```

## カテゴリ5: パフォーマンステスト (4個)

### TC-102-008: 処理時間テスト
```typescript
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
    const validationResult = {
      isValid: false,
      errors: generateValidationErrors(100),
      warnings: generateValidationWarnings(50),
      summary: { validRecords: 850, errorRecords: 100, warningRecords: 50 }
    };

    const startTime = performance.now();
    const result = errorHandler.processError(validationResult);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(50);
    expect(result).toBeDefined();
  });

  test('should handle extremely large error count efficiently', () => {
    const validationResult = {
      isValid: false,
      errors: generateValidationErrors(10000),
      warnings: [],
      summary: { validRecords: 0, errorRecords: 10000 }
    };

    const startTime = performance.now();
    const result = errorHandler.processError(validationResult);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(100);
    expect(result).toHaveLength(1); // Should summarize large errors
  });

  test('should not cause memory leaks during processing', () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Process many error sets
    for (let i = 0; i < 1000; i++) {
      const validationResult = createRandomErrors();
      errorHandler.processError(validationResult);
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
  });
});
```

## カテゴリ6: エッジケースと異常系テスト (4個)

### TC-102-009: 異常系処理テスト
```typescript
describe('processError - Edge Cases', () => {
  test('should handle null/undefined validation result', () => {
    expect(() => errorHandler.processError(null)).not.toThrow();
    expect(() => errorHandler.processError(undefined)).not.toThrow();

    const nullResult = errorHandler.processError(null);
    expect(nullResult[0].level).toBe('critical');
    expect(nullResult[0].fallbackType).toBe('table');
  });

  test('should handle malformed validation result', () => {
    const malformedResult = {
      isValid: 'not-boolean',
      errors: 'not-array',
      warnings: null,
      summary: { validRecords: -1, errorRecords: 'invalid' }
    };

    expect(() => errorHandler.processError(malformedResult)).not.toThrow();

    const result = errorHandler.processError(malformedResult);
    expect(result[0].level).toBe('critical');
  });

  test('should handle circular reference in error objects', () => {
    const circularError: any = { type: ErrorType.STRUCTURE_ERROR, severity: 'critical' };
    circularError.circular = circularError;

    const validationResult = {
      isValid: false,
      errors: [circularError],
      warnings: [],
      summary: { validRecords: 0, errorRecords: 1 }
    };

    expect(() => errorHandler.processError(validationResult)).not.toThrow();
  });

  test('should handle very long error messages gracefully', () => {
    const longMessage = 'A'.repeat(10000);
    const validationResult = {
      isValid: false,
      errors: [{
        type: ErrorType.STRUCTURE_ERROR,
        severity: 'critical',
        message: longMessage
      }],
      warnings: [],
      summary: { validRecords: 0, errorRecords: 1 }
    };

    const result = errorHandler.processError(validationResult);

    expect(result[0].message.length).toBeLessThan(500); // Should be truncated
  });
});
```

## テストヘルパー関数

### generateValidationErrors()
```typescript
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
    index: i
  }));
}
```

### generateValidationWarnings()
```typescript
function generateValidationWarnings(count: number): ValidationWarning[] {
  return Array.from({ length: count }, (_, i) => ({
    type: WarningType.DATA_QUALITY,
    message: `Warning ${i + 1}`,
    field: 'test',
    index: i,
    suggestion: 'Fix this issue'
  }));
}
```

### createCriticalError()
```typescript
function createCriticalError(): ValidationResult {
  return {
    isValid: false,
    errors: [{
      type: ErrorType.STRUCTURE_ERROR,
      severity: 'critical',
      message: 'データ構造にエラーがあります'
    }],
    warnings: [],
    summary: { validRecords: 0, errorRecords: 1 }
  };
}
```

## 実行優先度

### 高優先度（必須）
- エラーメッセージ生成テスト (8個)
- フォールバック判定テスト (6個)
- 複数エラー処理テスト (6個)

### 中優先度（重要）
- 多言語対応テスト (4個)
- パフォーマンステスト (4個)

### 低優先度（望ましい）
- エッジケースと異常系テスト (4個)

## 期待される結果

### Green Phase目標
- **必須テスト**: 20/20 成功 (100%)
- **重要テスト**: 6/8 成功 (75%以上)
- **合計目標**: 26/32 成功 (81%以上)

### Refactor Phase目標
- **全テスト**: 32/32 成功 (100%)
- **パフォーマンス**: 全要件達成
- **エッジケース**: 完全対応

---

**作成日**: 2025-09-29
**テストケース総数**: 32個
**実行時間目標**: 500ms以内
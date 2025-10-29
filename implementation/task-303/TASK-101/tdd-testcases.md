# TASK-101: TideDataValidator実装 - テストケース作成

## テストケース概要

合計テストケース数: **47個**
- 単体テスト: 32個
- 統合テスト: 15個

実装予定テストファイル:
- TideDataValidator.test.ts (メインクラステスト)
- ErrorCategorizer.test.ts (エラー分類テスト)
- WarningGenerator.test.ts (警告生成テスト)
- integration.test.ts (統合テスト)

## 1. TideDataValidator メインクラステスト (20個)

### 1.1 validateComprehensively() テスト (8個)

#### 正常系テスト (3個)
```typescript
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
    expect(endTime - startTime).toBeLessThan(3000); // 3秒以内
    expect(result.summary.totalRecords).toBe(5000);
  });

  test('should generate warnings for unusual but valid data', () => {
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
```

#### エラー系テスト (5個)
```typescript
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
    const options: ValidationOptions = { timeoutMs: 1000 }; // 1秒制限

    const result = validator.validateComprehensively(hugeData, options);

    // タイムアウトエラーまたは部分処理結果
    expect(result.summary.processingTime).toBeLessThan(1100); // 余裕を持って1.1秒
  });
```

### 1.2 validateBasic() テスト (4個)

```typescript
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
```

### 1.3 validateInStages() テスト (4個)

```typescript
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

  test('should apply strict mode validation', () => {
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
    expect(endTime - startTime).toBeLessThan(1000); // 1秒以内（最適化効果）
  });
```

### 1.4 コンストラクター・設定テスト (4個)

```typescript
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
    const result = validator.validateInStages(validTestData);

    expect(result).toBeDefined();
    expect(result.summary).toBeDefined();
  });

  test('should maintain consistent internal state', () => {
    const validator = new TideDataValidator(
      mockTideDataValidator,
      mockTideDataTransformer
    );

    // 複数回の実行で状態が変わらないことを確認
    const result1 = validator.validateBasic(validTestData);
    const result2 = validator.validateBasic(validTestData);

    expect(result1.isValid).toBe(result2.isValid);
  });
```

## 2. ErrorCategorizer ユーティリティテスト (6個)

```typescript
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
    expect(categorized[0].context).toContain('bad-time');
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
```

## 3. WarningGenerator ユーティリティテスト (6個)

```typescript
describe('WarningGenerator', () => {
  test('should generate warnings for boundary values', () => {
    const boundaryData: RawTideData[] = [
      { time: '2025-01-29T06:00:00Z', tide: 4.95 }, // 上限近く
      { time: '2025-01-29T12:00:00Z', tide: -2.95 } // 下限近く
    ];

    const warnings = WarningGenerator.generate(boundaryData);

    expect(warnings).toHaveLength(2);
    expect(warnings[0].type).toBe(WarningType.DATA_QUALITY);
  });

  test('should detect time sequence anomalies', () => {
    const unorderedData: RawTideData[] = [
      { time: '2025-01-29T12:00:00Z', tide: 2.0 },
      { time: '2025-01-29T06:00:00Z', tide: 1.0 }, // 時系列逆順
      { time: '2025-01-29T18:00:00Z', tide: 3.0 }
    ];

    const warnings = WarningGenerator.generate(unorderedData);

    expect(warnings.some(w => w.type === WarningType.DATA_QUALITY)).toBe(true);
    expect(warnings[0].message).toContain('時系列');
  });

  test('should warn about sparse data', () => {
    const sparseData: RawTideData[] = [
      { time: '2025-01-29T00:00:00Z', tide: 1.0 },
      { time: '2025-01-30T00:00:00Z', tide: 2.0 } // 24時間間隔
    ];

    const warnings = WarningGenerator.generate(sparseData);

    expect(warnings.some(w => w.message.includes('データ間隔'))).toBe(true);
  });

  test('should provide helpful suggestions', () => {
    const problematicData: RawTideData[] = [
      { time: '2025-01-29T06:00:00Z', tide: 4.8 }
    ];

    const warnings = WarningGenerator.generate(problematicData);

    expect(warnings[0].suggestion).toBeDefined();
    expect(warnings[0].suggestion).not.toBe('');
  });

  test('should respect warning thresholds', () => {
    const normalData: RawTideData[] = [
      { time: '2025-01-29T06:00:00Z', tide: 2.0 },
      { time: '2025-01-29T12:00:00Z', tide: 1.0 }
    ];

    const warnings = WarningGenerator.generate(normalData);

    expect(warnings).toHaveLength(0); // 正常データは警告なし
  });

  test('should handle edge cases in warning generation', () => {
    const edgeCases = [
      [], // 空配列
      [{ time: '2025-01-29T06:00:00Z', tide: 0 }] // 単一データ
    ];

    edgeCases.forEach(data => {
      expect(() => {
        WarningGenerator.generate(data);
      }).not.toThrow();
    });
  });
```

## 4. 統合テスト (15個)

### 4.1 TASK-002連携テスト (5個)

```typescript
describe('TASK-002 Integration', () => {
  test('should integrate with TideDataValidator from TASK-002', () => {
    const task002Validator = new TideDataValidator(); // TASK-002の実装
    const task101Validator = new TideDataValidator(
      task002Validator,
      new TideDataTransformer()
    );

    const data: RawTideData[] = [
      { time: '2025-01-29T06:00:00Z', tide: 2.5 }
    ];

    const result = task101Validator.validateComprehensively(data);

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
    const validator: ITideDataValidator = new TideDataValidator();
    const transformer: ITideDataTransformer = new TideDataTransformer();

    expect(() => {
      new TideDataValidator(validator, transformer);
    }).not.toThrow();
  });
```

### 4.2 パフォーマンス統合テスト (5個)

```typescript
describe('Performance Integration', () => {
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
    const inputSize = JSON.stringify(largeDataset).length;

    expect(memoryIncrease).toBeLessThan(inputSize * 5); // 5倍以下
  });

  test('should optimize performance mode correctly', () => {
    const dataset = generateValidTideData(5000);

    const startTime1 = performance.now();
    const result1 = tideDataValidator.validateInStages(dataset, {
      performanceMode: false,
      enableWarnings: true,
      strictMode: true
    });
    const time1 = performance.now() - startTime1;

    const startTime2 = performance.now();
    const result2 = tideDataValidator.validateInStages(dataset, {
      performanceMode: true,
      enableWarnings: false,
      strictMode: false
    });
    const time2 = performance.now() - startTime2;

    expect(time2).toBeLessThan(time1); // パフォーマンスモードが高速
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
```

### 4.3 エラーハンドリング統合テスト (5個)

```typescript
describe('Error Handling Integration', () => {
  test('should handle mixed error scenarios comprehensively', () => {
    const complexData: RawTideData[] = [
      { time: '2025-01-29T06:00:00Z', tide: 2.5 },     // 有効
      { time: 'invalid', tide: 1.0 },                   // 時刻エラー
      { time: '2025-01-29T12:00:00Z', tide: 50.0 },    // 範囲外
      { time: '2025-01-29T06:00:00Z', tide: 3.0 },     // 重複
      { time: '2025-01-29T18:00:00Z', tide: 4.9 }      // 警告レベル
    ];

    const result = tideDataValidator.validateComprehensively(complexData);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.summary.validRecords).toBe(1); // 最初のデータのみ有効
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
```

## ヘルパー関数

```typescript
// テスト用ヘルパー関数
function generateValidTideData(count: number): RawTideData[] {
  return Array.from({ length: count }, (_, i) => ({
    time: new Date(Date.now() + i * 3600000).toISOString(), // 1時間間隔
    tide: Math.sin(i * 0.1) * 3 // -3 to 3 の範囲
  }));
}

function createStructureError(): Error {
  const error = new Error('Data structure is corrupted') as any;
  error.code = 'STRUCTURE_ERROR';
  return error;
}

function createWarningError(): Error {
  const error = new Error('Minor data quality issue') as any;
  error.code = 'DATA_QUALITY_WARNING';
  return error;
}
```

## テスト実行要件

### 必要な成功基準
- [ ] 全47テストケースが成功
- [ ] テストカバレッジ90%以上
- [ ] パフォーマンステスト全通過
- [ ] メモリリークテスト安全
- [ ] 統合テスト完全成功

### テスト環境
- **Testing Framework**: Vitest + React Testing Library
- **TypeScript**: strict mode
- **Node.js**: 18以上
- **実行環境**: CI/CD対応

---

**テストケース作成完了**: 47個のテストケース設計完了
**次のステップ**: Red Phase実装（tdd-red.md）
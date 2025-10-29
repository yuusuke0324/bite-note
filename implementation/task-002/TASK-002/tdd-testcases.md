# TASK-002: データ検証・変換ユーティリティ実装 - テストケース

**作成日**: 2025-10-11
**テストフレームワーク**: Vitest
**カバレッジ目標**: 95%以上

## テストケース一覧

### 1. TimeFormatValidator テストケース

#### TC-TFV-001: 有効な時刻フォーマット検証

**目的**: 正しい時刻フォーマットを検証できることを確認

| ID | 入力 | 期待される出力 |
|----|------|--------------|
| TC-TFV-001-01 | "00:00" | `{ isValid: true, normalizedTime: "00:00" }` |
| TC-TFV-001-02 | "12:30" | `{ isValid: true, normalizedTime: "12:30" }` |
| TC-TFV-001-03 | "23:59" | `{ isValid: true, normalizedTime: "23:59" }` |
| TC-TFV-001-04 | "9:5" | `{ isValid: true, normalizedTime: "09:05" }` |
| TC-TFV-001-05 | "0:0" | `{ isValid: true, normalizedTime: "00:00" }` |

#### TC-TFV-002: 無効な時刻フォーマット検証

**目的**: 不正な時刻フォーマットを検出できることを確認

| ID | 入力 | 期待される出力 |
|----|------|--------------|
| TC-TFV-002-01 | "" | `{ isValid: false, errorMessage: "時刻が空です" }` |
| TC-TFV-002-02 | "25:00" | `{ isValid: false, errorMessage: "時が範囲外です (0-23)" }` |
| TC-TFV-002-03 | "12:60" | `{ isValid: false, errorMessage: "分が範囲外です (0-59)" }` |
| TC-TFV-002-04 | "abc" | `{ isValid: false, errorMessage: "時刻フォーマットが不正です" }` |
| TC-TFV-002-05 | "12-30" | `{ isValid: false, errorMessage: "時刻フォーマットが不正です" }` |
| TC-TFV-002-06 | "12:5:30" | `{ isValid: false, errorMessage: "時刻フォーマットが不正です" }` |
| TC-TFV-002-07 | "24:00" | `{ isValid: false, errorMessage: "時が範囲外です (0-23)" }` |
| TC-TFV-002-08 | "-1:30" | `{ isValid: false, errorMessage: "時が範囲外です (0-23)" }` |

#### TC-TFV-003: エッジケース

**目的**: 境界値や特殊ケースを正しく処理できることを確認

| ID | 入力 | 期待される出力 |
|----|------|--------------|
| TC-TFV-003-01 | "00:00" | `{ isValid: true, normalizedTime: "00:00" }` |
| TC-TFV-003-02 | "23:59" | `{ isValid: true, normalizedTime: "23:59" }` |
| TC-TFV-003-03 | "12:00 " | `{ isValid: true, normalizedTime: "12:00" }` (トリム処理) |
| TC-TFV-003-04 | " 09:30" | `{ isValid: true, normalizedTime: "09:30" }` (トリム処理) |

### 2. NumericValidator テストケース

#### TC-NV-001: 有効な潮位値検証

**目的**: 正しい潮位値を検証できることを確認

| ID | 入力 | 期待される出力 |
|----|------|--------------|
| TC-NV-001-01 | 0 | `{ isValid: true, normalizedValue: 0 }` |
| TC-NV-001-02 | 120 | `{ isValid: true, normalizedValue: 120 }` |
| TC-NV-001-03 | -1000 | `{ isValid: true, normalizedValue: -1000 }` |
| TC-NV-001-04 | 10000 | `{ isValid: true, normalizedValue: 10000 }` |
| TC-NV-001-05 | "150" | `{ isValid: true, normalizedValue: 150 }` (文字列→数値) |
| TC-NV-001-06 | "-500" | `{ isValid: true, normalizedValue: -500 }` |

#### TC-NV-002: 無効な潮位値検証

**目的**: 不正な潮位値を検出できることを確認

| ID | 入力 | 期待される出力 |
|----|------|--------------|
| TC-NV-002-01 | -1001 | `{ isValid: false, errorMessage: "潮位が範囲外です (-1000~10000cm)" }` |
| TC-NV-002-02 | 10001 | `{ isValid: false, errorMessage: "潮位が範囲外です (-1000~10000cm)" }` |
| TC-NV-002-03 | NaN | `{ isValid: false, errorMessage: "潮位が数値ではありません" }` |
| TC-NV-002-04 | Infinity | `{ isValid: false, errorMessage: "潮位が数値ではありません" }` |
| TC-NV-002-05 | -Infinity | `{ isValid: false, errorMessage: "潮位が数値ではありません" }` |
| TC-NV-002-06 | "abc" | `{ isValid: false, errorMessage: "潮位が数値ではありません" }` |
| TC-NV-002-07 | null | `{ isValid: false, errorMessage: "潮位が数値ではありません" }` |
| TC-NV-002-08 | undefined | `{ isValid: false, errorMessage: "潮位が数値ではありません" }` |

#### TC-NV-003: エッジケース

**目的**: 境界値や特殊ケースを正しく処理できることを確認

| ID | 入力 | 期待される出力 |
|----|------|--------------|
| TC-NV-003-01 | -1000 | `{ isValid: true, normalizedValue: -1000 }` (最小値) |
| TC-NV-003-02 | 10000 | `{ isValid: true, normalizedValue: 10000 }` (最大値) |
| TC-NV-003-03 | 0.5 | `{ isValid: true, normalizedValue: 0.5 }` (小数) |
| TC-NV-003-04 | -999.99 | `{ isValid: true, normalizedValue: -999.99 }` |

### 3. DataIntegrityChecker テストケース

#### TC-DIC-001: 有効なデータ配列検証

**目的**: 正しいデータ配列を検証できることを確認

| ID | 入力 | 期待される出力 |
|----|------|--------------|
| TC-DIC-001-01 | `[{ time: "00:00", tide: 120 }]` | `{ isValid: true, errors: [], warnings: [] }` |
| TC-DIC-001-02 | `[{ time: "00:00", tide: 120 }, { time: "06:00", tide: 200 }]` | `{ isValid: true, errors: [], warnings: [] }` |
| TC-DIC-001-03 | `[{ time: "00:00", tide: 120, type: "high" }]` | `{ isValid: true, errors: [], warnings: [] }` |

#### TC-DIC-002: 空配列・null検証

**目的**: 空配列やnullを検出できることを確認

| ID | 入力 | 期待される出力 |
|----|------|--------------|
| TC-DIC-002-01 | `[]` | `{ isValid: false, errors: [{ type: "EMPTY_DATA", message: "データが空です" }] }` |
| TC-DIC-002-02 | null | `{ isValid: false, errors: [{ type: "INVALID_STRUCTURE", message: "データが配列ではありません" }] }` |
| TC-DIC-002-03 | undefined | `{ isValid: false, errors: [{ type: "INVALID_STRUCTURE", message: "データが配列ではありません" }] }` |

#### TC-DIC-003: 構造エラー検証

**目的**: データ構造の問題を検出できることを確認

| ID | 入力 | 期待される出力 |
|----|------|--------------|
| TC-DIC-003-01 | `[{ tide: 120 }]` | `{ isValid: false, errors: [{ type: "INVALID_STRUCTURE", index: 0, message: "timeフィールドがありません" }] }` |
| TC-DIC-003-02 | `[{ time: "00:00" }]` | `{ isValid: false, errors: [{ type: "INVALID_STRUCTURE", index: 0, message: "tideフィールドがありません" }] }` |
| TC-DIC-003-03 | `["invalid"]` | `{ isValid: false, errors: [{ type: "INVALID_STRUCTURE", index: 0, message: "データポイントがオブジェクトではありません" }] }` |

#### TC-DIC-004: 重複時刻検証

**目的**: 重複時刻を検出できることを確認

| ID | 入力 | 期待される出力 |
|----|------|--------------|
| TC-DIC-004-01 | `[{ time: "00:00", tide: 120 }, { time: "00:00", tide: 150 }]` | `{ isValid: false, errors: [{ type: "DUPLICATE_TIME", index: 1, message: "時刻00:00が重複しています" }] }` |
| TC-DIC-004-02 | `[{ time: "12:00", tide: 100 }, { time: "06:00", tide: 80 }, { time: "12:00", tide: 120 }]` | `{ isValid: false, errors: [{ type: "DUPLICATE_TIME", index: 2, message: "時刻12:00が重複しています" }] }` |

#### TC-DIC-005: 時系列順序警告

**目的**: 時系列順序の問題を警告できることを確認

| ID | 入力 | 期待される出力 |
|----|------|--------------|
| TC-DIC-005-01 | `[{ time: "12:00", tide: 100 }, { time: "06:00", tide: 80 }]` | `{ isValid: true, errors: [], warnings: [{ type: "TIME_ORDER", message: "時系列順序が正しくありません" }] }` |
| TC-DIC-005-02 | `[{ time: "00:00", tide: 120 }, { time: "23:00", tide: 100 }, { time: "06:00", tide: 80 }]` | `{ isValid: true, errors: [], warnings: [{ type: "TIME_ORDER", message: "時系列順序が正しくありません" }] }` |

#### TC-DIC-006: type値検証

**目的**: type値の妥当性を検証できることを確認

| ID | 入力 | 期待される出力 |
|----|------|--------------|
| TC-DIC-006-01 | `[{ time: "00:00", tide: 120, type: "high" }]` | `{ isValid: true, errors: [], warnings: [] }` |
| TC-DIC-006-02 | `[{ time: "00:00", tide: 120, type: "low" }]` | `{ isValid: true, errors: [], warnings: [] }` |
| TC-DIC-006-03 | `[{ time: "00:00", tide: 120, type: "invalid" }]` | `{ isValid: true, errors: [], warnings: [{ type: "INVALID_TYPE", index: 0, message: "type値が不正です" }] }` |

### 4. TideDataTransformer テストケース

#### TC-TDT-001: 有効なデータ変換

**目的**: 正しいデータを変換できることを確認

| ID | 入力 | 期待される出力 |
|----|------|--------------|
| TC-TDT-001-01 | `[{ time: "9:5", tide: "120" }]` | `[{ time: "09:05", tide: 120 }]` |
| TC-TDT-001-02 | `[{ time: "00:00", tide: 120, type: "high" }]` | `[{ time: "00:00", tide: 120, type: "high" }]` |
| TC-TDT-001-03 | `[{ time: "12:30", tide: 150, extra: "data" }]` | `[{ time: "12:30", tide: 150, _raw: { time: "12:30", tide: 150, extra: "data" } }]` |

#### TC-TDT-002: 無効なデータのスキップ

**目的**: 無効なデータポイントをスキップできることを確認

| ID | 入力 | 期待される出力 |
|----|------|--------------|
| TC-TDT-002-01 | `[{ time: "invalid", tide: 120 }]` | `[]` (無効データをスキップ) |
| TC-TDT-002-02 | `[{ time: "12:00", tide: "abc" }]` | `[]` (無効データをスキップ) |
| TC-TDT-002-03 | `[{ time: "25:00", tide: 11000 }]` | `[]` (両方無効) |

#### TC-TDT-003: 混在データの変換

**目的**: 有効・無効データが混在する場合の変換を確認

| ID | 入力 | 期待される出力 |
|----|------|--------------|
| TC-TDT-003-01 | `[{ time: "00:00", tide: 120 }, { time: "invalid", tide: 150 }, { time: "12:00", tide: 180 }]` | `[{ time: "00:00", tide: 120 }, { time: "12:00", tide: 180 }]` |
| TC-TDT-003-02 | `[{ time: "9:0", tide: "100" }, { time: "25:00", tide: 120 }, { time: "15:30", tide: "150" }]` | `[{ time: "09:00", tide: 100 }, { time: "15:30", tide: 150 }]` |

#### TC-TDT-004: エラーケース

**目的**: 全データ無効時のエラーハンドリングを確認

| ID | 入力 | 期待される出力 |
|----|------|--------------|
| TC-TDT-004-01 | `[]` | エラーまたは空配列 |
| TC-TDT-004-02 | `[{ time: "invalid", tide: "abc" }]` | エラーまたは空配列 |
| TC-TDT-004-03 | null | エラー |

## パフォーマンステストケース

### TC-PERF-001: 大量データ検証パフォーマンス

**目的**: 大量データでも十分なパフォーマンスを確認

| ID | データ量 | 期待される処理時間 |
|----|---------|------------------|
| TC-PERF-001-01 | 100ポイント | < 10ms |
| TC-PERF-001-02 | 1000ポイント | < 100ms |
| TC-PERF-001-03 | 10000ポイント | < 1000ms |

## 統合テストケース

### TC-INT-001: バリデーター連携

**目的**: 複数バリデーターの組み合わせ動作を確認

| ID | 説明 | 期待される動作 |
|----|------|--------------|
| TC-INT-001-01 | TimeFormatValidator + NumericValidator | 両方のバリデーションが正しく動作 |
| TC-INT-001-02 | DataIntegrityChecker + TideDataTransformer | 整合性チェック後に変換が実行 |
| TC-INT-001-03 | 全バリデーター統合 | エンドツーエンドで正しく動作 |

## テスト実装方針

### ファイル構成
```
src/utils/validation/
├── __tests__/
│   ├── TimeFormatValidator.test.ts
│   ├── NumericValidator.test.ts
│   ├── DataIntegrityChecker.test.ts
│   ├── TideDataTransformer.test.ts
│   └── integration.test.ts
├── TimeFormatValidator.ts
├── NumericValidator.ts
├── DataIntegrityChecker.ts
├── TideDataTransformer.ts
├── types.ts
└── index.ts
```

### テストヘルパー

```typescript
// テストデータ生成ヘルパー
const createValidTideData = (count: number) => { /* ... */ };
const createInvalidTideData = () => { /* ... */ };
const createMixedTideData = () => { /* ... */ };
```

## 期待されるテスト結果

- ✅ 全テストケース成功
- ✅ カバレッジ95%以上
- ✅ パフォーマンステスト合格
- ✅ エッジケーステスト全て成功

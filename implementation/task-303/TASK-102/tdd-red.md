# TASK-102: TideChartErrorHandler実装 - Red Phase（失敗テスト実装）

## Red Phase 実行結果

### ✅ Red Phase 成功！

**テスト結果**: 23/29テスト失敗（期待通りの失敗）
**実行時間**: 665ms
**実装方式**: TDD Red Phase（スタブ実装）

## 実装されたファイル構造

```
src/components/validation/error-handling/
├── TideChartErrorHandler.ts         # メインハンドラークラス（スタブ）
├── types.ts                        # 型定義 ✅
├── index.ts                        # エクスポート ✅
└── __tests__/
    └── TideChartErrorHandler.test.ts  # メインクラステスト 🔴
```

## テスト失敗分析

### 🟢 成功しているテスト（6個）

1. **determineFallback基本動作** - スタブが`none`を返し、一部条件で正解
   - 「80%以上有効データで通常グラフ」: スタブ`none`が正解
   - 「エラーなしケース」: スタブ`none`が正解

2. **パフォーマンステスト基本** - 実行時間のみの基本チェック
   - 単一エラー処理時間 < 10ms
   - メモリリーク基本確認

### 🔴 期待通りに失敗しているテスト（23個）

#### 1. processError()メソッド（18個失敗）

**root cause**: スタブ実装が常に空配列`[]`を返すため

**典型的な失敗例**:
```
× should generate critical error message for structure error
  → Cannot read properties of undefined (reading 'level')

× should handle multiple errors of same level
  → expected [] to have a length of 1 but got +0
```

**失敗カテゴリ**:
- Critical エラーメッセージ生成テスト (2個)
- Error エラーメッセージ生成テスト (2個)
- Warning エラーメッセージ生成テスト (2個)
- 混在エラーレベル処理テスト (3個)
- エラー統計処理テスト (2個)
- 多言語対応テスト (4個)
- エッジケース処理テスト (3個)

#### 2. determineFallback()メソッド（5個失敗）

**root cause**: スタブ実装が常に`none`を返すため

**典型的な失敗例**:
```
× should return partial chart for 50-79% valid data
  → expected 'none' to be 'partial-chart'

× should return table for <20% valid data
  → expected 'none' to be 'table'
```

**失敗条件**:
- 50-79%有効データ → `partial-chart`期待
- 20-49%有効データ → `simple-chart`期待
- <20%有効データ → `table`期待
- 空データ → `table`期待

## Red Phase スタブ実装詳細

### 完全スタブ実装

#### TideChartErrorHandler.ts
```typescript
export class TideChartErrorHandler {
  processError(): ErrorDisplayInfo[] {
    return [];  // 常に空配列
  }

  determineFallback(): FallbackType {
    return 'none';  // 常にnone
  }

  // 全プライベートメソッドも最小スタブ実装
  private getMessageResources() { return emptyResources; }
  private determineErrorLevel() { return 'warning'; }
  private calculateDataValidityPercentage() { return 0; }
}
```

#### types.ts - 完全実装済み
```typescript
// ErrorDisplayInfo, FallbackType, ErrorProcessingOptions
// MessageResources, ErrorMessageTemplate の完全定義
export interface ErrorDisplayInfo {
  level: 'critical' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  suggestion?: string;
  fallbackType: FallbackType;
  debugInfo?: string;
}
```

## テストケース分析

### カテゴリ別失敗状況

| カテゴリ | 失敗/総数 | 成功率 | 主な失敗理由 |
|----------|-----------|--------|--------------|
| エラーメッセージ生成 | 8/8 | 0% | 空配列返却 |
| フォールバック判定 | 4/6 | 33% | 固定値返却 |
| 複数エラー処理 | 3/3 | 0% | 空配列返却 |
| 多言語対応 | 4/4 | 0% | スタブ実装 |
| パフォーマンス | 1/4 | 75% | 基本動作のみ |
| エッジケース | 3/4 | 25% | 空配列返却 |

### 優先度の高い失敗テスト（Green Phaseで最初に修正）

1. **基本エラーメッセージ生成**
   - `processError()`の基本実装
   - Critical/Error/Warning各レベルの処理
   - メッセージテンプレートシステム

2. **フォールバック判定ロジック**
   - `determineFallback()`の実装
   - データ有効性パーセンテージ計算
   - 条件分岐ロジック

3. **多言語対応システム**
   - メッセージリソース定義
   - ロケール判定・切り替え
   - フォールバック言語対応

### エッジケース（Refactor Phaseで対応）

1. **パフォーマンス最適化**
   - 大量エラー時の効率化
   - メモリリーク防止
   - 処理時間最適化

2. **異常系処理**
   - null/undefined入力対応
   - 不正データ構造対応
   - 循環参照対応

## Red Phase 成功判定

### ✅ 成功基準達成

1. **全テストケース作成完了**: 29個のテストケース
2. **期待通りの失敗**: 23個のテストが実装なしで失敗
3. **基盤コード動作**: 型定義、エクスポートは完全に動作
4. **TypeScript型安全性**: strict mode対応
5. **テスト実行環境**: 正常に動作

### 📊 Red Phase 統計

| カテゴリ | 作成数 | 失敗数 | 成功率（期待） |
|----------|---------|---------|-----------------|
| 型定義・基盤 | 2 | 0 | 100%（実装済み） |
| メインメソッド | 21 | 18 | 14%（期待通り） |
| ユーティリティ | 6 | 5 | 17%（期待通り） |
| **合計** | **29** | **23** | **21%（期待値）** |

## 次のステップ: Green Phase

### 🚀 Green Phase 実装計画

1. **優先順位1: processError基本実装**
   - メッセージリソース定義
   - エラーレベル判定ロジック
   - 基本メッセージ生成機能

2. **優先順位2: determineFallback実装**
   - データ有効性計算ロジック
   - フォールバック判定条件
   - 条件分岐実装

3. **優先順位3: 多言語対応実装**
   - 日本語・英語メッセージリソース
   - ロケール処理ロジック
   - フォールバック言語システム

### 🎯 Green Phase 目標

- **目標テスト成功率**: 85%以上（25/29テスト成功）
- **パフォーマンス目標**: 処理時間 < 50ms
- **メモリ目標**: 追加使用量 < 1MB

## Red Phase 完了宣言

✅ **TASK-102 Red Phase 正式完了**

- 29個のテストケース作成完了
- 23個の期待通りの失敗確認
- 基盤コード（型定義、エクスポート）完全実装
- Green Phase実装準備完了

**技術的成果**:
- 包括的なエラーハンドリング型定義システム構築
- 29個の詳細テストケース作成
- TASK-101との統合基盤準備
- 多言語対応・パフォーマンステストの設計完了

**次のステップ**: Green Phase（最小実装）実行準備完了

---

**Red Phase 完了時刻**: 2025-09-29T11:15:00Z
**実装期間**: 要件定義後 約30分
**テスト実行回数**: 1回（期待通りの失敗確認）
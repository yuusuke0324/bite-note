# TASK-002: データ検証・変換ユーティリティ実装 - 要件定義（Requirements Definition）

## 概要

潮汐グラフ描画のためのデータ検証・変換ユーティリティを実装する。外部APIからの潮汐データを安全に処理し、内部形式に変換する機能を提供する。

## 主要要件

### REQ-201: データ検証機能

#### R201-1: 時刻データ検証
- **要件**: ISO 8601形式の時刻文字列を検証
- **受け入れ基準**:
  - 有効な形式: `"2025-01-29T12:00:00Z"`, `"2025-01-29T12:00:00+09:00"`
  - 無効な形式: `"invalid"`, `"2025-13-01T25:00:00Z"`, `null`, `undefined`
- **エラー処理**: `INVALID_TIME_FORMAT` エラーを発生

#### R201-2: 潮位データ検証
- **要件**: 潮位値（数値）の範囲検証
- **受け入れ基準**:
  - 有効範囲: -3.0m ～ +5.0m
  - 無効値: 範囲外、`NaN`, `null`, `undefined`, 文字列
- **エラー処理**: `TIDE_OUT_OF_RANGE` エラーを発生

#### R201-3: データ配列検証
- **要件**: 入力データ配列の存在と構造検証
- **受け入れ基準**:
  - 空配列は無効
  - 各要素は `{ time: string, tide: number }` 形式
  - 最低1件のデータが必要
- **エラー処理**: `EMPTY_DATA` エラーを発生

### REQ-202: エラーハンドリング

#### R202-1: カスタムエラー定義
- **TideValidationError**: 基底エラークラス
- **InvalidTimeFormatError**: 時刻形式エラー（code: `INVALID_TIME_FORMAT`）
- **TideOutOfRangeError**: 潮位範囲外エラー（code: `TIDE_OUT_OF_RANGE`）
- **EmptyDataError**: 空データエラー（code: `EMPTY_DATA`）

#### R202-2: エラー情報
- **message**: 人間が読める詳細メッセージ
- **code**: プログラムで判定可能なエラーコード
- **context**: エラー発生時のコンテキスト情報

### REQ-203: データ変換機能

#### R203-1: TideChartData変換
- **要件**: 外部データを内部チャート形式に変換
- **入力形式**: `Array<{ time: string, tide: number }>`
- **出力形式**: `Array<{ x: number, y: number, timestamp: Date }>`
- **変換ロジック**:
  - `time` → Unix timestamp（ミリ秒）→ `x`
  - `tide` → そのまま `y`
  - `time` → Date オブジェクト → `timestamp`

#### R203-2: ソート保証
- **要件**: 出力データは時刻順（昇順）でソート
- **受け入れ基準**: 入力順序に関わらず、出力は時刻昇順

## 実装仕様

### 実装ファイル構造

```
src/utils/validation/
├── TideDataValidator.ts     # データ検証クラス
├── TideDataTransformer.ts   # データ変換クラス
├── errors.ts                # カスタムエラー定義
├── types.ts                 # 型定義
├── index.ts                 # エクスポートインデックス
└── __tests__/
    ├── TideDataValidator.test.ts
    ├── TideDataTransformer.test.ts
    ├── errors.test.ts
    └── integration.test.ts
```

### インターフェース設計

#### 入力データ型
```typescript
interface RawTideData {
  time: string;    // ISO 8601 形式
  tide: number;    // 潮位（メートル）
}
```

#### 出力データ型
```typescript
interface TideChartData {
  x: number;         // Unix timestamp (ミリ秒)
  y: number;         // 潮位値
  timestamp: Date;   // Date オブジェクト
}
```

#### バリデーター
```typescript
interface ITideDataValidator {
  validateTimeFormat(time: string): boolean;
  validateTideRange(tide: number): boolean;
  validateDataArray(data: RawTideData[]): void; // throws errors
}
```

#### トランスフォーマー
```typescript
interface ITideDataTransformer {
  transform(rawData: RawTideData[]): TideChartData[];
  validateAndTransform(rawData: RawTideData[]): TideChartData[];
}
```

## パフォーマンス要件

- **処理速度**: 1000件のデータを10ms以内で処理
- **メモリ使用量**: 入力データの3倍以下のメモリ使用
- **スケーラビリティ**: 10,000件のデータまで対応

## 品質要件

- **型安全性**: TypeScript strict mode対応
- **テストカバレッジ**: 95%以上
- **エラー処理**: 全ての異常系をカバー
- **境界値テスト**: 範囲の境界値を全てテスト

## 受け入れ基準

### 機能受け入れ基準
1. ✅ 有効な潮汐データを正しく変換できる
2. ✅ 無効な時刻形式を検出してエラーを発生する
3. ✅ 範囲外の潮位値を検出してエラーを発生する
4. ✅ 空配列を検出してエラーを発生する
5. ✅ 変換後データが時刻順でソートされている
6. ✅ エラーメッセージが適切で分かりやすい

### 品質受け入れ基準
1. ✅ 全テストケースが成功する
2. ✅ TypeScript型チェックが通る
3. ✅ パフォーマンス要件を満たす
4. ✅ メモリリークがない

## エッジケース

### データ境界値
- **時刻**: タイムゾーン境界、うるう年、うるう秒
- **潮位**: 正確に-3.0m、+5.0m（境界値）
- **配列**: 1件のデータ、大量データ（10,000件）

### 異常データ
- **時刻**: `null`, `undefined`, 空文字列、無効形式
- **潮位**: `NaN`, `Infinity`, 文字列、`null`, `undefined`
- **配列**: `null`, `undefined`, 空配列、不正な構造

### システム境界
- **メモリ制限**: 大量データでのメモリ使用量
- **処理時間**: タイムアウト処理
- **同時実行**: 複数スレッドでの安全性

## 実装ガイドライン

### TDD実装順序
1. **Red Phase**: エラーケースのテストから実装
2. **Green Phase**: 最小限の機能で全テスト通過
3. **Refactor Phase**: パフォーマンス最適化と保守性向上

### 設計原則
- **単一責任原則**: 各クラスは1つの責任のみ
- **依存性逆転**: インターフェースに依存する設計
- **リスコフ置換**: 派生クラスは基底クラスと置換可能
- **インターフェース分離**: 不要なメソッドを強制しない

### セキュリティ考慮事項
- **入力サニタイゼーション**: 全ての外部入力を検証
- **型安全性**: TypeScript型システムを最大限活用
- **メモリ安全性**: メモリリークの防止
- **エラー情報**: センシティブ情報の漏洩防止
# TASK-002: データ検証・変換ユーティリティ実装 - 要件定義

**作成日**: 2025-10-11
**タスクタイプ**: TDD
**要件リンク**: REQ-201 (データ検証), REQ-202 (エラーハンドリング)
**依存タスク**: なし

## 概要

潮汐グラフコンポーネントが受け取るデータの検証と変換を行うユーティリティ群を実装します。不正なデータの早期検出、適切なエラーハンドリング、recharts形式へのデータ変換を提供します。

## 実装対象

### 1. TimeFormatValidator.ts

**目的**: 時刻フォーマットの検証

**機能**:
- 時刻文字列が"HH:mm"形式に準拠しているか検証
- 時・分の数値範囲チェック（時: 0-23, 分: 0-59）
- 不正な文字列の検出

**入力**:
- `timeString: string` - 検証対象の時刻文字列

**出力**:
```typescript
interface TimeValidationResult {
  isValid: boolean;
  errorMessage?: string;
  normalizedTime?: string; // 正規化された時刻（例: "9:5" → "09:05"）
}
```

**検証ルール**:
1. フォーマット: "HH:mm" または "H:m" (先頭ゼロ省略可)
2. 時の範囲: 0 ≤ H ≤ 23
3. 分の範囲: 0 ≤ m ≤ 59
4. 区切り文字: コロン ":"

**エラーケース**:
- 空文字列
- フォーマット不一致（例: "25:00", "12:60", "abc", "12-30"）
- 時・分の範囲外

### 2. NumericValidator.ts

**目的**: 潮位数値の検証

**機能**:
- 潮位値が有効な数値範囲内か検証
- 数値型の確認
- 範囲外の値の検出

**入力**:
- `tideValue: number | string` - 検証対象の潮位値

**出力**:
```typescript
interface NumericValidationResult {
  isValid: boolean;
  errorMessage?: string;
  normalizedValue?: number; // 正規化された数値
}
```

**検証ルール**:
1. 型: number または数値文字列
2. 範囲: -1000 ≤ tide ≤ 10000 (cm)
3. 特殊値: NaN, Infinity, -Infinity は無効

**エラーケース**:
- 非数値（文字列、オブジェクト、配列等）
- 範囲外の値（-1001, 10001等）
- NaN, Infinity, -Infinity

### 3. DataIntegrityChecker.ts

**目的**: データ配列全体の整合性チェック

**機能**:
- 配列の有効性チェック
- データポイント間の矛盾検出
- 時系列順序の検証
- 重複データの検出

**入力**:
```typescript
interface TideDataPoint {
  time: string;
  tide: number;
  type?: 'high' | 'low';
}

type TideDataArray = TideDataPoint[];
```

**出力**:
```typescript
interface IntegrityCheckResult {
  isValid: boolean;
  errors: IntegrityError[];
  warnings: IntegrityWarning[];
}

interface IntegrityError {
  type: 'EMPTY_DATA' | 'INVALID_STRUCTURE' | 'DUPLICATE_TIME';
  index?: number;
  message: string;
}

interface IntegrityWarning {
  type: 'TIME_ORDER' | 'MISSING_FIELD';
  index?: number;
  message: string;
}
```

**検証ルール**:
1. **配列チェック**:
   - 配列が空でない
   - 配列型である
   - 最低1つのデータポイントを含む

2. **構造チェック**:
   - 各要素がオブジェクトである
   - 必須フィールド（time, tide）が存在

3. **整合性チェック**:
   - 時刻の重複なし
   - 時系列順序（警告レベル）
   - type値が'high'/'low'/undefinedのいずれか

**エラーケース**:
- 空配列
- null/undefined
- 非配列型
- 重複時刻
- 必須フィールド欠落

### 4. TideDataTransformer.ts

**目的**: 内部データ形式からrecharts形式への変換

**機能**:
- データポイントの正規化
- recharts互換形式への変換
- メタデータの保持

**入力**:
```typescript
interface RawTideData {
  time: string;
  tide: number | string;
  type?: 'high' | 'low';
  [key: string]: any; // その他のプロパティ
}
```

**出力**:
```typescript
interface TideChartData {
  time: string;        // 正規化された時刻 "HH:mm"
  tide: number;        // 正規化された潮位
  type?: 'high' | 'low';
  _raw?: any;          // 元データの保持（デバッグ用）
}
```

**変換ルール**:
1. 時刻の正規化（"9:5" → "09:05"）
2. 潮位の数値化（文字列→数値）
3. typeフィールドの保持
4. 無効なデータポイントのスキップ
5. 元データの_rawフィールドへの保存

**エラーハンドリング**:
- 変換失敗時は該当データポイントをスキップ
- 全データポイントが無効な場合はエラー

## 受け入れ基準

### 機能要件

1. **TimeFormatValidator**:
   - ✅ 有効な時刻文字列を正しく検証できる
   - ✅ 無効な時刻文字列を検出できる
   - ✅ 時刻を正規化できる（"9:5" → "09:05"）

2. **NumericValidator**:
   - ✅ 有効な潮位値を正しく検証できる
   - ✅ 範囲外の潮位値を検出できる
   - ✅ 非数値を検出できる

3. **DataIntegrityChecker**:
   - ✅ 空配列を検出できる
   - ✅ 重複時刻を検出できる
   - ✅ 必須フィールド欠落を検出できる
   - ✅ 時系列順序の問題を警告できる

4. **TideDataTransformer**:
   - ✅ 有効なデータを正しく変換できる
   - ✅ 無効なデータポイントをスキップできる
   - ✅ 元データを保持できる

### 非機能要件

1. **パフォーマンス**:
   - 1000データポイントの検証・変換が100ms以内

2. **エラーメッセージ**:
   - ユーザーフレンドリーなメッセージ
   - デバッグに必要な情報を含む

3. **型安全性**:
   - TypeScript strict mode準拠
   - 明確な型定義

4. **テスト可能性**:
   - 純粋関数として実装
   - 副作用なし

## エラー分類

### Critical（エラー）
- `EMPTY_DATA`: 空配列
- `INVALID_STRUCTURE`: データ構造不正
- `DUPLICATE_TIME`: 時刻重複
- `INVALID_TIME_FORMAT`: 時刻フォーマット不正
- `TIDE_OUT_OF_RANGE`: 潮位範囲外

### Warning（警告）
- `TIME_ORDER`: 時系列順序の問題
- `MISSING_OPTIONAL_FIELD`: オプションフィールド欠落

## 実装優先度

1. **Phase 1** (必須):
   - TimeFormatValidator
   - NumericValidator

2. **Phase 2** (必須):
   - DataIntegrityChecker

3. **Phase 3** (必須):
   - TideDataTransformer

## テスト戦略

### 単体テスト
- 各バリデーターの正常系テスト
- 各バリデーターの異常系テスト
- エッジケーステスト

### 統合テスト
- 複数バリデーターの組み合わせテスト
- 大量データでのパフォーマンステスト

## 成功指標

- ✅ 全バリデーターが実装されている
- ✅ 単体テストカバレッジ95%以上
- ✅ 全テストが成功
- ✅ TypeScriptコンパイルエラーなし
- ✅ ESLintエラーなし（重大なもの）

# TASK-101: TideDataValidator実装 - 詳細要件定義

## 概要

TideDataValidatorは、潮汐データの検証を専門に行うコンポーネントです。TASK-002で実装したデータ検証・変換ユーティリティを活用し、より高レベルな検証結果の統一インターフェースとエラー分類・優先度付けロジックを提供します。

## 機能要件

### 1. 検証結果統一インターフェース (ValidationResult型)

#### 要件定義
```typescript
interface ValidationResult {
  isValid: boolean;           // 全体の検証結果
  errors: ValidationError[];  // エラー一覧
  warnings: ValidationWarning[]; // 警告一覧
  data?: TideChartData[];     // 検証済みデータ（成功時）
  summary: ValidationSummary; // 検証サマリー
}

interface ValidationError {
  type: ErrorType;            // エラー種別
  severity: 'critical' | 'error' | 'warning';
  message: string;            // ユーザー向けメッセージ
  field?: string;             // エラー発生フィールド
  index?: number;             // エラー発生インデックス
  context?: any;              // 追加コンテキスト情報
}

interface ValidationWarning {
  type: WarningType;          // 警告種別
  message: string;            // ユーザー向けメッセージ
  field?: string;             // 警告発生フィールド
  index?: number;             // 警告発生インデックス
  suggestion?: string;        // 改善提案
}

interface ValidationSummary {
  totalRecords: number;       // 総レコード数
  validRecords: number;       // 有効レコード数
  errorRecords: number;       // エラーレコード数
  warningRecords: number;     // 警告レコード数
  processingTime: number;     // 処理時間（ms）
}
```

#### 設計原則
- **型安全性**: TypeScript strict modeで完全な型安全性確保
- **拡張性**: 新しいエラー・警告タイプの追加が容易
- **ユーザビリティ**: 非技術者にも理解しやすいメッセージ

### 2. エラー分類・優先度付けロジック

#### エラー分類体系
```typescript
enum ErrorType {
  // Critical: グラフ描画不可
  STRUCTURE_ERROR = 'STRUCTURE_ERROR',        // データ構造エラー
  EMPTY_DATA = 'EMPTY_DATA',                  // 空データ
  CORRUPTED_DATA = 'CORRUPTED_DATA',          // 破損データ

  // Error: 部分的な問題
  INVALID_TIME_FORMAT = 'INVALID_TIME_FORMAT', // 時刻形式エラー
  TIDE_OUT_OF_RANGE = 'TIDE_OUT_OF_RANGE',    // 潮位範囲外
  DUPLICATE_TIMESTAMP = 'DUPLICATE_TIMESTAMP', // 重複タイムスタンプ

  // Warning: 軽微な問題
  TIME_SEQUENCE_WARNING = 'TIME_SEQUENCE_WARNING', // 時系列順序警告
  UNUSUAL_TIDE_VALUE = 'UNUSUAL_TIDE_VALUE',       // 異常な潮位値
  SPARSE_DATA = 'SPARSE_DATA'                      // データ密度低下
}

enum WarningType {
  DATA_QUALITY = 'DATA_QUALITY',           // データ品質警告
  PERFORMANCE = 'PERFORMANCE',             // パフォーマンス警告
  USABILITY = 'USABILITY'                  // ユーザビリティ警告
}
```

#### 優先度ロジック
1. **Critical**: 即座にグラフ描画を停止
2. **Error**: 問題データを除外してグラフ描画継続
3. **Warning**: 警告表示とともにグラフ描画継続

### 3. TideDataValidator クラス仕様

#### 主要メソッド
```typescript
export class TideDataValidator {
  constructor(
    private tideDataValidator: ITideDataValidator,
    private tideDataTransformer: ITideDataTransformer
  );

  /**
   * 包括的データ検証の実行
   * @param rawData 生潮汐データ
   * @returns 統一された検証結果
   */
  validateComprehensively(rawData: RawTideData[]): ValidationResult;

  /**
   * 高速検証の実行（基本チェックのみ）
   * @param rawData 生潮汐データ
   * @returns 基本検証結果
   */
  validateBasic(rawData: RawTideData[]): Pick<ValidationResult, 'isValid' | 'errors'>;

  /**
   * 段階的検証の実行
   * @param rawData 生潮汐データ
   * @param options 検証オプション
   * @returns 段階的検証結果
   */
  validateInStages(
    rawData: RawTideData[],
    options: ValidationOptions
  ): ValidationResult;

  /**
   * エラー分類・優先度付け
   * @param errors 基本エラー一覧
   * @returns 分類済みエラー
   */
  private categorizeErrors(errors: TideValidationError[]): ValidationError[];

  /**
   * 警告レベル判定
   * @param data 潮汐データ
   * @returns 警告一覧
   */
  private generateWarnings(data: RawTideData[]): ValidationWarning[];
}
```

#### ValidationOptions
```typescript
interface ValidationOptions {
  enableWarnings: boolean;          // 警告検証の有効/無効
  strictMode: boolean;              // 厳密モード
  performanceMode: boolean;         // パフォーマンス優先モード
  maxRecords?: number;              // 最大処理レコード数
  timeoutMs?: number;               // タイムアウト時間
}
```

### 4. エラーハンドリング戦略

#### Critical レベル処理
```typescript
// Critical: データ構造エラー → グラフ非表示
if (hasStructureError) {
  return {
    isValid: false,
    errors: [structureError],
    warnings: [],
    summary: createSummary()
  };
}
```

#### Error レベル処理
```typescript
// Error: 数値範囲外 → 警告付きグラフ表示
const validData = rawData.filter(item =>
  this.tideDataValidator.validateTideRange(item.tide)
);
const rangeErrors = createRangeErrors(invalidData);
```

#### Warning レベル処理
```typescript
// Warning: 軽微な不整合 → 正常グラフ表示
const warnings = this.generateWarnings(validData);
// グラフ描画は継続、UI上で警告を表示
```

## 非機能要件

### 1. パフォーマンス要件
- **大量データ処理**: 10,000件の潮汐データを3秒以内で処理
- **段階的処理**: エラーレベルに応じた段階的検証の実行
- **メモリ効率**: 入力データの5倍以下のメモリ使用量

### 2. 品質要件
- **型安全性**: TypeScript strict mode完全準拠
- **テストカバレッジ**: 90%以上
- **エラーハンドリング**: 全例外パターンのキャッチ

### 3. ユーザビリティ要件
- **エラーメッセージ**: 非技術者向けの分かりやすい表現
- **国際化対応**: 多言語メッセージ対応の基盤準備
- **進捗表示**: 大量データ処理時の進捗フィードバック

## 技術仕様

### 1. 依存関係
- **TASK-002の成果物**: TideDataValidator, TideDataTransformer利用
- **React**: 18以上
- **TypeScript**: 5.0以上（strict mode）
- **Testing**: Vitest + React Testing Library

### 2. ファイル構成
```
src/components/validation/
├── TideDataValidator.ts          # メインバリデータークラス
├── types/
│   ├── ValidationResult.ts       # 検証結果型定義
│   ├── ValidationError.ts        # エラー型定義
│   └── ValidationOptions.ts      # オプション型定義
├── utils/
│   ├── ErrorCategorizer.ts       # エラー分類ユーティリティ
│   └── WarningGenerator.ts       # 警告生成ユーティリティ
└── __tests__/
    ├── TideDataValidator.test.ts
    ├── ErrorCategorizer.test.ts
    └── integration.test.ts
```

### 3. エクスポート仕様
```typescript
// メインAPIエクスポート
export { TideDataValidator } from './TideDataValidator';
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSummary,
  ValidationOptions
} from './types';
export { ErrorType, WarningType } from './types';
```

## 受け入れ基準

### 1. 機能受け入れ基準
- [ ] 有効データで ValidationResult.isValid = true
- [ ] Critical エラーで ValidationResult.isValid = false
- [ ] Error レベルでデータ除外後にグラフ表示継続
- [ ] Warning レベルで警告表示とグラフ表示の両立
- [ ] 10,000件データの3秒以内処理
- [ ] エラー分類・優先度付けの正確性

### 2. 品質受け入れ基準
- [ ] TypeScript strict mode エラー 0件
- [ ] 単体テストカバレッジ 90%以上
- [ ] 統合テストでの全エラーパターン確認
- [ ] パフォーマンステストでの性能要件達成
- [ ] メモリリークテストでのメモリ安全性確認

### 3. ユーザビリティ受け入れ基準
- [ ] エラーメッセージの非技術者向け表現
- [ ] 警告レベル判定の適切性
- [ ] 大量データでの進捗フィードバック

## 実装上の注意点

### 1. TASK-002との連携
- 既存のTideDataValidator, TideDataTransformerを最大限活用
- エラークラス（InvalidTimeFormatError等）の適切な利用
- 型定義（RawTideData, TideChartData）の一貫した利用

### 2. 拡張性の考慮
- 新しいエラータイプの追加容易性
- 検証ルールのカスタマイズ可能性
- 他のコンポーネントでの再利用性

### 3. テスタビリティ
- 依存注入による単体テストの容易性
- モック可能なインターフェース設計
- 段階的テストの実行可能性

---

**要件定義完成**: TASK-101の詳細仕様確定
**次のステップ**: テストケース作成（tdd-testcases.md）
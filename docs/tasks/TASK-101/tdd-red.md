# TASK-101: 動的縦軸スケール調整機能 - RED フェーズ

## 概要

TDDのREDフェーズとして、失敗するテストを作成・実行しました。実装ファイルが存在しないため、期待通りテストが失敗することを確認しました。

## 作成したテストファイル

### 1. 型定義ファイル

**`src/types/scale.ts`**
- DynamicScale インターface - 動的スケール設定
- ScaleCalculationOptions インターface - スケール計算オプション
- ScaleCalculationResult インターface - 詳細な計算結果
- SVGCoordinateConfig インターface - SVG座標変換設定

### 2. テストファイル

**`src/__tests__/utils/scale/DynamicScaleCalculator.test.ts`**

実装すべきメソッド:
- `DynamicScaleCalculator.calculateScale()` - 基本的なスケール計算
- `DynamicScaleCalculator.calculateDetailedScale()` - 詳細な計算結果

テストケース:
- ✅ TC-101: 標準的な潮位データでのスケール計算
- ✅ TC-102: 狭い範囲データでの細かいスケール適用
- ✅ TC-103: 広い範囲データでの粗いスケール適用
- ✅ TC-104: 無効データでの安全なフォールバック
- ✅ TC-105: 平均海面付近データでのゼロ含むスケール

**`src/__tests__/utils/scale/ScaleRenderer.test.ts`**

実装すべきメソッド:
- `ScaleRenderer.levelToSVGY()` - 潮位からSVG座標への変換
- `ScaleRenderer.generateTickLabels()` - 目盛りラベル生成
- `ScaleRenderer.generateSVGElements()` - SVG要素生成
- `ScaleRenderer.getOptimalLabelFormat()` - 最適ラベル形式決定

テストケース:
- ✅ TC-201: SVG座標変換の正確性
- ✅ TC-202: 範囲外値での適切なクリッピング
- ✅ TC-203: 適切にフォーマットされた目盛りラベル生成
- ✅ TC-204: 小数点値ラベルの処理
- ✅ TC-205: SVG要素の正常生成
- ✅ TC-206: スケールに基づく最適ラベル形式決定

## テスト実行結果

### DynamicScaleCalculator.test.ts

```bash
npm test -- src/__tests__/utils/scale/DynamicScaleCalculator.test.ts --run

❌ FAIL: Failed to resolve import "../../../utils/scale/DynamicScaleCalculator"
   原因: 実装ファイルが存在しない（期待通りの結果）
```

### ScaleRenderer.test.ts

```bash
npm test -- src/__tests__/utils/scale/ScaleRenderer.test.ts --run

❌ FAIL: Failed to resolve import "../../../utils/scale/ScaleRenderer"
   原因: 実装ファイルが存在しない（期待通りの結果）
```

## テスト設計の妥当性確認

### 潮位単位の統一
- 既存システム: 潮位は `level: number` でセンチメートル単位
- 新スケールシステム: センチメートル単位で統一
- テスト値: `-150cm` → `-1.5m`, `230cm` → `2.3m` など実用的な範囲

### スケール間隔の設計
- **細かいスケール**: 25cm間隔（狭い範囲: <2m）
- **標準スケール**: 50cm間隔（中間範囲: 2-5m）
- **粗いスケール**: 100cm以上間隔（広い範囲: >5m）

### エラーハンドリング設計
- 空配列 → デフォルトスケール提供
- NaN/Infinity値 → 安全なフォールバック
- 単一データポイント → 適切なマージン追加

## 次のステップ（GREENフェーズ）で実装する内容

### 1. DynamicScaleCalculator実装
```typescript
class DynamicScaleCalculator {
  static calculateScale(data: TideGraphPoint[]): DynamicScale
  static calculateDetailedScale(data: TideGraphPoint[], options?: ScaleCalculationOptions): ScaleCalculationResult
  private static determineOptimalInterval(dataSpan: number): number
  private static generateTicks(min: number, max: number, interval: number): number[]
  private static validateAndSanitizeData(data: TideGraphPoint[]): number[]
}
```

### 2. ScaleRenderer実装
```typescript
class ScaleRenderer {
  constructor(scale: DynamicScale, svgHeight: number)
  levelToSVGY(level: number): number
  generateTickLabels(): string[]
  generateSVGElements(): SVGScaleElements
  getOptimalLabelFormat(): LabelFormat
}
```

### 3. 実装優先度
1. **高**: DynamicScaleCalculator.calculateScale() - 基本機能
2. **高**: ScaleRenderer.levelToSVGY() - SVG統合必須
3. **中**: 詳細計算とSVG要素生成メソッド
4. **低**: 最適化とデバッグ支援機能

## RED フェーズ完了確認

- ✅ 全テストケースが実装不足により失敗
- ✅ テスト設計が要件と整合している
- ✅ 型定義が完成している
- ✅ 実装の方向性が明確になっている
- ✅ 期待するAPI設計が具体化されている

次のGREENフェーズでは、これらのテストを通すための最小限の実装を行います。

---

**実行日**: 2024-09-25
**フェーズ**: TDD RED (3/6)
**ステータス**: ✅ 完了
**次ステップ**: GREEN フェーズ - 最小実装
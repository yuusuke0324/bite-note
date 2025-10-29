# TASK-001: レスポンシブユーティリティ実装 - リファクタリング（Refactor Phase）

## Refactor Phase 実行ログ

Green Phaseで基本実装が完了し、46テスト中42テストが合格している状況から、残り4つのテスト失敗を修正し、コード品質を向上させる。

## 現在のテスト状況

### ✅ 合格済み (42/46)
- **ViewportDetector**: 16/16 テスト合格
- **SVGSizeCalculator**: 9/10 テスト合格
- **MarginCalculator**: 10/12 テスト合格
- **Integration**: 7/8 テスト合格

### 🔧 修正対象 (4/46)

1. **MarginCalculator.test.ts**
   - `should handle font size adjustments` - フォントサイズ調整が同じ値
   - `should handle very small SVG sizes` - 極小サイズでの最小マージン適用漏れ

2. **SVGSizeCalculator.test.ts**
   - `should enforce minimum height of 300px` - 最小高さ保証フラグ判定

3. **integration.test.ts**
   - `should work together to calculate chart layout` - マージン計算の一貫性

## リファクタリング計画

### 1. MarginCalculator の改善

#### 課題1: フォントサイズ調整で同じ値になる問題

```typescript
// 問題: fontSize 12 と 16 で同じ結果
const normalMargins = calculator.calculateMargins(svgSize, 'mobile', { fontSize: 12 });
const largeMargins = calculator.calculateMargins(svgSize, 'mobile', { fontSize: 16 });
// largeMargins.left が normalMargins.left と同じ (240)
```

**原因**: フォントスケールが適用される前に最小マージン制約で値が固定されている

#### 課題2: 極小SVGサイズで最小マージン適用漏れ

```typescript
// 問題: 100x50 サイズで bottom: 20, left: 30 となり最小値未満
const margins = calculator.calculateMargins({ width: 100, height: 50 }, 'mobile');
// 期待: bottom >= 40, left >= 60
```

**原因**: 極小サイズ用の特別処理が最小制約より弱い

### 2. SVGSizeCalculator の改善

#### 課題3: 最小高さ保証フラグ判定

```typescript
// 問題: 高さが200(最小未満)でも isMinimumSize が false
const result = calculator.calculateSize(viewport);
// 期待: result.isMinimumSize === true
```

**原因**: isMinimumSize フラグの判定ロジックが不正確

### 3. Integration テストの修正

#### 課題4: マージン計算の一貫性

```typescript
// 問題: SVGSizeCalculator と MarginCalculator で微妙に異なるマージン値
expect(sizeCalculation.margins).toEqual(margins);
// 期待: 完全一致
```

**原因**: 計算順序と丸め処理の違い

## リファクタリング実行

### Phase 1: MarginCalculator修正
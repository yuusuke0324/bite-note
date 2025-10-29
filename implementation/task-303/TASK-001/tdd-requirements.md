# TASK-001: レスポンシブユーティリティ実装 - 要件定義

## 概要

潮汐グラフの軸ラベル確実表示を実現するため、レスポンシブに対応したユーティリティ群を実装する。
画面サイズに応じて適切なSVGサイズとマージンを計算し、全デバイスで軸ラベルが確実に表示されることを保証する。

## 要件詳細

### REQ-301: レスポンシブ表示対応

#### R-301-1: ビューポート検出
- **要件**: 現在の画面サイズとデバイス種別を正確に検出する
- **受け入れ基準**:
  - Mobile: 320px - 768px の検出
  - Tablet: 768px - 1024px の検出
  - Desktop: 1024px+ の検出
  - 画面向き（portrait/landscape）の検出
  - デバイスピクセル比の取得

#### R-301-2: SVGサイズ計算
- **要件**: 画面サイズに応じて最適なSVGサイズを計算する
- **受け入れ基準**:
  - 最小サイズ保証: 600x300px
  - アスペクト比維持: 2:1 (width:height)
  - ビューポート幅の90%を上限とする
  - コンテナサイズからチャート領域を計算

#### R-301-3: 動的マージン計算
- **要件**: 軸ラベル表示に必要な動的マージンを計算する
- **受け入れ基準**:
  - X軸ラベル用: 最小40px bottom margin
  - Y軸ラベル用: 最小60px left margin
  - デバイス別の最適化
  - SVGサイズに応じた比例調整

### REQ-302: 軸ラベル表示保証

#### R-302-1: 最小サイズ強制
- **要件**: 軸ラベルが確実に表示される最小サイズを強制する
- **受け入れ基準**:
  - グラフ領域が最小200x150px未満の場合は最小サイズを適用
  - マージン不足時の自動調整
  - ラベル切り取り防止機能

#### R-302-2: マージン適応性
- **要件**: ラベル長さとフォントサイズに応じたマージン調整
- **受け入れ基準**:
  - 長いラベルでも確実表示
  - フォントサイズ変更に対応
  - 多言語対応（将来の拡張性）

## 技術仕様

### ViewportDetector インターフェース

```typescript
interface ViewportInfo {
  width: number;
  height: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
}

interface ViewportDetector {
  getCurrentViewport(): ViewportInfo;
  onViewportChange(callback: (viewport: ViewportInfo) => void): () => void;
}
```

### SVGSizeCalculator インターフェース

```typescript
interface SVGSizeCalculation {
  containerWidth: number;
  containerHeight: number;
  chartWidth: number;
  chartHeight: number;
  margins: ChartMargins;
  scaleFactor: number;
  isMinimumSize: boolean;
}

interface SVGSizeCalculator {
  calculateSize(
    viewport: ViewportInfo,
    containerElement?: HTMLElement
  ): SVGSizeCalculation;
}
```

### MarginCalculator インターフェース

```typescript
interface ChartMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface MarginCalculator {
  calculateMargins(
    svgSize: { width: number; height: number },
    deviceType: DeviceType,
    options?: MarginCalculationOptions
  ): ChartMargins;
}
```

## 制約条件

### 技術制約
- React Hooks対応（useEffect, useMemo, useCallback）
- TypeScript strict mode準拠
- DOM API使用（window.innerWidth, window.innerHeight）
- CSS単位は px のみ使用

### パフォーマンス制約
- リサイズイベントのデバウンス（100ms）
- 計算結果のメモ化
- 不要な再計算防止

### ブラウザ対応
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## テスト要件

### 単体テスト
- [ ] ビューポート検出の正確性テスト
- [ ] SVGサイズ計算の境界値テスト
- [ ] マージン計算の最小値保証テスト
- [ ] デバイス別設定の適用確認

### 統合テスト
- [ ] リサイズ時の動作確認
- [ ] 複数ユーティリティの連携テスト
- [ ] 実際のコンポーネントでの動作確認

### エッジケース
- [ ] 極小画面（320px未満）での動作
- [ ] 極大画面（4K以上）での動作
- [ ] ゼロサイズコンテナでの例外処理

## 受け入れ基準

### 機能要件
1. ✅ 全デバイス種別で正確なビューポート検出
2. ✅ 最小サイズ600x300pxの確実な適用
3. ✅ 軸ラベル用マージンの最小値保証
4. ✅ リアルタイムでのサイズ変更対応

### 非機能要件
1. ✅ 計算処理時間 < 10ms
2. ✅ メモリ使用量の適正管理
3. ✅ TypeScript型安全性100%
4. ✅ テストカバレッジ90%以上

### 品質要件
1. ✅ コードの可読性・保守性
2. ✅ 適切なエラーハンドリング
3. ✅ ドキュメント完備
4. ✅ 将来の拡張性確保

## 実装優先度

1. **HIGH**: ViewportDetector（基盤機能）
2. **HIGH**: SVGSizeCalculator（サイズ計算）
3. **HIGH**: MarginCalculator（マージン計算）
4. **MEDIUM**: リサイズイベント最適化
5. **LOW**: 将来拡張機能の準備

---

**作成日**: 2025-09-28
**作成者**: フロントエンド開発チーム
**レビュー**: 要
# TASK-001: TideGraphコンポーネント レスポンシブ対応 - 要件定義

## 概要

現在のTideGraphコンポーネントは固定サイズ（width, height props）で動作しており、レスポンシブ対応ができていない。異なる画面サイズでの表示に対応し、横スクロールを防止する必要がある。

## 現在の問題分析

### 既存実装の問題点
1. **固定サイズ設計**: width/height propsによる固定サイズ指定
2. **SVGのハードコーディング**: viewBoxサイズが固定
3. **レスポンシブ未対応**: 画面サイズに応じた調整なし
4. **横スクロールリスク**: コンテナ幅を超える可能性

### 既存コードの構造
```typescript
interface TideGraphProps {
  data: TideGraphData;
  width: number;      // 固定値
  height: number;     // 固定値
  animated?: boolean;
  loading?: boolean;
}
```

## 新しい要件定義

### 1. レスポンシブ対応の要件

#### 1.1 Props構造の拡張
```typescript
interface ResponsiveTideGraphProps {
  data: TideGraphData;
  // レスポンシブ設定
  responsive?: boolean;           // デフォルト: true
  maxWidth?: string;             // デフォルト: "100%"
  aspectRatio?: number;          // デフォルト: 16/9
  minWidth?: number;             // デフォルト: 320px

  // 既存props
  animated?: boolean;
  loading?: boolean;

  // 新規props
  preventHorizontalScroll?: boolean; // デフォルト: true
}
```

#### 1.2 Breakpoint対応
- **Mobile**: 320px〜767px
- **Tablet**: 768px〜1023px
- **Desktop**: 1024px以上

#### 1.3 動的SVG計算
```typescript
interface DynamicSVGDimensions {
  containerWidth: number;
  containerHeight: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  scaleFactor: number;
}
```

### 2. 機能要件

#### REQ-R001: 画面幅自動検出
- システムは現在の画面幅を自動検出しなければならない
- システムは画面サイズ変更に動的に対応しなければならない

#### REQ-R002: 動的サイズ調整
- システムはコンテナ幅に応じてSVGサイズを自動調整しなければならない
- システムは指定されたアスペクト比を維持しなければならない

#### REQ-R003: 横スクロール防止
- システムは如何なるサイズでも横スクロールを発生させてはならない
- システムはmax-width: 100%を確実に適用しなければならない

#### REQ-R004: 文字・マーカーの可読性保持
- システムは小さな画面でも文字が読める大きさを維持しなければならない
- システムは潮汐マーカーが適切に表示されることを保証しなければならない

### 3. 非機能要件

#### NFR-R001: パフォーマンス
- 画面サイズ変更時の再描画は200ms以内に完了しなければならない
- ResizeObserverによる効率的な監視を実装しなければならない

#### NFR-R002: 互換性
- 既存のTideGraphProps使用箇所で破綻しないよう後方互換性を維持しなければならない
- 段階的な移行が可能な設計とする

#### NFR-R003: アクセシビリティ
- 画面サイズによらず、キーボードナビゲーションが動作しなければならない
- スクリーンリーダーでの読み上げが適切に動作しなければならない

### 4. UI/UX要件

#### UIX-R001: 視覚的品質
- 全画面サイズで視覚的に美しいグラフが表示される
- テキストとラベルが適切なサイズで表示される
- グリッドラインと軸が正しく配置される

#### UIX-R002: インタラクション
- タッチとマウス操作が全画面サイズで動作する
- ツールチップが画面外にはみ出さない
- ズーム操作でレイアウトが崩れない

### 5. テスト要件

#### 5.1 単体テスト
- [ ] 画面サイズ検出ロジックのテスト
- [ ] SVG寸法計算ロジックのテスト
- [ ] アスペクト比維持ロジックのテスト
- [ ] 最小幅制限のテスト

#### 5.2 統合テスト
- [ ] 各Breakpointでのレンダリングテスト
- [ ] 画面サイズ変更時の再描画テスト
- [ ] 既存プロパティでの後方互換性テスト

#### 5.3 E2Eテスト
- [ ] 実際のデバイスでの横スクロールチェック
- [ ] ズーム操作での表示確認
- [ ] 画面回転での再描画確認

### 6. エラーハンドリング

#### ERR-R001: 極小画面対応
- 320px以下の画面での安全な描画
- 文字が読めない場合の代替表示

#### ERR-R002: ResizeObserver未サポート
- ResizeObserverが使用できない環境での代替手段
- window.resizeイベントでのフォールバック

#### ERR-R003: SVG計算エラー
- 不正な寸法計算時の安全なデフォルト値
- ゼロ除算エラーの防止

### 7. 実装アプローチ

#### 7.1 段階的実装
1. **Phase 1**: useResizeObserver hookの実装
2. **Phase 2**: 動的SVG寸法計算の実装
3. **Phase 3**: レスポンシブPropsの追加
4. **Phase 4**: 既存実装への統合

#### 7.2 技術スタック
- **React Hooks**: useState, useEffect, useCallback, useMemo
- **Browser APIs**: ResizeObserver, window.resize (fallback)
- **CSS**: CSS-in-JS, CSS Custom Properties
- **Testing**: Jest, React Testing Library

### 8. 成功基準

#### 8.1 機能面
- [x] 全てのBreakpointで適切な表示
- [x] 横スクロールの完全な防止
- [x] 既存機能の完全な維持

#### 8.2 品質面
- [x] テストカバレッジ95%以上
- [x] パフォーマンス劣化なし
- [x] アクセシビリティ基準維持

#### 8.3 ユーザー体験
- [x] 直感的なレスポンシブ動作
- [x] 快適なインタラクション
- [x] 視覚的品質の維持

## 実装完了後の検証項目

### デバイステスト
- [ ] iPhone SE (375px): 縦スクロールのみ、読みやすい表示
- [ ] iPad (768px): タブレット最適表示
- [ ] Desktop (1200px+): デスクトップ最適表示

### ブラウザテスト
- [ ] Chrome: ResizeObserver対応確認
- [ ] Safari: iOS Safari対応確認
- [ ] Firefox: 各種画面サイズ対応確認

### アクセシビリティテスト
- [ ] スクリーンリーダー: 全サイズで適切な読み上げ
- [ ] キーボードナビゲーション: 全サイズで操作可能
- [ ] ズーム: 200%まで対応

---

**要件定義完了日**: 2024-09-25
**レビュー担当**: 開発チーム
**承認**: プロダクトオーナー
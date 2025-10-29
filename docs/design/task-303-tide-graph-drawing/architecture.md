# TASK-303: 潮汐グラフ描画改善 アーキテクチャ設計

## システム概要

潮汐グラフの描画機能に特化した改善を実施し、軸ラベルの確実な表示、データ構造の標準化、エラーハンドリングの強化を図る。rechartsライブラリを基盤とした統一されたグラフコンポーネントにより、信頼性の高い潮汐データ可視化を提供する。

## アーキテクチャパターン

- **パターン**: コンポーネントベースアーキテクチャ + プレゼンテーション・ロジック分離
- **理由**: グラフ描画に特化したコンポーネント設計により、再利用性と保守性を向上

## システム境界

### スコープ内
- rechartsベースのグラフ描画コンポーネント
- 軸ラベル表示の確実性保証
- データ検証とエラーハンドリング
- レスポンシブ表示対応
- 標準化されたデータ構造処理

### スコープ外
- 潮汐計算ロジック（既存のTideCalculationServiceを使用）
- データベース変更
- 新規API開発

## コンポーネント構成

### プレゼンテーション層（Presentation Layer）

#### Core Components
- **TideChart.tsx** - rechartsベースのメイングラフコンポーネント
  - フレームワーク: React + TypeScript
  - グラフライブラリ: recharts (LineChart, Line, XAxis, YAxis, ResponsiveContainer)
  - データ形式: 標準化された `TideChartData[]`
  - 軸ラベル保証: 動的マージン計算

#### Data Processing Components
- **TideDataValidator.ts** - データ検証専用コンポーネント
  - 入力データの型チェック
  - 時刻フォーマット検証（"HH:mm"）
  - 潮位数値検証
  - 欠損・異常値検出

#### Layout Components
- **ResponsiveChartContainer.tsx** - レスポンシブコンテナ
  - 画面サイズ検出
  - 最小表示サイズ保証（600x300px）
  - デバイス別最適化

### ロジック層（Logic Layer）

#### Data Transformation
- **TideDataTransformer.ts** - データ変換ユーティリティ
  - 内部データ → recharts形式変換
  - 時刻データ正規化
  - 欠損データ補間

#### Chart Configuration
- **ChartConfigManager.ts** - グラフ設定管理
  - デバイス別設定
  - テーマ・色設定
  - アクセシビリティ設定

#### Error Handling
- **TideChartErrorHandler.ts** - エラー処理専用
  - エラー分類・優先度付け
  - ユーザーフレンドリーメッセージ
  - フォールバック処理

### ユーティリティ層（Utility Layer）

#### Responsive Utilities
- **ViewportDetector.ts** - ビューポート検出
- **SVGSizeCalculator.ts** - SVGサイズ計算
- **MarginCalculator.ts** - マージン計算

#### Validation Utilities
- **TimeFormatValidator.ts** - 時刻フォーマット検証
- **NumericValidator.ts** - 数値検証
- **DataIntegrityChecker.ts** - データ整合性チェック

## データフロー設計

### 入力データフロー
```
TideGraphData → DataValidator → DataTransformer → ChartData → rechartsComponent
```

### エラーハンドリングフロー
```
Data Input → Validation → Error Classification → User Message → Fallback Display
```

### レスポンシブフロー
```
Screen Size Change → Viewport Detection → Size Calculation → Chart Resize → Label Adjustment
```

## 技術スタック

### フロントエンド Core
- **React**: 18.x (Hooks中心)
- **TypeScript**: 4.9+ (strict mode)
- **recharts**: 2.8+ (LineChart, ResponsiveContainer)
- **Tailwind CSS**: 3.x (スタイリング)

### 開発・品質管理
- **Vitest**: テストフレームワーク
- **React Testing Library**: コンポーネントテスト
- **ESLint + Prettier**: コード品質
- **TypeScript strict**: 型安全性

## コンポーネント設計

### TideChart (メインコンポーネント)

```typescript
interface TideChartProps {
  data: TideChartData[];
  width?: number;
  height?: number;
  responsive?: boolean;
  showGrid?: boolean;
  onError?: (error: TideChartError) => void;
}

interface TideChartData {
  time: string;    // "HH:mm" format
  tide: number;    // cm unit
  isEvent?: boolean;
}
```

### 責務分離
- **TideChart**: 描画とレイアウト
- **TideDataValidator**: データ検証
- **ResponsiveChartContainer**: レスポンシブ対応
- **TideChartErrorHandler**: エラー処理

## エラーハンドリング戦略

### エラー分類
1. **データエラー**: 入力データの不正・不足
2. **描画エラー**: recharts描画失敗
3. **サイズエラー**: 表示領域不足
4. **ネットワークエラー**: データ取得失敗

### エラー表示レベル
- **Critical**: グラフ非表示 + エラーメッセージ
- **Warning**: グラフ表示 + 警告表示
- **Info**: グラフ表示 + 情報表示

### フォールバック戦略
- データ不足 → 代替メッセージ表示
- サイズ不足 → 最小サイズ強制適用
- 描画失敗 → テキスト形式データ表示

## パフォーマンス最適化

### レンダリング最適化
- **React.memo**: 不要な再描画防止
- **useMemo**: 重い計算のキャッシュ
- **useCallback**: イベントハンドラー最適化

### データ処理最適化
- **データ変換**: メモリ効率的な変換
- **バリデーション**: 早期失敗戦略
- **レイジーローディング**: 大量データ対応

### SVG最適化
- **ビューポート制限**: 過大なSVGサイズ防止
- **要素最小化**: 不要な描画要素削減
- **アニメーション最適化**: パフォーマンス重視

## レスポンシブ設計

### ブレークポイント
- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+

### サイズ戦略
- **最小保証**: 600x300px
- **最大制限**: ビューポート幅の90%
- **アスペクト比**: 2:1 (width:height)

### マージン戦略
- **X軸ラベル**: 最小40px bottom margin
- **Y軸ラベル**: 最小60px left margin
- **動的調整**: 画面サイズに応じた最適化

## アクセシビリティ対応

### 色覚多様性
- **高コントラスト**: WCAG 2.1 AA準拠
- **カラーパターン**: 色のみに依存しない表現
- **ダークモード**: 対応準備

### キーボード対応
- **フォーカス**: Tab順序の最適化
- **ARIA**: 適切なラベル・ロール設定
- **スクリーンリーダー**: 代替テキスト提供

## セキュリティ考慮事項

### 入力検証
- **XSS防止**: データサニタイズ
- **型安全性**: TypeScript厳格モード
- **値範囲チェック**: 異常値検出

### エラー情報
- **機密情報保護**: 内部情報の非露出
- **ログレベル**: 本番環境での情報制御

## 拡張性設計

### 設定可能項目
- **色テーマ**: カスタムカラーパレット
- **軸ラベル**: 表示形式カスタマイズ
- **グリッド**: 表示・非表示切り替え
- **ツールチップ**: 詳細情報表示

### プラグイン対応
- **カスタムマーカー**: イベント表示
- **アニメーション**: 描画エフェクト
- **エクスポート**: 画像・PDF出力

### 国際化対応
- **多言語**: ラベル・メッセージの国際化
- **数値形式**: ロケール対応
- **タイムゾーン**: 時刻表示の地域化

## 品質保証

### テスト戦略
- **単体テスト**: 各コンポーネント・ユーティリティ
- **統合テスト**: コンポーネント間連携
- **視覚回帰テスト**: グラフ描画の一貫性
- **アクセシビリティテスト**: WCAG準拠確認

### モニタリング
- **パフォーマンス**: 描画時間計測
- **エラー率**: エラー発生頻度追跡
- **ユーザビリティ**: 軸ラベル可視性確認

## 運用・保守

### ログ戦略
- **開発環境**: 詳細デバッグ情報
- **本番環境**: エラー・警告のみ
- **分析**: ユーザー行動データ収集

### 更新戦略
- **段階的展開**: フィーチャーフラグ使用
- **A/Bテスト**: 新デザインの効果測定
- **ロールバック**: 問題時の迅速復旧

---

**設計日**: 2025-09-28
**設計者**: フロントエンド開発チーム
**レビュー者**: UX/UIデザイナー、アクセシビリティ専門家
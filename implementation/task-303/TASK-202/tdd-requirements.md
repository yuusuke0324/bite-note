# TASK-202: TideChart メインコンポーネント実装 - 要件定義

## 概要

TideChartは潮汐データを視覚化するメイングラフコンポーネントです。rechartsライブラリを使用し、レスポンシブ表示、軸ラベル保証、エラーハンドリングを組み込んだ高品質なチャートを提供します。

## 詳細要件

### 1. 機能要件

#### 1.1 recharts統合 (REQ-101)
**目的**: recharts LineChart を使用した滑らかなグラフ描画
**詳細**:
- LineChart コンポーネントの統合
- XAxis: 時間軸（"HH:mm"フォーマット）
- YAxis: 潮位軸（"cm"単位）
- Line: 潮汐データポイント接続
- ResponsiveContainer: 自動サイズ調整
- Tooltip: データポイント詳細表示
- Grid: 読み取りやすさ向上

#### 1.2 軸ラベル確実表示 (REQ-102)
**目的**: 全画面サイズで軸ラベルが確実に表示される
**詳細**:
- 最小マージン保証: X軸40px、Y軸60px
- ラベル重複回避アルゴリズム
- 自動フォントサイズ調整
- 時間ラベル間隔の動的調整

#### 1.3 レスポンシブ表示 (REQ-301)
**目的**: 画面サイズに応じた最適なグラフ表示
**詳細**:
- ResponsiveChartContainer統合
- 最小サイズ保証: 600x300px
- アスペクト比維持: 2:1 (width:height)
- デバイス別マージン調整

### 2. データ仕様

#### 2.1 入力データ型
```typescript
interface TideChartData {
  time: string;      // "HH:mm" 形式
  tide: number;      // 潮位 (cm)
  type?: 'high' | 'low' | 'normal'; // 満潮・干潮マーカー
}

interface TideChartProps {
  data: TideChartData[];
  width?: number;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showMarkers?: boolean;
  onDataPointClick?: (data: TideChartData, index: number) => void;
  className?: string;
  style?: React.CSSProperties;
}
```

#### 2.2 出力仕様
- SVGベースのグラフ描画
- インタラクティブなツールチップ
- イベントマーカー（満潮・干潮）
- エラー状態での代替表示

### 3. UI/UX仕様

#### 3.1 グラフスタイリング
- **線の色**: 青系統 (#0088FE)
- **線の太さ**: 2px
- **背景色**: 白 (#FFFFFF)
- **グリッド色**: 薄いグレー (#E0E0E0)
- **軸ラベル色**: ダークグレー (#333333)

#### 3.2 インタラクション
- **ツールチップ**: ホバー時に「時刻: XX:XX\n潮位: XXXcm」表示
- **マーカー**: 満潮（↑赤丸）、干潮（↓青丸）
- **クリック**: データポイントクリックでコールバック実行

#### 3.3 レスポンシブ動作
- **デスクトップ**: フルサイズ表示
- **タブレット**: マージン調整、フォント最適化
- **モバイル**: コンパクト表示、タッチ最適化

### 4. 技術仕様

#### 4.1 依存コンポーネント
- ResponsiveChartContainer (TASK-201)
- TideDataValidator (TASK-101)
- TideChartErrorHandler (TASK-102)
- ChartConfigManager (TASK-103)

#### 4.2 使用技術スタック
- React 18 + TypeScript
- recharts (LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer)
- TASK-001 ユーティリティ

#### 4.3 パフォーマンス要件
- 初期描画: 500ms以内
- データ更新時の再描画: 200ms以内
- メモリ使用量: 適正範囲
- 100データポイントまでスムーズ描画

### 5. エラーハンドリング仕様

#### 5.1 エラー分類
```typescript
enum TideChartError {
  CHART_RENDERING_FAILED = 'CHART_RENDERING_FAILED',
  SVG_CREATION_FAILED = 'SVG_CREATION_FAILED',
  AXIS_RENDER_FAILED = 'AXIS_RENDER_FAILED',
  DATA_PROCESSING_FAILED = 'DATA_PROCESSING_FAILED'
}
```

#### 5.2 エラー処理
- **Critical**: グラフ非表示、エラーメッセージ表示
- **Warning**: 警告付きでグラフ表示
- **Info**: 正常表示、ログ出力のみ

#### 5.3 フォールバック機能
- 描画失敗時: テキスト形式データテーブル表示
- 部分データ: 利用可能データのみでグラフ作成
- 空データ: "データがありません"メッセージ

### 6. アクセシビリティ要件

#### 6.1 ARIA属性
- `role="img"`: グラフ要素
- `aria-label`: グラフ概要説明
- `aria-describedby`: 詳細説明参照

#### 6.2 キーボード対応
- Tab順序: 論理的なフォーカス遷移
- Enter/Space: データポイント選択
- 矢印キー: データポイント移動

#### 6.3 色覚多様性対応
- WCAG 2.1 AA準拠のコントラスト比
- 色だけに依存しない情報表示
- パターンやシンボルでの区別

### 7. 品質保証要件

#### 7.1 単体テスト
- コンポーネントレンダリングテスト
- Propsバリデーションテスト
- イベントハンドリングテスト
- エラー状態テスト

#### 7.2 統合テスト
- recharts統合確認
- 依存コンポーネント連携テスト
- レスポンシブ動作テスト
- データフロー全体テスト

#### 7.3 品質基準
- TypeScript strict mode 準拠
- ESLint エラー 0件
- テストカバレッジ 95%以上
- コンポーネントサイズ 500行以下

### 8. 受け入れ基準

#### 8.1 機能受け入れ基準
- [ ] 正常データで滑らかなグラフが描画される
- [ ] 軸ラベルが全画面サイズで表示される
- [ ] ツールチップが正しく動作する
- [ ] エラー時にフォールバック表示される
- [ ] レスポンシブ動作が適切に機能する

#### 8.2 品質受け入れ基準
- [ ] 全単体テスト合格
- [ ] 全統合テスト合格
- [ ] 型チェックエラー 0件
- [ ] ESLint警告 0件
- [ ] アクセシビリティ確認済み

#### 8.3 パフォーマンス受け入れ基準
- [ ] 初期描画 500ms以内
- [ ] データ更新 200ms以内
- [ ] 100データポイント対応
- [ ] メモリリークなし

## 実装戦略

### Phase 1: 基本グラフ実装
1. TideChart.tsx コンポーネント作成
2. recharts基本統合
3. データプロパティ定義

### Phase 2: 高度機能実装
1. イベントマーカー機能
2. インタラクティブ機能
3. エラーハンドリング統合

### Phase 3: 統合・最適化
1. 依存コンポーネント統合
2. レスポンシブ機能統合
3. パフォーマンス最適化

### Phase 4: 品質確保
1. テスト実装
2. アクセシビリティ対応
3. ドキュメント整備

---

**要件定義完了日**: 2025-09-30
**承認者**: Claude Code Assistant
**次ステップ**: テストケース作成 (tdd-testcases.md)
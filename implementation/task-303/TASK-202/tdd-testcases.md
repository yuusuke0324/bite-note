# TASK-202: TideChart メインコンポーネント実装 - テストケース

## 概要

TideChartコンポーネントの包括的テストケースを定義します。recharts統合、軸ラベル表示、レスポンシブ機能、エラーハンドリングを網羅的にテストします。

## テストケース一覧 (合計21個)

### A. 基本レンダリングテスト (4個)

#### A1. デフォルトレンダリングテスト
**目的**: 基本Propsでの正常レンダリング確認
**テストデータ**:
```typescript
const basicData: TideChartData[] = [
  { time: "06:00", tide: 120 },
  { time: "12:00", tide: -50 },
  { time: "18:00", tide: 200 },
];
```
**期待結果**:
- SVG要素が生成される
- LineChart要素が存在する
- 3つのデータポイントが描画される

#### A2. 空データレンダリングテスト
**目的**: 空データ配列での適切な処理確認
**テストデータ**: `[]`
**期待結果**:
- エラーが発生しない
- "データがありません"メッセージ表示
- フォールバック表示が機能する

#### A3. カスタムPropsレンダリングテスト
**目的**: カスタムプロパティの適用確認
**テストProps**:
```typescript
{
  data: basicData,
  showGrid: false,
  showTooltip: false,
  className: "custom-chart",
  style: { backgroundColor: "red" }
}
```
**期待結果**:
- Grid線が非表示になる
- Tooltipが無効になる
- カスタムクラスとスタイルが適用される

#### A4. 複雑データレンダリングテスト
**目的**: 大量データ・特殊値での安定性確認
**テストデータ**:
```typescript
const complexData: TideChartData[] = [
  { time: "00:00", tide: 0, type: 'normal' },
  { time: "06:00", tide: 300, type: 'high' },
  { time: "12:00", tide: -100, type: 'low' },
  { time: "18:00", tide: 250, type: 'high' },
  { time: "23:59", tide: 50, type: 'normal' }
];
```
**期待結果**:
- 全データポイントが正確に描画される
- 満潮・干潮マーカーが表示される
- パフォーマンスが許容範囲内

### B. recharts統合テスト (5個)

#### B1. LineChartプロパティテスト
**目的**: recharts LineChartプロパティの正確性確認
**検証項目**:
- width, height プロパティ
- data プロパティの正確な渡し
- margin プロパティの適用

**期待結果**:
```typescript
expect(lineChart).toHaveProps({
  data: expectedData,
  margin: { top: 20, right: 20, bottom: 40, left: 60 }
});
```

#### B2. XAxis設定テスト
**目的**: X軸（時間軸）の正確な設定確認
**検証項目**:
- dataKey: "time"
- tickFormatter: "HH:mm"形式
- axisLine, tickLine の表示

**期待結果**:
```typescript
expect(xAxis).toHaveProps({
  dataKey: "time",
  axisLine: true,
  tickLine: true
});
```

#### B3. YAxis設定テスト
**目的**: Y軸（潮位軸）の正確な設定確認
**検証項目**:
- dataKey: "tide"
- unit: "cm"
- domain: [auto, auto]

**期待結果**:
```typescript
expect(yAxis).toHaveProps({
  dataKey: "tide",
  unit: "cm",
  domain: ['dataMin', 'dataMax']
});
```

#### B4. Line設定テスト
**目的**: データ線の正確な設定確認
**検証項目**:
- dataKey: "tide"
- stroke: "#0088FE"
- strokeWidth: 2

**期待結果**:
```typescript
expect(line).toHaveProps({
  dataKey: "tide",
  stroke: "#0088FE",
  strokeWidth: 2
});
```

#### B5. Tooltip設定テスト
**目的**: ツールチップの正確な動作確認
**テスト手順**:
1. データポイントにマウスホバー
2. ツールチップ表示確認
3. 表示内容の正確性確認

**期待結果**:
- ツールチップが表示される
- "時刻: 06:00" が表示される
- "潮位: 120cm" が表示される

### C. レスポンシブ統合テスト (3個)

#### C1. ResponsiveChartContainer統合テスト
**目的**: ResponsiveChartContainerとの正常統合確認
**テスト手順**:
1. TideChartをResponsiveChartContainerでラップ
2. サイズ変更シミュレート
3. グラフの再描画確認

**期待結果**:
- ResponsiveContainerが正常に動作する
- サイズ変更時に再描画される
- 最小サイズが保証される

#### C2. 画面サイズ変更応答テスト
**目的**: 画面サイズ変更に対する適切な応答確認
**テストケース**:
```typescript
const testCases = [
  { width: 320, height: 240, device: 'mobile' },
  { width: 768, height: 512, device: 'tablet' },
  { width: 1024, height: 512, device: 'desktop' }
];
```
**期待結果**:
- 各サイズでグラフが正常表示される
- マージンが適切に調整される
- フォントサイズが最適化される

#### C3. 最小サイズ保証テスト
**目的**: 600x300px最小サイズ保証の確認
**テスト手順**:
1. 最小サイズ以下のコンテナを設定
2. TideChart描画
3. 実際のサイズ確認

**期待結果**:
- width >= 600px が保証される
- height >= 300px が保証される
- 軸ラベルが確実に表示される

### D. インタラクション機能テスト (3個)

#### D1. データポイントクリックテスト
**目的**: onDataPointClickコールバックの動作確認
**テスト手順**:
1. onDataPointClickコールバック設定
2. データポイントクリック
3. コールバック実行確認

**期待結果**:
```typescript
expect(onDataPointClick).toHaveBeenCalledWith(
  { time: "06:00", tide: 120 },
  0
);
```

#### D2. ツールチップインタラクションテスト
**目的**: ツールチップの詳細インタラクション確認
**テスト手順**:
1. データポイントにマウスホバー
2. ツールチップ内容確認
3. マウス離脱でツールチップ消失確認

**期待結果**:
- ホバーでツールチップ表示
- 正確なデータ内容表示
- 離脱でツールチップ非表示

#### D3. マーカーインタラクションテスト
**目的**: 満潮・干潮マーカーのインタラクション確認
**テストデータ**:
```typescript
{ time: "06:00", tide: 300, type: 'high' }
```
**期待結果**:
- 満潮マーカー（赤丸↑）が表示される
- マーカークリックでイベント発火
- 適切なスタイリング適用

### E. エラーハンドリングテスト (4個)

#### E1. 不正データ処理テスト
**目的**: 不正な入力データの適切な処理確認
**テストデータ**:
```typescript
const invalidData = [
  { time: "invalid", tide: "not-number" },
  { time: "25:00", tide: NaN },
  { time: "", tide: undefined }
];
```
**期待結果**:
- エラーが適切にキャッチされる
- フォールバック表示が機能する
- エラーメッセージが表示される

#### E2. recharts描画失敗テスト
**目的**: recharts描画エラーのハンドリング確認
**テスト手順**:
1. recharts描画を強制的に失敗させる
2. エラーハンドリング動作確認
3. フォールバック表示確認

**期待結果**:
- CHART_RENDERING_FAILED エラー発生
- テキスト形式データテーブル表示
- エラーログ出力

#### E3. SVG作成失敗テスト
**目的**: SVG要素作成失敗時のハンドリング確認
**期待結果**:
- SVG_CREATION_FAILED エラー発生
- 代替表示機能作動
- ユーザーフレンドリーなエラーメッセージ

#### E4. メモリ不足エラーテスト
**目的**: 大量データによるメモリ不足の処理確認
**テストデータ**: 10,000データポイント
**期待結果**:
- データサンプリングが作動
- パフォーマンス劣化を防ぐ
- 警告メッセージ表示

### F. アクセシビリティテスト (2個)

#### F1. ARIA属性テスト
**目的**: 適切なARIA属性の設定確認
**検証項目**:
- role="img" 設定
- aria-label でグラフ概要説明
- aria-describedby で詳細説明参照

**期待結果**:
```typescript
expect(chartElement).toHaveAttribute('role', 'img');
expect(chartElement).toHaveAttribute('aria-label', '潮汐グラフ: 6時から18時までの潮位変化');
```

#### F2. キーボードナビゲーションテスト
**目的**: キーボード操作対応の確認
**テスト手順**:
1. Tab キーでフォーカス移動
2. 矢印キーでデータポイント移動
3. Enter キーで選択実行

**期待結果**:
- 論理的なフォーカス順序
- 矢印キーでポイント移動
- Enter/Spaceで選択可能

## テスト実行戦略

### 優先度 HIGH (合計12個)
- A1, A2, A3: 基本レンダリング
- B1, B2, B3, B4: recharts統合コア
- C1, C3: レスポンシブコア機能
- E1, E2: 基本エラーハンドリング
- F1: 基本アクセシビリティ

### 優先度 MEDIUM (合計6個)
- A4: 複雑データ処理
- B5: ツールチップ詳細
- C2: 画面サイズ変更
- D1, D2: インタラクション基本
- E3: SVG作成エラー

### 優先度 LOW (合計3個)
- D3: マーカーインタラクション
- E4: メモリ不足処理
- F2: キーボードナビゲーション

### テスト環境設定

#### 必要なテストライブラリ
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
```

#### モック設定
```typescript
// recharts モック
vi.mock('recharts', () => ({
  LineChart: vi.fn(),
  XAxis: vi.fn(),
  YAxis: vi.fn(),
  Line: vi.fn(),
  Tooltip: vi.fn(),
  ResponsiveContainer: vi.fn()
}));

// ResizeObserver モック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));
```

### パフォーマンス期待値

#### 描画性能
- 初期描画: 500ms以内
- 再描画: 200ms以内
- 100データポイント: スムーズ描画

#### メモリ使用量
- 基本動作: 10MB以内
- 大量データ: 50MB以内
- メモリリーク: なし

---

**テストケース作成日**: 2025-09-30
**総テスト数**: 21個 (HIGH: 12, MEDIUM: 6, LOW: 3)
**期待カバレッジ**: 95%以上
**次ステップ**: Red Phase実装 (tdd-red.md)
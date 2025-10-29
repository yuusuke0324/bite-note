# TideChart コンポーネント使用方法

## 概要

`TideChart`は、Rechartsライブラリを基盤とした潮位グラフコンポーネントです。アクセシビリティ、レスポンシブ対応、パフォーマンス最適化を重視した実装となっています。

## 基本的な使用方法

### インポート

```typescript
import { TideChart } from './components/chart/tide/TideChart';
import type { TideDataPoint } from './components/chart/tide/types';
```

### 最小限の実装

```typescript
const sampleData: TideDataPoint[] = [
  { time: '00:00', tide: 120 },
  { time: '03:00', tide: 80 },
  { time: '06:00', tide: 200 },
  { time: '09:00', tide: 150 },
];

function MyComponent() {
  return (
    <TideChart
      data={sampleData}
      width={800}
      height={400}
    />
  );
}
```

## Props

### 必須Props

| Prop | 型 | 説明 |
|------|---|------|
| `data` | `TideDataPoint[]` | 潮位データの配列 |
| `width` | `number` | グラフの幅（ピクセル） |
| `height` | `number` | グラフの高さ（ピクセル） |

### オプションProps

| Prop | 型 | デフォルト | 説明 |
|------|---|-----------|------|
| `showGrid` | `boolean` | `true` | グリッド線の表示 |
| `showTooltip` | `boolean` | `true` | ツールチップの表示 |
| `showMarkers` | `boolean` | `true` | データポイントマーカーの表示 |
| `theme` | `'light' \| 'dark' \| 'high-contrast'` | `'light'` | テーマ設定 |
| `ariaLabel` | `string` | `'潮汐グラフ'` | アクセシビリティラベル |
| `ariaDescription` | `string` | - | グラフの詳細説明 |

## データ型定義

### TideDataPoint

```typescript
interface TideDataPoint {
  time: string;          // 時刻（例: "00:00"）
  tide: number;          // 潮位（cm）
  type?: 'high' | 'low'; // オプション: 満潮/干潮マーカー
}
```

## 使用例

### 1. 基本的なグラフ

```typescript
const tideData: TideDataPoint[] = [
  { time: '00:00', tide: 120 },
  { time: '03:00', tide: 80, type: 'low' },
  { time: '06:00', tide: 200, type: 'high' },
  { time: '09:00', tide: 150 },
  { time: '12:00', tide: 90, type: 'low' },
  { time: '15:00', tide: 180, type: 'high' },
  { time: '18:00', tide: 140 },
  { time: '21:00', tide: 110 }
];

<TideChart
  data={tideData}
  width={800}
  height={400}
/>
```

### 2. カスタマイズされたグラフ

```typescript
<TideChart
  data={tideData}
  width={1000}
  height={500}
  showGrid={true}
  showTooltip={true}
  showMarkers={true}
  theme="dark"
  ariaLabel="24時間潮位変化グラフ"
  ariaDescription="本日0時から24時までの潮位変化を示すグラフです"
/>
```

### 3. ModernAppでの統合例

```typescript
const TideChartContent = () => {
  const sampleTideData: TideDataPoint[] = [
    { time: '00:00', tide: 120 },
    { time: '03:00', tide: 80, type: 'low' as const },
    { time: '06:00', tide: 200, type: 'high' as const },
    { time: '09:00', tide: 150 },
    { time: '12:00', tide: 90, type: 'low' as const },
    { time: '15:00', tide: 180, type: 'high' as const },
    { time: '18:00', tide: 140 },
    { time: '21:00', tide: 110 }
  ];

  return (
    <div style={{ padding: '16px' }}>
      <TideChart
        data={sampleTideData}
        width={800}
        height={400}
        showGrid={true}
        showTooltip={true}
        showMarkers={true}
      />
    </div>
  );
};
```

## アクセシビリティ機能

### ARIA属性

TideChartは以下のARIA属性を自動的に設定します：

- `role="img"`: グラフ全体を画像として認識
- `aria-label`: グラフのタイトル
- `aria-describedby`: グラフの詳細説明（オプション）
- `data-testid="tide-chart"`: テスト用ID

### キーボードナビゲーション

現在、キーボードナビゲーション機能は実装準備段階です（TASK-302完了時点）。

将来的に以下の機能が追加予定：
- `Tab`: グラフへのフォーカス移動
- `ArrowRight/Left`: データポイント間の移動
- `Home/End`: 最初/最後のデータポイントへ移動

## テーマ対応

### ライトテーマ（デフォルト）
```typescript
<TideChart data={data} width={800} height={400} theme="light" />
```

### ダークテーマ
```typescript
<TideChart data={data} width={800} height={400} theme="dark" />
```

### 高コントラストテーマ
```typescript
<TideChart data={data} width={800} height={400} theme="high-contrast" />
```

## レスポンシブ対応

TideChartは固定サイズのコンポーネントですが、親コンテナのサイズに応じてwidth/heightを動的に設定することで、レスポンシブな表示が可能です：

```typescript
import { useState, useEffect } from 'react';

function ResponsiveTideChart({ data }: { data: TideDataPoint[] }) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth > 768 ? 800 : 400;
      const height = window.innerWidth > 768 ? 400 : 200;
      setDimensions({ width, height });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <TideChart
      data={data}
      width={dimensions.width}
      height={dimensions.height}
    />
  );
}
```

## パフォーマンス考慮事項

### データ量の推奨

- **推奨**: 24～48時間分（24～96データポイント）
- **最大**: 7日分（168データポイント）
- **大量データ**: 1000ポイント以上の場合、データ間引きを推奨

### メモ化

大量のデータを扱う場合、親コンポーネントでデータをメモ化することを推奨：

```typescript
import { useMemo } from 'react';

function MyComponent() {
  const tideData = useMemo(() => fetchTideData(), []);

  return <TideChart data={tideData} width={800} height={400} />;
}
```

## トラブルシューティング

### グラフが表示されない

1. `data`配列が空でないか確認
2. `width`/`height`が正の数値か確認
3. 親コンテナに十分なスペースがあるか確認

### データポイントが表示されない

1. `showMarkers={true}`が設定されているか確認
2. `data`配列の各要素が`TideDataPoint`型に準拠しているか確認

### ツールチップが表示されない

1. `showTooltip={true}`が設定されているか確認
2. データポイントにマウスホバーできているか確認

## テスト

### 単体テスト例

```typescript
import { render, screen } from '@testing-library/react';
import { TideChart } from './TideChart';

test('renders TideChart component', () => {
  const data = [
    { time: '00:00', tide: 120 },
    { time: '06:00', tide: 200 },
  ];

  render(<TideChart data={data} width={800} height={400} />);

  const chart = screen.getByTestId('tide-chart');
  expect(chart).toBeInTheDocument();
});
```

### E2Eテスト例

```typescript
import { test, expect } from '@playwright/test';

test('TideChart displays correctly', async ({ page }) => {
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  const chart = page.locator('[data-testid="tide-chart"]');
  await expect(chart).toBeVisible();
});
```

## 関連コンポーネント

### TideGraph

既存のSVGベースの潮位グラフコンポーネント。釣果記録詳細画面で使用されています。

- **TideChart**: 汎用的な潮位グラフ（Recharts）
- **TideGraph**: 釣果記録専用グラフ（SVG）

用途に応じて使い分けてください。

## サポートとフィードバック

問題が発生した場合やフィードバックは、プロジェクトのIssueトラッカーまでお願いします。

## 更新履歴

- **2025-10-11**: 初版作成（TASK-402）
- **2025-10-11**: TASK-303 E2Eテスト完了
- **2025-10-11**: TASK-302 アクセシビリティ対応完了
- **2025-10-11**: TASK-202 基本実装完了

# TASK-101: 動的縦軸スケール調整機能 - テストケース

## テストケース構成

### 1. DynamicScaleCalculator 単体テスト

#### TC-101: 基本的なスケール計算

**テストカテゴリ**: 正常系
**目的**: 標準的な潮位データでスケール計算が正しく動作することを確認

```typescript
describe('DynamicScaleCalculator', () => {
  describe('calculateScale', () => {
    it('should calculate scale for standard tide data', () => {
      const tideData: TideDataPoint[] = [
        { time: '00:00', level: -1.5, state: 'low' },
        { time: '06:00', level: 2.3, state: 'high' },
        { time: '12:00', level: -0.8, state: 'low' },
        { time: '18:00', level: 1.9, state: 'high' }
      ];

      const scale = DynamicScaleCalculator.calculateScale(tideData);

      expect(scale.min).toBeCloseTo(-2.0); // マージン考慮
      expect(scale.max).toBeCloseTo(3.0);  // マージン考慮
      expect(scale.interval).toBe(0.5);    // 範囲約4mなので0.5m間隔
      expect(scale.ticks).toEqual([-2.0, -1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]);
      expect(scale.unit).toBe('m');
    });
  });
});
```

#### TC-102: 狭い範囲データのスケール計算

**テストカテゴリ**: 境界値
**目的**: 潮位差が小さいデータで適切な細かいスケールが適用されることを確認

```typescript
it('should use fine scale for narrow range data', () => {
  const tideData: TideDataPoint[] = [
    { time: '00:00', level: 0.8, state: 'low' },
    { time: '06:00', level: 1.6, state: 'high' },
    { time: '12:00', level: 0.9, state: 'low' },
    { time: '18:00', level: 1.4, state: 'high' }
  ];

  const scale = DynamicScaleCalculator.calculateScale(tideData);

  expect(scale.interval).toBe(0.5); // 狭い範囲なので0.5m間隔
  expect(scale.ticks.length).toBeGreaterThanOrEqual(6);
  expect(scale.ticks.length).toBeLessThanOrEqual(10);
});
```

#### TC-103: 広い範囲データのスケール計算

**テストカテゴリ**: 境界値
**目的**: 潮位差が大きいデータで適切な広いスケールが適用されることを確認

```typescript
it('should use wide scale for large range data', () => {
  const tideData: TideDataPoint[] = [
    { time: '00:00', level: -3.2, state: 'low' },
    { time: '06:00', level: 4.8, state: 'high' },
    { time: '12:00', level: -2.9, state: 'low' },
    { time: '18:00', level: 4.2, state: 'high' }
  ];

  const scale = DynamicScaleCalculator.calculateScale(tideData);

  expect(scale.interval).toBeGreaterThanOrEqual(1.0); // 広い範囲なので1.0m以上の間隔
  expect(scale.ticks.length).toBeGreaterThanOrEqual(6);
  expect(scale.ticks.length).toBeLessThanOrEqual(10);
});
```

#### TC-104: 無効データのフォールバック

**テストカテゴリ**: 異常系
**目的**: 無効なデータに対して安全にフォールバックすることを確認

```typescript
it('should fallback gracefully for invalid data', () => {
  const emptyData: TideDataPoint[] = [];
  const scale1 = DynamicScaleCalculator.calculateScale(emptyData);

  expect(scale1).toEqual({
    min: -2.0,
    max: 2.0,
    interval: 1.0,
    ticks: [-2, -1, 0, 1, 2],
    unit: 'm'
  });

  const invalidData: TideDataPoint[] = [
    { time: '00:00', level: NaN, state: 'low' },
    { time: '06:00', level: Infinity, state: 'high' }
  ];
  const scale2 = DynamicScaleCalculator.calculateScale(invalidData);

  expect(scale2.min).toBeDefined();
  expect(scale2.max).toBeDefined();
  expect(scale2.interval).toBeGreaterThan(0);
});
```

#### TC-105: ゼロ中心データのスケール調整

**テストカテゴリ**: 特殊ケース
**目的**: 平均海面付近のデータでゼロを含むスケールが適用されることを確認

```typescript
it('should include zero in scale for data around mean sea level', () => {
  const tideData: TideDataPoint[] = [
    { time: '00:00', level: -0.5, state: 'low' },
    { time: '06:00', level: 0.8, state: 'high' },
    { time: '12:00', level: -0.3, state: 'low' },
    { time: '18:00', level: 0.6, state: 'high' }
  ];

  const scale = DynamicScaleCalculator.calculateScale(tideData);

  expect(scale.ticks).toContain(0.0);
  expect(scale.min).toBeLessThanOrEqual(0);
  expect(scale.max).toBeGreaterThanOrEqual(0);
});
```

### 2. ScaleRenderer 単体テスト

#### TC-201: SVG座標変換

**テストカテゴリ**: 正常系
**目的**: 潮位値からSVG Y座標への変換が正確に行われることを確認

```typescript
describe('ScaleRenderer', () => {
  describe('levelToSVGY', () => {
    it('should convert tide level to SVG Y coordinate', () => {
      const scale: DynamicScale = {
        min: -2.0,
        max: 2.0,
        interval: 1.0,
        ticks: [-2, -1, 0, 1, 2],
        unit: 'm'
      };
      const svgHeight = 400;

      const renderer = new ScaleRenderer(scale, svgHeight);

      expect(renderer.levelToSVGY(2.0)).toBe(0);     // 最大値はSVG上端
      expect(renderer.levelToSVGY(0.0)).toBe(200);   // 中央値はSVG中央
      expect(renderer.levelToSVGY(-2.0)).toBe(400);  // 最小値はSVG下端
    });
  });
});
```

#### TC-202: 目盛りラベル生成

**テストカテゴリ**: 正常系
**目的**: 目盛りラベルが適切にフォーマットされることを確認

```typescript
it('should generate properly formatted tick labels', () => {
  const scale: DynamicScale = {
    min: -1.5,
    max: 2.5,
    interval: 0.5,
    ticks: [-1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0, 2.5],
    unit: 'm'
  };

  const renderer = new ScaleRenderer(scale, 400);
  const labels = renderer.generateTickLabels();

  expect(labels).toEqual([
    '-1.5m', '-1.0m', '-0.5m', '0.0m', '0.5m', '1.0m', '1.5m', '2.0m', '2.5m'
  ]);
});
```

### 3. TideGraph統合テスト

#### TC-301: 動的スケール統合

**テストカテゴリ**: 統合
**目的**: TideGraphコンポーネントで動的スケールが正常に機能することを確認

```typescript
describe('TideGraph with Dynamic Scale', () => {
  it('should render with dynamic scale', async () => {
    const mockData: TideGraphData = {
      points: [
        { time: '00:00', level: -1.2, state: 'low' },
        { time: '06:00', level: 1.8, state: 'high' },
        { time: '12:00', level: -0.9, state: 'low' },
        { time: '18:00', level: 1.5, state: 'high' }
      ],
      dateRange: { start: new Date(), end: new Date() },
      fishingTime: '06:00',
      state: 'high',
      isEvent: false
    };

    const { container } = render(
      <TideGraph
        data={mockData}
        width={600}
        height={400}
        dynamicScale={true}
      />
    );

    // Y軸目盛りラベルの確認
    const tickLabels = container.querySelectorAll('.y-axis-tick-label');
    expect(tickLabels.length).toBeGreaterThan(5);

    // 適切な範囲でのスケール確認
    const firstLabel = tickLabels[0].textContent;
    const lastLabel = tickLabels[tickLabels.length - 1].textContent;
    expect(firstLabel).toMatch(/-?\d+\.?\d*m/);
    expect(lastLabel).toMatch(/-?\d+\.?\d*m/);
  });
});
```

#### TC-302: レスポンシブとの統合

**テストカテゴリ**: 統合
**目的**: レスポンシブ機能と動的スケールが併用できることを確認

```typescript
it('should work with responsive features', () => {
  const mockData: TideGraphData = {
    // ... テストデータ
  };

  const { container } = render(
    <TideGraph
      data={mockData}
      width={600}
      height={400}
      dynamicScale={true}
      responsiveConfig={{ responsive: true }}
    />
  );

  // SVGビューボックスが適切に設定されていることを確認
  const svg = container.querySelector('svg');
  expect(svg).toHaveAttribute('viewBox');

  // 動的スケールが適用されていることを確認
  const yAxisTicks = container.querySelectorAll('.y-axis-tick');
  expect(yAxisTicks.length).toBeGreaterThan(0);
});
```

### 4. パフォーマンステスト

#### TC-401: スケール計算パフォーマンス

**テストカテゴリ**: パフォーマンス
**目的**: スケール計算が要求性能内で完了することを確認

```typescript
describe('Performance Tests', () => {
  it('should calculate scale within performance threshold', () => {
    const largeDataSet: TideDataPoint[] = Array.from({ length: 288 }, (_, i) => ({
      time: `${Math.floor(i / 12).toString().padStart(2, '0')}:${(i % 12 * 5).toString().padStart(2, '0')}`,
      level: Math.sin(i * Math.PI / 144) * 2 + Math.random() * 0.5,
      state: i % 72 < 36 ? 'rising' : 'falling' as const
    }));

    const startTime = performance.now();
    const scale = DynamicScaleCalculator.calculateScale(largeDataSet);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(10); // 10ms以内
    expect(scale).toBeDefined();
    expect(scale.ticks.length).toBeGreaterThan(0);
  });
});
```

### 5. エッジケーステスト

#### TC-501: 極端な値のテスト

**テストカテゴリ**: 境界値・異常系
**目的**: 極端な潮位値でも安全に動作することを確認

```typescript
describe('Edge Cases', () => {
  it('should handle extreme values safely', () => {
    const extremeData: TideDataPoint[] = [
      { time: '00:00', level: -50.0, state: 'low' },
      { time: '12:00', level: 50.0, state: 'high' }
    ];

    const scale = DynamicScaleCalculator.calculateScale(extremeData);

    expect(scale.min).toBeFinite();
    expect(scale.max).toBeFinite();
    expect(scale.interval).toBeGreaterThan(0);
    expect(scale.ticks.length).toBeGreaterThan(0);
    expect(scale.ticks.length).toBeLessThanOrEqual(20); // 最大目盛り数の制限
  });

  it('should handle single data point', () => {
    const singlePoint: TideDataPoint[] = [
      { time: '12:00', level: 1.5, state: 'high' }
    ];

    const scale = DynamicScaleCalculator.calculateScale(singlePoint);

    expect(scale.ticks).toContain(1.5);
    expect(scale.min).toBeLessThanOrEqual(1.5);
    expect(scale.max).toBeGreaterThanOrEqual(1.5);
  });
});
```

## テスト実行戦略

### 実行順序
1. **単体テスト** → **統合テスト** → **UIテスト** → **パフォーマンステスト**
2. 各レベルでの失敗時は上位レベルの実行を中止
3. エッジケースは各レベルで並行実行

### カバレッジ目標
- **コードカバレッジ**: 90%以上
- **分岐カバレッジ**: 85%以上
- **機能カバレッジ**: 100%

### テストデータ
- **実データベース**: 実際の日本沿岸部の潮位データを使用
- **合成データ**: 境界値・異常値を含む人工的なテストデータ
- **回帰データ**: 既存機能への影響確認用データ

---

**作成日**: 2024-09-25
**更新日**: 2024-09-25
**担当者**: 開発チーム
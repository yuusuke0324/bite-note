# TASK-001: TideGraphレスポンシブ対応 テストケース定義

## 概要

TideGraphコンポーネントのレスポンシブ対応実装に必要なテストケースを網羅的に定義します。

## テスト戦略

### テストピラミッド
- **単体テスト (Unit Tests)**: 70% - 個別ロジックの検証
- **統合テスト (Integration Tests)**: 20% - コンポーネント連携の検証
- **E2Eテスト (End-to-End Tests)**: 10% - ユーザー体験の検証

### テスト環境
- **テストフレームワーク**: Jest
- **コンポーネントテスト**: React Testing Library
- **モック**: ResizeObserver, window.resize
- **ブラウザテスト**: Chrome DevTools Device Emulation

## 単体テスト (Unit Tests)

### UT-001: 画面サイズ検出ロジック

#### UT-001-01: useResizeObserver フックの基本動作
```typescript
describe('useResizeObserver', () => {
  it('should detect initial container width', () => {
    const { result } = renderHook(() => useResizeObserver(mockRef));
    expect(result.current.width).toBe(1200); // デスクトップデフォルト
  });

  it('should update width on resize', async () => {
    const { result } = renderHook(() => useResizeObserver(mockRef));
    act(() => {
      mockResizeObserver.mockResize({ width: 768, height: 1024 });
    });
    await waitFor(() => {
      expect(result.current.width).toBe(768);
    });
  });

  it('should fallback to window.resize when ResizeObserver unavailable', () => {
    global.ResizeObserver = undefined;
    const { result } = renderHook(() => useResizeObserver(mockRef));
    act(() => {
      global.dispatchEvent(new Event('resize'));
    });
    expect(result.current.width).toBeDefined();
  });
});
```

#### UT-001-02: デバイス種別判定
```typescript
describe('detectDeviceType', () => {
  it('should return mobile for width < 768', () => {
    expect(detectDeviceType(767)).toBe('mobile');
    expect(detectDeviceType(320)).toBe('mobile');
  });

  it('should return tablet for width 768-1023', () => {
    expect(detectDeviceType(768)).toBe('tablet');
    expect(detectDeviceType(1023)).toBe('tablet');
  });

  it('should return desktop for width >= 1024', () => {
    expect(detectDeviceType(1024)).toBe('desktop');
    expect(detectDeviceType(1920)).toBe('desktop');
  });
});
```

### UT-002: SVG寸法計算ロジック

#### UT-002-01: 動的ビューボックス計算
```typescript
describe('calculateSVGDimensions', () => {
  it('should calculate correct viewBox for mobile', () => {
    const dimensions = calculateSVGDimensions({
      containerWidth: 375,
      aspectRatio: 16/9,
      deviceType: 'mobile'
    });

    expect(dimensions).toEqual({
      viewBoxWidth: 375,
      viewBoxHeight: 211, // 375 / (16/9)
      containerWidth: 375,
      containerHeight: 211,
      scaleFactor: 1
    });
  });

  it('should respect maximum width constraints', () => {
    const dimensions = calculateSVGDimensions({
      containerWidth: 2000,
      aspectRatio: 16/9,
      deviceType: 'desktop',
      maxWidth: 1200
    });

    expect(dimensions.viewBoxWidth).toBeLessThanOrEqual(1200);
  });

  it('should maintain aspect ratio', () => {
    const aspectRatio = 16/9;
    const dimensions = calculateSVGDimensions({
      containerWidth: 800,
      aspectRatio,
      deviceType: 'tablet'
    });

    const calculatedRatio = dimensions.viewBoxWidth / dimensions.viewBoxHeight;
    expect(calculatedRatio).toBeCloseTo(aspectRatio, 2);
  });
});
```

#### UT-002-02: 最小幅制限
```typescript
describe('minimum width constraints', () => {
  it('should enforce minimum width of 320px', () => {
    const dimensions = calculateSVGDimensions({
      containerWidth: 280,
      aspectRatio: 16/9,
      deviceType: 'mobile'
    });

    expect(dimensions.viewBoxWidth).toBeGreaterThanOrEqual(320);
  });

  it('should adjust height proportionally for minimum width', () => {
    const dimensions = calculateSVGDimensions({
      containerWidth: 280,
      aspectRatio: 16/9,
      deviceType: 'mobile'
    });

    expect(dimensions.viewBoxHeight).toBe(320 / (16/9));
  });
});
```

### UT-003: アスペクト比維持ロジック

#### UT-003-01: アスペクト比計算
```typescript
describe('aspect ratio maintenance', () => {
  it('should maintain 16:9 aspect ratio by default', () => {
    const config = createResponsiveConfig({ aspectRatio: 16/9 });
    expect(config.aspectRatio).toBe(16/9);
  });

  it('should allow custom aspect ratios', () => {
    const config = createResponsiveConfig({ aspectRatio: 4/3 });
    expect(config.aspectRatio).toBe(4/3);
  });

  it('should calculate height from width and aspect ratio', () => {
    const height = calculateHeightFromAspectRatio(800, 16/9);
    expect(height).toBeCloseTo(450, 0);
  });
});
```

### UT-004: CSS スタイル生成

#### UT-004-01: レスポンシブCSS生成
```typescript
describe('generateResponsiveCSS', () => {
  it('should generate mobile-first CSS', () => {
    const css = generateResponsiveCSS({
      responsive: true,
      maxWidth: '100%',
      preventHorizontalScroll: true
    });

    expect(css).toContain('max-width: 100%');
    expect(css).toContain('overflow-x: hidden');
    expect(css).toContain('width: 100%');
  });

  it('should include media queries for breakpoints', () => {
    const css = generateResponsiveCSS({
      responsive: true,
      breakpoints: { mobile: 480, tablet: 768, desktop: 1024 }
    });

    expect(css).toContain('@media (min-width: 480px)');
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).toContain('@media (min-width: 1024px)');
  });
});
```

### UT-005: エラーハンドリング

#### UT-005-01: 不正な値の処理
```typescript
describe('error handling', () => {
  it('should handle zero width gracefully', () => {
    const dimensions = calculateSVGDimensions({
      containerWidth: 0,
      aspectRatio: 16/9,
      deviceType: 'mobile'
    });

    expect(dimensions.viewBoxWidth).toBe(320); // minimum width
  });

  it('should handle negative dimensions', () => {
    const dimensions = calculateSVGDimensions({
      containerWidth: -100,
      aspectRatio: 16/9,
      deviceType: 'mobile'
    });

    expect(dimensions.viewBoxWidth).toBeGreaterThan(0);
  });

  it('should handle invalid aspect ratio', () => {
    const dimensions = calculateSVGDimensions({
      containerWidth: 800,
      aspectRatio: 0,
      deviceType: 'tablet'
    });

    expect(dimensions.aspectRatio).toBe(16/9); // fallback
  });
});
```

## 統合テスト (Integration Tests)

### IT-001: TideGraphコンポーネント統合

#### IT-001-01: レスポンシブプロパティの統合
```typescript
describe('TideGraph responsive integration', () => {
  it('should render with responsive props', () => {
    const responsiveConfig = {
      responsive: true,
      maxWidth: '100%',
      aspectRatio: 16/9,
      preventHorizontalScroll: true
    };

    render(
      <TideGraph
        tideInfo={mockTideInfo}
        responsiveConfig={responsiveConfig}
      />
    );

    const svg = screen.getByRole('img');
    expect(svg).toHaveStyle('max-width: 100%');
    expect(svg).toHaveStyle('width: 100%');
  });
});
```

#### IT-001-02: 画面サイズ変更時の再描画
```typescript
describe('screen resize behavior', () => {
  it('should redraw on window resize', async () => {
    const { rerender } = render(<TideGraph tideInfo={mockTideInfo} />);

    // 初期サイズ確認
    expect(screen.getByTestId('tide-svg')).toHaveAttribute('viewBox', '0 0 1200 675');

    // 画面サイズ変更
    act(() => {
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('tide-svg')).toHaveAttribute('viewBox', '0 0 768 432');
    });
  });
});
```

### IT-002: ブレークポイント統合テスト

#### IT-002-01: モバイルブレークポイント
```typescript
describe('mobile breakpoint integration', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 375 });
  });

  it('should apply mobile styles and layout', () => {
    render(<TideGraph tideInfo={mockTideInfo} />);

    const container = screen.getByTestId('tide-graph-container');
    expect(container).toHaveClass('mobile-layout');

    const svg = screen.getByTestId('tide-svg');
    expect(svg).toHaveAttribute('viewBox', expect.stringContaining('375'));
  });

  it('should have readable text sizes on mobile', () => {
    render(<TideGraph tideInfo={mockTideInfo} />);

    const labels = screen.getAllByTestId('axis-label');
    labels.forEach(label => {
      const fontSize = window.getComputedStyle(label).fontSize;
      expect(parseInt(fontSize)).toBeGreaterThanOrEqual(12);
    });
  });
});
```

#### IT-002-02: タブレット・デスクトップブレークポイント
```typescript
describe('tablet and desktop breakpoints', () => {
  it('should optimize for tablet screens (768px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768 });
    render(<TideGraph tideInfo={mockTideInfo} />);

    const container = screen.getByTestId('tide-graph-container');
    expect(container).toHaveClass('tablet-layout');
  });

  it('should maximize desktop screen usage (1024px+)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200 });
    render(<TideGraph tideInfo={mockTideInfo} />);

    const svg = screen.getByTestId('tide-svg');
    const viewBox = svg.getAttribute('viewBox');
    expect(viewBox).toContain('1200');
  });
});
```

### IT-003: 横スクロール防止テスト

#### IT-003-01: オーバーフロー制御
```typescript
describe('horizontal scroll prevention', () => {
  it('should never exceed container width', () => {
    const containerWidth = 320;
    Object.defineProperty(window, 'innerWidth', { value: containerWidth });

    render(<TideGraph tideInfo={mockTideInfo} />);

    const svg = screen.getByTestId('tide-svg');
    const svgWidth = svg.getBoundingClientRect().width;
    expect(svgWidth).toBeLessThanOrEqual(containerWidth);
  });

  it('should apply overflow-x: hidden to container', () => {
    render(<TideGraph tideInfo={mockTideInfo} />);

    const container = screen.getByTestId('tide-graph-container');
    expect(container).toHaveStyle('overflow-x: hidden');
  });
});
```

## E2Eテスト (End-to-End Tests)

### E2E-001: デバイス体験テスト

#### E2E-001-01: スマートフォン体験
```typescript
describe('smartphone user experience', () => {
  beforeEach(async () => {
    await page.setViewport({ width: 375, height: 667 }); // iPhone SE
  });

  it('should display readable tide graph without horizontal scroll', async () => {
    await page.goto('/fishing-record/123');

    // 横スクロールバーが表示されないことを確認
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);

    // グラフの可読性確認
    const tideGraph = await page.waitForSelector('[data-testid="tide-svg"]');
    const boundingBox = await tideGraph.boundingBox();
    expect(boundingBox.width).toBeLessThanOrEqual(375);
  });

  it('should support touch interactions on mobile', async () => {
    await page.goto('/fishing-record/123');

    // タッチでツールチップ表示
    const graphArea = await page.waitForSelector('[data-testid="tide-curve"]');
    await graphArea.tap();

    const tooltip = await page.waitForSelector('[data-testid="tide-tooltip"]');
    expect(tooltip).toBeTruthy();
  });
});
```

#### E2E-001-02: タブレット・デスクトップ体験
```typescript
describe('tablet and desktop experience', () => {
  it('should optimize for iPad layout', async () => {
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto('/fishing-record/123');

    const tideGraph = await page.waitForSelector('[data-testid="tide-svg"]');
    const boundingBox = await tideGraph.boundingBox();

    // タブレットでは画面を効率的に使用
    expect(boundingBox.width).toBeGreaterThan(600);
    expect(boundingBox.width).toBeLessThanOrEqual(768);
  });

  it('should maximize desktop screen real estate', async () => {
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto('/fishing-record/123');

    const tideGraph = await page.waitForSelector('[data-testid="tide-svg"]');
    const boundingBox = await tideGraph.boundingBox();

    // デスクトップでは大きくても読みやすい表示
    expect(boundingBox.width).toBeGreaterThan(800);
  });
});
```

### E2E-002: 画面回転・ズーム対応

#### E2E-002-01: 画面回転テスト
```typescript
describe('screen orientation changes', () => {
  it('should adapt to portrait/landscape changes', async () => {
    // 縦向きで開始
    await page.setViewport({ width: 375, height: 667 });
    await page.goto('/fishing-record/123');

    let tideGraph = await page.waitForSelector('[data-testid="tide-svg"]');
    const portraitBox = await tideGraph.boundingBox();

    // 横向きに回転
    await page.setViewport({ width: 667, height: 375 });
    await page.waitForTimeout(300); // 回転アニメーション待機

    tideGraph = await page.waitForSelector('[data-testid="tide-svg"]');
    const landscapeBox = await tideGraph.boundingBox();

    // 横向きでは幅が増加し、高さが減少
    expect(landscapeBox.width).toBeGreaterThan(portraitBox.width);
    expect(landscapeBox.height).toBeLessThan(portraitBox.height);
  });
});
```

#### E2E-002-02: ブラウザズーム対応
```typescript
describe('browser zoom compatibility', () => {
  it('should maintain usability at 200% zoom', async () => {
    await page.goto('/fishing-record/123');
    await page.setViewport({ width: 375, height: 667 });

    // 200%ズーム
    await page.evaluate(() => {
      document.body.style.zoom = '2';
    });

    // グラフが表示範囲内に収まること
    const tideGraph = await page.waitForSelector('[data-testid="tide-svg"]');
    const boundingBox = await tideGraph.boundingBox();

    // ズームしても横スクロールが発生しない
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });
});
```

## パフォーマンステスト

### PERF-001: レンダリング性能

#### PERF-001-01: 初期レンダリング時間
```typescript
describe('rendering performance', () => {
  it('should render within 200ms', async () => {
    const startTime = performance.now();

    render(<TideGraph tideInfo={mockTideInfo} />);
    await screen.findByTestId('tide-svg');

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(200);
  });
});
```

#### PERF-001-02: リサイズ応答性能
```typescript
describe('resize response performance', () => {
  it('should respond to resize within 100ms', async () => {
    const { rerender } = render(<TideGraph tideInfo={mockTideInfo} />);

    const startTime = performance.now();

    act(() => {
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('tide-svg')).toHaveAttribute('viewBox', expect.stringContaining('768'));
    });

    const endTime = performance.now();
    const resizeTime = endTime - startTime;

    expect(resizeTime).toBeLessThan(100);
  });
});
```

## アクセシビリティテスト

### A11Y-001: スクリーンリーダー対応

#### A11Y-001-01: ARIA属性とラベル
```typescript
describe('screen reader accessibility', () => {
  it('should provide proper ARIA labels', () => {
    render(<TideGraph tideInfo={mockTideInfo} />);

    const svg = screen.getByTestId('tide-svg');
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('aria-label', expect.stringContaining('潮汐グラフ'));
  });

  it('should have descriptive text for data points', () => {
    render(<TideGraph tideInfo={mockTideInfo} />);

    const dataPoints = screen.getAllByTestId('tide-data-point');
    dataPoints.forEach(point => {
      expect(point).toHaveAttribute('aria-label');
    });
  });
});
```

### A11Y-002: キーボードナビゲーション
```typescript
describe('keyboard navigation', () => {
  it('should support tab navigation through interactive elements', async () => {
    render(<TideGraph tideInfo={mockTideInfo} />);

    const interactiveElements = screen.getAllByRole('button');

    // Tab でナビゲート
    userEvent.tab();
    expect(interactiveElements[0]).toHaveFocus();

    userEvent.tab();
    expect(interactiveElements[1]).toHaveFocus();
  });
});
```

## モックとフィクスチャ

### テストデータ
```typescript
export const mockTideInfo: TideInfo = {
  date: new Date('2024-09-25T12:00:00'),
  location: { latitude: 33.9583, longitude: 131.0047 },
  harmonicConstants: [
    { name: 'M2', amplitude: 1.2, phase: 45 },
    { name: 'S2', amplitude: 0.8, phase: 90 },
    { name: 'K1', amplitude: 0.6, phase: 120 },
    { name: 'O1', amplitude: 0.4, phase: 180 }
  ],
  tideEvents: mockTideEvents,
  tideType: 'mixed'
};

export const mockResponsiveConfig: ResponsiveGraphConfig = {
  responsive: true,
  maxWidth: '100%',
  aspectRatio: 16/9,
  breakpoints: { mobile: 480, tablet: 768, desktop: 1024 },
  preventHorizontalScroll: true
};
```

## テスト実行計画

### 1. 開発中テスト
```bash
npm run test:watch -- TideGraph
```

### 2. 統合テスト
```bash
npm run test:integration
```

### 3. E2Eテスト
```bash
npm run test:e2e -- --spec="**/tide-graph-responsive.spec.ts"
```

### 4. 全テストスイート
```bash
npm run test:all
```

## 完了基準

### 必須テスト項目
- [ ] 単体テスト: 画面サイズ検出 (5テスト)
- [ ] 単体テスト: SVG寸法計算 (8テスト)
- [ ] 単体テスト: アスペクト比維持 (3テスト)
- [ ] 単体テスト: エラーハンドリング (3テスト)
- [ ] 統合テスト: レスポンシブ統合 (6テスト)
- [ ] 統合テスト: 横スクロール防止 (2テスト)
- [ ] E2Eテスト: デバイス体験 (4テスト)
- [ ] パフォーマンステスト: レンダリング (2テスト)
- [ ] アクセシビリティテスト: A11Y対応 (3テスト)

### 成功基準
- [ ] 全テストケースが通過する
- [ ] テストカバレッジが95%以上
- [ ] E2Eテストで横スクロールが発生しない
- [ ] パフォーマンステストで200ms以内のレンダリング
- [ ] アクセシビリティテストで基準を満たす

---

**作成日**: 2024-09-25
**テスト実装ターゲット**: TASK-001 Step 3
**総テストケース数**: 36項目
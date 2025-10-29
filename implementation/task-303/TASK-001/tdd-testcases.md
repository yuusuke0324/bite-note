# TASK-001: レスポンシブユーティリティ実装 - テストケース

## テスト戦略

TDD（テスト駆動開発）に基づき、各ユーティリティの単体テストから統合テストまで網羅的にテストする。
特に軸ラベル表示保証に関わる境界値とエッジケースを重点的にテストする。

## ViewportDetector テストケース

### VD-001: 基本的なビューポート検出

```typescript
describe('ViewportDetector', () => {
  describe('getCurrentViewport', () => {
    test('should detect mobile viewport correctly', () => {
      // Given: モバイルサイズのビューポート
      mockWindowSize(375, 667);

      // When: ビューポート情報を取得
      const viewport = detector.getCurrentViewport();

      // Then: モバイルデバイスとして正しく検出
      expect(viewport).toEqual({
        width: 375,
        height: 667,
        deviceType: 'mobile',
        orientation: 'portrait',
        pixelRatio: expect.any(Number)
      });
    });

    test('should detect tablet viewport correctly', () => {
      // Given: タブレットサイズのビューポート
      mockWindowSize(768, 1024);

      // When: ビューポート情報を取得
      const viewport = detector.getCurrentViewport();

      // Then: タブレットデバイスとして正しく検出
      expect(viewport).toEqual({
        width: 768,
        height: 1024,
        deviceType: 'tablet',
        orientation: 'portrait',
        pixelRatio: expect.any(Number)
      });
    });

    test('should detect desktop viewport correctly', () => {
      // Given: デスクトップサイズのビューポート
      mockWindowSize(1920, 1080);

      // When: ビューポート情報を取得
      const viewport = detector.getCurrentViewport();

      // Then: デスクトップデバイスとして正しく検出
      expect(viewport).toEqual({
        width: 1920,
        height: 1080,
        deviceType: 'desktop',
        orientation: 'landscape',
        pixelRatio: expect.any(Number)
      });
    });
  });
});
```

### VD-002: 境界値テスト

```typescript
describe('viewport boundary detection', () => {
  test('should detect 320px as mobile', () => {
    mockWindowSize(320, 568);
    expect(detector.getCurrentViewport().deviceType).toBe('mobile');
  });

  test('should detect 767px as mobile', () => {
    mockWindowSize(767, 1024);
    expect(detector.getCurrentViewport().deviceType).toBe('mobile');
  });

  test('should detect 768px as tablet', () => {
    mockWindowSize(768, 1024);
    expect(detector.getCurrentViewport().deviceType).toBe('tablet');
  });

  test('should detect 1023px as tablet', () => {
    mockWindowSize(1023, 768);
    expect(detector.getCurrentViewport().deviceType).toBe('tablet');
  });

  test('should detect 1024px as desktop', () => {
    mockWindowSize(1024, 768);
    expect(detector.getCurrentViewport().deviceType).toBe('desktop');
  });
});
```

### VD-003: 画面向きテスト

```typescript
describe('orientation detection', () => {
  test('should detect portrait orientation', () => {
    mockWindowSize(375, 812); // width < height
    expect(detector.getCurrentViewport().orientation).toBe('portrait');
  });

  test('should detect landscape orientation', () => {
    mockWindowSize(812, 375); // width > height
    expect(detector.getCurrentViewport().orientation).toBe('landscape');
  });

  test('should handle square aspect ratio', () => {
    mockWindowSize(600, 600); // width === height
    expect(detector.getCurrentViewport().orientation).toBe('portrait'); // デフォルト
  });
});
```

### VD-004: リサイズイベントテスト

```typescript
describe('viewport change detection', () => {
  test('should call callback on viewport change', () => {
    const callback = jest.fn();
    const unsubscribe = detector.onViewportChange(callback);

    // Given: 初期状態
    mockWindowSize(375, 667);

    // When: 画面サイズが変更
    mockWindowSize(768, 1024);
    fireResizeEvent();

    // Then: コールバックが呼ばれる
    expect(callback).toHaveBeenCalledWith({
      width: 768,
      height: 1024,
      deviceType: 'tablet',
      orientation: 'portrait',
      pixelRatio: expect.any(Number)
    });

    unsubscribe();
  });

  test('should not call callback after unsubscribe', () => {
    const callback = jest.fn();
    const unsubscribe = detector.onViewportChange(callback);

    unsubscribe();

    mockWindowSize(1920, 1080);
    fireResizeEvent();

    expect(callback).not.toHaveBeenCalled();
  });
});
```

## SVGSizeCalculator テストケース

### SSC-001: 基本的なサイズ計算

```typescript
describe('SVGSizeCalculator', () => {
  describe('calculateSize', () => {
    test('should calculate size for mobile viewport', () => {
      // Given: モバイルビューポート
      const viewport: ViewportInfo = {
        width: 375,
        height: 667,
        deviceType: 'mobile',
        orientation: 'portrait',
        pixelRatio: 2
      };

      // When: サイズを計算
      const result = calculator.calculateSize(viewport);

      // Then: 適切なサイズが計算される
      expect(result).toEqual({
        containerWidth: expect.any(Number),
        containerHeight: expect.any(Number),
        chartWidth: expect.any(Number),
        chartHeight: expect.any(Number),
        margins: expect.objectContaining({
          top: expect.any(Number),
          right: expect.any(Number),
          bottom: expect.any(Number),
          left: expect.any(Number)
        }),
        scaleFactor: expect.any(Number),
        isMinimumSize: expect.any(Boolean)
      });
    });
  });
});
```

### SSC-002: 最小サイズ保証テスト

```typescript
describe('minimum size guarantee', () => {
  test('should enforce minimum width of 600px', () => {
    const viewport: ViewportInfo = {
      width: 320, // 最小幅未満
      height: 568,
      deviceType: 'mobile',
      orientation: 'portrait',
      pixelRatio: 2
    };

    const result = calculator.calculateSize(viewport);

    expect(result.containerWidth).toBeGreaterThanOrEqual(600);
    expect(result.isMinimumSize).toBe(true);
  });

  test('should enforce minimum height of 300px', () => {
    const viewport: ViewportInfo = {
      width: 800,
      height: 200, // 最小高さ未満
      deviceType: 'tablet',
      orientation: 'landscape',
      pixelRatio: 1
    };

    const result = calculator.calculateSize(viewport);

    expect(result.containerHeight).toBeGreaterThanOrEqual(300);
    expect(result.isMinimumSize).toBe(true);
  });

  test('should not enforce minimum for large screens', () => {
    const viewport: ViewportInfo = {
      width: 1920,
      height: 1080,
      deviceType: 'desktop',
      orientation: 'landscape',
      pixelRatio: 1
    };

    const result = calculator.calculateSize(viewport);

    expect(result.isMinimumSize).toBe(false);
  });
});
```

### SSC-003: アスペクト比テスト

```typescript
describe('aspect ratio maintenance', () => {
  test('should maintain 2:1 aspect ratio', () => {
    const viewport: ViewportInfo = {
      width: 800,
      height: 600,
      deviceType: 'tablet',
      orientation: 'landscape',
      pixelRatio: 1
    };

    const result = calculator.calculateSize(viewport);

    const aspectRatio = result.containerWidth / result.containerHeight;
    expect(aspectRatio).toBeCloseTo(2.0, 1);
  });

  test('should adjust height when width is constrained', () => {
    const viewport: ViewportInfo = {
      width: 600, // 最小幅
      height: 800,
      deviceType: 'mobile',
      orientation: 'portrait',
      pixelRatio: 1
    };

    const result = calculator.calculateSize(viewport);

    expect(result.containerWidth).toBe(600);
    expect(result.containerHeight).toBe(300); // 600 / 2
  });
});
```

## MarginCalculator テストケース

### MC-001: 基本的なマージン計算

```typescript
describe('MarginCalculator', () => {
  describe('calculateMargins', () => {
    test('should calculate margins for mobile device', () => {
      // Given: モバイルSVGサイズ
      const svgSize = { width: 600, height: 300 };
      const deviceType = 'mobile';

      // When: マージンを計算
      const margins = calculator.calculateMargins(svgSize, deviceType);

      // Then: 適切なマージンが計算される
      expect(margins).toEqual({
        top: expect.any(Number),
        right: expect.any(Number),
        bottom: expect.any(Number),
        left: expect.any(Number)
      });
    });
  });
});
```

### MC-002: 最小マージン保証テスト

```typescript
describe('minimum margin guarantee', () => {
  test('should enforce minimum bottom margin of 40px for X-axis', () => {
    const svgSize = { width: 600, height: 300 };
    const deviceType = 'mobile';

    const margins = calculator.calculateMargins(svgSize, deviceType);

    expect(margins.bottom).toBeGreaterThanOrEqual(40);
  });

  test('should enforce minimum left margin of 60px for Y-axis', () => {
    const svgSize = { width: 600, height: 300 };
    const deviceType = 'mobile';

    const margins = calculator.calculateMargins(svgSize, deviceType);

    expect(margins.left).toBeGreaterThanOrEqual(60);
  });

  test('should scale margins proportionally for larger screens', () => {
    const smallSize = { width: 600, height: 300 };
    const largeSize = { width: 1200, height: 600 };

    const smallMargins = calculator.calculateMargins(smallSize, 'mobile');
    const largeMargins = calculator.calculateMargins(largeSize, 'desktop');

    // 大きい画面では比例的にマージンも大きくなる
    expect(largeMargins.bottom).toBeGreaterThan(smallMargins.bottom);
    expect(largeMargins.left).toBeGreaterThan(smallMargins.left);
  });
});
```

### MC-003: デバイス別マージン最適化テスト

```typescript
describe('device-specific margin optimization', () => {
  test('should use smaller margins for mobile', () => {
    const svgSize = { width: 600, height: 300 };

    const mobileMargins = calculator.calculateMargins(svgSize, 'mobile');
    const desktopMargins = calculator.calculateMargins(svgSize, 'desktop');

    // モバイルではよりコンパクトなマージン
    expect(mobileMargins.top).toBeLessThanOrEqual(desktopMargins.top);
    expect(mobileMargins.right).toBeLessThanOrEqual(desktopMargins.right);
  });

  test('should provide generous margins for desktop', () => {
    const svgSize = { width: 1200, height: 600 };

    const desktopMargins = calculator.calculateMargins(svgSize, 'desktop');

    // デスクトップでは余裕のあるマージン
    expect(desktopMargins.bottom).toBeGreaterThanOrEqual(50);
    expect(desktopMargins.left).toBeGreaterThanOrEqual(80);
  });
});
```

## 統合テストケース

### IT-001: ユーティリティ連携テスト

```typescript
describe('Utilities Integration', () => {
  test('should work together to calculate chart layout', () => {
    // Given: レスポンシブユーティリティセット
    const viewport = detector.getCurrentViewport();
    const sizeCalculation = sizeCalculator.calculateSize(viewport);
    const margins = marginCalculator.calculateMargins(
      { width: sizeCalculation.containerWidth, height: sizeCalculation.containerHeight },
      viewport.deviceType
    );

    // Then: 一貫した計算結果
    expect(sizeCalculation.margins).toEqual(margins);
    expect(sizeCalculation.chartWidth).toBe(
      sizeCalculation.containerWidth - margins.left - margins.right
    );
    expect(sizeCalculation.chartHeight).toBe(
      sizeCalculation.containerHeight - margins.top - margins.bottom
    );
  });
});
```

### IT-002: リアルタイム更新テスト

```typescript
describe('Real-time updates', () => {
  test('should recalculate on viewport change', () => {
    const results: SVGSizeCalculation[] = [];

    detector.onViewportChange((viewport) => {
      const calculation = sizeCalculator.calculateSize(viewport);
      results.push(calculation);
    });

    // 画面サイズ変更
    mockWindowSize(375, 667); // mobile
    fireResizeEvent();

    mockWindowSize(768, 1024); // tablet
    fireResizeEvent();

    mockWindowSize(1920, 1080); // desktop
    fireResizeEvent();

    expect(results).toHaveLength(3);
    expect(results[0].containerWidth).toBeLessThan(results[1].containerWidth);
    expect(results[1].containerWidth).toBeLessThan(results[2].containerWidth);
  });
});
```

## エラーケーステスト

### EC-001: 異常値処理テスト

```typescript
describe('Error cases', () => {
  test('should handle zero viewport size', () => {
    mockWindowSize(0, 0);

    expect(() => {
      detector.getCurrentViewport();
    }).not.toThrow();

    const viewport = detector.getCurrentViewport();
    expect(viewport.deviceType).toBe('mobile'); // デフォルト
  });

  test('should handle negative viewport size', () => {
    mockWindowSize(-100, -200);

    const viewport = detector.getCurrentViewport();
    expect(viewport.width).toBeGreaterThan(0);
    expect(viewport.height).toBeGreaterThan(0);
  });

  test('should handle extremely large viewport', () => {
    mockWindowSize(10000, 8000);

    const viewport = detector.getCurrentViewport();
    const calculation = sizeCalculator.calculateSize(viewport);

    // 極大画面でも適切に処理
    expect(calculation.containerWidth).toBeLessThanOrEqual(viewport.width * 0.9);
  });
});
```

## パフォーマンステスト

### PT-001: 計算性能テスト

```typescript
describe('Performance', () => {
  test('should calculate size within 10ms', () => {
    const viewport: ViewportInfo = {
      width: 1920,
      height: 1080,
      deviceType: 'desktop',
      orientation: 'landscape',
      pixelRatio: 1
    };

    const startTime = performance.now();
    sizeCalculator.calculateSize(viewport);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(10);
  });

  test('should handle rapid resize events efficiently', () => {
    const callback = jest.fn();
    detector.onViewportChange(callback);

    // 短時間で複数回リサイズ
    for (let i = 0; i < 100; i++) {
      mockWindowSize(800 + i, 600);
      fireResizeEvent();
    }

    // デバウンス処理により呼び出し回数が制限される
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
```

## テストユーティリティ

### テストヘルパー関数

```typescript
// テストヘルパー
function mockWindowSize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
}

function fireResizeEvent() {
  window.dispatchEvent(new Event('resize'));
}
```

## テスト実行計画

### 実行順序
1. ViewportDetector単体テスト
2. SVGSizeCalculator単体テスト
3. MarginCalculator単体テスト
4. 統合テスト
5. エラーケーステスト
6. パフォーマンステスト

### 合格基準
- 全テストケース合格
- コードカバレッジ90%以上
- パフォーマンス要件クリア
- エラーハンドリング完備

---

**作成日**: 2025-09-28
**テストケース数**: 35件
**推定実行時間**: 30秒
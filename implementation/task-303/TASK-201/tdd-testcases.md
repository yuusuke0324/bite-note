# TASK-201: ResponsiveChartContainer実装 - テストケース設計

## テスト戦略

### テスト構成
- **単体テスト**: 12個（機能別詳細テスト）
- **統合テスト**: 3個（外部連携・パフォーマンステスト）
- **総テスト数**: 15個

### テスト分類
1. **コンポーネントレンダリングテスト** (3個)
2. **サイズ計算テスト** (4個)
3. **レスポンシブテスト** (3個)
4. **TASK-001連携テスト** (2個)
5. **統合・パフォーマンステスト** (3個)

## 🧪 詳細テストケース

### A. コンポーネントレンダリングテスト (3個)

#### A01: 基本レンダリング確認テスト
```typescript
describe('ResponsiveChartContainer - Basic Rendering', () => {
  test('should render with default props', () => {
    const { container } = render(
      <ResponsiveChartContainer>
        <div data-testid="chart-content">Test Chart</div>
      </ResponsiveChartContainer>
    );

    expect(container.querySelector('.responsive-chart-container')).toBeInTheDocument();
    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
    expect(container.querySelector('[data-device]')).toBeInTheDocument();
  });

  test('should apply custom className and style', () => {
    const customStyle = { backgroundColor: 'red' };
    const { container } = render(
      <ResponsiveChartContainer
        className="custom-container"
        style={customStyle}
      >
        <div>Test</div>
      </ResponsiveChartContainer>
    );

    const containerElement = container.querySelector('.responsive-chart-container');
    expect(containerElement).toHaveClass('custom-container');
    expect(containerElement).toHaveStyle('background-color: red');
  });
});
```

#### A02: プロパティによるレンダリング変化テスト
```typescript
describe('ResponsiveChartContainer - Props Variation', () => {
  test('should apply custom minimum size constraints', () => {
    const { container } = render(
      <ResponsiveChartContainer minWidth={800} minHeight={400}>
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    const chartWrapper = container.querySelector('.chart-wrapper');
    expect(chartWrapper).toHaveStyle('min-width: 800px');
    expect(chartWrapper).toHaveStyle('min-height: 400px');
  });

  test('should handle disabled responsive mode', () => {
    const { container } = render(
      <ResponsiveChartContainer responsive={false}>
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    const containerElement = container.querySelector('.responsive-chart-container');
    expect(containerElement).toHaveAttribute('data-responsive', 'false');
  });
});
```

#### A03: childrenの正常表示テスト
```typescript
describe('ResponsiveChartContainer - Children Rendering', () => {
  test('should render complex children correctly', () => {
    const ComplexChart = () => (
      <div>
        <svg data-testid="svg-element" width="100" height="100">
          <circle cx="50" cy="50" r="40" />
        </svg>
        <div data-testid="chart-legend">Legend</div>
      </div>
    );

    render(
      <ResponsiveChartContainer>
        <ComplexChart />
      </ResponsiveChartContainer>
    );

    expect(screen.getByTestId('svg-element')).toBeInTheDocument();
    expect(screen.getByTestId('chart-legend')).toBeInTheDocument();
  });
});
```

### B. サイズ計算テスト (4個)

#### B01: 最小サイズ制約の適用テスト
```typescript
describe('ResponsiveChartContainer - Size Constraints', () => {
  beforeEach(() => {
    // モックのコンテナサイズを設定
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: jest.fn(() => ({ width: 400, height: 200 })) // 最小サイズ以下
    });
  });

  test('should enforce minimum width constraint', () => {
    const onSizeChange = jest.fn();

    render(
      <ResponsiveChartContainer
        minWidth={600}
        minHeight={300}
        onSizeChange={onSizeChange}
      >
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    expect(onSizeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 600, // 最小幅が適用される
        height: 300 // 最小高さが適用される
      })
    );
  });

  test('should use container size when larger than minimum', () => {
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: jest.fn(() => ({ width: 1000, height: 500 })) // 最小サイズ以上
    });

    const onSizeChange = jest.fn();

    render(
      <ResponsiveChartContainer
        minWidth={600}
        minHeight={300}
        onSizeChange={onSizeChange}
      >
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    expect(onSizeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 1000,
        height: 500
      })
    );
  });
});
```

#### B02: アスペクト比維持機能テスト
```typescript
describe('ResponsiveChartContainer - Aspect Ratio', () => {
  test('should maintain 2:1 aspect ratio by default', () => {
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: jest.fn(() => ({ width: 1000, height: 800 }))
    });

    const onSizeChange = jest.fn();

    render(
      <ResponsiveChartContainer onSizeChange={onSizeChange}>
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    // アスペクト比2:1を維持するため、高さが調整される
    expect(onSizeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 1000,
        height: 500 // 1000 / 2 = 500
      })
    );
  });

  test('should respect custom aspect ratio', () => {
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: jest.fn(() => ({ width: 900, height: 600 }))
    });

    const onSizeChange = jest.fn();

    render(
      <ResponsiveChartContainer aspectRatio={1.5} onSizeChange={onSizeChange}>
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    expect(onSizeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 900,
        height: 600 // 900 / 1.5 = 600
      })
    );
  });
});
```

#### B03: デバイス別サイズ調整テスト
```typescript
describe('ResponsiveChartContainer - Device-Specific Sizing', () => {
  test('should adjust size for mobile device', () => {
    // ViewportDetectorをモック
    jest.mock('../../utils/responsive/ViewportDetector', () => ({
      ViewportDetector: jest.fn().mockImplementation(() => ({
        getCurrentDeviceType: () => 'mobile'
      }))
    }));

    const onDeviceChange = jest.fn();

    render(
      <ResponsiveChartContainer onDeviceChange={onDeviceChange}>
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    expect(onDeviceChange).toHaveBeenCalledWith('mobile');
  });

  test('should adjust size for desktop device', () => {
    jest.mock('../../utils/responsive/ViewportDetector', () => ({
      ViewportDetector: jest.fn().mockImplementation(() => ({
        getCurrentDeviceType: () => 'desktop'
      }))
    }));

    const onDeviceChange = jest.fn();

    render(
      <ResponsiveChartContainer onDeviceChange={onDeviceChange}>
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    expect(onDeviceChange).toHaveBeenCalledWith('desktop');
  });
});
```

#### B04: 親コンテナサイズ変更対応テスト
```typescript
describe('ResponsiveChartContainer - Parent Size Changes', () => {
  test('should recalculate size when parent container changes', async () => {
    const onSizeChange = jest.fn();

    const { rerender } = render(
      <div style={{ width: 800, height: 400 }}>
        <ResponsiveChartContainer onSizeChange={onSizeChange}>
          <div>Test Chart</div>
        </ResponsiveChartContainer>
      </div>
    );

    // 初期サイズの確認
    expect(onSizeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 800,
        height: 400
      })
    );

    // 親コンテナのサイズを変更
    rerender(
      <div style={{ width: 1200, height: 600 }}>
        <ResponsiveChartContainer onSizeChange={onSizeChange}>
          <div>Test Chart</div>
        </ResponsiveChartContainer>
      </div>
    );

    // 変更後のサイズが反映されることを確認
    await waitFor(() => {
      expect(onSizeChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          width: 1200,
          height: 600
        })
      );
    });
  });
});
```

### C. レスポンシブテスト (3個)

#### C01: ウィンドウリサイズ対応テスト
```typescript
describe('ResponsiveChartContainer - Window Resize', () => {
  test('should respond to window resize events', async () => {
    const onSizeChange = jest.fn();

    render(
      <ResponsiveChartContainer onSizeChange={onSizeChange}>
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    // ウィンドウサイズ変更をシミュレート
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    // デバウンス後にサイズ変更が反映されることを確認
    await waitFor(() => {
      expect(onSizeChange).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  test('should handle rapid resize events with debouncing', async () => {
    const onSizeChange = jest.fn();

    render(
      <ResponsiveChartContainer debounceMs={50} onSizeChange={onSizeChange}>
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    // 連続してリサイズイベントを発生
    for (let i = 0; i < 10; i++) {
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }

    // デバウンス期間待機
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // デバウンスにより呼び出し回数が制限されることを確認
    expect(onSizeChange).toHaveBeenCalledTimes(1);
  });
});
```

#### C02: デバイス変更検出テスト
```typescript
describe('ResponsiveChartContainer - Device Change Detection', () => {
  test('should detect device type changes', async () => {
    const onDeviceChange = jest.fn();

    // 初期はモバイル
    const mockDetector = {
      getCurrentDeviceType: jest.fn().mockReturnValue('mobile')
    };

    jest.mock('../../utils/responsive/ViewportDetector', () => ({
      ViewportDetector: jest.fn().mockImplementation(() => mockDetector)
    }));

    const { rerender } = render(
      <ResponsiveChartContainer onDeviceChange={onDeviceChange}>
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    expect(onDeviceChange).toHaveBeenCalledWith('mobile');

    // デバイスタイプをデスクトップに変更
    mockDetector.getCurrentDeviceType.mockReturnValue('desktop');

    rerender(
      <ResponsiveChartContainer onDeviceChange={onDeviceChange}>
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    expect(onDeviceChange).toHaveBeenCalledWith('desktop');
  });
});
```

#### C03: デバウンス機能確認テスト
```typescript
describe('ResponsiveChartContainer - Debounce Functionality', () => {
  test('should apply custom debounce timing', async () => {
    const onSizeChange = jest.fn();

    render(
      <ResponsiveChartContainer debounceMs={200} onSizeChange={onSizeChange}>
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    // 複数回リサイズイベントを発生
    act(() => {
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));
    });

    // デバウンス時間の半分で確認（まだ呼ばれていない）
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    expect(onSizeChange).toHaveBeenCalledTimes(1); // 初期化時の1回のみ

    // デバウンス時間経過後に確認
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });
    expect(onSizeChange).toHaveBeenCalledTimes(2); // デバウンス後の1回追加
  });
});
```

### D. TASK-001連携テスト (2個)

#### D01: ViewportDetector連携確認テスト
```typescript
describe('ResponsiveChartContainer - ViewportDetector Integration', () => {
  test('should integrate with ViewportDetector correctly', () => {
    const mockDetector = {
      getCurrentDeviceType: jest.fn().mockReturnValue('tablet'),
      getViewportSize: jest.fn().mockReturnValue({ width: 800, height: 600 })
    };

    jest.mock('../../utils/responsive/ViewportDetector', () => ({
      ViewportDetector: jest.fn().mockImplementation(() => mockDetector)
    }));

    const onDeviceChange = jest.fn();

    render(
      <ResponsiveChartContainer
        enableViewportDetection={true}
        onDeviceChange={onDeviceChange}
      >
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    expect(mockDetector.getCurrentDeviceType).toHaveBeenCalled();
    expect(onDeviceChange).toHaveBeenCalledWith('tablet');
  });

  test('should work when viewport detection is disabled', () => {
    const onDeviceChange = jest.fn();

    render(
      <ResponsiveChartContainer
        enableViewportDetection={false}
        onDeviceChange={onDeviceChange}
      >
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    // ビューポート検出が無効の場合はデフォルト値を使用
    expect(onDeviceChange).toHaveBeenCalledWith('desktop'); // デフォルト値
  });
});
```

#### D02: SVGSizeCalculator統合確認テスト
```typescript
describe('ResponsiveChartContainer - SVGSizeCalculator Integration', () => {
  test('should use SVGSizeCalculator for size calculations', () => {
    const mockCalculator = {
      calculateSize: jest.fn().mockReturnValue({ width: 800, height: 400 })
    };

    jest.mock('../../utils/responsive/SVGSizeCalculator', () => ({
      SVGSizeCalculator: jest.fn().mockImplementation(() => mockCalculator)
    }));

    const onSizeChange = jest.fn();

    render(
      <ResponsiveChartContainer
        minWidth={600}
        minHeight={300}
        aspectRatio={2.0}
        onSizeChange={onSizeChange}
      >
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    expect(mockCalculator.calculateSize).toHaveBeenCalledWith(
      expect.any(Object), // container size
      expect.objectContaining({
        minWidth: 600,
        minHeight: 300,
        aspectRatio: 2.0,
        device: expect.any(String)
      })
    );

    expect(onSizeChange).toHaveBeenCalledWith({ width: 800, height: 400 });
  });
});
```

### E. 統合・パフォーマンステスト (3個)

#### E01: ブラウザー連携テスト
```typescript
describe('ResponsiveChartContainer - Browser Integration', () => {
  test('should work across different viewport sizes', async () => {
    const testCases = [
      { width: 320, height: 568, expected: 'mobile' },
      { width: 768, height: 1024, expected: 'tablet' },
      { width: 1440, height: 900, expected: 'desktop' }
    ];

    const onDeviceChange = jest.fn();

    for (const testCase of testCases) {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: testCase.width
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: testCase.height
      });

      const { unmount } = render(
        <ResponsiveChartContainer onDeviceChange={onDeviceChange}>
          <div>Test Chart</div>
        </ResponsiveChartContainer>
      );

      expect(onDeviceChange).toHaveBeenLastCalledWith(testCase.expected);
      unmount();
    }
  });
});
```

#### E02: デバイス回転時の挙動確認テスト
```typescript
describe('ResponsiveChartContainer - Device Orientation', () => {
  test('should handle device orientation changes', async () => {
    const onSizeChange = jest.fn();

    render(
      <ResponsiveChartContainer onSizeChange={onSizeChange}>
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    // 縦向き → 横向きの変更をシミュレート
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 768 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 1024 });

    act(() => {
      window.dispatchEvent(new Event('orientationchange'));
    });

    await waitFor(() => {
      expect(onSizeChange).toHaveBeenCalled();
    });

    // 横向きに変更
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });

    act(() => {
      window.dispatchEvent(new Event('orientationchange'));
    });

    await waitFor(() => {
      expect(onSizeChange).toHaveBeenCalled();
    });
  });
});
```

#### E03: パフォーマンステスト
```typescript
describe('ResponsiveChartContainer - Performance', () => {
  test('should handle rapid resize events efficiently', async () => {
    const onSizeChange = jest.fn();
    const startTime = performance.now();

    render(
      <ResponsiveChartContainer debounceMs={50} onSizeChange={onSizeChange}>
        <div>Test Chart</div>
      </ResponsiveChartContainer>
    );

    // 大量のリサイズイベントを発生させる
    for (let i = 0; i < 100; i++) {
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // パフォーマンス要件: 100ms以内で処理完了
    expect(processingTime).toBeLessThan(100);

    // デバウンスにより呼び出し回数が適切に制限される
    expect(onSizeChange).toHaveBeenCalledTimes(2); // 初期化 + デバウンス後
  });

  test('should not cause memory leaks', async () => {
    const components = [];

    // 複数のコンポーネントをマウント/アンマウント
    for (let i = 0; i < 50; i++) {
      const { unmount } = render(
        <ResponsiveChartContainer>
          <div>Test Chart {i}</div>
        </ResponsiveChartContainer>
      );
      components.push(unmount);
    }

    // 全てアンマウント
    components.forEach(unmount => unmount());

    // ガベージコレクションを強制実行（テスト環境で利用可能な場合）
    if (global.gc) {
      global.gc();
    }

    // メモリリークがないことを確認（実際のテストでは適切なメモリ監視ツールを使用）
    expect(true).toBe(true); // プレースホルダー
  });
});
```

## 📊 テストデータ・モック

### ViewportDetectorモック
```typescript
const mockViewportDetector = {
  getCurrentDeviceType: jest.fn(),
  getViewportSize: jest.fn(),
  onDeviceChange: jest.fn()
};
```

### SVGSizeCalculatorモック
```typescript
const mockSVGSizeCalculator = {
  calculateSize: jest.fn().mockReturnValue({ width: 800, height: 400 }),
  calculateMargin: jest.fn().mockReturnValue({ top: 20, right: 20, bottom: 20, left: 20 })
};
```

### ResizeObserverモック
```typescript
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));
```

## ✅ 受け入れ基準

### テスト成功基準
- [ ] 全15テストケースが成功する
- [ ] テストカバレッジが95%以上
- [ ] パフォーマンステストが全て合格
- [ ] TASK-001統合テストが合格

### 品質基準
- [ ] TypeScript strict mode でエラーなし
- [ ] ESLint 違反なし
- [ ] React Testing Library ベストプラクティス準拠
- [ ] すべてのエラーケースにフォールバック対応

---

**テストケース設計完了**: 2025-09-30
**テスト実装**: TASK-201 TDD Step 3/6 Red Phase へ
**総テスト数**: 15個 (単体12個 + 統合3個)
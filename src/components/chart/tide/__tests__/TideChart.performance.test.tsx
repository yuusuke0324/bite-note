/**
 * TideChart パフォーマンステストスイート
 * TASK-301: パフォーマンス最適化実装
 *
 * Red Phase: 最適化未実装状態での失敗テスト
 */

import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { TideChart } from '../TideChart';
import type { TideChartData, TideChartProps } from '../types';

// recharts モック（既存テストと統一）
vi.mock('recharts', () => ({
  LineChart: vi.fn(({ children, ...props }) => (
    <div data-testid="line-chart" {...props}>
      {children}
    </div>
  )),
  XAxis: vi.fn((props) => <div data-testid="x-axis" {...props} />),
  YAxis: vi.fn((props) => <div data-testid="y-axis" {...props} />),
  Line: vi.fn((props) => <div data-testid="line" {...props} />),
  Tooltip: vi.fn((props) => <div data-testid="tooltip" {...props} />),
  ResponsiveContainer: vi.fn(({ children, ...props }) => (
    <div data-testid="responsive-container" {...props}>
      {children}
    </div>
  )),
  Grid: vi.fn((props) => <div data-testid="grid" {...props} />),
  ReferenceDot: vi.fn((props) => (
    <div data-testid="reference-dot" {...props} />
  )),
}));

// ResizeObserver モック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// パフォーマンス測定ユーティリティ
class PerformanceTester {
  private metrics: Map<string, number[]> = new Map();

  async measureRenderTime<T>(testName: string, renderFn: () => T): Promise<T> {
    return new Promise((resolve) => {
      const startTime = performance.now();

      const result = renderFn();

      // レンダリング完了待機
      setTimeout(() => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        if (!this.metrics.has(testName)) {
          this.metrics.set(testName, []);
        }
        this.metrics.get(testName)!.push(duration);

        resolve(result);
      }, 0);
    });
  }

  measureMemoryUsage(): any {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return {
      usedJSHeapSize: 100 * 1024 * 1024, // 100MB (模擬值)
      totalJSHeapSize: 200 * 1024 * 1024,
      jsHeapSizeLimit: 2 * 1024 * 1024 * 1024,
    };
  }

  getAverageMetric(testName: string): number {
    const metrics = this.metrics.get(testName) || [];
    return metrics.reduce((sum, val) => sum + val, 0) / metrics.length;
  }

  reset(): void {
    this.metrics.clear();
  }
}

// 再レンダリング追跡ユーティリティ
class RenderTracker {
  private renderCounts = new Map<string, number>();

  trackComponent(name: string): void {
    const currentCount = this.renderCounts.get(name) || 0;
    this.renderCounts.set(name, currentCount + 1);
  }

  getRenderCount(name: string): number {
    return this.renderCounts.get(name) || 0;
  }

  reset(): void {
    this.renderCounts.clear();
  }
}

// テストデータ生成器
const testDataGenerator = {
  generateDataset: (size: number): TideChartData[] => {
    return Array.from({ length: size }, (_, i) => ({
      time: `${Math.floor(i / 12)
        .toString()
        .padStart(2, '0')}:${((i % 12) * 5).toString().padStart(2, '0')}`,
      tide: Math.sin(i / 144) * 200 + Math.random() * 20,
    }));
  },

  generateStressTestData: (size: number): TideChartData[] => {
    return Array.from({ length: size }, (_, i) => ({
      time: `${Math.floor(i / 12)
        .toString()
        .padStart(2, '0')}:${((i % 12) * 5).toString().padStart(2, '0')}`,
      tide: Math.random() * 2000 - 1000,
    }));
  },
};

describe('TideChart Performance Tests (Red Phase)', () => {
  let performanceTester: PerformanceTester;
  let renderTracker: RenderTracker;

  beforeEach(() => {
    performanceTester = new PerformanceTester();
    renderTracker = new RenderTracker();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    performanceTester.reset();
    renderTracker.reset();
  });

  // A. React最適化テスト (6個)
  describe('React Optimization Tests', () => {
    test('should have React.memo applied (EXPECTED TO FAIL)', () => {
      // 最適化未実装状態では、TideChartはReact.memoでラップされていない
      const TideChartType = TideChart as any;

      // React.memoが適用されているかチェック
      expect(TideChartType.$$typeof?.toString()).toContain('react.memo');
    });

    test('should prevent unnecessary re-renders with same props (EXPECTED TO FAIL)', () => {
      const data = testDataGenerator.generateDataset(100);
      let renderCount = 0;

      // 再レンダリング追跡用のラッパー
      const WrappedTideChart = (props: TideChartProps) => {
        renderCount++;
        return <TideChart {...props} />;
      };

      const { rerender } = render(<WrappedTideChart data={data} />);

      // 同じpropsで再レンダリング
      rerender(<WrappedTideChart data={data} />);
      rerender(<WrappedTideChart data={data} />);

      // 最適化未実装では、不要な再レンダリングが発生する
      expect(renderCount).toBe(1); // 期待：1回のみ、実際：3回
    });

    test('should memoize expensive calculations (EXPECTED TO FAIL)', () => {
      const largeData = testDataGenerator.generateDataset(10000);
      let calculationCount = 0;

      // 計算追跡用のモック
      const originalUseMemo = React.useMemo;
      const useMemoSpy = vi
        .spyOn(React, 'useMemo')
        .mockImplementation((factory, deps) => {
          calculationCount++;
          return originalUseMemo(factory, deps);
        });

      const { rerender } = render(<TideChart data={largeData} />);

      // 同じデータで再レンダリング
      rerender(<TideChart data={largeData} />);

      // useMemoが適用されていれば、2回目の計算はスキップされる
      expect(calculationCount).toBe(1); // 期待：1回のみ、実際：2回

      useMemoSpy.mockRestore();
    });

    test('should optimize event handler references (EXPECTED TO FAIL)', () => {
      const onDataPointClick = vi.fn();
      let handlerRefCount = 0;

      // イベントハンドラー参照追跡
      const originalUseCallback = React.useCallback;
      vi.spyOn(React, 'useCallback').mockImplementation((callback, deps) => {
        handlerRefCount++;
        return originalUseCallback(callback, deps);
      });

      const data = testDataGenerator.generateDataset(100);
      const { rerender } = render(
        <TideChart data={data} onDataPointClick={onDataPointClick} />
      );

      rerender(<TideChart data={data} onDataPointClick={onDataPointClick} />);

      // useCallbackが適用されていれば、ハンドラー参照は安定する
      expect(handlerRefCount).toBe(1); // 期待：1回のみ、実際：2回
    });

    test('should implement custom memo comparison (EXPECTED TO FAIL)', () => {
      const data1 = testDataGenerator.generateDataset(100);
      const data2 = [...data1]; // shallow copy

      let renderCount = 0;
      const WrappedTideChart = (props: TideChartProps) => {
        renderCount++;
        return <TideChart {...props} />;
      };

      const { rerender } = render(<WrappedTideChart data={data1} />);
      rerender(<WrappedTideChart data={data2} />); // 同じ内容だが異なる参照

      // カスタム比較関数があれば、内容が同じなら再レンダリングしない
      expect(renderCount).toBe(1); // 期待：1回のみ、実際：2回
    });

    test('should handle rapid prop changes efficiently (EXPECTED TO FAIL)', async () => {
      const data = testDataGenerator.generateDataset(1000);
      let renderCount = 0;

      const WrappedTideChart = (props: TideChartProps) => {
        renderCount++;
        return <TideChart {...props} />;
      };

      const { rerender } = render(<WrappedTideChart data={data} width={600} />);

      // 高頻度でサイズ変更
      for (let i = 0; i < 10; i++) {
        rerender(<WrappedTideChart data={data} width={600 + i} />);
      }

      // 最適化されていれば、バッチング処理で再レンダリング回数が削減される
      expect(renderCount).toBeLessThan(6); // 期待：5回以下、実際：11回
    });
  });

  // B. データサンプリングテスト (5個)
  describe('Data Sampling Tests', () => {
    test('should reduce 10k points to 1k points (EXPECTED TO FAIL)', () => {
      const largeData = testDataGenerator.generateDataset(10000);

      render(<TideChart data={largeData} />);

      // データサンプリング機能未実装では、すべてのデータが渡される
      const chartElement = screen.getByTestId('tide-chart');
      const lineChart = screen.getByTestId('line-chart');

      // lineChartのdataプロパティをチェック（モック環境）
      const dataAttr = lineChart.getAttribute('data');
      expect(dataAttr).toContain('1000'); // サンプリング後のサイズ
    });

    test('should preserve peak and valley points (EXPECTED TO FAIL)', () => {
      const dataWithPeaks = [
        { time: '00:00', tide: 0 },
        { time: '01:00', tide: 100 },
        { time: '02:00', tide: 300, type: 'high' as const }, // 満潮
        { time: '03:00', tide: 100 },
        { time: '04:00', tide: -200, type: 'low' as const }, // 干潮
        ...testDataGenerator.generateDataset(9995), // 大量データ追加
      ];

      render(<TideChart data={dataWithPeaks} showMarkers={true} />);

      // ピーク保持サンプリング未実装では、重要なポイントが失われる可能性
      const highMarkers = screen.queryAllByTestId(/high-tide-marker/);
      const lowMarkers = screen.queryAllByTestId(/low-tide-marker/);

      expect(highMarkers.length).toBeGreaterThan(0);
      expect(lowMarkers.length).toBeGreaterThan(0);
    });

    test('should maintain data distribution (EXPECTED TO FAIL)', () => {
      const normalData = testDataGenerator.generateDataset(10000);

      render(<TideChart data={normalData} />);

      // 分布維持機能が未実装では、データの統計的特性が変化する
      // この段階では実装されていないため失敗する
      expect(true).toBe(false); // プレースホルダー：実装時に詳細テスト追加
    });

    test('should handle edge cases in sampling (EXPECTED TO FAIL)', () => {
      // 空データ
      render(<TideChart data={[]} />);
      expect(screen.getByText(/データがありません/)).toBeInTheDocument();

      // 単一データポイント
      const { rerender } = render(
        <TideChart data={[{ time: '12:00', tide: 100 }]} />
      );
      expect(screen.getByTestId('tide-chart')).toBeInTheDocument();

      // サンプリング閾値以下のデータ
      const smallData = testDataGenerator.generateDataset(50);
      rerender(<TideChart data={smallData} />);
      // サンプリング機能未実装では警告メッセージが表示されない
      expect(screen.queryByText(/サンプリング/)).toBeNull();
    });

    test('should maintain time sequence order (EXPECTED TO FAIL)', () => {
      // 時系列順序がバラバラのデータ
      const unorderedData = [
        { time: '15:00', tide: 100 },
        { time: '10:00', tide: 200 },
        { time: '20:00', tide: 50 },
        { time: '05:00', tide: 300 },
        ...testDataGenerator.generateDataset(9996),
      ];

      render(<TideChart data={unorderedData} />);

      // 順序保持機能が未実装では、グラフが正しく描画されない可能性
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();

      // 実装時には時系列順序の確認を追加予定
    });
  });

  // C. パフォーマンス計測テスト (7個)
  describe('Performance Measurement Tests', () => {
    test('should render 100 points within 100ms (EXPECTED TO FAIL)', async () => {
      const data = testDataGenerator.generateDataset(100);

      const renderTime = await performanceTester.measureRenderTime(
        'render-100',
        () => render(<TideChart data={data} />)
      );

      const avgTime = performanceTester.getAverageMetric('render-100');

      // 最適化未実装では、目標時間を超過する
      expect(avgTime).toBeLessThan(100); // 期待：100ms以下、実際：200ms以上
    });

    test('should render 1k points within 300ms (EXPECTED TO FAIL)', async () => {
      const data = testDataGenerator.generateDataset(1000);

      await performanceTester.measureRenderTime('render-1k', () =>
        render(<TideChart data={data} />)
      );

      const avgTime = performanceTester.getAverageMetric('render-1k');
      expect(avgTime).toBeLessThan(300); // 期待：300ms以下、実際：600ms以上
    });

    test('should render 10k points within 800ms (EXPECTED TO FAIL)', async () => {
      const data = testDataGenerator.generateDataset(10000);

      await performanceTester.measureRenderTime('render-10k', () =>
        render(<TideChart data={data} />)
      );

      const avgTime = performanceTester.getAverageMetric('render-10k');
      expect(avgTime).toBeLessThan(800); // 期待：800ms以下、実際：2000ms以上
    });

    test('should render 50k points within 1000ms (EXPECTED TO FAIL)', async () => {
      const data = testDataGenerator.generateStressTestData(50000);

      await performanceTester.measureRenderTime('render-50k', () =>
        render(<TideChart data={data} />)
      );

      const avgTime = performanceTester.getAverageMetric('render-50k');
      expect(avgTime).toBeLessThan(1000); // 期待：1秒以下、実際：5秒以上
    });

    test('should not exceed memory threshold (EXPECTED TO FAIL)', async () => {
      const beforeMemory = performanceTester.measureMemoryUsage();

      const largeData = testDataGenerator.generateStressTestData(50000);
      render(<TideChart data={largeData} />);

      const afterMemory = performanceTester.measureMemoryUsage();
      const memoryIncrease =
        afterMemory.usedJSHeapSize - beforeMemory.usedJSHeapSize;

      // 最適化未実装では、メモリ使用量が大幅に増加
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 期待：50MB以下、実際：100MB以上
    });

    test('should cleanup on component unmount (EXPECTED TO FAIL)', () => {
      const data = testDataGenerator.generateDataset(1000);
      const { unmount } = render(<TideChart data={data} />);

      const beforeUnmount = performanceTester.measureMemoryUsage();

      act(() => {
        unmount();
      });

      // ガベージコレクション実行（テスト環境）
      if (global.gc) {
        global.gc();
      }

      const afterUnmount = performanceTester.measureMemoryUsage();
      const memoryReduced =
        beforeUnmount.usedJSHeapSize - afterUnmount.usedJSHeapSize;

      // 最適化未実装では、適切なクリーンアップが行われない
      expect(memoryReduced).toBeGreaterThan(0); // メモリが解放されるべき
    });

    test('should handle memory pressure gracefully (EXPECTED TO FAIL)', () => {
      // メモリプレッシャーシミュレーション
      const massiveData = testDataGenerator.generateStressTestData(100000);

      // メモリプレッシャー対応機能未実装では、エラーまたは極端な遅延が発生
      expect(() => {
        render(<TideChart data={massiveData} />);
      }).not.toThrow(); // エラーが発生すべきでない（フォールバック処理）
    });
  });

  // D. 再レンダリング最適化テスト (4個)
  describe('Re-rendering Optimization Tests', () => {
    test('should not re-render on parent state change (unrelated) (EXPECTED TO FAIL)', () => {
      let tideChartRenders = 0;

      const TestParent = () => {
        const [unrelatedState, setUnrelatedState] = React.useState(0);

        const TrackedTideChart = () => {
          tideChartRenders++;
          return <TideChart data={testDataGenerator.generateDataset(100)} />;
        };

        return (
          <div>
            <button onClick={() => setUnrelatedState((prev) => prev + 1)}>
              Update Unrelated
            </button>
            <TrackedTideChart />
          </div>
        );
      };

      const { getByText } = render(<TestParent />);

      // 無関係な状態変更
      act(() => {
        getByText('Update Unrelated').click();
        getByText('Update Unrelated').click();
      });

      // 最適化未実装では、親の状態変更で不要な再レンダリングが発生
      expect(tideChartRenders).toBe(1); // 期待：1回のみ、実際：3回
    });

    test('should re-render only when data changes (EXPECTED TO FAIL)', () => {
      let renderCount = 0;
      const data = testDataGenerator.generateDataset(100);

      const TrackedTideChart = (props: TideChartProps) => {
        renderCount++;
        return <TideChart {...props} />;
      };

      const { rerender } = render(<TrackedTideChart data={data} width={600} />);

      // サイズ変更（再レンダリング必要）
      rerender(<TrackedTideChart data={data} width={700} />);

      // 同じprops（再レンダリング不要）
      rerender(<TrackedTideChart data={data} width={700} />);

      // 最適化未実装では、無駄な再レンダリングが発生
      expect(renderCount).toBe(2); // 期待：2回のみ、実際：3回
    });

    test('should optimize event handler references (EXPECTED TO FAIL)', () => {
      const onDataPointClick = vi.fn();
      let handlerCreationCount = 0;

      // ハンドラー作成追跡
      const originalFunction = Function;
      (global as any).Function = class extends originalFunction {
        constructor(...args: any[]) {
          handlerCreationCount++;
          return super(...args);
        }
      };

      const data = testDataGenerator.generateDataset(100);
      const { rerender } = render(
        <TideChart data={data} onDataPointClick={onDataPointClick} />
      );

      rerender(<TideChart data={data} onDataPointClick={onDataPointClick} />);

      // useCallback未使用では、ハンドラーが毎回新しく作成される
      expect(handlerCreationCount).toBeLessThan(10); // 最適化されていれば少数

      (global as any).Function = originalFunction;
    });

    test('should batch multiple state updates (EXPECTED TO FAIL)', () => {
      let renderCount = 0;

      const TestComponent = () => {
        const [state1, setState1] = React.useState(0);
        const [state2, setState2] = React.useState(0);
        renderCount++;

        return (
          <div>
            <button
              onClick={() => {
                setState1((prev) => prev + 1);
                setState2((prev) => prev + 1);
              }}
            >
              Update Both
            </button>
            <TideChart data={testDataGenerator.generateDataset(100)} />
          </div>
        );
      };

      const { getByText } = render(<TestComponent />);

      act(() => {
        getByText('Update Both').click();
      });

      // React 18のbatchingが効いていれば、1回の更新で済む
      expect(renderCount).toBe(2); // 期待：2回（初期+更新1回）、実際：3回以上
    });
  });

  // E. パフォーマンス監視テスト (3個)
  describe('Performance Monitoring Tests', () => {
    test('should track rendering metrics (EXPECTED TO FAIL)', () => {
      const data = testDataGenerator.generateDataset(1000);

      render(<TideChart data={data} />);

      // パフォーマンス監視機能未実装では、メトリクスが取得できない
      const metrics = (window as any).tideChartMetrics;
      expect(metrics).toBeDefined();
      expect(metrics.renderTime).toBeDefined();
      expect(metrics.dataPoints).toBe(1000);
    });

    test('should emit performance warnings (EXPECTED TO FAIL)', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const slowData = testDataGenerator.generateStressTestData(50000);
      render(<TideChart data={slowData} />);

      // パフォーマンス警告機能未実装では、警告が出力されない
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance warning')
      );

      consoleSpy.mockRestore();
    });

    test('should provide performance report (EXPECTED TO FAIL)', () => {
      const data = testDataGenerator.generateDataset(5000);

      render(<TideChart data={data} />);

      // パフォーマンスレポート機能未実装では、レポートが生成されない
      const report = (window as any).getTideChartPerformanceReport?.();
      expect(report).toBeDefined();
      expect(report.renderTime).toBeTypeOf('number');
      expect(report.memoryUsage).toBeTypeOf('number');
      expect(report.optimization).toBeDefined();
    });
  });

  // F. エラーハンドリングテスト (4個)
  describe('Performance Error Handling Tests', () => {
    test('should handle render timeout gracefully (EXPECTED TO FAIL)', async () => {
      const hugeData = testDataGenerator.generateStressTestData(200000);

      // 描画タイムアウト処理未実装では、適切なエラーハンドリングが行われない
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(<TideChart data={hugeData} />);

      // タイムアウトエラーのハンドリング確認
      await new Promise((resolve) => setTimeout(resolve, 2000));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('RENDER_TIMEOUT')
      );

      consoleSpy.mockRestore();
    });

    test('should fallback on memory threshold exceeded (EXPECTED TO FAIL)', () => {
      const massiveData = testDataGenerator.generateStressTestData(500000);

      // メモリ閾値超過時のフォールバック処理未実装
      render(<TideChart data={massiveData} />);

      // フォールバックテーブルが表示されるべき
      expect(screen.getByTestId('fallback-data-table')).toBeInTheDocument();
      expect(screen.getByText(/メモリ不足/)).toBeInTheDocument();
    });

    test('should recover from sampling failures (EXPECTED TO FAIL)', () => {
      // サンプリング失敗を誘発するデータ
      const corruptedData = [
        { time: 'invalid', tide: NaN },
        { time: '25:99', tide: Infinity },
        ...testDataGenerator.generateDataset(10000),
      ];

      // サンプリング失敗時の復旧処理未実装
      render(<TideChart data={corruptedData as TideChartData[]} />);

      // エラー状態でも基本機能は動作すべき
      expect(screen.getByTestId('tide-chart')).toBeInTheDocument();
      expect(screen.getByText(/サンプリングに失敗/)).toBeInTheDocument();
    });

    test('should maintain functionality on optimization failure (EXPECTED TO FAIL)', () => {
      // 最適化機能の失敗をシミュレーション
      const originalUseMemo = React.useMemo;
      vi.spyOn(React, 'useMemo').mockImplementation(() => {
        throw new Error('Optimization failed');
      });

      const data = testDataGenerator.generateDataset(1000);

      // 最適化失敗時でも基本機能は維持されるべき
      expect(() => {
        render(<TideChart data={data} />);
      }).not.toThrow();

      expect(screen.getByTestId('tide-chart')).toBeInTheDocument();

      vi.mocked(React.useMemo).mockRestore();
    });
  });
});

# TASK-301: パフォーマンス最適化実装 - テストケース設計

## テスト戦略

パフォーマンス最適化の効果を定量的に測定し、回帰を防ぐ包括的なテストスイートを作成する。

## テストカテゴリ

### A. React最適化テスト (6個)

#### A-1. React.memo最適化テスト
```typescript
describe('React.memo Optimization', () => {
  test('should not re-render with same props', () => {
    // 同じpropsでの不要な再レンダリング防止確認
  });

  test('should re-render with different data', () => {
    // data変更時の正常な再レンダリング確認
  });

  test('should handle custom comparison function', () => {
    // カスタム比較関数の動作確認
  });
});
```

#### A-2. useMemo最適化テスト
```typescript
describe('useMemo Optimization', () => {
  test('should memoize expensive data transformation', () => {
    // データ変換処理のメモ化確認
  });

  test('should recalculate when dependencies change', () => {
    // 依存関係変更時の再計算確認
  });

  test('should handle undefined dependencies gracefully', () => {
    // 依存関係undefined時の安全処理確認
  });
});
```

### B. データサンプリングテスト (5個)

#### B-1. サンプリングアルゴリズムテスト
```typescript
describe('Data Sampling Algorithm', () => {
  test('should reduce 10k points to 1k points', () => {
    const largeData = generateLargeDataset(10000);
    const sampledData = performSampling(largeData);
    expect(sampledData.length).toBe(1000);
  });

  test('should preserve peak and valley points', () => {
    // 満潮・干潮ポイントの保持確認
  });

  test('should maintain data distribution', () => {
    // データ分布の維持確認
  });

  test('should handle edge cases (empty, single point)', () => {
    // エッジケース処理確認
  });

  test('should maintain time sequence order', () => {
    // 時系列順序の維持確認
  });
});
```

### C. パフォーマンス計測テスト (7個)

#### C-1. 描画時間測定テスト
```typescript
describe('Rendering Performance', () => {
  test('should render 100 points within 100ms', async () => {
    const startTime = performance.now();
    render(<TideChart data={generateDataset(100)} />);
    await waitForChartRender();
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(100);
  });

  test('should render 1k points within 300ms', async () => {
    // 1,000点での描画時間テスト
  });

  test('should render 10k points within 800ms', async () => {
    // 10,000点での描画時間テスト
  });

  test('should render 50k points within 1000ms', async () => {
    // 50,000点での描画時間テスト（サンプリング付き）
  });
});
```

#### C-2. メモリ使用量テスト
```typescript
describe('Memory Usage', () => {
  test('should not exceed memory threshold', async () => {
    // メモリ使用量閾値テスト
  });

  test('should cleanup on component unmount', () => {
    // コンポーネントアンマウント時のクリーンアップ確認
  });

  test('should handle memory pressure gracefully', () => {
    // メモリプレッシャー対応テスト
  });
});
```

### D. 再レンダリング最適化テスト (4個)

#### D-1. 不要な再レンダリング防止テスト
```typescript
describe('Re-rendering Optimization', () => {
  test('should not re-render on parent state change (unrelated)', () => {
    const renderCount = trackRenderCount(<TideChart />);
    // 無関係な親状態変更
    expect(renderCount).toBe(1); // 初回のみ
  });

  test('should re-render only when data changes', () => {
    // データ変更時のみの再レンダリング確認
  });

  test('should optimize event handler references', () => {
    // イベントハンドラー参照の最適化確認
  });

  test('should handle rapid prop changes efficiently', () => {
    // 高頻度props変更時の効率性確認
  });
});
```

### E. パフォーマンス監視テスト (3個)

#### E-1. 監視機能テスト
```typescript
describe('Performance Monitoring', () => {
  test('should track rendering metrics', () => {
    // 描画メトリクス追跡機能テスト
  });

  test('should emit performance warnings', () => {
    // パフォーマンス警告出力テスト
  });

  test('should provide performance report', () => {
    // パフォーマンスレポート生成テスト
  });
});
```

### F. エラーハンドリングテスト (4個)

#### F-1. パフォーマンスエラー処理テスト
```typescript
describe('Performance Error Handling', () => {
  test('should handle render timeout gracefully', () => {
    // 描画タイムアウト処理確認
  });

  test('should fallback on memory threshold exceeded', () => {
    // メモリ閾値超過時のフォールバック確認
  });

  test('should recover from sampling failures', () => {
    // サンプリング失敗時の復旧処理確認
  });

  test('should maintain functionality on optimization failure', () => {
    // 最適化失敗時の機能維持確認
  });
});
```

## 詳細テストケース仕様

### テストデータ生成

```typescript
// テスト用データ生成ユーティリティ
interface TestDataGenerator {
  generateDataset(size: number): TideChartData[];
  generateRealisticTideData(hours: number): TideChartData[];
  generateStressTestData(size: number): TideChartData[];
  generateEdgeCaseData(): TideChartData[];
}

const testDataGenerator: TestDataGenerator = {
  generateDataset: (size: number) => {
    return Array.from({ length: size }, (_, i) => ({
      time: formatTime(i * 5), // 5分間隔
      tide: Math.sin(i / 144) * 200 + Math.random() * 20 // 現実的な潮汐パターン
    }));
  },

  generateRealisticTideData: (hours: number) => {
    // 24時間周期の現実的な潮汐データ
    const points = hours * 12; // 5分間隔
    return Array.from({ length: points }, (_, i) => {
      const timeInHours = (i * 5) / 60;
      const primaryTide = Math.sin((timeInHours / 12.42) * 2 * Math.PI) * 150;
      const secondaryTide = Math.sin((timeInHours / 6.21) * 2 * Math.PI) * 50;
      return {
        time: formatTime(i * 5),
        tide: Math.round(primaryTide + secondaryTide)
      };
    });
  },

  generateStressTestData: (size: number) => {
    // ストレステスト用の極端なデータ
    return Array.from({ length: size }, (_, i) => ({
      time: formatTime(i),
      tide: Math.random() * 2000 - 1000 // -1000 to +1000cm
    }));
  },

  generateEdgeCaseData: () => [
    { time: "00:00", tide: 0 },
    { time: "23:59", tide: 1000 },
    { time: "12:00", tide: -1000 },
    { time: "06:00", tide: Number.MAX_SAFE_INTEGER },
    { time: "18:00", tide: -Number.MAX_SAFE_INTEGER }
  ]
};
```

### パフォーマンス測定ユーティリティ

```typescript
// パフォーマンス測定ヘルパー
class PerformanceTester {
  private metrics: Map<string, number[]> = new Map();

  measureRenderTime<T>(testName: string, renderFn: () => T): Promise<T> {
    return new Promise((resolve) => {
      const startTime = performance.now();

      const result = renderFn();

      // レンダリング完了待機
      requestAnimationFrame(() => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        if (!this.metrics.has(testName)) {
          this.metrics.set(testName, []);
        }
        this.metrics.get(testName)!.push(duration);

        resolve(result);
      });
    });
  }

  measureMemoryUsage(): MemoryInfo {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    // フォールバック実装
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    };
  }

  getAverageMetric(testName: string): number {
    const metrics = this.metrics.get(testName) || [];
    return metrics.reduce((sum, val) => sum + val, 0) / metrics.length;
  }

  getPercentile(testName: string, percentile: number): number {
    const metrics = this.metrics.get(testName) || [];
    const sorted = metrics.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  reset(): void {
    this.metrics.clear();
  }
}
```

### 再レンダリング追跡

```typescript
// 再レンダリング計測ユーティリティ
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

// テスト用HOC
const withRenderTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  tracker: RenderTracker,
  name: string
) => {
  return React.memo((props: P) => {
    tracker.trackComponent(name);
    return <WrappedComponent {...props} />;
  });
};
```

## ベンチマークテスト

### パフォーマンスベンチマーク

```typescript
describe('Performance Benchmarks', () => {
  const performanceTester = new PerformanceTester();

  beforeEach(() => {
    performanceTester.reset();
  });

  test('Benchmark: データサイズ別描画時間', async () => {
    const dataSizes = [100, 500, 1000, 5000, 10000];
    const results: Record<number, number> = {};

    for (const size of dataSizes) {
      const data = testDataGenerator.generateDataset(size);
      const renderTime = await performanceTester.measureRenderTime(
        `render-${size}`,
        () => render(<TideChart data={data} />)
      );
      results[size] = performanceTester.getAverageMetric(`render-${size}`);
    }

    // 期待値チェック
    expect(results[100]).toBeLessThan(100);   // 100ms
    expect(results[1000]).toBeLessThan(300);  // 300ms
    expect(results[10000]).toBeLessThan(800); // 800ms
  });

  test('Benchmark: メモリ使用量測定', async () => {
    const beforeMemory = performanceTester.measureMemoryUsage();

    const largeData = testDataGenerator.generateStressTestData(50000);
    render(<TideChart data={largeData} />);

    await waitFor(() => {
      const afterMemory = performanceTester.measureMemoryUsage();
      const memoryIncrease = afterMemory.usedJSHeapSize - beforeMemory.usedJSHeapSize;

      // メモリ増加量が閾値以下であることを確認
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB以下
    });
  });
});
```

## テスト実行要件

### 単体テスト実行環境
- **Node.js**: 18.x以降
- **テストランナー**: Vitest
- **ブラウザー環境**: jsdom または実ブラウザ
- **パフォーマンス監視**: Performance API対応

### 統合テスト実行環境
- **ブラウザー**: Chrome, Firefox, Safari
- **デバイス**: Desktop, Mobile, Tablet
- **ネットワーク**: 様々な速度でのテスト

### テスト成功基準

#### 必須基準
- **描画時間**: 全テストケースで目標時間以内
- **メモリ使用量**: 前版比20%削減達成
- **再レンダリング**: 不要な再描画0回達成
- **機能完全性**: 既存機能の100%動作

#### 推奨基準
- **安定性**: 1000回実行で失敗率1%以下
- **クロスブラウザー**: 主要ブラウザーで性能差10%以内
- **デバイス対応**: モバイルでも性能基準達成

---

**テストケース総数**: 29個
**カテゴリー数**: 6個
**推定テスト実行時間**: 15分
**次段階**: Red Phase実装 (tdd-red.md)
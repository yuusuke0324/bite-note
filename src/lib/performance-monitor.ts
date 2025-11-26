// パフォーマンス監視ユーティリティ

import { logger } from './errors';

interface PerformanceMeasurement {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
}

interface WebVitalsMetrics {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export class PerformanceMonitor {
  private measurements: PerformanceMeasurement[] = [];
  private webVitals: WebVitalsMetrics = {};
  private thresholds = {
    'slow-operation': 1000, // 1秒以上で警告
    'memory-usage': 50 * 1024 * 1024, // 50MBで警告
    'fcp': 2000, // 2秒
    'lcp': 3000, // 3秒
    'fid': 100, // 100ms
    'cls': 0.1 // 0.1
  };

  constructor() {
    this.initializeWebVitalsTracking();
  }

  /**
   * 同期処理のパフォーマンス測定
   */
  measure<T>(name: string, operation: () => T): T {
    const startTime = performance.now();
    performance.mark(`${name}-start`);

    const result = operation();

    const endTime = performance.now();
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    this.recordMeasurement(name, endTime - startTime, startTime, endTime);

    return result;
  }

  /**
   * 非同期処理のパフォーマンス測定
   */
  async measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    performance.mark(`${name}-start`);

    try {
      const result = await operation();

      const endTime = performance.now();
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);

      this.recordMeasurement(name, endTime - startTime, startTime, endTime);

      return result;
    } catch (error) {
      const endTime = performance.now();
      performance.mark(`${name}-error`);

      this.recordMeasurement(`${name}-error`, endTime - startTime, startTime, endTime);

      throw error;
    }
  }

  /**
   * Core Web Vitals の追跡を開始
   */
  trackWebVitals(): void {
    // First Contentful Paint
    this.observePerformanceEntry('paint', (entry) => {
      if (entry.name === 'first-contentful-paint') {
        this.webVitals.FCP = entry.startTime;
      }
    });

    // Largest Contentful Paint
    this.observePerformanceEntry('largest-contentful-paint', (entry) => {
      this.webVitals.LCP = entry.startTime;
    });

    // First Input Delay
    this.observePerformanceEntry('first-input', (entry) => {
      this.webVitals.FID = entry.processingStart - entry.startTime;
    });

    // Cumulative Layout Shift
    this.observePerformanceEntry('layout-shift', (entry) => {
      if (!entry.hadRecentInput) {
        this.webVitals.CLS = (this.webVitals.CLS || 0) + entry.value;
      }
    });

    // Time to First Byte
    this.observePerformanceEntry('navigation', (entry) => {
      this.webVitals.TTFB = entry.responseStart - entry.requestStart;
    });
  }

  /**
   * メモリ使用量の監視
   */
  getMemoryInfo(): MemoryInfo | null {
    if ('memory' in performance) {
      const memory = (performance as Performance & {
        memory?: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        };
      }).memory;

      if (!memory) return null;

      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  /**
   * パフォーマンス測定値を記録
   */
  recordMeasurement(name: string, duration: number, startTime?: number, endTime?: number): void {
    this.measurements.push({
      name,
      duration,
      startTime: startTime || performance.now() - duration,
      endTime: endTime || performance.now()
    });
  }

  /**
   * すべてのメトリクスを取得
   */
  getMetrics() {
    return {
      measurements: this.measurements,
      webVitals: this.webVitals,
      memory: this.getMemoryInfo(),
      timestamp: Date.now()
    };
  }

  /**
   * パフォーマンス問題の検出
   */
  detectIssues(): string[] {
    const issues: string[] = [];

    // 遅い操作の検出
    this.measurements.forEach(measurement => {
      if (measurement.duration > this.thresholds['slow-operation']) {
        issues.push(`${measurement.name} exceeded threshold`);
      }
    });

    // メモリ使用量の検査
    const memory = this.getMemoryInfo();
    if (memory && memory.usedJSHeapSize > this.thresholds['memory-usage']) {
      issues.push('High memory usage detected');
    }

    // Web Vitals の検査
    if (this.webVitals.FCP && this.webVitals.FCP > this.thresholds.fcp) {
      issues.push('Poor First Contentful Paint');
    }

    if (this.webVitals.LCP && this.webVitals.LCP > this.thresholds.lcp) {
      issues.push('Poor Largest Contentful Paint');
    }

    if (this.webVitals.FID && this.webVitals.FID > this.thresholds.fid) {
      issues.push('Poor First Input Delay');
    }

    if (this.webVitals.CLS && this.webVitals.CLS > this.thresholds.cls) {
      issues.push('Poor Cumulative Layout Shift');
    }

    return issues;
  }

  /**
   * レポートの生成
   */
  generateReport(): {
    summary: {
      totalMeasurements: number;
      averageDuration: number;
      slowOperations: number;
      issues: string[];
    };
    details: {
      measurements: PerformanceMeasurement[];
      webVitals: WebVitalsMetrics;
      memory: MemoryInfo | null;
    };
  } {
    const slowOperations = this.measurements.filter(
      m => m.duration > this.thresholds['slow-operation']
    ).length;

    const averageDuration = this.measurements.length > 0
      ? this.measurements.reduce((sum, m) => sum + m.duration, 0) / this.measurements.length
      : 0;

    return {
      summary: {
        totalMeasurements: this.measurements.length,
        averageDuration,
        slowOperations,
        issues: this.detectIssues()
      },
      details: {
        measurements: this.measurements,
        webVitals: this.webVitals,
        memory: this.getMemoryInfo()
      }
    };
  }

  /**
   * 測定値をクリア
   */
  clearMeasurements(): void {
    this.measurements = [];
  }

  /**
   * しきい値の設定
   */
  setThresholds(thresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  // プライベートメソッド

  private initializeWebVitalsTracking(): void {
    // ページロード完了後にWeb Vitalsの追跡を開始
    if (document.readyState === 'complete') {
      this.trackWebVitals();
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.trackWebVitals(), 0);
      });
    }
  }

  private observePerformanceEntry(
    entryType: string,
    callback: (entry: PerformanceEntry) => void
  ): void {
    try {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(callback);
        });
        observer.observe({ entryTypes: [entryType] });
      } else {
        // フォールバック: 既存のエントリをチェック
        const entries = performance.getEntriesByType(entryType);
        entries.forEach(callback);
      }
    } catch (error) {
      logger.warn(`Failed to observe ${entryType}`, { error });
    }
  }
}

/**
 * グローバルパフォーマンスモニター シングルトンインスタンス
 */
export const performanceMonitor = new PerformanceMonitor();
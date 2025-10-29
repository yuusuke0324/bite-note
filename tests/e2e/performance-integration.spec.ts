/**
 * TASK-301: パフォーマンス統合テスト
 * TASK-202のパフォーマンス監視とCI/CD統合
 */

import { test, expect } from '@playwright/test';
import {
  createTestFishingRecord,
  navigateToRecordsList,
  openTideGraphTab,
  assertTideGraphVisible,
  collectPerformanceMetrics,
  defaultTestRecord
} from './helpers/test-helpers';
import { TestIds } from '../../src/constants/testIds';

test.describe('TASK-301-008: レンダリング性能測定', () => {
  test('should meet performance requirements', async ({ page }) => {
    // Given: パフォーマンス測定の準備
    await page.goto('/');

    // Performance Observer のセットアップ
    await page.addInitScript(() => {
      window.performanceData = {
        paintTimings: [],
        navigationTiming: performance.timing,
        layoutShifts: []
      };

      // Paint タイミングの収集
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint' || entry.name === 'largest-contentful-paint') {
            window.performanceData.paintTimings.push({
              name: entry.name,
              startTime: entry.startTime
            });
          }
        }
      }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

      // Layout Shift の収集
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) return;
          window.performanceData.layoutShifts.push({
            value: entry.value,
            startTime: entry.startTime
          });
        }
      }).observe({ entryTypes: ['layout-shift'] });
    });

    // When: 潮汐グラフをロード
    const startTime = Date.now();

    await navigateToRecordsList(page);
    await createTestFishingRecord(page, defaultTestRecord);
    await page.click(`[data-testid="${TestIds.RECORD_ITEM(defaultTestRecord.id)}"]`);
    await openTideGraphTab(page);
    await assertTideGraphVisible(page);

    const endTime = Date.now();
    const totalLoadTime = endTime - startTime;

    // Then: パフォーマンス要件を満たす
    const performanceData = await page.evaluate(() => window.performanceData);

    // First Contentful Paint < 1.5秒（1500ms）
    const fcp = performanceData.paintTimings.find(p => p.name === 'first-contentful-paint');
    if (fcp) {
      expect(fcp.startTime).toBeLessThan(1500);
      console.log(`First Contentful Paint: ${fcp.startTime}ms`);
    }

    // Largest Contentful Paint < 2秒（2000ms）
    const lcp = performanceData.paintTimings.find(p => p.name === 'largest-contentful-paint');
    if (lcp) {
      expect(lcp.startTime).toBeLessThan(2000);
      console.log(`Largest Contentful Paint: ${lcp.startTime}ms`);
    }

    // Cumulative Layout Shift < 0.1
    const totalCLS = performanceData.layoutShifts.reduce((sum, shift) => sum + shift.value, 0);
    expect(totalCLS).toBeLessThan(0.1);
    console.log(`Cumulative Layout Shift: ${totalCLS}`);

    // 全体的なロード時間 < 3秒
    expect(totalLoadTime).toBeLessThan(3000);
    console.log(`Total Load Time: ${totalLoadTime}ms`);

    // パフォーマンスサマリーの表示（失敗予定・未実装）
    const perfSummary = await page.locator('[data-testid="performance-summary"]');
    await expect(perfSummary).toBeVisible(); // 失敗予定
  });

  test('should measure graph rendering performance', async ({ page }) => {
    await page.goto('/');

    // グラフ特有のパフォーマンス測定
    await page.addInitScript(() => {
      window.graphMetrics = {
        renderStart: 0,
        renderEnd: 0,
        frameCount: 0
      };

      // Canvas レンダリングの測定
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
        if (contextType === '2d') {
          window.graphMetrics.renderStart = performance.now();
        }
        return originalGetContext.call(this, contextType, contextAttributes);
      };
    });

    await page.click('[data-testid="fishing-records-link"]');
    await createTestRecord(page);
    await page.click('[data-testid^="record-"]');

    const renderStartTime = Date.now();
    await page.click('[data-testid="tide-graph-tab"]');
    await page.waitForSelector('[data-testid="tide-graph-canvas"]');
    const renderEndTime = Date.now();

    const graphRenderTime = renderEndTime - renderStartTime;

    // グラフ描画時間 < 1秒
    expect(graphRenderTime).toBeLessThan(1000);
    console.log(`Graph Render Time: ${graphRenderTime}ms`);

    // Canvas API パフォーマンスメトリクス（失敗予定）
    const canvasMetrics = await page.locator('[data-testid="canvas-metrics"]');
    await expect(canvasMetrics).toBeVisible(); // 失敗予定
  });
});

test.describe('TASK-301-009: メモリ使用量監視', () => {
  test('should stay within memory limits', async ({ page }) => {
    await page.goto('/');

    // メモリ測定の準備
    await page.addInitScript(() => {
      window.memorySnapshots = [];

      const takeSnapshot = (label) => {
        if (performance.memory) {
          window.memorySnapshots.push({
            label,
            timestamp: Date.now(),
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          });
        }
      };

      window.takeMemorySnapshot = takeSnapshot;
      takeSnapshot('initial');
    });

    // Given: メモリ使用量の初期状態
    await page.evaluate(() => window.takeMemorySnapshot('after-page-load'));

    // When: 複数の釣果記録を連続表示
    await page.click('[data-testid="fishing-records-link"]');

    for (let i = 0; i < 5; i++) {
      await createTestRecord(page, `test-record-${i}`);
      await page.click(`[data-testid="record-test-record-${i}"]`);
      await page.click('[data-testid="tide-graph-tab"]');
      await page.waitForSelector('[data-testid="tide-graph-canvas"]');

      await page.evaluate((index) => {
        window.takeMemorySnapshot(`after-record-${index}`);
      }, i);

      await page.goBack();
      await page.waitForSelector('[data-testid="fishing-records-list"]');
    }

    // メモリ使用量の分析
    const snapshots = await page.evaluate(() => window.memorySnapshots);

    if (snapshots.length > 0) {
      const initialMemory = snapshots[0];
      const peakMemory = snapshots.reduce((max, snapshot) =>
        snapshot.usedJSHeapSize > max.usedJSHeapSize ? snapshot : max
      );
      const finalMemory = snapshots[snapshots.length - 1];

      console.log('Memory Analysis:');
      console.log(`Initial: ${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Peak: ${(peakMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Final: ${(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);

      // Then: ピークメモリ使用量 < 100MB
      expect(peakMemory.usedJSHeapSize / 1024 / 1024).toBeLessThan(100);

      // メモリリークがない（最終使用量が初期の2倍以内）
      const memoryGrowthRatio = finalMemory.usedJSHeapSize / initialMemory.usedJSHeapSize;
      expect(memoryGrowthRatio).toBeLessThan(2.0);

      // TASK-202の基準を満たす
      console.log(`Memory growth ratio: ${memoryGrowthRatio.toFixed(2)}`);
    }

    // メモリリーク警告の表示確認（失敗予定）
    const memoryWarning = await page.locator('[data-testid="memory-warning"]');
    await expect(memoryWarning).toBeHidden(); // メモリリークがない場合は非表示
  });
});

test.describe('TASK-301-010: CI/CD統合パフォーマンステスト', () => {
  test('should integrate with existing performance monitoring', async ({ page }) => {
    // TASK-202で作成したパフォーマンス監視との連携
    await page.goto('/');

    // パフォーマンス監視スクリプトの動作確認
    const performanceConfig = await page.evaluate(async () => {
      try {
        const response = await fetch('/performance.config.json');
        return response.ok ? await response.json() : null;
      } catch {
        return null;
      }
    });

    // 設定ファイルが存在し、適切な閾値が設定されている
    expect(performanceConfig).toBeTruthy(); // TASK-202で作成されているはず

    if (performanceConfig) {
      expect(performanceConfig.thresholds.maxExecutionTime).toBe(2000); // 2秒
      expect(performanceConfig.thresholds.maxMemoryUsage).toBe(100 * 1024 * 1024); // 100MB
    }

    // パフォーマンステストの実行
    await page.click('[data-testid="fishing-records-link"]');
    await createTestRecord(page);

    const startTime = performance.now();
    await page.click('[data-testid^="record-"]');
    await page.click('[data-testid="tide-graph-tab"]');
    await page.waitForSelector('[data-testid="tide-graph-canvas"]');
    const endTime = performance.now();

    const executionTime = endTime - startTime;

    // TASK-202の基準（2秒以内）を満たす
    expect(executionTime).toBeLessThan(2000);

    // パフォーマンステスト結果の記録（失敗予定）
    const perfResults = await page.locator('[data-testid="perf-test-results"]');
    await expect(perfResults).toBeVisible(); // 失敗予定

    // CI/CD統合情報の確認（失敗予定）
    const cicdIntegration = await page.locator('[data-testid="cicd-performance-status"]');
    await expect(cicdIntegration).toContainText('PASS'); // 失敗予定
  });

  test('should report performance metrics to monitoring system', async ({ page }) => {
    await page.goto('/');

    // メトリクス送信の確認
    let performanceReports = [];

    page.on('response', response => {
      if (response.url().includes('/api/performance-metrics')) {
        performanceReports.push({
          url: response.url(),
          status: response.status(),
          timestamp: Date.now()
        });
      }
    });

    // パフォーマンステストの実行
    await page.click('[data-testid="fishing-records-link"]');
    await createTestRecord(page);
    await page.click('[data-testid^="record-"]');
    await page.click('[data-testid="tide-graph-tab"]');
    await page.waitForSelector('[data-testid="tide-graph-canvas"]');

    // メトリクスレポートが送信されている（失敗予定・未実装）
    await page.waitForTimeout(1000); // 送信を待つ
    expect(performanceReports.length).toBeGreaterThan(0); // 失敗予定

    if (performanceReports.length > 0) {
      expect(performanceReports[0].status).toBe(200);
    }
  });
});

// ヘルパー関数
async function createTestRecord(page, recordId = 'test-record') {
  await page.click('[data-testid="add-record-button"]');

  await page.fill('[data-testid="location-name"]', '東京湾');
  await page.fill('[data-testid="latitude"]', '35.6762');
  await page.fill('[data-testid="longitude"]', '139.6503');
  await page.fill('[data-testid="fishing-date"]', '2024-07-15');

  // 記録IDの設定
  await page.fill('[data-testid="record-id"]', recordId);

  await page.click('[data-testid="save-record-button"]');
  await page.waitForSelector(`[data-testid="record-${recordId}"]`);
}
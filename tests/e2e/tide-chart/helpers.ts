// E2E Test Helpers for TideChart Component
import { Page, expect } from '@playwright/test';
import { TestIds } from '../../../src/constants/testIds';

// Test Data Sets
export const validTideData = [
  { time: '00:00', tide: 120 },
  { time: '03:00', tide: 80 },
  { time: '06:00', tide: 200 },
  { time: '09:00', tide: 150 },
  { time: '12:00', tide: 90 },
  { time: '15:00', tide: 180 },
  { time: '18:00', tide: 140 },
  { time: '21:00', tide: 110 }
];

export const invalidTideData = [
  { time: 'invalid', tide: 'invalid' },
  { time: '25:00', tide: -2000 }
];

export const largeTideDataset = Array.from({ length: 50000 }, (_, i) => ({
  time: `${Math.floor(i / 60).toString().padStart(2, '0')}:${(i % 60).toString().padStart(2, '0')}`,
  tide: Math.sin(i * 0.01) * 100 + 120
}));

// Page Object Model for TideChart
export class TideChartPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('domcontentloaded');

    // ModernAppなので、ボトムナビゲーションから潮汐グラフタブをクリック
    const tideChartTab = this.page.locator(`[data-testid="${TestIds.TIDE_GRAPH_TAB}"]`);
    await tideChartTab.waitFor({ state: 'visible', timeout: 10000 });
    await tideChartTab.click();

    // チャートの表示を待機
    await this.page.waitForTimeout(1000); // アニメーション待機
  }

  async waitForChart() {
    await this.page.waitForSelector('[data-testid="tide-chart"]', { timeout: 10000 });
  }

  getChartElement() {
    return this.page.locator('[data-testid="tide-chart"]');
  }

  getDataPoints() {
    // TideChartはカスタムdata-pointを使用
    return this.page.locator('[data-testid^="data-point-"]');
  }

  getTooltip() {
    return this.page.locator('.recharts-tooltip-wrapper');
  }

  getErrorMessage() {
    return this.page.locator('[data-testid="error-message"]');
  }

  getFallbackTable() {
    return this.page.locator('[data-testid="fallback-table"]');
  }

  getThemeSelector() {
    return this.page.locator('[data-testid="theme-selector"]');
  }

  async selectTheme(theme: string) {
    await this.page.selectOption('[data-testid="theme-selector"]', theme);
  }

  async hoverDataPoint(index: number = 0) {
    const dataPoints = this.getDataPoints();
    await dataPoints.nth(index).hover();
  }

  async clickDataPoint(index: number = 0) {
    const dataPoints = this.getDataPoints();
    await dataPoints.nth(index).click();
  }

  async navigateWithKeyboard(key: string) {
    await this.page.keyboard.press(key);
  }

  async expectVisible() {
    await expect(this.getChartElement()).toBeVisible();
  }

  async expectChartRendered() {
    await this.expectVisible();
    await expect(this.page.locator('[role="img"]')).toBeVisible();
    await expect(this.page.locator('.recharts-line')).toBeVisible();
  }

  async expectAxisLabelsVisible() {
    await expect(this.page.locator('.recharts-xAxis .recharts-cartesian-axis-tick').first()).toBeVisible();
    await expect(this.page.locator('.recharts-yAxis .recharts-cartesian-axis-tick').first()).toBeVisible();
  }

  async expectErrorState() {
    await expect(this.getErrorMessage()).toBeVisible();
  }

  async expectFallbackState() {
    await expect(this.getFallbackTable()).toBeVisible();
  }
}

// Mock API Helpers
export class MockAPIHelper {
  constructor(private page: Page) {}

  async mockValidData() {
    await this.page.route('/api/tide-data', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ data: validTideData })
      });
    });
  }

  async mockInvalidData() {
    await this.page.route('/api/tide-data', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ data: invalidTideData })
      });
    });
  }

  async mockEmptyData() {
    await this.page.route('/api/tide-data', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [] })
      });
    });
  }

  async mockNetworkError() {
    await this.page.route('/api/tide-data', route => {
      route.abort();
    });
  }

  async mockServerError() {
    await this.page.route('/api/tide-data', route => {
      route.fulfill({ status: 500 });
    });
  }

  async mockLargeDataset() {
    await this.page.route('/api/tide-data', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ data: largeTideDataset })
      });
    });
  }

  async mockDelayedResponse(delay: number = 2000) {
    await this.page.route('/api/tide-data', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: validTideData })
        });
      }, delay);
    });
  }
}

// Performance Measurement Helpers
export class PerformanceHelper {
  constructor(private page: Page) {}

  async measureRenderTime(): Promise<number> {
    const startTime = Date.now();
    await this.page.waitForSelector('[data-testid="tide-chart"]');
    return Date.now() - startTime;
  }

  async measureDataUpdateTime(): Promise<number> {
    const startTime = Date.now();
    await this.page.click('[data-testid="refresh-data"]');
    await this.page.waitForSelector('[data-testid="data-updated"]');
    return Date.now() - startTime;
  }

  async measureResizeTime(): Promise<number> {
    const startTime = Date.now();
    await this.page.setViewportSize({ width: 800, height: 600 });
    await this.page.waitForFunction(() => {
      const chart = document.querySelector('[data-testid="tide-chart"]');
      return chart && chart.clientWidth <= 800;
    });
    return Date.now() - startTime;
  }

  async getMemoryUsage(): Promise<number> {
    return await this.page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });
  }
}

// Accessibility Helpers
export class AccessibilityHelper {
  constructor(private page: Page) {}

  async checkARIAAttributes() {
    const chart = this.page.locator('[data-testid="tide-chart"]');

    const role = await chart.getAttribute('role');
    const ariaLabel = await chart.getAttribute('aria-label');
    const ariaDescribedBy = await chart.getAttribute('aria-describedby');

    return { role, ariaLabel, ariaDescribedBy };
  }

  async checkFocusIndicator() {
    await this.page.keyboard.press('Tab');
    const focusedElement = this.page.locator(':focus');
    const outline = await focusedElement.evaluate(el => getComputedStyle(el).outline);
    return outline;
  }

  async checkKeyboardNavigation() {
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('ArrowRight');
    await this.page.keyboard.press('ArrowLeft');
    await this.page.keyboard.press('Home');
    await this.page.keyboard.press('End');

    const focusedIndex = await this.page.getAttribute('[data-testid="tide-chart"]', 'data-focused-index');
    return parseInt(focusedIndex || '0');
  }

  async checkScreenReaderContent() {
    const description = await this.page.locator('[data-testid="chart-description"]').textContent();
    const pointDescription = await this.page.locator('[data-testid="point-description"]').textContent();
    return { description, pointDescription };
  }
}

// Visual Regression Helpers
export class VisualRegressionHelper {
  constructor(private page: Page) {}

  async captureScreenshot(name: string) {
    await this.page.waitForSelector('[data-testid="tide-chart"]');
    await this.page.waitForLoadState('networkidle');
    return await this.page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
  }

  async compareScreenshot(name: string) {
    await this.page.waitForSelector('[data-testid="tide-chart"]', { timeout: 30000 });
    await this.page.waitForLoadState('networkidle');

    // CI環境での閾値調整
    const isCI = process.env.CI === 'true';
    const config = {
      threshold: isCI ? 0.2 : 0.1,
      animations: 'disabled' as const,
    };

    await expect(this.page).toHaveScreenshot(`${name}.png`, config);
  }
}

// Device and Browser Helpers
export const DEVICE_VIEWPORTS = {
  desktop: { width: 1200, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
};

export class DeviceHelper {
  constructor(private page: Page) {}

  async setDesktop() {
    await this.page.setViewportSize(DEVICE_VIEWPORTS.desktop);
  }

  async setTablet() {
    await this.page.setViewportSize(DEVICE_VIEWPORTS.tablet);
  }

  async setMobile() {
    await this.page.setViewportSize(DEVICE_VIEWPORTS.mobile);
  }

  async testResponsiveFlow() {
    await this.setDesktop();
    await this.page.waitForTimeout(100);

    await this.setTablet();
    await this.page.waitForTimeout(100);

    await this.setMobile();
    await this.page.waitForTimeout(100);
  }
}

// Test Utilities
export async function waitForChartLoad(page: Page) {
  await page.waitForSelector('[data-testid="tide-chart"]');
  await page.waitForSelector('.recharts-line');
  await page.waitForLoadState('networkidle');
}

export async function ensureNoConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  return () => {
    expect(errors).toEqual([]);
  };
}

/**
 * テスト前にクリーンな状態を保証するヘルパー関数
 * - LocalStorage/sessionStorageをクリア
 * - IndexedDBをクリア
 * - アプリケーション初期化を待機
 *
 * **使用例**:
 * ```typescript
 * test.beforeEach(async ({ page }) => {
 *   await setupCleanPage(page);
 * });
 * ```
 */
export async function setupCleanPage(page: Page) {
  // LocalStorageアクセスエラーを回避するため、実際のページにアクセスしてからクリア
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // LocalStorage/sessionStorage/IndexedDBを完全にクリア
  await page.evaluate(async () => {
    try {
      // LocalStorage/sessionStorageクリア
      if (typeof Storage !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }

      // IndexedDBクリア（BiteNoteDBを削除）
      if (typeof indexedDB !== 'undefined') {
        const databases = ['BiteNoteDB'];
        // IndexedDB削除を非同期で実行し、完了を待機
        const deletePromises = databases.map(dbName => {
          return new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase(dbName);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve(); // エラーでも続行
            request.onblocked = () => {
              console.log(`IndexedDB ${dbName} deletion blocked`);
              // ブロックされても一定時間後に続行
              setTimeout(() => resolve(), 1000);
            };
          });
        });
        await Promise.all(deletePromises);
      }
    } catch (e) {
      // アクセスができない場合は無視
      console.log('Storage clear skipped:', e);
    }
  });

  // 🟢 改善1: IndexedDB削除完了を確実に確認
  await page.evaluate(async () => {
    if (typeof indexedDB !== 'undefined') {
      // 削除完了を確認（最大10回、100msごとにチェック）
      for (let i = 0; i < 10; i++) {
        const dbs = await indexedDB.databases();
        const hasBiteNoteDB = dbs.some(db => db.name === 'BiteNoteDB');
        if (!hasBiteNoteDB) {
          return; // 削除完了
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  });

  // 🟢 改善2: goto()で再初期化（reload()より確実）
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // 🟢 改善3: waitForTimeoutではなく、実際のUIが表示されるまで待機
  await page.waitForSelector(
    `[data-testid="${TestIds.FORM_TAB}"]`,
    { timeout: 20000, state: 'visible' }
  );

  // 🟢 改善4: タブUIが操作可能か確認
  const formTab = page.locator(`[data-testid="${TestIds.FORM_TAB}"]`);
  await expect(formTab).toBeEnabled();

  // 🟢 改善5: App.tsx初期化が完了したことを確認（エラー表示がないこと）
  const errorDisplay = page.locator('[data-testid="error-message"]');
  const errorCount = await errorDisplay.count();
  if (errorCount > 0) {
    await expect(errorDisplay).not.toBeVisible({ timeout: 1000 });
  }
}
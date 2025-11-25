// E2E Test Helpers for TideChart Component
import { Page, expect } from '@playwright/test';
import { TestIds } from '../../../src/constants/testIds';
import { waitForAppInit } from '../helpers/test-helpers';

/**
 * テスト用ヘルパー関数: テスト用釣果記録を作成
 *
 * CI環境でIndexedDBが空の場合に、テストデータを自動作成します。
 * IndexedDBに直接データを挿入する方法を使用します。
 */
async function createTestRecord(page: Page) {
  // IndexedDBに直接テストレコードを挿入
  await page.evaluate(() => {
    return new Promise<void>((resolve, reject) => {
      // setupCleanPage() でセットされたテスト用DB名を使用
      const dbName = (globalThis as any).__TEST_DB_NAME__ || 'FishingRecordDB';
      // バージョン指定なし - Dexieが作成したDBをそのまま開く
      const request = indexedDB.open(dbName);

      request.onerror = () => {
        console.error('[createTestRecord] IndexedDB open error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const db = request.result;

        // fishing_records テーブルが存在するか確認
        if (!db.objectStoreNames.contains('fishing_records')) {
          console.error('[createTestRecord] fishing_records table not found');
          reject(new Error('fishing_records table not found'));
          return;
        }

        const transaction = db.transaction(['fishing_records'], 'readwrite');
        const store = transaction.objectStore('fishing_records');

        // テスト用釣果記録データ
        const testRecord = {
          id: 'test-record-' + Date.now(),
          fishSpecies: 'テスト魚種',
          size: 30,
          location: 'テスト地点',
          coordinates: {
            latitude: 35.6812,
            longitude: 139.7671
          },
          date: new Date(),
          weather: '晴れ',
          notes: 'E2Eテスト用データ',
          photos: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const addRequest = store.add(testRecord);

        addRequest.onsuccess = () => {
          console.log('[createTestRecord] テストレコードをIndexedDBに挿入しました (DB: ' + dbName + ')');
          db.close();
          resolve();
        };

        addRequest.onerror = () => {
          console.error('[createTestRecord] Add record error:', addRequest.error);
          db.close();
          reject(addRequest.error);
        };
      };

    });
  });

  // ページをリロードしてデータを反映
  await page.reload();

  // Fixed: Issue #226 - E2Eテストの初期化パターンを統一
  await page.waitForSelector('[data-app-initialized]', { timeout: 10000 });
}

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

  /**
   * 潮汐グラフを表示（記録詳細画面経由）
   *
   * 処理フロー:
   * 1. ホーム画面に移動
   * 2. 記録が存在しない場合は自動作成
   * 3. 最初の記録カードをクリック（記録詳細画面を開く）
   * 4. 潮汐グラフトグルボタンをクリック（グラフを展開）
   * 5. グラフの表示を待つ（潮汐API計算完了を待機）
   */
  async goto() {
    // Step 1: ホーム画面に移動
    await this.page.goto('/');

    // Fixed: Issue #226 - E2Eテストの初期化パターンを統一
    await this.page.waitForSelector('[data-app-initialized]', { timeout: 10000 });

    // Step 2: 記録が存在しない場合は自動作成
    const recordCount = await this.page.locator('[data-testid^="record-"]').count();
    if (recordCount === 0) {
      console.log('[TideChartPage.goto] 釣果記録が存在しないため、テストデータを作成します');
      await createTestRecord(this.page);
    }

    // Step 3: 最初の記録カードをクリック（記録詳細画面を開く）
    const firstRecord = this.page.locator('[data-testid^="record-"]').first();
    await expect(firstRecord).toBeVisible({ timeout: 10000 });
    await firstRecord.click();

    // Step 4: 記録詳細画面が開いたことを確認
    await this.page.waitForSelector('[data-testid="tide-integration-section"]', { timeout: 10000 });

    // Step 5: 潮汐グラフトグルボタンをクリック（グラフを展開）
    const toggleButton = this.page.locator('[data-testid="tide-graph-toggle-button"]');
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();

    // Step 6: グラフの完全なロードを待つ（waitForChart()を使用）
    await this.waitForChart();
  }

  /**
   * 潮汐グラフの完全なロードを待機
   *
   * 段階的待機戦略:
   * 1. tide-chartの表示を待つ
   * 2. Rechartsのレンダリング完了を待つ（recharts-lineの存在確認）
   * 3. 最低1つのデータポイントが表示されることを確認
   */
  async waitForChart() {
    // 1. tide-chartの表示を待つ
    await this.page.waitForSelector('[data-testid="tide-chart"]', {
      state: 'visible',
      timeout: 15000
    });

    // 2. Rechartsのレンダリング完了を待つ（recharts-lineの存在確認）
    await this.page.waitForSelector(
      '[data-testid="tide-graph-canvas"] .recharts-line',
      {
        state: 'attached',
        timeout: 15000
      }
    );

    // 3. 最低1つのデータポイントが表示されることを確認（スコープ限定版）
    // データポイントの数を確認して、実際にレンダリングされていることを検証
    await this.page.waitForFunction(() => {
      const dataPoints = document.querySelectorAll('[data-testid="tide-chart"] [data-testid^="data-point-"]');
      return dataPoints.length > 0;
    }, { timeout: 10000 });
  }

  getChartElement() {
    return this.page.locator('[data-testid="tide-chart"]');
  }

  // TideIntegration 実装に合わせたヘルパーメソッド

  getTideError() {
    return this.page.locator('[data-testid="tide-error"]');
  }

  getTideLoading() {
    return this.page.locator('[data-testid="tide-loading"]');
  }

  getCoordinatesError() {
    return this.page.locator('[data-testid="coordinates-error"]');
  }

  getTooltip() {
    return this.page.locator('.recharts-tooltip-wrapper');
  }

  getFallbackTable() {
    return this.page.locator('[data-testid="fallback-table"]');
  }

  async expectTideError() {
    await expect(this.getTideError()).toBeVisible();
  }

  async expectCoordinatesError() {
    await expect(this.getCoordinatesError()).toBeVisible();
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
    // .recharts-lineはvisibility:hiddenの場合があるので、attachedで確認
    await expect(this.page.locator('.recharts-line').first()).toBeAttached();
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

  // ========================================
  // 追加実装メソッド（Issue #181対応）
  // ========================================

  /**
   * チャートのデータポイント要素を取得
   *
   * Note:
   * - カスタムDataPointコンポーネントのdata-testidに依存
   * - TideChartスコープ内に限定して誤検知を防止
   * - セレクタ: [data-testid="tide-chart"] [data-testid^="data-point-"]
   */
  getDataPoints() {
    // TideChartスコープ内に限定（他のチャートコンポーネントとの衝突を防止）
    return this.page.locator('[data-testid="tide-chart"] [data-testid^="data-point-"]');
  }

  /**
   * エラーメッセージ要素を取得
   * getTideError()のエイリアス（テストコードとの互換性のため両方提供）
   */
  getErrorMessage() {
    return this.getTideError();
  }

  /**
   * チャートの内部サイズ（clientWidth）を取得
   *
   * Note: boundingBox ではなく clientWidth を使用する理由：
   * - TideChart は最小サイズ 600x300 を強制（TideChart.tsx Line 863-864）
   * - モバイルでは親コンテナが overflow-x-auto のため、boundingBox と clientSize が異なる
   *
   * @returns チャートの clientWidth (px)
   */
  async getChartWidth(): Promise<number> {
    return this.getChartElement().evaluate(el => el.clientWidth);
  }

  /**
   * チャートの内部サイズ（clientHeight）を取得
   * @returns チャートの clientHeight (px)
   */
  async getChartHeight(): Promise<number> {
    return this.getChartElement().evaluate(el => el.clientHeight);
  }

  /**
   * データポイントにホバー
   * @param index データポイントのインデックス（0始まり）
   */
  async hoverDataPoint(index: number) {
    const dataPoints = this.getDataPoints();
    await dataPoints.nth(index).hover();
  }

  /**
   * データポイントをクリック
   * @param index データポイントのインデックス（0始まり）
   */
  async clickDataPoint(index: number) {
    const dataPoints = this.getDataPoints();
    await dataPoints.nth(index).click();
  }

  /**
   * テーマを選択
   *
   * Note: 実際のUI実装に合わせて調整が必要
   * 現在はdata-testid="theme-selector"を想定
   *
   * @param theme テーマ名 ('light' | 'dark' | 'high-contrast')
   * @throws セレクターが見つからない場合はエラーをthrow
   */
  async selectTheme(theme: 'light' | 'dark' | 'high-contrast') {
    const selector = this.page.locator('[data-testid="theme-selector"]');

    // 実装が存在しない場合はテストをスキップ（明示的）
    if (await selector.count() === 0) {
      throw new Error(
        `テーマセレクター [data-testid="theme-selector"] が実装されていません。` +
        `このテストはスキップしてください。`
      );
    }

    await selector.selectOption(theme);
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
      maxDiffPixelRatio: 0.02, // 2%までのpixel差異を許容（緊急措置、Issue #187）
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
  // Wait for at least one recharts line to be rendered (multiple may exist in CI)
  await page.waitForSelector('.recharts-line >> nth=0');
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
  // テスト用の一意なDB名を生成（タイムスタンプ + ランダム値）
  const testDbName = `FishingRecordDB_Test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // ブラウザコンテキストにDB名を注入（ページロード前）
  await page.addInitScript((dbName) => {
    (globalThis as any).__TEST_DB_NAME__ = dbName;
  }, testDbName);

  // ページアクセス（IndexedDB削除不要 → 高速化）
  await page.goto('/');

  // Fixed: Issue #226 & #228 - 共通の初期化待機関数を使用（より堅牢）
  await waitForAppInit(page);

  // タブUIが操作可能か確認
  const homeTab = page.locator('[data-testid="home-tab"]');
  await expect(homeTab).toBeEnabled();
}
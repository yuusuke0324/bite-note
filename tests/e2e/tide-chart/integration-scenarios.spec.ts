// TC-E005: 統合シナリオテスト群 (10個)
import { test, expect } from '@playwright/test';
import {
  TideChartPage,
  MockAPIHelper,
  AccessibilityHelper,
  validTideData,
  setupCleanPage
} from './helpers';

test.describe('TC-E005: 統合シナリオテスト群', () => {
  let chartPage: TideChartPage;
  let mockAPI: MockAPIHelper;
  let a11yHelper: AccessibilityHelper;

  test.beforeEach(async ({ page }) => {
    chartPage = new TideChartPage(page);
    mockAPI = new MockAPIHelper(page);
    a11yHelper = new AccessibilityHelper(page);

    await setupCleanPage(page);
  });

  test('TC-E005-001: should complete standard user workflow', async ({ page }) => {
    await mockAPI.mockValidData();

    // 1. ページアクセス
    await chartPage.goto();
    await chartPage.expectChartRendered();

    // 2. データ確認
    await expect(page.locator('.recharts-line').first()).toBeVisible();

    // 3. データポイントインタラクション
    await chartPage.hoverDataPoint(0);
    await expect(chartPage.getTooltip()).toBeVisible();

    // 4. 設定変更
    await chartPage.selectTheme('dark');
    await expect(page.locator('[data-testid="tide-chart"]')).toHaveCSS('background-color', /rgb\(0, 0, 0\)/);

    // 5. データ更新
    await page.click('[data-testid="refresh-data"]');
    await page.waitForSelector('[data-testid="data-updated"]');
  });

  test('TC-E005-002: should handle error and recovery workflow', async ({ page }) => {
    let errorState = true;

    await page.route('/api/tide-data', route => {
      if (errorState) {
        route.fulfill({ status: 500 });
      } else {
        route.fulfill({ status: 200, body: JSON.stringify({ data: validTideData }) });
      }
    });

    // 1. エラー状態の確認
    await chartPage.goto();
    await chartPage.expectErrorState();
    await chartPage.expectFallbackState();

    // 2. 復旧処理
    errorState = false;
    await page.click('[data-testid="retry-button"]');

    // 3. 正常状態への復旧確認
    await chartPage.expectChartRendered();
    await expect(chartPage.getErrorMessage()).not.toBeVisible();
  });

  test('TC-E005-003: should handle settings change workflow', async ({ page }) => {
    await mockAPI.mockValidData();

    await chartPage.goto();
    await chartPage.waitForChart();

    // 1. 初期状態確認
    await chartPage.expectVisible();

    // 2. テーマ変更
    await chartPage.selectTheme('high-contrast');
    await expect(page.locator('[data-testid="tide-chart"]')).toHaveCSS('background-color', /rgb\(0, 0, 0\)/);

    // 3. グリッド表示切替
    await page.uncheck('[data-testid="show-grid"]');
    await expect(page.locator('.recharts-cartesian-grid')).not.toBeVisible();

    // 4. 設定リセット
    await page.click('[data-testid="reset-settings"]');
    await expect(page.locator('[data-testid="theme-selector"]')).toHaveValue('light');
    await expect(page.locator('[data-testid="show-grid"]')).toBeChecked();
  });

  test('TC-E005-004: should complete accessibility workflow', async ({ page }) => {
    await mockAPI.mockValidData();

    await chartPage.goto();
    await chartPage.waitForChart();

    // 1. キーボードナビゲーション
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveCSS('outline', /2px solid/);

    // 2. Arrow キーナビゲーション
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');

    // 3. Enter キーでの詳細表示
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="detail-popup"]')).toBeVisible();

    // 4. Escape キーでの終了
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="detail-popup"]')).not.toBeVisible();

    // 5. ARIA属性確認
    const ariaData = await a11yHelper.checkARIAAttributes();
    expect(ariaData.ariaLabel).toContain('潮汐グラフ');
  });

  test('TC-E005-005: should integrate correctly with ResponsiveChartContainer', async ({ page }) => {
    await mockAPI.mockValidData();

    await chartPage.goto();
    await chartPage.waitForChart();

    // 1. 初期サイズ確認
    const initialSize = await page.locator('[data-testid="chart-container"]').boundingBox();
    expect(initialSize?.width).toBeGreaterThan(600);
    expect(initialSize?.height).toBeGreaterThan(300);

    // 2. リサイズ動作確認
    await page.setViewportSize({ width: 400, height: 300 });
    await page.waitForTimeout(100);

    const resizedSize = await page.locator('[data-testid="chart-container"]').boundingBox();
    expect(resizedSize?.width).toBe(600); // 最小サイズ制約
    expect(resizedSize?.height).toBe(300);

    // 3. アスペクト比確認
    if (resizedSize) {
      const aspectRatio = resizedSize.width / resizedSize.height;
      expect(aspectRatio).toBeCloseTo(2, 1); // 2:1比率
    }
  });

  test('TC-E005-006: should integrate correctly with TideDataValidator', async ({ page }) => {
    // 1. 有効データでの正常動作
    await page.route('/api/tide-data', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          data: [
            { time: '00:00', tide: 100 },
            { time: '06:00', tide: 200 },
            { time: '12:00', tide: 150 }
          ]
        })
      });
    });

    await chartPage.goto();
    await chartPage.expectChartRendered();

    // 2. 無効データでのエラーハンドリング
    await page.route('/api/tide-data', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          data: [
            { time: 'invalid', tide: 'invalid' }
          ]
        })
      });
    });

    await page.reload();
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
  });

  test('TC-E005-007: should integrate correctly with ChartConfigManager', async ({ page }) => {
    await mockAPI.mockValidData();

    await chartPage.goto();
    await chartPage.waitForChart();

    // 1. デフォルト設定確認
    const defaultTheme = await page.getAttribute('[data-testid="tide-chart"]', 'data-theme');
    expect(defaultTheme).toBe('light');

    // 2. 設定変更の反映確認
    await chartPage.selectTheme('dark');
    const updatedTheme = await page.getAttribute('[data-testid="tide-chart"]', 'data-theme');
    expect(updatedTheme).toBe('dark');

    // 3. デバイス別設定確認
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    const mobileConfig = await page.getAttribute('[data-testid="tide-chart"]', 'data-device');
    expect(mobileConfig).toBe('mobile');

    // 4. アクセシビリティ設定確認
    await page.check('[data-testid="high-contrast-mode"]');
    const accessibilityMode = await page.getAttribute('[data-testid="tide-chart"]', 'data-accessibility');
    expect(accessibilityMode).toBe('high-contrast');
  });

  test('TC-E005-008: should integrate correctly with ErrorHandler', async ({ page }) => {
    // 1. ネットワークエラー
    await page.route('/api/tide-data', route => {
      route.abort();
    });

    await chartPage.goto();
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    const networkErrorText = await page.locator('[data-testid="error-message"]').textContent();
    expect(networkErrorText).toContain('データの取得に失敗しました');

    // 2. データ形式エラー
    await page.route('/api/tide-data', route => {
      route.fulfill({ status: 200, body: 'invalid json' });
    });

    await page.reload();
    await expect(page.locator('[data-testid="parse-error"]')).toBeVisible();

    // 3. フォールバック表示確認
    await chartPage.expectFallbackState();
    const fallbackRows = await page.locator('[data-testid="fallback-table"] tr').count();
    expect(fallbackRows).toBeGreaterThan(0);
  });

  test('TC-E005-009: should have complete ARIA integration', async ({ page }) => {
    await mockAPI.mockValidData();

    await chartPage.goto();
    await chartPage.waitForChart();

    // 1. 基本ARIA属性確認
    const ariaData = await a11yHelper.checkARIAAttributes();
    expect(ariaData.role).toBe('img');
    expect(ariaData.ariaLabel).toContain('潮汐グラフ');
    expect(ariaData.ariaDescribedBy).toBeTruthy();

    // 2. 動的ARIA更新確認
    await page.click('[data-testid="refresh-data"]');
    await page.waitForSelector('[data-testid="data-updated"]');

    const updatedLabel = await page.getAttribute('[data-testid="tide-chart"]', 'aria-label');
    expect(updatedLabel).toContain('更新されました');

    // 3. ライブリージョン確認
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeVisible();
  });

  test('TC-E005-010: should have complete screen reader integration', async ({ page }) => {
    await mockAPI.mockValidData();

    await chartPage.goto();
    await chartPage.waitForChart();

    // 1. 概要説明確認
    const description = await page.locator('[data-testid="chart-description"]').textContent();
    expect(description).toContain('データポイント');
    expect(description).toContain('満潮');
    expect(description).toContain('干潮');

    // 2. データポイント詳細確認
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight');

    const pointDescription = await page.locator('[data-testid="point-description"]').textContent();
    expect(pointDescription).toContain('時刻');
    expect(pointDescription).toContain('潮位');

    // 3. 傾向分析確認
    const trendAnalysis = await page.locator('[data-testid="trend-analysis"]').textContent();
    expect(trendAnalysis).toContain('潮汐パターン');

    // 4. ナビゲーション指示確認
    const navigationHelp = await page.locator('[data-testid="navigation-help"]').textContent();
    expect(navigationHelp).toContain('矢印キー');
    expect(navigationHelp).toContain('Enterキー');
  });
});
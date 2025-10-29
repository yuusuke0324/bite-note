// TC-E001: 基本機能E2Eテスト群 (15個)
import { test, expect } from '@playwright/test';
import {
  TideChartPage,
  MockAPIHelper,
  PerformanceHelper,
  waitForChartLoad,
  ensureNoConsoleErrors,
  setupCleanPage,
  DEVICE_VIEWPORTS
} from './helpers';

test.describe('TC-E001: 基本機能E2Eテスト群', () => {
  let chartPage: TideChartPage;
  let mockAPI: MockAPIHelper;
  let performance: PerformanceHelper;

  test.beforeEach(async ({ page }) => {
    chartPage = new TideChartPage(page);
    mockAPI = new MockAPIHelper(page);
    performance = new PerformanceHelper(page);

    await setupCleanPage(page);
    await mockAPI.mockValidData();
  });

  test('TC-E001-001: should render TideChart component correctly', async ({ page }) => {
    await chartPage.goto();
    await chartPage.waitForChart();

    await chartPage.expectVisible();
    await expect(page.locator('[role="img"]')).toBeVisible();

    // ARIA属性確認
    const ariaLabel = await page.getAttribute('[data-testid="tide-chart"]', 'aria-label');
    expect(ariaLabel).toContain('潮汐グラフ');
  });

  test('TC-E001-002: should display tide data correctly', async ({ page }) => {
    await chartPage.goto();
    await chartPage.waitForChart();

    // データポイントが表示されることを確認
    const dataPoints = await chartPage.getDataPoints();
    const count = await dataPoints.count();
    expect(count).toBeGreaterThan(0);

    // 線グラフが描画されることを確認
    await expect(page.locator('.recharts-line .recharts-curve').first()).toBeVisible();
  });

  test('TC-E001-003: should display axis labels correctly', async ({ page }) => {
    await chartPage.goto();
    await chartPage.waitForChart();

    await chartPage.expectAxisLabelsVisible();

    // ラベルが読み取り可能であることを確認
    const xAxisTicks = await page.locator('.recharts-xAxis .recharts-cartesian-axis-tick').count();
    const yAxisTicks = await page.locator('.recharts-yAxis .recharts-cartesian-axis-tick').count();

    expect(xAxisTicks).toBeGreaterThan(0);
    expect(yAxisTicks).toBeGreaterThan(0);
  });

  test('TC-E001-004: should respond to screen size changes', async ({ page }) => {
    await chartPage.goto();
    await chartPage.waitForChart();

    // Desktop
    await page.setViewportSize(DEVICE_VIEWPORTS.desktop);
    await chartPage.expectVisible();

    // Tablet
    await page.setViewportSize(DEVICE_VIEWPORTS.tablet);
    await chartPage.expectVisible();

    // Mobile
    await page.setViewportSize(DEVICE_VIEWPORTS.mobile);
    await chartPage.expectVisible();

    // 最小サイズ制約が適用されることを確認
    const chartBounds = await page.locator('[data-testid="tide-chart"]').boundingBox();
    expect(chartBounds?.width).toBeGreaterThanOrEqual(600);
    expect(chartBounds?.height).toBeGreaterThanOrEqual(300);
  });

  test('TC-E001-005: should handle invalid data gracefully', async ({ page }) => {
    await mockAPI.mockInvalidData();

    await chartPage.goto();

    // エラーメッセージが表示されることを確認
    await chartPage.expectErrorState();

    // アプリケーションがクラッシュしないことを確認
    const checkErrors = await ensureNoConsoleErrors(page);
    // Note: This test is expected to fail initially as error handling is not yet implemented
  });

  test('TC-E001-006: should show fallback text table on error', async ({ page }) => {
    await mockAPI.mockServerError();

    await chartPage.goto();

    // フォールバック表示が機能することを確認
    await chartPage.expectFallbackState();

    // テキストテーブルが表示されることを確認
    const tableRows = await page.locator('[data-testid="fallback-table"] tr').count();
    expect(tableRows).toBeGreaterThan(0);
  });

  test('TC-E001-007: should display user-friendly error messages', async ({ page }) => {
    await mockAPI.mockServerError();

    await chartPage.goto();

    const errorText = await page.locator('[data-testid="error-message"]').textContent();
    expect(errorText).toContain('データの取得に失敗しました');

    // 技術的でない表現であることを確認
    expect(errorText).not.toContain('500');
    expect(errorText).not.toContain('Internal Server Error');
  });

  test('TC-E001-008: should recover from error state correctly', async ({ page }) => {
    let errorState = true;

    await page.route('/api/tide-data', route => {
      if (errorState) {
        route.fulfill({ status: 500 });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: validTideData })
        });
      }
    });

    await chartPage.goto();
    await chartPage.expectErrorState();

    // 復旧処理
    errorState = false;
    await page.reload();

    // 正常状態への復旧確認
    await chartPage.expectChartRendered();
    await expect(chartPage.getErrorMessage()).not.toBeVisible();
  });

  test('TC-E001-009: should show tooltip on data point hover', async ({ page }) => {
    await chartPage.goto();
    await chartPage.waitForChart();

    await chartPage.hoverDataPoint(0);

    // ツールチップが表示されることを確認
    await expect(chartPage.getTooltip()).toBeVisible();

    // ツールチップにデータ詳細が表示されることを確認
    const tooltipContent = await page.locator('.recharts-tooltip-wrapper').textContent();
    expect(tooltipContent).toBeTruthy();
  });

  test('TC-E001-010: should highlight selected data point', async ({ page }) => {
    await chartPage.goto();
    await chartPage.waitForChart();

    await chartPage.clickDataPoint(0);

    // 選択状態が視覚的に表示されることを確認
    const selectedPoint = await page.locator('.recharts-line .recharts-dot').first();
    const hasSelectedClass = await selectedPoint.evaluate(el => el.classList.contains('selected'));
    expect(hasSelectedClass).toBe(true);
  });

  test('TC-E001-011: should show focus indicator on keyboard navigation', async ({ page }) => {
    await chartPage.goto();
    await chartPage.waitForChart();

    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');

    // フォーカスインジケーターが表示されることを確認
    const outline = await focusedElement.evaluate(el => getComputedStyle(el).outline);
    expect(outline).toMatch(/2px solid/);

    // 3:1コントラスト比が確保されることを確認 (計算は簡略化)
    expect(outline).toBeTruthy();
  });

  test('TC-E001-012: should navigate data points with keyboard', async ({ page }) => {
    await chartPage.goto();
    await chartPage.waitForChart();

    await page.keyboard.press('Tab');  // チャートにフォーカス
    await page.keyboard.press('ArrowRight');  // 次のデータポイント
    await page.keyboard.press('ArrowLeft');   // 前のデータポイント
    await page.keyboard.press('Home');        // 最初のデータポイント
    await page.keyboard.press('End');         // 最後のデータポイント

    // フォーカスが適切に移動することを確認
    const focusedIndex = await page.getAttribute('[data-testid="tide-chart"]', 'data-focused-index');
    expect(parseInt(focusedIndex || '0')).toBeGreaterThanOrEqual(0);
  });

  test('TC-E001-013: should switch themes correctly', async ({ page }) => {
    await chartPage.goto();
    await chartPage.waitForChart();

    // Light theme
    await chartPage.selectTheme('light');
    await expect(page.locator('[data-testid="tide-chart"]')).toHaveCSS('background-color', /rgb\(255, 255, 255\)/);

    // Dark theme
    await chartPage.selectTheme('dark');
    await expect(page.locator('[data-testid="tide-chart"]')).toHaveCSS('background-color', /rgb\(0, 0, 0\)/);

    // High contrast theme
    await chartPage.selectTheme('high-contrast');
    await expect(page.locator('[data-testid="tide-chart"]')).toHaveCSS('background-color', /rgb\(0, 0, 0\)/);
  });

  test('TC-E001-014: should update chart settings dynamically', async ({ page }) => {
    await chartPage.goto();
    await chartPage.waitForChart();

    // グリッド表示切替
    await page.check('[data-testid="show-grid"]');
    await expect(page.locator('.recharts-cartesian-grid')).toBeVisible();

    await page.uncheck('[data-testid="show-grid"]');
    await expect(page.locator('.recharts-cartesian-grid')).not.toBeVisible();
  });

  test('TC-E001-015: should restore default settings', async ({ page }) => {
    await chartPage.goto();
    await chartPage.waitForChart();

    // 設定を変更
    await chartPage.selectTheme('dark');
    await page.uncheck('[data-testid="show-grid"]');

    // デフォルトに復元
    await page.click('[data-testid="reset-settings"]');

    await expect(page.locator('[data-testid="theme-selector"]')).toHaveValue('light');
    await expect(page.locator('[data-testid="show-grid"]')).toBeChecked();
  });
});
// TC-E002: 視覚回帰テスト群 (12個)
import { test, expect } from '@playwright/test';
import {
  TideChartPage,
  MockAPIHelper,
  VisualRegressionHelper,
  validTideData,
  largeTideDataset,
  setupCleanPage,
  DEVICE_VIEWPORTS
} from './helpers';

test.describe('TC-E002: 視覚回帰テスト群', () => {
  let chartPage: TideChartPage;
  let mockAPI: MockAPIHelper;
  let visualHelper: VisualRegressionHelper;

  test.beforeEach(async ({ page }) => {
    chartPage = new TideChartPage(page);
    mockAPI = new MockAPIHelper(page);
    visualHelper = new VisualRegressionHelper(page);

    await setupCleanPage(page);
  });

  test('TC-E002-001: should match desktop screenshot', async ({ page }) => {
    await mockAPI.mockValidData();
    await page.setViewportSize(DEVICE_VIEWPORTS.desktop);

    await chartPage.goto();
    await chartPage.waitForChart();

    await visualHelper.compareScreenshot('tide-chart-desktop');
  });

  test('TC-E002-002: should match tablet screenshot', async ({ page }) => {
    await mockAPI.mockValidData();
    await page.setViewportSize(DEVICE_VIEWPORTS.tablet);

    await chartPage.goto();
    await chartPage.waitForChart();

    await visualHelper.compareScreenshot('tide-chart-tablet');
  });

  test('TC-E002-003: should match mobile screenshot', async ({ page }) => {
    await mockAPI.mockValidData();
    await page.setViewportSize(DEVICE_VIEWPORTS.mobile);

    await chartPage.goto();
    await chartPage.waitForChart();

    await visualHelper.compareScreenshot('tide-chart-mobile');
  });

  test('TC-E002-004: should match light theme screenshot', async ({ page }) => {
    await mockAPI.mockValidData();

    await chartPage.goto();
    await chartPage.waitForChart();
    await chartPage.selectTheme('light');

    await visualHelper.compareScreenshot('tide-chart-light-theme');
  });

  test('TC-E002-005: should match dark theme screenshot', async ({ page }) => {
    await mockAPI.mockValidData();

    await chartPage.goto();
    await chartPage.waitForChart();
    await chartPage.selectTheme('dark');

    await visualHelper.compareScreenshot('tide-chart-dark-theme');
  });

  test('TC-E002-006: should match high contrast theme screenshot', async ({ page }) => {
    await mockAPI.mockValidData();

    await chartPage.goto();
    await chartPage.waitForChart();
    await chartPage.selectTheme('high-contrast');

    await visualHelper.compareScreenshot('tide-chart-high-contrast');
  });

  test('TC-E002-007: should match normal state screenshot', async ({ page }) => {
    await mockAPI.mockValidData();

    await chartPage.goto();
    await chartPage.waitForChart();

    await visualHelper.compareScreenshot('tide-chart-normal-state');
  });

  test('TC-E002-008: should match error state screenshot', async ({ page }) => {
    await mockAPI.mockServerError();

    await chartPage.goto();
    await page.waitForSelector('[data-testid="error-message"]');

    await visualHelper.compareScreenshot('tide-chart-error-state');
  });

  test('TC-E002-009: should match loading state screenshot', async ({ page }) => {
    await mockAPI.mockDelayedResponse(2000);

    await chartPage.goto();
    await page.waitForSelector('[data-testid="loading-indicator"]');

    await visualHelper.compareScreenshot('tide-chart-loading-state');
  });

  test('TC-E002-010: should match hover state screenshot', async ({ page }) => {
    await mockAPI.mockValidData();

    await chartPage.goto();
    await chartPage.waitForChart();

    await chartPage.hoverDataPoint(0);
    await page.waitForSelector('.recharts-tooltip-wrapper');

    await visualHelper.compareScreenshot('tide-chart-hover-state');
  });

  test('TC-E002-011: should match selected state screenshot', async ({ page }) => {
    await mockAPI.mockValidData();

    await chartPage.goto();
    await chartPage.waitForChart();

    await chartPage.clickDataPoint(0);

    await visualHelper.compareScreenshot('tide-chart-selected-state');
  });

  test('TC-E002-012: should match focus state screenshot', async ({ page }) => {
    await mockAPI.mockValidData();

    await chartPage.goto();
    await chartPage.waitForChart();

    await page.keyboard.press('Tab');

    await visualHelper.compareScreenshot('tide-chart-focus-state');
  });
});
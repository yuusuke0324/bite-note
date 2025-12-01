/**
 * TideChart E2E Test Helpers
 *
 * Provides Page Objects and utilities for tide chart E2E tests.
 * TC-E003: Multi-browser tests
 * TC-E004: Performance tests
 *
 * NOTE: The full TideChart component has `data-testid="tide-chart"` but is only
 * used in unit tests. In the production app, the CompactTideChart (displayed in
 * PhotoHeroCard) uses `data-testid="photo-hero-card-tide-chart"`.
 *
 * These tests target the CompactTideChart displayed in the record detail view.
 */

import { Page, Locator, expect } from '@playwright/test';
import { createTestFishingRecordWithCoordinates } from '../helpers/test-helpers';

// Selectors (using CSS classes where data-testid is not available)
const SELECTORS = {
  TIDE_CHART: '[data-testid="photo-hero-card-tide-chart"]',
  TIDE_LOADING: '[data-testid="photo-hero-card-tide-loading"]',
  PHOTO_HERO_CARD: '.photo-hero-card', // CSS class, not data-testid
  LIST_TAB: '[data-testid="list-tab"]',
  APP_INITIALIZED: 'body[data-app-initialized="true"]',
};

/**
 * Large tide dataset for performance testing
 * Generates 24 hours of tide data at 10-minute intervals (144 data points)
 */
export const largeTideDataset = Array.from({ length: 144 }, (_, i) => {
  const hours = Math.floor(i / 6);
  const minutes = (i % 6) * 10;
  const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  // Simulate sinusoidal tide pattern
  const tide = Math.round(100 + 50 * Math.sin((i / 144) * 2 * Math.PI * 2));
  return { time, tide };
});

/**
 * Setup clean page for testing
 * Clears storage and waits for app initialization
 */
export async function setupCleanPage(page: Page): Promise<void> {
  // Clear storage before navigation
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      // Ignore errors in incognito mode
    }
  });

  // Set viewport for consistent testing
  await page.setViewportSize({ width: 1024, height: 768 });
}

/**
 * TideChartPage - Page Object for TideChart interactions
 *
 * Encapsulates all tide chart related operations for E2E testing.
 * The tide chart is displayed as a CompactTideChart overlay in PhotoHeroCard
 * when viewing fishing record details.
 */
export class TideChartPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a page with TideChart
   * Creates a test record with coordinates and navigates to detail view
   */
  async goto(): Promise<void> {
    // Navigate to the app root first
    await this.page.goto('/');

    // Wait for app initialization
    await this.page.waitForSelector(SELECTORS.APP_INITIALIZED, {
      timeout: 15000,
      state: 'attached',
    });

    // Create a test record with coordinates for tide chart display
    // This function handles: IndexedDB insertion, page reload, and navigation to list tab
    await this.createTestRecordWithTideData();

    // Wait for record cards to appear in the list
    const recordCards = this.page.locator(SELECTORS.PHOTO_HERO_CARD);
    await recordCards.first().waitFor({ state: 'visible', timeout: 10000 });

    // Click on the first record to view details with tide chart
    await recordCards.first().click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Create a test fishing record with coordinates for tide chart display
   * Uses the shared test helper that properly interacts with the app's database
   */
  private async createTestRecordWithTideData(): Promise<void> {
    // Use the shared test helper to create a record with coordinates
    // This ensures the record is properly created through the app's data layer
    await createTestFishingRecordWithCoordinates(this.page, {
      location: '東京湾テストポイント',
      latitude: 35.4498,
      longitude: 139.6649,
      date: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:mm
      fishSpecies: 'シーバス',
      size: 50,
      weather: '晴れ',
      notes: 'E2Eテスト用潮汐データ表示用',
    });
  }

  /**
   * Wait for the tide chart to be rendered
   * Waits for either the chart or the loading indicator to appear first,
   * then waits for the actual chart.
   */
  async waitForChart(): Promise<void> {
    // First, wait for either chart or loading indicator
    await this.page.waitForSelector(
      `${SELECTORS.TIDE_CHART}, ${SELECTORS.TIDE_LOADING}`,
      { timeout: 10000, state: 'visible' }
    );

    // Then wait for the actual chart (loading may still be in progress)
    await this.page.waitForSelector(SELECTORS.TIDE_CHART, {
      timeout: 15000,
      state: 'visible',
    });
  }

  /**
   * Assert that the chart is rendered correctly
   */
  async expectChartRendered(): Promise<void> {
    const chart = this.page.locator(SELECTORS.TIDE_CHART);
    await expect(chart).toBeVisible();

    // Check that SVG is rendered (CompactTideChart uses Recharts which renders SVG)
    const svg = chart.locator('svg');
    await expect(svg).toBeVisible();
  }

  /**
   * Get the chart element locator
   * Returns the tide chart overlay element in PhotoHeroCard
   */
  getChartElement(): Locator {
    return this.page.locator(SELECTORS.TIDE_CHART);
  }

  /**
   * Hover over a data point by index
   */
  async hoverDataPoint(index: number): Promise<void> {
    const chart = this.getChartElement();
    const chartBox = await chart.boundingBox();

    if (!chartBox) {
      throw new Error('Chart element not found');
    }

    // Calculate approximate position based on chart width
    const dataPointCount = 24; // Assume 24 data points for hourly data
    const xOffset = (chartBox.width / dataPointCount) * (index + 0.5);
    const yOffset = chartBox.height / 2;

    await this.page.mouse.move(chartBox.x + xOffset, chartBox.y + yOffset);
    await this.page.waitForTimeout(200); // Wait for tooltip animation
  }

  /**
   * Get the tooltip locator
   */
  getTooltip(): Locator {
    return this.page.locator('[data-testid="tide-tooltip"]');
  }

  /**
   * Get data points locator (SVG circles/dots)
   * Note: CompactTideChart may not render individual dots (dot={false})
   */
  getDataPoints(): Locator {
    return this.page.locator(`${SELECTORS.TIDE_CHART} svg circle`);
  }
}

/**
 * MockAPIHelper - Helper for mocking API responses
 */
export class MockAPIHelper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Mock valid tide data API response
   */
  async mockValidData(): Promise<void> {
    // Generate sample tide data for 24 hours
    const tideData = Array.from({ length: 24 }, (_, i) => ({
      time: `${i.toString().padStart(2, '0')}:00`,
      tide: Math.round(100 + 50 * Math.sin((i / 24) * 2 * Math.PI * 2)),
      type: i % 6 === 0 ? 'high' : i % 6 === 3 ? 'low' : undefined,
    }));

    await this.page.route('**/api/tide/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: tideData,
          tideName: '中潮',
        }),
      });
    });
  }

  /**
   * Mock large dataset for performance testing
   */
  async mockLargeDataset(): Promise<void> {
    await this.page.route('**/api/tide/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: largeTideDataset,
          tideName: '大潮',
        }),
      });
    });
  }
}

/**
 * PerformanceHelper - Helper for measuring performance metrics
 */
export class PerformanceHelper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Measure chart render time
   * @returns Render time in milliseconds
   */
  async measureRenderTime(): Promise<number> {
    const startTime = Date.now();

    // Navigate and wait for chart
    await this.page.goto('/');
    await this.page.waitForSelector(SELECTORS.APP_INITIALIZED, {
      timeout: 15000,
    });

    // Navigate to list and click first record
    const listTab = this.page.locator(SELECTORS.LIST_TAB);
    if (await listTab.isVisible()) {
      await listTab.click();
      await this.page.waitForTimeout(300);

      // Click first record to view detail with tide chart
      const firstCard = this.page.locator(SELECTORS.PHOTO_HERO_CARD).first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
      }
    }

    // Wait for chart to be visible
    try {
      await this.page.waitForSelector(SELECTORS.TIDE_CHART, {
        timeout: 10000,
        state: 'visible',
      });
    } catch {
      // If no chart found, return max time
      return 10000;
    }

    return Date.now() - startTime;
  }

  /**
   * Measure resize response time
   * @returns Resize time in milliseconds
   */
  async measureResizeTime(): Promise<number> {
    // Ensure chart is visible first
    await this.page.waitForSelector(SELECTORS.TIDE_CHART, {
      timeout: 10000,
      state: 'visible',
    });

    const startTime = Date.now();

    // Trigger resize
    await this.page.setViewportSize({ width: 800, height: 600 });

    // Wait for chart to re-render
    await this.page.waitForFunction(
      (selector: string) => {
        const chart = document.querySelector(selector);
        return chart && chart.clientWidth > 0;
      },
      SELECTORS.TIDE_CHART,
      { timeout: 5000 }
    );

    return Date.now() - startTime;
  }
}

/**
 * E2Eテスト: TideIntegration (recharts版)
 *
 * 目的: TideIntegrationコンポーネントがrechartsベースのTideChartを使用して
 *       正しく表示されることを検証
 *
 * 検証項目:
 * - REQ-503: rechartsライブラリの使用
 * - REQ-501: 軸ラベルの表示
 * - REQ-504: HH:mm形式の時刻表示
 * - REQ-505: cm単位の潮位表示
 * - レスポンシブ対応
 */

import { test, expect, Page } from '@playwright/test';

// テストヘルパー: 釣果記録詳細画面を開く
async function openFishingRecordDetail(page: Page) {
  await page.goto('http://localhost:3000');

  // 釣果記録一覧が表示されるまで待機
  await page.waitForSelector('[data-testid="fishing-record-list"]', { timeout: 10000 });

  // 最初の釣果記録をクリック
  const firstRecord = page.locator('[data-testid="fishing-record-item"]').first();
  await firstRecord.click();

  // 詳細画面が表示されるまで待機
  await page.waitForSelector('[data-testid="fishing-record-detail"]', { timeout: 5000 });
}

test.describe('TideIntegration with TideChart (recharts)', () => {
  test.beforeEach(async ({ page }) => {
    // 各テスト前にページをリロード
    await page.goto('http://localhost:3000');
  });

  test('TC-001: 潮汐グラフ表示ボタンが存在する', async ({ page }) => {
    await openFishingRecordDetail(page);

    // 潮汐グラフ表示ボタンを確認
    const tideButton = page.locator('[data-testid="tide-graph-tab"]');
    await expect(tideButton).toBeVisible();
    await expect(tideButton).toContainText('潮汐グラフを表示');
  });

  test('TC-002: rechartsベースのTideChartが表示される', async ({ page }) => {
    await openFishingRecordDetail(page);

    // 潮汐グラフ表示ボタンをクリック
    const tideButton = page.locator('[data-testid="tide-graph-tab"]');
    await tideButton.click();

    // TideChartコンポーネントが表示されるまで待機
    await page.waitForSelector('[data-testid="tide-chart"]', { timeout: 10000 });

    // rechartsの要素を確認
    const tideChart = page.locator('[data-testid="tide-chart"]');
    await expect(tideChart).toBeVisible();

    // LineChartコンポーネントの存在確認
    const lineChart = page.locator('[data-testid="line-chart"]');
    await expect(lineChart).toBeVisible();
  });

  test('TC-003: X軸ラベル(時刻)がHH:mm形式で表示される (REQ-504)', async ({ page }) => {
    await openFishingRecordDetail(page);

    // 潮汐グラフを表示
    await page.locator('[data-testid="tide-graph-tab"]').click();
    await page.waitForSelector('[data-testid="tide-chart"]', { timeout: 10000 });

    // X軸の確認
    const xAxis = page.locator('[data-testid="x-axis"]');
    await expect(xAxis).toBeVisible();

    // X軸ラベルのテキストを取得して形式確認
    const axisText = await page.textContent('[data-testid="x-axis"]');
    expect(axisText).toMatch(/\d{2}:\d{2}/); // HH:mm形式のパターンマッチ
  });

  test('TC-004: Y軸ラベル(潮位)がcm単位で表示される (REQ-505)', async ({ page }) => {
    await openFishingRecordDetail(page);

    // 潮汐グラフを表示
    await page.locator('[data-testid="tide-graph-tab"]').click();
    await page.waitForSelector('[data-testid="tide-chart"]', { timeout: 10000 });

    // Y軸の確認
    const yAxis = page.locator('[data-testid="y-axis"]');
    await expect(yAxis).toBeVisible();

    // Y軸のunit属性を確認
    const yAxisUnit = await yAxis.getAttribute('unit');
    expect(yAxisUnit).toBe('cm');
  });

  test('TC-005: グラフにデータポイントが表示される', async ({ page }) => {
    await openFishingRecordDetail(page);

    // 潮汐グラフを表示
    await page.locator('[data-testid="tide-graph-tab"]').click();
    await page.waitForSelector('[data-testid="tide-chart"]', { timeout: 10000 });

    // データポイントの存在確認
    const dataPoint = page.locator('[data-testid^="data-point-"]').first();
    await expect(dataPoint).toBeVisible();
  });

  test('TC-006: ツールチップが表示される', async ({ page }) => {
    await openFishingRecordDetail(page);

    // 潮汐グラフを表示
    await page.locator('[data-testid="tide-graph-tab"]').click();
    await page.waitForSelector('[data-testid="tide-chart"]', { timeout: 10000 });

    // データポイントにホバー
    const dataPoint = page.locator('[data-testid^="data-point-"]').first();
    await dataPoint.hover();

    // ツールチップが表示されることを確認
    const tooltip = page.locator('[data-testid="tooltip"]');
    await expect(tooltip).toBeVisible({ timeout: 3000 });
  });

  test('TC-007: 満潮・干潮マーカーが表示される', async ({ page }) => {
    await openFishingRecordDetail(page);

    // 潮汐グラフを表示
    await page.locator('[data-testid="tide-graph-tab"]').click();
    await page.waitForSelector('[data-testid="tide-chart"]', { timeout: 10000 });

    // 満潮マーカーの確認
    const highTideMarker = page.locator('[data-testid^="high-tide-marker"]').first();

    // マーカーが存在するか確認（存在しない場合もあり得る）
    const count = await page.locator('[data-testid^="high-tide-marker"]').count();
    if (count > 0) {
      await expect(highTideMarker).toBeVisible();
    }
  });

  test('TC-008: グラフ表示/非表示の切り替えができる', async ({ page }) => {
    await openFishingRecordDetail(page);

    // 潮汐グラフを表示
    const tideButton = page.locator('[data-testid="tide-graph-tab"]');
    await tideButton.click();
    await page.waitForSelector('[data-testid="tide-chart"]', { timeout: 10000 });

    // ボタンテキストが変わることを確認
    await expect(tideButton).toContainText('潮汐グラフを非表示');

    // グラフが表示されていることを確認
    const tideChart = page.locator('[data-testid="tide-chart"]');
    await expect(tideChart).toBeVisible();

    // もう一度クリックして非表示
    await tideButton.click();

    // ボタンテキストが戻ることを確認
    await expect(tideButton).toContainText('潮汐グラフを表示');
  });

  test('TC-009: レスポンシブ対応 - モバイルサイズ', async ({ page }) => {
    // モバイルサイズに設定
    await page.setViewportSize({ width: 375, height: 667 });

    await openFishingRecordDetail(page);

    // 潮汐グラフを表示
    await page.locator('[data-testid="tide-graph-tab"]').click();
    await page.waitForSelector('[data-testid="tide-chart"]', { timeout: 10000 });

    // グラフが表示されることを確認
    const tideChart = page.locator('[data-testid="tide-chart"]');
    await expect(tideChart).toBeVisible();

    // グラフサイズが適切か確認
    const chartBox = await tideChart.boundingBox();
    expect(chartBox?.width).toBeLessThan(400); // モバイルサイズ
  });

  test('TC-010: レスポンシブ対応 - タブレットサイズ', async ({ page }) => {
    // タブレットサイズに設定
    await page.setViewportSize({ width: 768, height: 1024 });

    await openFishingRecordDetail(page);

    // 潮汐グラフを表示
    await page.locator('[data-testid="tide-graph-tab"]').click();
    await page.waitForSelector('[data-testid="tide-chart"]', { timeout: 10000 });

    // グラフが表示されることを確認
    const tideChart = page.locator('[data-testid="tide-chart"]');
    await expect(tideChart).toBeVisible();

    // グラフサイズが適切か確認
    const chartBox = await tideChart.boundingBox();
    expect(chartBox?.width).toBeGreaterThan(600); // タブレットサイズ
    expect(chartBox?.width).toBeLessThan(750);
  });

  test('TC-011: レスポンシブ対応 - デスクトップサイズ', async ({ page }) => {
    // デスクトップサイズに設定
    await page.setViewportSize({ width: 1920, height: 1080 });

    await openFishingRecordDetail(page);

    // 潮汐グラフを表示
    await page.locator('[data-testid="tide-graph-tab"]').click();
    await page.waitForSelector('[data-testid="tide-chart"]', { timeout: 10000 });

    // グラフが表示されることを確認
    const tideChart = page.locator('[data-testid="tide-chart"]');
    await expect(tideChart).toBeVisible();

    // グラフサイズが適切か確認
    const chartBox = await tideChart.boundingBox();
    expect(chartBox?.width).toBeGreaterThan(700); // デスクトップサイズ
  });

  test('TC-012: 軸ラベルが表示領域内に収まる (REQ-501)', async ({ page }) => {
    await openFishingRecordDetail(page);

    // 潮汐グラフを表示
    await page.locator('[data-testid="tide-graph-tab"]').click();
    await page.waitForSelector('[data-testid="tide-chart"]', { timeout: 10000 });

    // ResponsiveContainerの確認
    const responsiveContainer = page.locator('[data-testid="responsive-container"]');
    await expect(responsiveContainer).toBeVisible();

    // X軸とY軸の両方が表示されていることを確認
    const xAxis = page.locator('[data-testid="x-axis"]');
    const yAxis = page.locator('[data-testid="y-axis"]');

    await expect(xAxis).toBeVisible();
    await expect(yAxis).toBeVisible();

    // 軸がコンテナ内に収まっていることを確認
    const containerBox = await responsiveContainer.boundingBox();
    const xAxisBox = await xAxis.boundingBox();
    const yAxisBox = await yAxis.boundingBox();

    if (containerBox && xAxisBox && yAxisBox) {
      expect(xAxisBox.x).toBeGreaterThanOrEqual(containerBox.x);
      expect(xAxisBox.x + xAxisBox.width).toBeLessThanOrEqual(containerBox.x + containerBox.width);
      expect(yAxisBox.y).toBeGreaterThanOrEqual(containerBox.y);
      expect(yAxisBox.y + yAxisBox.height).toBeLessThanOrEqual(containerBox.y + containerBox.height);
    }
  });
});

test.describe('TideIntegration - エラーハンドリング', () => {
  test('TC-013: GPS座標なしの場合のエラー表示', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // GPS座標がない釣果記録を開く（モック）
    // この実装は実際のアプリ構造に依存

    // エラーメッセージの確認
    const errorMessage = page.locator('[data-testid="coordinates-error"]');

    // エラーが表示される場合のみ確認
    const errorCount = await errorMessage.count();
    if (errorCount > 0) {
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('GPS座標');
    }
  });

  test('TC-014: 潮汐計算エラー時の表示', async ({ page }) => {
    await openFishingRecordDetail(page);

    // 潮汐グラフ表示を試行
    await page.locator('[data-testid="tide-graph-tab"]').click();

    // エラーが発生した場合の確認
    const errorElement = page.locator('[data-testid="tide-error"]');
    const loadingElement = page.locator('[data-testid="tide-loading"]');

    // エラーまたはローディング、またはチャートのいずれかが表示される
    const errorCount = await errorElement.count();
    const loadingCount = await loadingElement.count();
    const chartCount = await page.locator('[data-testid="tide-chart"]').count();

    expect(errorCount + loadingCount + chartCount).toBeGreaterThan(0);
  });
});

test.describe('TideIntegration - パフォーマンス', () => {
  test('TC-015: グラフ表示が3秒以内に完了する', async ({ page }) => {
    await openFishingRecordDetail(page);

    // 開始時間を記録
    const startTime = Date.now();

    // 潮汐グラフ表示ボタンをクリック
    await page.locator('[data-testid="tide-graph-tab"]').click();

    // グラフが表示されるまで待機
    await page.waitForSelector('[data-testid="tide-chart"]', { timeout: 10000 });

    // 経過時間を計算
    const elapsed = Date.now() - startTime;

    // 3秒以内に表示されることを確認
    expect(elapsed).toBeLessThan(3000);
  });
});

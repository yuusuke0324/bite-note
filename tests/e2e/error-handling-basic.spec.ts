import { test, expect } from '@playwright/test';
import { TestIds } from '../../src/constants/testIds';

/**
 * エラーハンドリング基礎テスト
 *
 * Issue #150 Phase 2 - 実装済み機能のE2Eテスト
 * - ErrorBoundary表示
 * - 基本的なフォームバリデーション
 * - オフライン検出
 */

test.describe('エラーハンドリング基礎', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display ErrorBoundary on render error', async ({ page }) => {
    // ErrorBoundaryをテストするため、意図的にエラーを発生させる
    await page.evaluate(() => {
      // 開発環境でのみテスト可能（本番環境ではErrorBoundaryは通常発生しない）
      // Reactのエラーバウンダリーをトリガーするため、nullを参照させる
      throw new Error('Test error for ErrorBoundary');
    });

    // ErrorBoundaryが表示されることを確認
    const errorBoundary = page.locator(`[data-testid="${TestIds.ERROR_BOUNDARY}"]`);
    await expect(errorBoundary).toBeVisible({ timeout: 10000 });

    // エラーメッセージが表示されることを確認
    const errorMessage = page.locator(`[data-testid="${TestIds.ERROR_BOUNDARY_MESSAGE}"]`);
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('エラーが発生しました');

    // リロードボタンが表示されることを確認
    const reloadButton = page.locator(`[data-testid="${TestIds.ERROR_BOUNDARY_RELOAD}"]`);
    await expect(reloadButton).toBeVisible();
  });

  test('should validate required fields on form submission', async ({ page }) => {
    // フォームタブに移動
    await page.click(`[data-testid="${TestIds.NAV_ITEM('form')}"]`);
    await page.waitForSelector('form[data-testid="fishing-record-form"]', { state: 'visible' });

    // 必須フィールドを空のまま送信を試行
    const saveButton = page.locator(`[data-testid="${TestIds.SAVE_RECORD_BUTTON}"]`);

    // 釣行日時フィールドをクリア
    const dateInput = page.locator(`[data-testid="${TestIds.FISHING_DATE}"]`);
    await dateInput.clear();

    // 釣り場フィールドをクリア
    const locationInput = page.locator(`[data-testid="${TestIds.LOCATION_NAME}"]`);
    await locationInput.clear();

    // 送信を試行
    await saveButton.click();

    // HTML5バリデーションまたはフォームバリデーションが機能することを確認
    // (実装によっては、送信がブロックされるか、エラーメッセージが表示される)
    const form = page.locator('form[data-testid="fishing-record-form"]');
    await expect(form).toBeVisible();

    // 必須フィールドにinvalid状態があることを確認（HTML5バリデーション）
    const isDateInvalid = await dateInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    const isLocationInvalid = await locationInput.evaluate((el: HTMLInputElement) => !el.validity.valid);

    expect(isDateInvalid || isLocationInvalid).toBeTruthy();
  });

  test('should detect offline state', async ({ page, context }) => {
    // フォームタブに移動
    await page.click(`[data-testid="${TestIds.NAV_ITEM('form')}"]`);
    await page.waitForSelector('form[data-testid="fishing-record-form"]', { state: 'visible' });

    // オフライン状態をシミュレート
    await context.setOffline(true);

    // OfflineIndicatorが表示されることを確認
    const offlineIndicator = page.locator(`[data-testid="${TestIds.OFFLINE_INDICATOR}"]`);

    // オフライン検出まで少し待機（最大5秒）
    await expect(offlineIndicator).toBeVisible({ timeout: 5000 });

    // オフラインメッセージが含まれることを確認
    await expect(offlineIndicator).toContainText('オフライン');

    // オンラインに復旧
    await context.setOffline(false);

    // OfflineIndicatorが非表示になることを確認（または同期ステータスに変わる）
    await expect(offlineIndicator).not.toBeVisible({ timeout: 5000 });
  });

  test('should persist data in IndexedDB', async ({ page }) => {
    // リストタブに移動
    await page.click(`[data-testid="${TestIds.NAV_ITEM('list')}"]`);
    await page.waitForSelector(`[data-testid="${TestIds.FISHING_RECORDS_LIST}"]`, { state: 'visible' });

    // IndexedDBにデータが存在するか確認
    const hasData = await page.evaluate(async () => {
      const dbName = 'BiteNoteDB';
      return new Promise<boolean>((resolve) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          resolve(db.objectStoreNames.contains('fishingRecords'));
        };
        request.onerror = () => resolve(false);
      });
    });

    // IndexedDBが初期化されていることを確認
    expect(hasData).toBeTruthy();
  });

  test('should handle navigation between tabs', async ({ page }) => {
    // 各タブに移動してエラーが発生しないことを確認

    // フォームタブ
    await page.click(`[data-testid="${TestIds.NAV_ITEM('form')}"]`);
    await page.waitForSelector('form[data-testid="fishing-record-form"]', { state: 'visible' });

    // リストタブ
    await page.click(`[data-testid="${TestIds.NAV_ITEM('list')}"]`);
    await page.waitForSelector(`[data-testid="${TestIds.FISHING_RECORDS_LIST}"]`, { state: 'visible' });

    // タイドグラフタブ（存在する場合）
    const tideGraphTab = page.locator(`[data-testid="${TestIds.NAV_ITEM('tide-graph')}"]`);
    if (await tideGraphTab.isVisible()) {
      await tideGraphTab.click();
      await page.waitForTimeout(1000); // タイドグラフの読み込み待機
    }

    // エラーバウンダリーが表示されないことを確認
    const errorBoundary = page.locator(`[data-testid="${TestIds.ERROR_BOUNDARY}"]`);
    await expect(errorBoundary).not.toBeVisible();
  });
});

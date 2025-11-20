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

  // TODO: ErrorBoundaryテストの実装
  // 現在のテスト方法（page.evaluate()でエラーを投げる）では、
  // ReactのレンダリングサイクルP外でエラーが発生するため、ErrorBoundaryにキャッチされない。
  //
  // 推奨される実装方法（将来のタスク）:
  // 1. localStorageフラグ（__test_force_error__）を設定
  // 2. ModernAppでフラグをチェックし、意図的にレンダリングエラーを発生させる
  // 3. ErrorBoundaryが表示されることを確認
  // 4. フラグをクリーンアップ
  //
  // 参照: Issue #172 - qa-engineer レビュー結果
  test.skip('should display ErrorBoundary on render error', async ({ page }) => {
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

    // 必須フィールドを明示的に空にする（clear()ではなくfill('')を使用）
    const dateInput = page.locator(`[data-testid="${TestIds.FISHING_DATE}"]`);
    await dateInput.fill(''); // fill('')はReactのonChangeをトリガーする

    const locationInput = page.locator(`[data-testid="${TestIds.LOCATION_NAME}"]`);
    await locationInput.fill('');

    // 保存ボタンを取得
    const saveButton = page.locator(`[data-testid="${TestIds.SAVE_RECORD_BUTTON}"]`);

    // ボタンの状態を確認
    const isDisabled = await saveButton.isDisabled();

    // ボタンが無効化されることを確認（クライアントサイドバリデーション）
    // react-hook-formを使用しているため、HTML5のvalidityではなく、
    // ボタンのdisabled状態でバリデーションを確認
    expect(isDisabled).toBeTruthy();
  });

  test('should detect offline state', async ({ page, context }) => {
    // フォームタブに移動
    await page.click(`[data-testid="${TestIds.NAV_ITEM('form')}"]`);
    await page.waitForSelector('form[data-testid="fishing-record-form"]', { state: 'visible' });

    // オフライン状態をシミュレート
    await context.setOffline(true);

    // OfflineIndicatorが表示されることを確認（タイムアウトを3秒に短縮）
    const offlineIndicator = page.locator(`[data-testid="${TestIds.OFFLINE_INDICATOR}"]`);
    await expect(offlineIndicator).toBeVisible({ timeout: 3000 });

    // オフラインメッセージが含まれることを確認
    await expect(offlineIndicator).toContainText('オフライン');

    // オンラインに復旧
    await context.setOffline(false);

    // OfflineIndicatorが非表示になることを確認（または同期ステータスに変わる）
    await expect(offlineIndicator).not.toBeVisible({ timeout: 3000 });
  });

  test('should persist data in IndexedDB', async ({ page }) => {
    // リストタブに移動
    await page.click(`[data-testid="${TestIds.NAV_ITEM('list')}"]`);
    await page.waitForSelector(`[data-testid="${TestIds.FISHING_RECORDS_LIST}"]`, { state: 'visible', timeout: 10000 });

    // IndexedDBにデータが存在するか確認
    const hasData = await page.evaluate(async () => {
      // 実際のデータベース名を使用（FishingRecordDB）
      const dbName = 'FishingRecordDB';
      return new Promise<boolean>((resolve) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          // 実際のテーブル名を使用（fishing_records）
          resolve(db.objectStoreNames.contains('fishing_records'));
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
    await page.waitForSelector(`[data-testid="${TestIds.FISHING_RECORDS_LIST}"]`, { state: 'visible', timeout: 10000 });

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

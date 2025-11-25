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
    // Step 1: localStorageフラグを設定してエラーをトリガー
    await page.evaluate(() => {
      localStorage.setItem('__test_force_error__', 'true');
    });

    // Step 2: ページをリロードしてエラーを発生させる
    await page.reload();

    // Step 3: ErrorBoundaryが表示されることを確認
    const errorBoundary = page.locator(`[data-testid="${TestIds.ERROR_BOUNDARY}"]`);
    await expect(errorBoundary).toBeVisible({ timeout: 10000 });

    // エラーメッセージが表示されることを確認
    const errorMessage = page.locator(`[data-testid="${TestIds.ERROR_BOUNDARY_MESSAGE}"]`);
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('エラーが発生しました');

    // リロードボタンが表示されることを確認
    const reloadButton = page.locator(`[data-testid="${TestIds.ERROR_BOUNDARY_RELOAD}"]`);
    await expect(reloadButton).toBeVisible();

    // Step 4: クリーンアップ
    await page.evaluate(() => {
      localStorage.removeItem('__test_force_error__');
    });
  });

  test('should validate required fields on form submission', async ({ page }) => {
    // フォームタブに移動
    await page.click(`[data-testid="${TestIds.FORM_TAB}"]`);
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

  test('should validate date field with future date', async ({ page }) => {
    // フォームタブに移動
    await page.click(`[data-testid="${TestIds.FORM_TAB}"]`);
    await page.waitForSelector('form[data-testid="fishing-record-form"]', { state: 'visible' });

    // 未来の日付を生成（1年後）
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm形式

    // 未来の日付を入力
    const dateInput = page.locator(`[data-testid="${TestIds.FISHING_DATE}"]`);
    await dateInput.fill(futureDateStr);

    // 場所を入力（必須フィールド）
    const locationInput = page.locator(`[data-testid="${TestIds.LOCATION_NAME}"]`);
    await locationInput.fill('テスト釣り場');

    // 魚種を入力（必須フィールド）
    const speciesInput = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);
    await speciesInput.fill('テスト魚種');

    // 保存ボタンを取得
    const saveButton = page.locator(`[data-testid="${TestIds.SAVE_RECORD_BUTTON}"]`);

    // 未来の日付でも保存ボタンは有効（警告は出るが保存は可能な仕様と想定）
    const isEnabled = await saveButton.isEnabled();
    expect(isEnabled).toBeTruthy(); // 現在の仕様では未来の日付も許容
  });

  test('should validate size field with negative value', async ({ page }) => {
    // フォームタブに移動
    await page.click(`[data-testid="${TestIds.FORM_TAB}"]`);
    await page.waitForSelector('form[data-testid="fishing-record-form"]', { state: 'visible' });

    // 必須フィールドを入力
    const dateInput = page.locator(`[data-testid="${TestIds.FISHING_DATE}"]`);
    await dateInput.fill('2024-01-01T10:00');

    const locationInput = page.locator(`[data-testid="${TestIds.LOCATION_NAME}"]`);
    await locationInput.fill('テスト釣り場');

    // 魚種を入力（必須フィールド）
    const speciesInput = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);
    await speciesInput.fill('テスト魚種');

    // サイズフィールドに負の値を入力
    const sizeInput = page.locator(`[data-testid="${TestIds.FISH_SIZE}"]`);
    await sizeInput.fill('-10');

    // 保存ボタンを取得
    const saveButton = page.locator(`[data-testid="${TestIds.SAVE_RECORD_BUTTON}"]`);

    // 負の値を入力すると保存ボタンが無効化されることを確認（バリデーション）
    const isDisabled = await saveButton.isDisabled();
    expect(isDisabled).toBeTruthy();
  });

  test('should handle location field with special characters', async ({ page }) => {
    // フォームタブに移動
    await page.click(`[data-testid="${TestIds.FORM_TAB}"]`);
    await page.waitForSelector('form[data-testid="fishing-record-form"]', { state: 'visible' });

    // 必須フィールドを入力
    const dateInput = page.locator(`[data-testid="${TestIds.FISHING_DATE}"]`);
    await dateInput.fill('2024-01-01T10:00');

    // 特殊文字を含む場所名を入力（XSS対策確認）
    const locationInput = page.locator(`[data-testid="${TestIds.LOCATION_NAME}"]`);
    const specialCharsLocation = '<script>alert("xss")</script>';
    await locationInput.fill(specialCharsLocation);

    // 魚種を入力（必須フィールド）
    const speciesInput = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);
    await speciesInput.fill('テスト魚種');

    // 保存ボタンをクリック
    const saveButton = page.locator(`[data-testid="${TestIds.SAVE_RECORD_BUTTON}"]`);
    await saveButton.click();

    // 少し待機（保存処理完了）
    await page.waitForTimeout(2000);

    // リストタブに移動して保存されたデータを確認
    await page.click(`[data-testid="${TestIds.LIST_TAB}"]`);
    await page.waitForSelector(`[data-testid="${TestIds.FISHING_RECORDS_LIST}"]`, { state: 'visible', timeout: 10000 });

    // スクリプトタグがそのまま実行されず、テキストとして表示されることを確認
    // （エスケープされているか、または表示されていないことを確認）
    const pageContent = await page.content();
    // <script>タグが実行されていないことを確認（存在しないか、エスケープされている）
    expect(pageContent).not.toContain('<script>alert("xss")</script>');
  });

  test('should detect offline state', async ({ page, context }) => {
    // フォームタブに移動
    await page.click(`[data-testid="${TestIds.FORM_TAB}"]`);
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
    await page.click(`[data-testid="${TestIds.LIST_TAB}"]`);
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
    await page.click(`[data-testid="${TestIds.FORM_TAB}"]`);
    await page.waitForSelector('form[data-testid="fishing-record-form"]', { state: 'visible' });

    // リストタブ
    await page.click(`[data-testid="${TestIds.LIST_TAB}"]`);
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

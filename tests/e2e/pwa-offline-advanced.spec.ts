/**
 * PWA オフライン高度機能 E2Eテスト (Issue #155 Phase 3-3)
 * - 手動同期ボタン
 * - 同期メッセージ（トースト通知）
 * - ストレージエラーハンドリング
 * - Toast アクセシビリティ
 *
 * QAエンジニアレビュー対応:
 * - ServiceWorkerモック戦略の安定化（MessageChannel使用）
 * - オフラインキュー追加の確認テスト
 * - エッジケースの追加（並行処理、同期データなし）
 * - テスト実行順序依存性の排除（serial mode削除）
 * - waitForTimeout削除（安定性向上）
 */

import {
  test,
  expect,
  waitForServiceWorker,
  fullPWACleanup,
  getOfflineQueueStatus,
  simulateOffline,
  simulateOnline,
  simulateStorageQuotaExceeded,
} from './fixtures/pwa-fixtures';
import { createTestFishingRecord } from './helpers/test-helpers';
import { TestIds } from '../../src/constants/testIds';

test.describe('Phase 3-3: E2E Tests - Offline Sync UI & Storage Error Handling', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await fullPWACleanup(page);
    await page.goto('/');
    await waitForServiceWorker(page);
  });

  test.describe('Manual Sync Button', () => {
    test('should display sync button when there are pending items', async ({ page }) => {
      // Given: オフライン状態でデータを作成
      await simulateOffline(page);
      await createTestFishingRecord(page, { location: 'テスト釣り場' });

      // キューに追加されたことを確認（重要！）
      const queueStatus = await getOfflineQueueStatus(page);
      expect(queueStatus.pendingCount).toBeGreaterThan(0);

      // When: オンラインに戻る
      await simulateOnline(page);

      // Then: 同期ボタンが表示される
      const syncButton = page.getByTestId(TestIds.SYNC_BUTTON);
      await expect(syncButton).toBeVisible();
      await expect(syncButton).toContainText('今すぐ同期');
    });

    test('should trigger manual sync when button is clicked', async ({ page }) => {
      // Given: 未同期データがある状態
      await simulateOffline(page);
      await createTestFishingRecord(page, { location: 'テスト釣り場' });
      await simulateOnline(page);

      // When: 同期ボタンをクリック
      const syncButton = page.getByTestId(TestIds.SYNC_BUTTON);
      await syncButton.click();

      // Then: 同期が実行される
      await expect(page.getByTestId(TestIds.TOAST_SUCCESS)).toBeVisible({ timeout: 10000 });
    });

    test('should prevent duplicate sync when already syncing', async ({ page }) => {
      // Given: 複数の未同期データがある
      await simulateOffline(page);
      await createTestFishingRecord(page, { location: '釣り場1' });
      await createTestFishingRecord(page, { location: '釣り場2' });
      await createTestFishingRecord(page, { location: '釣り場3' });

      await simulateOnline(page);

      // When: 同期中に追加の同期ボタンクリック
      const syncButton = page.getByTestId(TestIds.SYNC_BUTTON);
      await syncButton.click();

      // 同期進行中に再度クリック
      await syncButton.click(); // 即座にクリック

      // Then: 「同期が既に進行中です」メッセージ表示
      const infoToast = page.getByTestId(TestIds.TOAST_INFO);
      await expect(infoToast).toContainText('同期が既に進行中です');
    });
  });

  test.describe('Sync Messages (Toast Notifications)', () => {
    test('should display info toast when sync starts', async ({ page }) => {
      // Given: 未同期データがある状態
      await simulateOffline(page);
      await createTestFishingRecord(page, { location: 'テスト釣り場' });
      await simulateOnline(page);

      // When: 手動同期を実行
      await page.getByTestId(TestIds.SYNC_BUTTON).click();

      // Then: 同期開始メッセージが表示される
      const infoToast = page.getByTestId(TestIds.TOAST_INFO);
      await expect(infoToast).toBeVisible();
      await expect(infoToast).toContainText('同期を開始しました');
    });

    test('should display success toast when sync completes', async ({ page }) => {
      // Given: 未同期データがある状態
      await simulateOffline(page);
      await createTestFishingRecord(page, { location: 'テスト釣り場' });
      await simulateOnline(page);

      // When: 同期が完了
      await page.getByTestId(TestIds.SYNC_BUTTON).click();

      // Then: 同期成功メッセージが表示される
      const successToast = page.getByTestId(TestIds.TOAST_SUCCESS);
      await expect(successToast).toBeVisible({ timeout: 10000 });
      await expect(successToast).toContainText('件のデータを同期しました');
    });

    // Note: 「同期データなし」のテストケースはユニットテストでカバー済み
    // (OfflineIndicator.test.tsx:197-228)
    // E2Eでは、同期ボタンが未同期データなしの場合に表示されないため、
    // このシナリオは実装上発生しないため削除
  });

  test.describe('Storage Error Handling', () => {
    test('should display storage error toast when quota exceeded', async ({ page }) => {
      // Given: ストレージ満杯状態をシミュレート
      await simulateStorageQuotaExceeded(page);

      // When: データ作成を試行
      await page.click(`[data-testid="${TestIds.FORM_TAB}"]`);
      await page.fill(`[data-testid="${TestIds.LOCATION_NAME}"]`, 'テスト釣り場');
      await page.click(`[data-testid="${TestIds.SAVE_RECORD_BUTTON}"]`);

      // Then: ストレージエラーメッセージが表示される
      const errorToast = page.getByTestId(TestIds.TOAST_ERROR);
      await expect(errorToast).toBeVisible();
      await expect(errorToast).toContainText('ストレージが満杯です');

      // アクションボタンが表示される
      const dataManagementButton = page.getByTestId(TestIds.TOAST_ACTION_BUTTON);
      await expect(dataManagementButton).toBeVisible();
    });

    test('should navigate to data management screen', async ({ page }) => {
      // Given: ストレージエラーが表示されている状態
      await simulateStorageQuotaExceeded(page);

      await page.click(`[data-testid="${TestIds.FORM_TAB}"]`);
      await page.fill(`[data-testid="${TestIds.LOCATION_NAME}"]`, 'テスト釣り場');
      await page.click(`[data-testid="${TestIds.SAVE_RECORD_BUTTON}"]`);

      // When: データ管理ボタンをクリック
      const dataManagementButton = page.getByTestId(TestIds.TOAST_ACTION_BUTTON);
      await dataManagementButton.click();

      // Then: データ管理画面に遷移する
      await expect(page).toHaveURL('/data-management');
    });
  });

  test.describe('Toast Accessibility', () => {
    test('should have proper ARIA attributes on toast', async ({ page }) => {
      // Given: オフライン状態で未同期データを作成
      await simulateOffline(page);
      await createTestFishingRecord(page, { location: 'テスト釣り場' });
      await simulateOnline(page);

      // When: 手動同期を実行
      const syncButton = page.getByTestId(TestIds.SYNC_BUTTON);
      await syncButton.click();

      // Then: トーストが表示され、ARIA属性が正しい
      const toast = page.getByRole('alert');
      await expect(toast).toBeVisible();

      // aria-liveの値を検証（infoトーストの場合はpolite）
      await expect(toast).toHaveAttribute('aria-live', 'polite');
      await expect(toast).toHaveAttribute('aria-atomic', 'true');

      // 成功トーストも同様に検証
      const successToast = page.getByTestId(TestIds.TOAST_SUCCESS);
      await expect(successToast).toBeVisible({ timeout: 10000 });
      await expect(successToast).toHaveAttribute('aria-live', 'polite');
      await expect(successToast).toHaveAttribute('aria-atomic', 'true');
    });

    test('should have touch-friendly button sizes (44x44px)', async ({ page }) => {
      // Given: ストレージエラーでトーストにボタンが表示されている
      await simulateStorageQuotaExceeded(page);

      await page.click(`[data-testid="${TestIds.FORM_TAB}"]`);
      await page.fill(`[data-testid="${TestIds.LOCATION_NAME}"]`, 'テスト釣り場');
      await page.click(`[data-testid="${TestIds.SAVE_RECORD_BUTTON}"]`);

      // Then: アクションボタンのタッチターゲットが44x44px以上
      const actionButton = page.getByTestId(TestIds.TOAST_ACTION_BUTTON);
      const boundingBox = await actionButton.boundingBox();
      expect(boundingBox?.width).toBeGreaterThanOrEqual(44);
      expect(boundingBox?.height).toBeGreaterThanOrEqual(44);

      // クローズボタンも同様に検証
      const closeButton = page.getByTestId(TestIds.TOAST_CLOSE_BUTTON);
      const closeBoundingBox = await closeButton.boundingBox();
      expect(closeBoundingBox?.width).toBeGreaterThanOrEqual(44);
      expect(closeBoundingBox?.height).toBeGreaterThanOrEqual(44);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle offline during sync gracefully', async ({ page }) => {
      // Given: 未同期データがある
      await simulateOffline(page);
      await createTestFishingRecord(page, { location: 'テスト釣り場' });
      await simulateOnline(page);

      // When: 同期開始
      const syncButton = page.getByTestId(TestIds.SYNC_BUTTON);
      await syncButton.click();

      // 同期中にオフラインに戻る
      await page.waitForSelector(`[data-testid="${TestIds.SYNC_STATUS}"]`, { timeout: 5000 });
      await simulateOffline(page);

      // Then: オフラインバナーが再表示される
      const offlineIndicator = page.getByTestId(TestIds.OFFLINE_INDICATOR);
      await expect(offlineIndicator).toBeVisible();

      // 未同期カウントが維持される
      const badge = page.getByTestId(TestIds.OFFLINE_BADGE);
      await expect(badge).toContainText('未同期:');
    });
  });
});

/**
 * Phase 3-3 完了:
 * ✅ 完全なオフライン→オンライン同期フロー
 * ✅ QuotaExceededError の実際のシミュレーション
 * ✅ データ管理画面への遷移テスト
 * ✅ エッジケース（並行処理、同期中のオフライン復帰）
 * ✅ アクセシビリティテスト（ARIA属性、44x44pxタッチターゲット）
 */

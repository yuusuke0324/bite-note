// セッション管理E2Eテスト - 拡張版（異常系・エッジケース）
// Phase 3-4: セッション管理機能実装

import { test, expect } from '@playwright/test';
import { TestIds } from '../../src/constants/testIds';

// Fixed: Issue #201 - Using development server for E2E tests in CI
test.describe('Session Management - Extended Tests (Phase 3-4)', () => {
  test.beforeEach(async ({ page }) => {
    // アプリを起動
    await page.goto('/');

    // アプリが初期化されるまで待機
    await page.waitForSelector('[data-app-initialized]', { timeout: 10000 });

    // セッション管理の初期化を待機
    await page.waitForFunction(() => {
      // @ts-expect-error - テスト用
      return window.sessionServiceStarted === true;
    }, { timeout: 5000 });

    // Zustand storeが利用可能か確認
    const hasSessionStore = await page.evaluate(() => {
      // @ts-expect-error - テスト用
      return typeof window.__sessionStore !== 'undefined';
    });

    if (!hasSessionStore) {
      throw new Error('window.__sessionStore is not available. Check environment variables.');
    }
  });

  test.describe('異常系テスト', () => {
    test('TC-SM-003-FAIL: 再接続失敗時にエラートーストが表示されること', async ({
      page,
    }) => {
      // TODO: IndexedDBモックを実装して再接続失敗をシミュレート
      // 現在の環境ではIndexedDBが正常動作するため、スキップ
      test.skip();
    });

    test('TC-SM-004-FAIL: エクスポート失敗時にエラートーストが表示されること', async ({
      page,
    }) => {
      // TODO: exportAllData をモックしてエラーを返す
      // 現在の環境では正常動作するため、スキップ
      test.skip();
    });

    test('TC-SM-009: モーダル表示中にページをリロードしてもデータが失われないこと', async ({
      page,
    }) => {
      // セッション期限切れイベントを発火
      await page.evaluate(() => {
        const event = new CustomEvent('session_expired');
        window.dispatchEvent(event);
      });

      // モーダルが表示されるまで待機
      await page.waitForSelector(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`, { timeout: 5000 });

      // ページをリロード
      await page.reload();

      // アプリが初期化されるまで待機
      await page.waitForSelector('[data-app-initialized]', { timeout: 10000 });

      // モーダルは閉じているはず（リロード後は新しいセッション）
      const modalVisible = await page.isVisible(
        `[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`
      );
      expect(modalVisible).toBe(false);
    });
  });

  test.describe('エッジケーステスト', () => {
    test('TC-SM-002-COUNT: 未保存データカウントが正しく表示されること', async ({
      page,
    }) => {
      // 未保存データカウントを設定してイベント発火
      await page.evaluate(() => {
        // @ts-expect-error - テスト用のグローバルアクセス
        if (window.__sessionStore) {
          // @ts-expect-error - テスト用のグローバルアクセス
          window.__sessionStore.getState().actions.setUnsavedDataCount(5);
        }

        const event = new CustomEvent('session_expired');
        window.dispatchEvent(event);
      });

      const modal = page.locator(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`);
      await expect(modal).toBeVisible({ timeout: 10000 });

      // 未保存データカウントが表示されていることを確認
      await expect(modal).toContainText('保存されていない釣果記録が5件あります');
    });

    test('TC-SM-002-NO-COUNT: 未保存データが0件の場合はカウントが表示されないこと', async ({
      page,
    }) => {
      // 未保存データカウント0でイベント発火
      await page.evaluate(() => {
        const event = new CustomEvent('session_expired');
        window.dispatchEvent(event);
      });

      const modal = page.locator(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`);
      await expect(modal).toBeVisible({ timeout: 10000 });

      // カウントメッセージが表示されていないことを確認
      await expect(modal).not.toContainText('保存されていない釣果記録が');
    });

    test('TC-SM-MULTI: 複数回セッション期限切れイベントが発火してもモーダルは1つだけ表示されること', async ({
      page,
    }) => {
      // 連続してイベントを発火
      await page.evaluate(() => {
        for (let i = 0; i < 5; i++) {
          const event = new CustomEvent('session_expired');
          window.dispatchEvent(event);
        }
      });

      // モーダルが表示されることを確認
      const modals = page.locator(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`);
      await expect(modals).toHaveCount(1);
    });

    // TODO: Issue #214 でComponent Testに移行予定
    // E2EテストではReactの再レンダリングタイミング制御が困難なため、一旦スキップ
    // QAエンジニアレビュー結果: E2EではなくComponent Testで実装すべき
    test.skip('TC-SM-010: 再接続中は再度再接続ボタンを押せないこと', async ({ page }) => {
      // セッション期限切れイベントを発火
      await page.evaluate(() => {
        const event = new CustomEvent('session_expired');
        window.dispatchEvent(event);
      });

      await page.waitForSelector(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`, { timeout: 5000 });

      const reconnectButton = page.locator(
        `[data-testid="${TestIds.RECONNECT_AND_SAVE_BUTTON}"]`
      );

      // 最初のクリック
      await reconnectButton.click();

      // ボタンが無効化されていることを確認
      await expect(reconnectButton).toBeDisabled();

      // 再接続中のテキストが表示されていることを確認
      await expect(reconnectButton).toContainText('再接続中');
    });

    // TODO: Issue #214 でComponent Testに移行予定
    // E2EテストではReactの再レンダリングタイミング制御が困難なため、一旦スキップ
    test.skip('TC-SM-011: 再接続中はエクスポートボタンも無効化されること', async ({
      page,
    }) => {
      // セッション期限切れイベントを発火
      await page.evaluate(() => {
        const event = new CustomEvent('session_expired');
        window.dispatchEvent(event);
      });

      await page.waitForSelector(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`, { timeout: 5000 });

      const reconnectButton = page.locator(
        `[data-testid="${TestIds.RECONNECT_AND_SAVE_BUTTON}"]`
      );
      const exportButton = page.locator(`[data-testid="${TestIds.EXPORT_NOW_BUTTON}"]`);

      // 再接続ボタンをクリック
      await reconnectButton.click();

      // エクスポートボタンも無効化されているはず
      await expect(exportButton).toBeDisabled();
    });

    // TODO: Issue #214 でComponent Testに移行予定
    // E2EテストではReactの再レンダリングタイミング制御が困難なため、一旦スキップ
    test.skip('TC-SM-012: 再接続中は×ボタンも無効化されること', async ({ page }) => {
      // セッション期限切れイベントを発火
      await page.evaluate(() => {
        const event = new CustomEvent('session_expired');
        window.dispatchEvent(event);
      });

      await page.waitForSelector(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`, { timeout: 5000 });

      const reconnectButton = page.locator(
        `[data-testid="${TestIds.RECONNECT_AND_SAVE_BUTTON}"]`
      );
      const closeButton = page.locator(
        `[data-testid="${TestIds.SESSION_MODAL_CLOSE_BUTTON}"]`
      );

      // 再接続ボタンをクリック
      await reconnectButton.click();

      // ×ボタンも無効化されているはず
      await expect(closeButton).toBeDisabled();
    });

    test('TC-SM-013: モーダルの背景クリックで確認ダイアログが表示されること', async ({
      page,
    }) => {
      // セッション期限切れイベントを発火
      await page.evaluate(() => {
        const event = new CustomEvent('session_expired');
        window.dispatchEvent(event);
      });

      await page.waitForSelector(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`, { timeout: 5000 });

      // 確認ダイアログのハンドラーを設定
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('未保存のデータが失われる可能性があります');
        await dialog.dismiss(); // キャンセル
      });

      // 背景をクリック（モーダル外）
      await page.click(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`, {
        position: { x: 0, y: 0 }, // 左上隅をクリック（背景部分）
      });

      // モーダルが閉じていないことを確認（キャンセルしたので）
      await expect(
        page.locator(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`)
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('パフォーマンステスト', () => {
    test('TC-SM-PERF-001: セッション期限切れモーダルが300ms以内に表示されること', async ({
      page,
    }) => {
      const startTime = Date.now();

      await page.evaluate(() => {
        const event = new CustomEvent('session_expired');
        window.dispatchEvent(event);
      });

      await page.waitForSelector(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`, { timeout: 5000 });

      const endTime = Date.now();
      const displayTime = endTime - startTime;

      // 300ms以内に表示されること
      expect(displayTime).toBeLessThan(300);
    });

    test('TC-SM-PERF-002: エクスポート処理が5秒以内に完了すること', async ({
      page,
    }) => {
      // ダウンロードイベントをリッスン
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 });

      // セッション期限切れイベントを発火
      await page.evaluate(() => {
        const event = new CustomEvent('session_expired');
        window.dispatchEvent(event);
      });

      await page.waitForSelector(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`, { timeout: 5000 });

      const startTime = Date.now();

      // エクスポートボタンをクリック
      const exportButton = page.locator(`[data-testid="${TestIds.EXPORT_NOW_BUTTON}"]`);
      await exportButton.click();

      // ダウンロードが開始されることを確認
      await downloadPromise;

      const endTime = Date.now();
      const exportTime = endTime - startTime;

      // 5秒以内に完了すること
      expect(exportTime).toBeLessThan(5000);
    });
  });

  test.describe('アクセシビリティテスト - 拡張', () => {
    test('TC-SM-A11Y-001: モーダル表示時に再接続ボタンに自動フォーカスされること', async ({
      page,
    }) => {
      // セッション期限切れイベントを発火
      await page.evaluate(() => {
        const event = new CustomEvent('session_expired');
        window.dispatchEvent(event);
      });

      await page.waitForSelector(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`, { timeout: 5000 });

      // 再接続ボタンにフォーカスが当たっていることを確認
      const reconnectButton = page.locator(
        `[data-testid="${TestIds.RECONNECT_AND_SAVE_BUTTON}"]`
      );
      await expect(reconnectButton).toBeFocused();
    });

    test('TC-SM-A11Y-002: Tabキーでフォーカス移動ができること', async ({ page }) => {
      // セッション期限切れイベントを発火
      await page.evaluate(() => {
        const event = new CustomEvent('session_expired');
        window.dispatchEvent(event);
      });

      await page.waitForSelector(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`, { timeout: 5000 });

      const reconnectButton = page.locator(
        `[data-testid="${TestIds.RECONNECT_AND_SAVE_BUTTON}"]`
      );
      const exportButton = page.locator(`[data-testid="${TestIds.EXPORT_NOW_BUTTON}"]`);
      const closeButton = page.locator(
        `[data-testid="${TestIds.SESSION_MODAL_CLOSE_BUTTON}"]`
      );

      // 初期フォーカス: 再接続ボタン
      await expect(reconnectButton).toBeFocused();

      // Tab → エクスポートボタン
      await page.keyboard.press('Tab');
      await expect(exportButton).toBeFocused();

      // Tab → ×ボタン
      await page.keyboard.press('Tab');
      await expect(closeButton).toBeFocused();

      // Shift+Tab → エクスポートボタン
      await page.keyboard.press('Shift+Tab');
      await expect(exportButton).toBeFocused();
    });

    test('TC-SM-A11Y-003: スクリーンリーダー用のテキストが適切に設定されていること', async ({
      page,
    }) => {
      // セッション期限切れイベントを発火
      await page.evaluate(() => {
        const event = new CustomEvent('session_expired');
        window.dispatchEvent(event);
      });

      await page.waitForSelector(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`, { timeout: 5000 });

      // モーダルタイトルが存在し、aria-labelledbyで参照されていることを確認
      const title = page.locator('#modal-title');
      await expect(title).toBeVisible({ timeout: 10000 });
      await expect(title).toContainText('セッションが期限切れになりました');

      // モーダル説明が存在し、aria-describedbyで参照されていることを確認
      const description = page.locator('#modal-description');
      await expect(description).toBeVisible({ timeout: 10000 });
      await expect(description).toContainText('しばらく操作がなかったため');
    });
  });

  test.describe('レスポンシブデザインテスト', () => {
    test('TC-SM-RESP-001: モバイル幅でボタンが縦並びになること', async ({
      page,
    }) => {
      // モバイルサイズに変更
      await page.setViewportSize({ width: 375, height: 667 });

      // セッション期限切れイベントを発火
      await page.evaluate(() => {
        const event = new CustomEvent('session_expired');
        window.dispatchEvent(event);
      });

      await page.waitForSelector(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`, { timeout: 5000 });

      const reconnectButton = page.locator(
        `[data-testid="${TestIds.RECONNECT_AND_SAVE_BUTTON}"]`
      );
      const exportButton = page.locator(`[data-testid="${TestIds.EXPORT_NOW_BUTTON}"]`);

      // ボタンの位置を取得
      const reconnectBox = await reconnectButton.boundingBox();
      const exportBox = await exportButton.boundingBox();

      // 縦並びであることを確認（Y座標が異なる）
      expect(reconnectBox!.y).toBeLessThan(exportBox!.y);
    });

    test('TC-SM-RESP-002: デスクトップ幅でボタンが横並びになること', async ({
      page,
    }) => {
      // デスクトップサイズに変更
      await page.setViewportSize({ width: 1024, height: 768 });

      // セッション期限切れイベントを発火
      await page.evaluate(() => {
        const event = new CustomEvent('session_expired');
        window.dispatchEvent(event);
      });

      await page.waitForSelector(`[data-testid="${TestIds.SESSION_TIMEOUT_MODAL}"]`, { timeout: 5000 });

      const reconnectButton = page.locator(
        `[data-testid="${TestIds.RECONNECT_AND_SAVE_BUTTON}"]`
      );
      const exportButton = page.locator(`[data-testid="${TestIds.EXPORT_NOW_BUTTON}"]`);

      // ボタンの位置を取得
      const reconnectBox = await reconnectButton.boundingBox();
      const exportBox = await exportButton.boundingBox();

      // 横並びであることを確認（Y座標が同じ or ほぼ同じ）
      expect(Math.abs(reconnectBox!.y - exportBox!.y)).toBeLessThan(5);
    });
  });
});

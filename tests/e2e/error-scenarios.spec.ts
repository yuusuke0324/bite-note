import { test, expect } from '@playwright/test';

test.describe('エラーシナリオとリカバリー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('GPS取得エラーのハンドリング', async ({ page }) => {
    await page.click('[data-tab="form"]');

    // GPS許可を拒否
    await page.context().grantPermissions([], { origin: 'http://localhost:5173' });

    // GPS取得ボタンをクリック
    await page.click('[data-testid="gps-button"]');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('GPS');

    // 手動入力案内が表示されることを確認
    await expect(page.locator('[data-testid="manual-input-guidance"]')).toBeVisible();

    // 手動入力フィールドにフォーカスが当たることを確認
    await expect(page.locator('[data-testid="location-input"]')).toBeFocused();
  });

  test('写真アップロードエラーのハンドリング', async ({ page }) => {
    await page.click('[data-tab="form"]');

    // 無効なファイルをアップロード（大きすぎるファイルをシミュレート）
    await page.route('**/upload', route => {
      route.fulfill({
        status: 413,
        body: JSON.stringify({ error: 'File too large' })
      });
    });

    // ファイル選択をシミュレート
    const fileInput = page.locator('[data-testid="photo-input"]');
    if (await fileInput.count() > 0) {
      // 大きなファイルサイズをシミュレート
      await page.evaluate(() => {
        const input = document.querySelector('[data-testid="photo-input"]') as HTMLInputElement;
        if (input) {
          const file = new File(['x'.repeat(11 * 1024 * 1024)], 'large-image.jpg', { type: 'image/jpeg' });
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // エラーメッセージが表示されることを確認
      await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-toast"]')).toContainText('ファイルサイズ');

      // リトライ機能が表示されることを確認
      await expect(page.locator('[data-testid="retry-upload-button"]')).toBeVisible();
    }
  });

  test('ネットワークエラーからのリカバリー', async ({ page }) => {
    await page.click('[data-tab="form"]');

    // フォームに入力
    await page.fill('[data-testid="date-input"]', '2024-01-15');
    await page.fill('[data-testid="location-input"]', '霞ヶ浦');
    await page.fill('[data-testid="species-input"]', 'コイ');

    // ネットワークエラーをシミュレート
    await page.route('**/api/records', route => {
      route.abort();
    });

    // 保存を試行
    await page.click('[data-testid="save-button"]');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('ネットワーク');

    // リトライボタンが表示されることを確認
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // ネットワークを復旧
    await page.unroute('**/api/records');

    // リトライボタンをクリック
    await page.click('[data-testid="retry-button"]');

    // 成功メッセージが表示されることを確認
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('オフライン状態の処理', async ({ page }) => {
    await page.click('[data-tab="form"]');

    // オフライン状態をシミュレート
    await page.context().setOffline(true);

    // フォームに入力
    await page.fill('[data-testid="date-input"]', '2024-01-15');
    await page.fill('[data-testid="location-input"]', '琵琶湖');
    await page.fill('[data-testid="species-input"]', 'ブラックバス');

    // 保存を試行
    await page.click('[data-testid="save-button"]');

    // オフライン通知が表示されることを確認
    await expect(page.locator('[data-testid="offline-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-notification"]')).toContainText('オフライン');

    // ローカル保存メッセージが表示されることを確認
    await expect(page.locator('[data-testid="local-save-message"]')).toBeVisible();

    // オンラインに復旧
    await page.context().setOffline(false);

    // 同期ボタンが表示されることを確認
    await expect(page.locator('[data-testid="sync-button"]')).toBeVisible();

    // 同期を実行
    await page.click('[data-testid="sync-button"]');

    // 同期成功メッセージが表示されることを確認
    await expect(page.locator('[data-testid="sync-success-message"]')).toBeVisible();
  });

  test('無効なデータ入力のハンドリング', async ({ page }) => {
    await page.click('[data-tab="form"]');

    // 無効な日付を入力
    await page.fill('[data-testid="date-input"]', '2030-12-31'); // 未来の日付

    // 無効なサイズを入力
    await page.fill('[data-testid="size-input"]', '-10'); // 負の値

    // 保存を試行
    await page.click('[data-testid="save-button"]');

    // バリデーションエラーが表示されることを確認
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('日付');
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('サイズ');

    // エラーフィールドがハイライトされることを確認
    await expect(page.locator('[data-testid="date-input"]')).toHaveClass(/error/);
    await expect(page.locator('[data-testid="size-input"]')).toHaveClass(/error/);
  });

  test('ストレージ容量不足のハンドリング', async ({ page }) => {
    // LocalStorageの容量制限をシミュレート
    await page.addInitScript(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function(key, value) {
        if (value.length > 100) { // 小さな制限でシミュレート
          throw new Error('QuotaExceededError');
        }
        return originalSetItem.call(this, key, value);
      };
    });

    await page.click('[data-tab="form"]');

    // 大きなメモデータを入力
    const largeText = 'x'.repeat(200);
    await page.fill('[data-testid="memo-input"]', largeText);
    await page.fill('[data-testid="date-input"]', '2024-01-15');
    await page.fill('[data-testid="location-input"]', '霞ヶ浦');
    await page.fill('[data-testid="species-input"]', 'コイ');

    // 保存を試行
    await page.click('[data-testid="save-button"]');

    // ストレージエラーメッセージが表示されることを確認
    await expect(page.locator('[data-testid="storage-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="storage-error"]')).toContainText('容量');

    // データクリーンアップの提案が表示されることを確認
    await expect(page.locator('[data-testid="cleanup-suggestion"]')).toBeVisible();
  });

  test('JavaScriptエラーからのリカバリー', async ({ page }) => {
    // コンソールエラーを監視
    const errors: string[] = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // 意図的にJavaScriptエラーを発生させる
    await page.evaluate(() => {
      // @ts-ignore
      window.undefinedFunction();
    });

    // エラーバウンダリーが動作することを確認
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-boundary"]')).toContainText('エラーが発生しました');

    // リロードボタンが表示されることを確認
    await expect(page.locator('[data-testid="reload-button"]')).toBeVisible();

    // リロードを実行
    await page.click('[data-testid="reload-button"]');

    // アプリケーションが正常に復旧することを確認
    await expect(page.locator('[data-testid="error-boundary"]')).not.toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('ブラウザ互換性エラーのハンドリング', async ({ page, browserName }) => {
    // 特定のブラウザでの機能制限をテスト
    if (browserName === 'webkit') {
      // Safari/WebKitでのIndexedDB制限をシミュレート
      await page.addInitScript(() => {
        // @ts-ignore
        delete window.indexedDB;
      });

      await page.goto('/');

      // フォールバック機能が動作することを確認
      await expect(page.locator('[data-testid="fallback-storage-notice"]')).toBeVisible();
    }
  });

  test('セッションタイムアウトの処理', async ({ page }) => {
    // セッションタイムアウトをシミュレート
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Session expired' })
      });
    });

    await page.click('[data-tab="list"]');

    // 認証エラーメッセージが表示されることを確認
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();

    // 再ログインプロンプトが表示されることを確認
    await expect(page.locator('[data-testid="reauth-prompt"]')).toBeVisible();
  });
});
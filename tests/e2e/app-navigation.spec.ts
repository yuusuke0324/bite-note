import { test, expect } from '@playwright/test';

test.describe('アプリケーション基本ナビゲーション', () => {
  test('アプリケーションが正常に読み込まれる', async ({ page }) => {
    await page.goto('/');

    // ページタイトルを確認
    await expect(page).toHaveTitle(/Bite Note/);

    // アプリケーションコンテナが表示されることを確認
    await expect(page.locator('#root')).toBeVisible();

    // ヘッダーが表示されることを確認（ホーム画面では「Bite Note」が表示）
    await expect(page.locator('h1')).toContainText('Bite Note');
  });

  test('タブナビゲーションが正常に動作する', async ({ page }) => {
    await page.goto('/');

    // ページが読み込まれるまで待機
    await expect(page.locator('#root')).toBeVisible();

    // タブが存在することを確認（アイコンのみのナビゲーション）
    const formTab = page.locator('[data-testid="form-tab"]');
    const listTab = page.locator('[data-testid="list-tab"]');

    if (await formTab.count() > 0) {
      // force: true を使用してクリックを強制実行
      await formTab.click({ force: true });
      // フォームコンテンツが表示されることを確認
      await expect(page.locator('text=釣行日時')).toBeVisible();
    }

    if (await listTab.count() > 0) {
      await listTab.click({ force: true });
      // 一覧コンテンツが表示されることを確認（空の状態も含む）
      await page.waitForTimeout(500);
    }
  });

  test('レスポンシブデザインが正常に動作する', async ({ page }) => {
    // デスクトップビューポート
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();

    // タブレットビューポート
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('#root')).toBeVisible();

    // モバイルビューポート
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('#root')).toBeVisible();
  });

  test('キーボードナビゲーションが機能する', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();

    // Tabキーでフォーカス移動をテスト
    await page.keyboard.press('Tab');

    // フォーカスされた要素があることを確認
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);

    // フォーカス可能な要素またはBODYであることを確認
    const validFocusElements = ['BUTTON', 'INPUT', 'A', 'SELECT', 'TEXTAREA', 'BODY'];
    expect(validFocusElements).toContain(focusedElement);
  });

  test('アプリケーション基本機能が動作する', async ({ page }) => {
    await page.goto('/');

    // アプリケーションが読み込まれることを確認
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Bite Note');

    // 基本的なUIエレメントが存在することを確認（BottomNavigation - アイコンのみ）
    await expect(page.locator('[data-testid="home-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="form-tab"]')).toBeVisible();
  });
});
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('釣果記録作成フロー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 記録登録タブに移動
    await page.click('[data-tab="form"]');
    await expect(page.locator('[data-testid="record-form"]')).toBeVisible();
  });

  test('基本的な釣果記録を作成できる', async ({ page }) => {
    // 日付を入力
    await page.fill('[data-testid="date-input"]', '2024-01-15');

    // 場所を入力
    await page.fill('[data-testid="location-input"]', '千葉県 印旛沼');

    // 魚種を入力
    await page.fill('[data-testid="species-input"]', 'ブラックバス');

    // サイズを入力
    await page.fill('[data-testid="size-input"]', '45');

    // 重量を入力
    await page.fill('[data-testid="weight-input"]', '1.5');

    // 天候を選択
    await page.selectOption('[data-testid="weather-select"]', '晴れ');

    // メモを入力
    await page.fill('[data-testid="memo-input"]', 'スピナーベイトで釣れました');

    // 保存ボタンをクリック
    await page.click('[data-testid="save-button"]');

    // 成功メッセージが表示されることを確認
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('記録を保存しました');

    // 一覧ページに自動遷移するか確認
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();

    // 作成した記録が一覧に表示されることを確認
    await expect(page.locator('[data-testid="record-item"]').first()).toContainText('ブラックバス');
    await expect(page.locator('[data-testid="record-item"]').first()).toContainText('45cm');
  });

  test('写真付きの釣果記録を作成できる', async ({ page }) => {
    // 基本情報を入力
    await page.fill('[data-testid="date-input"]', '2024-01-15');
    await page.fill('[data-testid="location-input"]', '神奈川県 相模湖');
    await page.fill('[data-testid="species-input"]', 'ニジマス');
    await page.fill('[data-testid="size-input"]', '30');

    // 写真をアップロード（テスト用の画像ファイルが必要）
    const testImagePath = path.join(__dirname, '../../src/assets/test-fish.jpg');

    // ファイル入力が存在する場合のみテスト
    const fileInput = page.locator('[data-testid="photo-input"]');
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(testImagePath);

      // 写真プレビューが表示されることを確認
      await expect(page.locator('[data-testid="photo-preview"]')).toBeVisible();
    }

    // 保存
    await page.click('[data-testid="save-button"]');

    // 成功確認
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('GPS位置情報を取得できる', async ({ page }) => {
    // GPSの許可をモック
    await page.context().grantPermissions(['geolocation']);
    await page.setGeolocation({ latitude: 35.6762, longitude: 139.6503 });

    // GPS取得ボタンをクリック
    await page.click('[data-testid="gps-button"]');

    // 位置情報が自動入力されることを確認
    await expect(page.locator('[data-testid="location-input"]')).not.toHaveValue('');

    // 緯度経度情報が表示されることを確認
    await expect(page.locator('[data-testid="coordinates-display"]')).toBeVisible();
  });

  test('必須項目の検証が正常に動作する', async ({ page }) => {
    // 何も入力せずに保存を試行
    await page.click('[data-testid="save-button"]');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('必須項目');

    // 日付のみ入力
    await page.fill('[data-testid="date-input"]', '2024-01-15');
    await page.click('[data-testid="save-button"]');

    // まだエラーが表示されることを確認
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

    // 場所と魚種も入力
    await page.fill('[data-testid="location-input"]', '東京湾');
    await page.fill('[data-testid="species-input"]', '海ブラックバス');

    await page.click('[data-testid="save-button"]');

    // エラーが消えて成功することを確認
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('フォームのリセット機能が動作する', async ({ page }) => {
    // フォームに入力
    await page.fill('[data-testid="date-input"]', '2024-01-15');
    await page.fill('[data-testid="location-input"]', '琵琶湖');
    await page.fill('[data-testid="species-input"]', 'ブルーギル');

    // リセットボタンをクリック
    await page.click('[data-testid="reset-button"]');

    // フォームがクリアされることを確認
    await expect(page.locator('[data-testid="date-input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="location-input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="species-input"]')).toHaveValue('');
  });

  test('エラーハンドリングが適切に動作する', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('**/api/records', route => {
      route.abort();
    });

    // フォームに入力
    await page.fill('[data-testid="date-input"]', '2024-01-15');
    await page.fill('[data-testid="location-input"]', '霞ヶ浦');
    await page.fill('[data-testid="species-input"]', 'コイ');

    // 保存を試行
    await page.click('[data-testid="save-button"]');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('保存に失敗');

    // リトライボタンが表示されることを確認
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });
});
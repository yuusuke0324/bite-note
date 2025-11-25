import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('釣果記録作成フロー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Fixed: Issue #226 - E2Eテストの初期化パターンを統一
    // waitForAppInitはHOME_TAB待機のため、正常系フローのみで使用
    await page.waitForSelector('[data-app-initialized]', { timeout: 10000 });
    // 記録登録タブが表示されるまで待機
    await page.waitForSelector('[data-testid="form-tab"]', { state: 'visible', timeout: 10000 });
    // 記録登録タブに移動（BottomNavigationのdata-testid属性を使用）
    await page.click('[data-testid="form-tab"]');
    // フォームが表示されるまで待機
    await page.waitForSelector('form', { state: 'visible' });
  });

  test('基本的な釣果記録を作成できる', async ({ page }) => {
    // 日付を入力
    await page.fill('[data-testid="fishing-date"]', '2024-01-15T10:00');

    // 場所を入力
    await page.fill('[data-testid="location-name"]', '千葉県 印旛沼');

    // 魚種を入力（Autocompleteコンポーネントを使用）
    await page.fill('[data-testid="fish-species-input"]', 'ブラックバス');

    // サイズを入力
    await page.fill('[data-testid="fish-size"]', '45');

    // 天候を入力
    await page.fill('[data-testid="weather"]', '晴れ');

    // メモを入力
    await page.fill('[data-testid="notes"]', 'スピナーベイトで釣れました');

    // 保存ボタンをクリック
    await page.click('[data-testid="save-record-button"]');

    // 記録一覧画面に遷移することを確認（ModernAppの動作）
    await expect(page.locator('h1')).toContainText('記録一覧');

    // 作成した記録が表示されることを確認
    await expect(page.locator('text=ブラックバス')).toBeVisible();
    await expect(page.locator('text=千葉県 印旛沼')).toBeVisible();
  });

  test.skip('写真付きの釣果記録を作成できる', async ({ page }) => {
    // TODO: 写真アップロード機能のdata-testid属性を実装後に有効化
    // 基本情報を入力
    await page.fill('[data-testid="fishing-date"]', '2024-01-15T10:00');
    await page.fill('[data-testid="location-name"]', '神奈川県 相模湖');
    await page.fill('[data-testid="fish-species-input"]', 'ニジマス');
    await page.fill('[data-testid="fish-size"]', '30');

    // 写真をアップロード（テスト用の画像ファイルが必要）
    const testImagePath = path.join(__dirname, '../../src/assets/test-fish.jpg');

    // ファイル入力が存在する場合のみテスト
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(testImagePath);
    }

    // 保存
    await page.click('[data-testid="save-record-button"]');

    // ホーム画面に戻ることを確認
    await expect(page.locator('h1')).toContainText('釣果記録');
  });

  test.skip('GPS位置情報を取得できる', async ({ page }) => {
    // TODO: GPS機能のdata-testid属性を実装後に有効化
    // GPSの許可をモック
    await page.context().grantPermissions(['geolocation']);
    await page.setGeolocation({ latitude: 35.6762, longitude: 139.6503 });

    // GPS取得ボタンをクリック（GPSLocationInputコンポーネントのボタン）
    await page.click('button:has-text("現在地を取得")');

    // 緯度経度情報が表示されることを確認
    await expect(page.locator('[data-testid="latitude"]')).not.toHaveValue('');
    await expect(page.locator('[data-testid="longitude"]')).not.toHaveValue('');
  });

  test.skip('必須項目の検証が正常に動作する', async ({ page }) => {
    // TODO: バリデーションエラー表示のdata-testid属性を実装後に有効化
    // 何も入力せずに保存を試行
    await page.click('[data-testid="save-record-button"]');

    // エラーメッセージが表示されることを確認（フォームのバリデーションエラー）
    await expect(page.locator('p[role="alert"]').first()).toBeVisible();

    // 日付のみ入力
    await page.fill('[data-testid="fishing-date"]', '2024-01-15T10:00');
    await page.click('[data-testid="save-record-button"]');

    // まだエラーが表示されることを確認
    await expect(page.locator('p[role="alert"]')).toBeVisible();

    // 場所と魚種も入力
    await page.fill('[data-testid="location-name"]', '東京湾');
    await page.fill('[data-testid="fish-species-input"]', '海ブラックバス');

    await page.click('[data-testid="save-record-button"]');

    // ホーム画面に戻ることを確認（成功）
    await expect(page.locator('h1')).toContainText('釣果記録');
  });

  test.skip('フォームのリセット機能が動作する', async ({ page }) => {
    // TODO: リセットボタンのdata-testid属性を実装後に有効化
    // フォームに入力
    await page.fill('[data-testid="fishing-date"]', '2024-01-15T10:00');
    await page.fill('[data-testid="location-name"]', '琵琶湖');
    await page.fill('[data-testid="fish-species-input"]', 'ブルーギル');

    // リセットボタンをクリック
    await page.click('button:has-text("リセット")');

    // 確認ダイアログが表示される場合は承認
    page.on('dialog', dialog => dialog.accept());

    // フォームがクリアされることを確認
    await expect(page.locator('[data-testid="fishing-date"]')).toHaveValue('');
    await expect(page.locator('[data-testid="location-name"]')).toHaveValue('');
    await expect(page.locator('[data-testid="fish-species"]')).toHaveValue('');
  });

  test.skip('エラーハンドリングが適切に動作する', async ({ page }) => {
    // TODO: エラー表示のdata-testid属性を実装後に有効化
    // IndexedDBへの保存をインターセプトするのは困難なため、このテストは別のアプローチが必要

    // フォームに入力
    await page.fill('[data-testid="fishing-date"]', '2024-01-15T10:00');
    await page.fill('[data-testid="location-name"]', '霞ヶ浦');
    await page.fill('[data-testid="fish-species-input"]', 'コイ');

    // 保存を試行
    await page.click('[data-testid="save-record-button"]');

    // エラーが発生した場合、エラーメッセージが表示されることを確認
    // （実際のエラーをトリガーする方法を見つける必要がある）
  });
});
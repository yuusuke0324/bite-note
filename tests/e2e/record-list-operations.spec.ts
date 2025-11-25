import { test, expect } from '@playwright/test';

test.describe('釣果記録一覧操作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Fixed: Issue #226 - E2Eテストの初期化パターンを統一
    // waitForAppInitはHOME_TAB待機のため、正常系フローのみで使用
    await page.waitForSelector('[data-app-initialized]', { timeout: 10000 });

    // テストデータを事前に作成（モックまたは実際のデータ作成）
    await page.evaluate(() => {
      // ローカルストレージにテストデータを追加
      const testRecords = [
        {
          id: '1',
          date: '2024-01-15',
          location: '千葉県 印旛沼',
          species: 'ブラックバス',
          size: 45,
          weight: 1.5,
          weather: '晴れ',
          memo: 'スピナーベイトで釣れました'
        },
        {
          id: '2',
          date: '2024-01-10',
          location: '神奈川県 相模湖',
          species: 'ニジマス',
          size: 30,
          weight: 0.8,
          weather: '曇り',
          memo: 'フライで釣りました'
        },
        {
          id: '3',
          date: '2024-01-05',
          location: '東京都 多摩川',
          species: 'アユ',
          size: 20,
          weight: 0.3,
          weather: '雨',
          memo: '友釣りで'
        }
      ];
      localStorage.setItem('fishingRecords', JSON.stringify(testRecords));
    });

    // 記録一覧タブに移動（BottomNavigationは nav-${id} パターンを使用）
    await page.click('[data-testid="nav-list"]');
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
  });

  test.skip('記録一覧が正常に表示される', async ({ page }) => {
    // 記録アイテムが表示されることを確認
    await expect(page.locator('[data-testid="record-item"]')).toHaveCount(3);

    // 最初の記録の内容を確認
    const firstRecord = page.locator('[data-testid="record-item"]').first();
    await expect(firstRecord).toContainText('ブラックバス');
    await expect(firstRecord).toContainText('45cm');
    await expect(firstRecord).toContainText('印旛沼');
  });

  test.skip('記録の詳細表示が機能する', async ({ page }) => {
    // 最初の記録をクリック
    await page.click('[data-testid="record-item"]');

    // 詳細モーダルまたは詳細ページが表示されることを確認
    await expect(page.locator('[data-testid="record-detail"]')).toBeVisible();

    // 詳細情報が表示されることを確認
    await expect(page.locator('[data-testid="record-detail"]')).toContainText('ブラックバス');
    await expect(page.locator('[data-testid="record-detail"]')).toContainText('45cm');
    await expect(page.locator('[data-testid="record-detail"]')).toContainText('1.5kg');
    await expect(page.locator('[data-testid="record-detail"]')).toContainText('スピナーベイトで釣れました');
  });

  test.skip('記録の検索機能が動作する', async ({ page }) => {
    // 検索ボックスに魚種名を入力
    await page.fill('[data-testid="search-input"]', 'ブラックバス');

    // 検索結果がフィルタされることを確認
    await expect(page.locator('[data-testid="record-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="record-item"]').first()).toContainText('ブラックバス');

    // 検索をクリア
    await page.clear('[data-testid="search-input"]');
    await expect(page.locator('[data-testid="record-item"]')).toHaveCount(3);
  });

  test.skip('記録のフィルタリング機能が動作する', async ({ page }) => {
    // 魚種フィルターを適用
    await page.selectOption('[data-testid="species-filter"]', 'ニジマス');

    // フィルタされた結果が表示されることを確認
    await expect(page.locator('[data-testid="record-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="record-item"]').first()).toContainText('ニジマス');

    // 場所フィルターを適用
    await page.selectOption('[data-testid="species-filter"]', ''); // リセット
    await page.fill('[data-testid="location-filter"]', '相模湖');

    await expect(page.locator('[data-testid="record-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="record-item"]').first()).toContainText('相模湖');
  });

  test.skip('記録のソート機能が動作する', async ({ page }) => {
    // 日付の降順でソート（デフォルト）
    const recordItems = page.locator('[data-testid="record-item"]');
    await expect(recordItems.first()).toContainText('2024-01-15');

    // サイズの降順でソート
    await page.selectOption('[data-testid="sort-select"]', 'size-desc');
    await expect(recordItems.first()).toContainText('45cm'); // ブラックバス

    // サイズの昇順でソート
    await page.selectOption('[data-testid="sort-select"]', 'size-asc');
    await expect(recordItems.first()).toContainText('20cm'); // アユ
  });

  test.skip('記録の編集機能が動作する', async ({ page }) => {
    // 編集ボタンをクリック
    await page.click('[data-testid="record-item"] [data-testid="edit-button"]');

    // 編集フォームが表示されることを確認
    await expect(page.locator('[data-testid="edit-form"]')).toBeVisible();

    // フィールドに既存の値が入っていることを確認
    await expect(page.locator('[data-testid="edit-species-input"]')).toHaveValue('ブラックバス');

    // 値を変更
    await page.fill('[data-testid="edit-size-input"]', '50');

    // 保存ボタンをクリック
    await page.click('[data-testid="save-edit-button"]');

    // 更新された値が表示されることを確認
    await expect(page.locator('[data-testid="record-item"]').first()).toContainText('50cm');
  });

  test.skip('記録の削除機能が動作する', async ({ page }) => {
    // 削除ボタンをクリック
    await page.click('[data-testid="record-item"] [data-testid="delete-button"]');

    // 確認ダイアログが表示されることを確認
    await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();

    // 削除を確認
    await page.click('[data-testid="confirm-delete-button"]');

    // 記録が削除されることを確認
    await expect(page.locator('[data-testid="record-item"]')).toHaveCount(2);

    // 削除した記録が表示されないことを確認
    await expect(page.locator('[data-testid="record-list"]')).not.toContainText('ブラックバス');
  });

  test.skip('ページネーション機能が動作する', async ({ page }) => {
    // 大量のテストデータを追加
    await page.evaluate(() => {
      const additionalRecords = [];
      for (let i = 4; i <= 25; i++) {
        additionalRecords.push({
          id: i.toString(),
          date: `2024-01-${i.toString().padStart(2, '0')}`,
          location: `場所${i}`,
          species: `魚種${i}`,
          size: 20 + i,
          weight: 0.5 + (i * 0.1),
          weather: '晴れ',
          memo: `記録${i}`
        });
      }

      const existingRecords = JSON.parse(localStorage.getItem('fishingRecords') || '[]');
      localStorage.setItem('fishingRecords', JSON.stringify([...existingRecords, ...additionalRecords]));
    });

    // ページをリロードして新しいデータを読み込み
    await page.reload();
    await page.click('[data-testid="nav-list"]');

    // ページネーションが表示されることを確認
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();

    // 次のページをクリック
    await page.click('[data-testid="next-page-button"]');

    // 2ページ目のコンテンツが表示されることを確認
    await expect(page.locator('[data-testid="current-page"]')).toContainText('2');
  });

  test.skip('空の状態が適切に表示される', async ({ page }) => {
    // ローカルストレージをクリア
    await page.evaluate(() => {
      localStorage.removeItem('fishingRecords');
    });

    await page.reload();
    await page.click('[data-testid="nav-list"]');

    // 空の状態メッセージが表示されることを確認
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-state"]')).toContainText('記録がありません');

    // 記録作成ボタンが表示されることを確認
    await expect(page.locator('[data-testid="create-record-button"]')).toBeVisible();
  });

  test.skip('モバイルビューで正常に動作する', async ({ page }) => {
    // モバイルビューポートに設定
    await page.setViewportSize({ width: 375, height: 667 });

    // 記録一覧が表示されることを確認
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();

    // モバイル用のレイアウトが適用されることを確認
    const recordItem = page.locator('[data-testid="record-item"]').first();
    await expect(recordItem).toBeVisible();

    // タッチイベントが正常に動作することを確認
    await recordItem.tap();
    await expect(page.locator('[data-testid="record-detail"]')).toBeVisible();
  });
});
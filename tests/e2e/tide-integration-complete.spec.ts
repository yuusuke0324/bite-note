/**
 * TASK-402: 潮汐システム統合E2Eテスト
 *
 * 全コンポーネント統合による完全なユーザーフローテスト
 */

import { test, expect, Page } from '@playwright/test';

class TideSystemIntegrationHelper {
  constructor(private page: Page) {}

  // アプリケーション全体のフロー実行
  async executeCompleteUserFlow() {
    // 1. ホーム画面から開始
    await this.page.goto('/');
    await expect(this.page.locator('[data-testid="app-title"]')).toContainText('釣果記録');

    // 2. 新規記録作成に移動
    await this.page.click('[data-testid="add-new-record-button"]');
    await expect(this.page).toHaveURL('/fishing-records/new');

    // 3. GPS位置取得をシミュレート
    await this.page.context().grantPermissions(['geolocation']);
    await this.page.click('[data-testid="use-gps-button"]');

    // GPS取得完了まで待機
    await expect(this.page.locator('[data-testid="gps-status"]')).toContainText('取得完了');

    // 4. 釣果情報入力
    await this.page.fill('[data-testid="location-input"]', '東京湾 豊洲埠頭');
    await this.page.fill('[data-testid="fish-species-input"]', 'スズキ');
    await this.page.fill('[data-testid="size-input"]', '52');
    await this.page.fill('[data-testid="weight-input"]', '1800');
    await this.page.selectOption('[data-testid="weather-select"]', '晴れ');
    await this.page.fill('[data-testid="temperature-input"]', '18');
    await this.page.fill('[data-testid="notes-input"]', '良型のスズキが釣れました。潮の動きが良く活性が高かったです。');

    // 5. 写真追加（オプション）
    const fileInput = this.page.locator('[data-testid="photo-upload-input"]');
    // モック画像ファイルをシミュレート
    await fileInput.setInputFiles({
      name: 'fish-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data')
    });

    // 6. 記録保存
    await this.page.click('[data-testid="save-record-button"]');

    // 保存完了確認
    await expect(this.page).toHaveURL('/fishing-records');
    await expect(this.page.locator('[data-testid="success-message"]')).toContainText('記録が保存されました');

    // 7. 作成された記録の詳細ページに移動
    await this.page.click('[data-testid^="record-item-"]:first-child [data-testid="view-detail-button"]');

    // 8. 基本情報の表示確認
    await expect(this.page.locator('[data-testid="record-location"]')).toContainText('東京湾 豊洲埠頭');
    await expect(this.page.locator('[data-testid="record-species"]')).toContainText('スズキ');
    await expect(this.page.locator('[data-testid="record-size"]')).toContainText('52cm');

    return this.page.url(); // 記録IDを含むURL返却
  }

  // 潮汐システムフル機能テスト
  async testFullTideSystemFeatures() {
    // 1. 潮汐統合セクションの存在確認
    await expect(this.page.locator('[data-testid="tide-integration-section"]')).toBeVisible();

    // 2. 初期状態確認
    const toggleButton = this.page.locator('[data-testid="tide-graph-toggle-button"]');
    await expect(toggleButton).toContainText('📊 潮汐グラフを表示');

    // 3. 潮汐情報展開とローディング確認
    await toggleButton.click();
    await expect(this.page.locator('[data-testid="tide-loading"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="tide-loading"]')).toContainText('潮汐情報を計算中...');

    // 4. 計算完了後の表示確認
    await this.page.waitForSelector('[data-testid="tide-summary-card"]', { timeout: 10000 });
    await expect(this.page.locator('[data-testid="tide-loading"]')).not.toBeVisible();

    // 5. 潮汐グラフコンポーネント確認
    await expect(this.page.locator('[data-testid="tide-graph"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="tide-graph-canvas"]')).toBeVisible();

    // 6. 潮汐サマリーカード確認
    const summaryCard = this.page.locator('[data-testid="tide-summary-card"]');
    await expect(summaryCard).toBeVisible();
    await expect(summaryCard.locator('[data-testid="current-tide-level"]')).toContainText(/\d+cm/);
    await expect(summaryCard.locator('[data-testid="tide-state"]')).toContainText(/(上げ潮|下げ潮|満潮|干潮)/);
    await expect(summaryCard.locator('[data-testid="tide-type"]')).toContainText(/(大潮|小潮|中潮|若潮|長潮)/);

    // 7. 釣果時刻マーカー確認
    await expect(this.page.locator('[data-testid="fishing-time-marker"]')).toBeVisible();

    // 8. 潮汐と釣果の関係分析
    const analysisSection = this.page.locator('[data-testid="tide-analysis-section"]');
    await expect(analysisSection).toBeVisible();
    await expect(analysisSection).toContainText('釣果と潮汐の関係');

    const timeAnalysis = this.page.locator('[data-testid="fishing-time-analysis"]');
    await expect(timeAnalysis).toBeVisible();

    // 9. 次回最適釣行時間提案
    const nextOptimalTime = this.page.locator('[data-testid="next-optimal-time"]');
    await expect(nextOptimalTime).toBeVisible();
    await expect(nextOptimalTime).toContainText('次回の最適釣行時間');
    await expect(nextOptimalTime).toContainText(/\d{1,2}:\d{2}/);

    // 10. 潮汐トゥールチップインタラクション
    const graphCanvas = this.page.locator('[data-testid="tide-graph-canvas"]');
    await graphCanvas.hover({ position: { x: 200, y: 150 } });
    await expect(this.page.locator('[data-testid="tide-tooltip"]')).toBeVisible();

    const tooltip = this.page.locator('[data-testid="tide-tooltip"]');
    await expect(tooltip.locator('[data-testid="tooltip-time"]')).toContainText(/\d{1,2}:\d{2}/);
    await expect(tooltip.locator('[data-testid="tooltip-level"]')).toContainText(/\d+cm/);
    await expect(tooltip.locator('[data-testid="tooltip-state"]')).toContainText(/(上げ潮|下げ潮)/);

    // 11. マウスアウトでトゥールチップ非表示
    await this.page.locator('body').hover({ position: { x: 0, y: 0 } });
    await expect(this.page.locator('[data-testid="tide-tooltip"]')).not.toBeVisible();

    // 12. 折りたたみ機能確認
    await toggleButton.click();
    await expect(toggleButton).toContainText('📊 潮汐グラフを表示');
    await this.page.waitForTimeout(350);
    await expect(this.page.locator('[data-testid="tide-content-section"]')).not.toBeVisible();
  }

  // 複数記録での潮汐比較機能テスト
  async testMultipleRecordsTideComparison() {
    // 2つ目の記録作成
    await this.page.goto('/fishing-records/new');

    await this.page.context().setGeolocation({ latitude: 34.6937, longitude: 135.5023 });
    await this.page.click('[data-testid="use-gps-button"]');
    await this.page.waitForTimeout(1000);

    await this.page.fill('[data-testid="location-input"]', '大阪湾');
    await this.page.fill('[data-testid="fish-species-input"]', 'アジ');
    await this.page.fill('[data-testid="size-input"]', '25');

    await this.page.click('[data-testid="save-record-button"]');
    await this.page.waitForURL('/fishing-records');

    // 2つ目の記録詳細ページに移動
    await this.page.click('[data-testid^="record-item-"]:first-child [data-testid="view-detail-button"]');

    // 潮汐情報展開
    await this.page.click('[data-testid="tide-graph-toggle-button"]');
    await this.page.waitForSelector('[data-testid="tide-summary-card"]', { timeout: 10000 });

    // 異なる地域での潮汐情報が表示されることを確認
    await expect(this.page.locator('[data-testid="tide-location-info"]')).toContainText('大阪湾');
    await expect(this.page.locator('[data-testid="tide-summary-card"]')).toBeVisible();
  }

  // エラー処理とリカバリのテスト
  async testErrorHandlingAndRecovery() {
    // API エラーをシミュレート
    await this.page.route('**/api/tide/**', route => {
      route.abort('failed');
    });

    // 潮汐情報展開試行
    await this.page.click('[data-testid="tide-graph-toggle-button"]');

    // エラー表示確認
    await expect(this.page.locator('[data-testid="tide-error"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="tide-error"]')).toContainText('潮汐情報の取得に失敗しました');
    await expect(this.page.locator('[data-testid="tide-retry-button"]')).toBeVisible();

    // API モックを解除
    await this.page.unroute('**/api/tide/**');

    // 再試行実行
    await this.page.click('[data-testid="tide-retry-button"]');

    // 正常復旧確認
    await this.page.waitForSelector('[data-testid="tide-summary-card"]', { timeout: 10000 });
    await expect(this.page.locator('[data-testid="tide-error"]')).not.toBeVisible();
    await expect(this.page.locator('[data-testid="tide-summary-card"]')).toBeVisible();
  }
}

test.describe('潮汐システム統合E2Eテスト', () => {
  let helper: TideSystemIntegrationHelper;

  test.beforeEach(async ({ page }) => {
    helper = new TideSystemIntegrationHelper(page);
  });

  test('TC-I001: 完全なユーザーフロー（記録作成→詳細表示→潮汐情報）', async ({ page }) => {
    // 完全なユーザーフローを実行
    const recordUrl = await helper.executeCompleteUserFlow();

    // 潮汐システムの全機能をテスト
    await helper.testFullTideSystemFeatures();

    console.log(`記録URL: ${recordUrl} での潮汐システム統合テスト完了`);
  });

  test('TC-I002: 複数記録での潮汐比較機能', async ({ page }) => {
    // 最初の記録作成
    await helper.executeCompleteUserFlow();

    // 複数記録での潮汐比較テスト
    await helper.testMultipleRecordsTideComparison();
  });

  test('TC-I003: エラー処理とリカバリ機能', async ({ page }) => {
    // 基本記録作成
    await helper.executeCompleteUserFlow();

    // エラー処理テスト
    await helper.testErrorHandlingAndRecovery();
  });

  test('TC-I004: パフォーマンス統合テスト', async ({ page }) => {
    const startTime = Date.now();

    // 完全フロー実行
    await helper.executeCompleteUserFlow();

    const recordCreationTime = Date.now() - startTime;

    // 潮汐情報表示のパフォーマンス測定
    const tideStartTime = Date.now();
    await page.click('[data-testid="tide-graph-toggle-button"]');
    await page.waitForSelector('[data-testid="tide-summary-card"]', { timeout: 10000 });
    const tideLoadTime = Date.now() - tideStartTime;

    // パフォーマンス基準確認
    expect(recordCreationTime).toBeLessThan(10000); // 記録作成10秒以内
    expect(tideLoadTime).toBeLessThan(5000); // 潮汐情報5秒以内

    console.log(`統合パフォーマンス: 記録作成 ${recordCreationTime}ms, 潮汐表示 ${tideLoadTime}ms`);
  });

  test('TC-I005: ブラウザ間互換性統合テスト', async ({ page, browserName }) => {
    // 完全フローをブラウザ別で実行
    await helper.executeCompleteUserFlow();
    await helper.testFullTideSystemFeatures();

    // ブラウザ特有の確認
    switch (browserName) {
      case 'chromium':
        await expect(page.locator('[data-testid="tide-graph-canvas"]')).toBeVisible();
        break;
      case 'firefox':
        // Firefox特有のアニメーション確認
        await page.click('[data-testid="tide-graph-toggle-button"]');
        await page.waitForTimeout(350);
        break;
      case 'webkit':
        // Safari特有のtouch動作確認
        const canvas = page.locator('[data-testid="tide-graph-canvas"]');
        await canvas.tap({ position: { x: 100, y: 100 } });
        await expect(page.locator('[data-testid="tide-tooltip"]')).toBeVisible();
        break;
    }

    console.log(`${browserName} での統合テスト完了`);
  });

  test('TC-I006: レスポンシブデザイン統合テスト', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568, name: 'iPhone SE' },
      { width: 375, height: 667, name: 'iPhone 8' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1024, height: 768, name: 'iPad Landscape' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // 記録作成フロー
      await helper.executeCompleteUserFlow();

      // 潮汐システム確認
      await page.click('[data-testid="tide-graph-toggle-button"]');
      await page.waitForSelector('[data-testid="tide-summary-card"]', { timeout: 10000 });

      // ビューポート別レイアウト確認
      const tideSection = page.locator('[data-testid="tide-integration-section"]');
      if (viewport.width < 768) {
        await expect(tideSection).toHaveClass(/mobile-layout/);
      } else if (viewport.width < 1024) {
        await expect(tideSection).toHaveClass(/tablet-layout/);
      }

      console.log(`${viewport.name} (${viewport.width}x${viewport.height}) での統合テスト完了`);
    }
  });

  test('TC-I007: アクセシビリティ統合テスト', async ({ page }) => {
    // 完全フロー実行
    await helper.executeCompleteUserFlow();

    // キーボードナビゲーション統合テスト
    await page.keyboard.press('Tab'); // 潮汐ボタンにフォーカス
    await expect(page.locator('[data-testid="tide-graph-toggle-button"]')).toBeFocused();

    await page.keyboard.press('Enter'); // Enter で展開
    await page.waitForSelector('[data-testid="tide-summary-card"]', { timeout: 10000 });

    // ARIA 属性確認
    const toggleButton = page.locator('[data-testid="tide-graph-toggle-button"]');
    await expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    await expect(toggleButton).toHaveAttribute('aria-controls', 'tide-content-section');

    // スクリーンリーダー対応確認
    await expect(page.locator('[data-testid="tide-integration-description"]')).toBeVisible();

    // Space キーでの操作確認
    await page.keyboard.press('Space'); // Space で折りたたみ
    await expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });
});
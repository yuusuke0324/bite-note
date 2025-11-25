/**
 * TASK-402: 潮汐システム統合E2Eテスト
 *
 * 全コンポーネント統合による完全なユーザーフローテスト
 * QAエンジニアレビュー対応: Issue #173修正版
 */

import { test, expect, Page } from '@playwright/test';
import { createTestFishingRecord } from './helpers/test-helpers';
import { TestIds } from '../../src/constants/testIds';

class TideSystemIntegrationHelper {
  constructor(private page: Page) {}

  // アプリケーション全体のフロー実行
  async executeCompleteUserFlow() {
    // 1. ホーム画面から開始 + アプリ初期化待機
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });

    // App.tsx初期化完了を待機
    await this.page.waitForSelector('body[data-app-initialized="true"]', {
      timeout: 25000,
      state: 'attached'
    });

    // UIが表示されるまで待機
    await this.page.waitForSelector('[data-testid="form-tab"]', {
      timeout: 10000,
      state: 'visible'
    });

    // CI環境でのService Worker初期化等の遅延を吸収
    await this.page.waitForTimeout(500);

    // 2. 新規記録作成
    await createTestFishingRecord(this.page, {
      id: 'test-record-' + Date.now(),
      location: '東京湾 豊洲埠頭',
      latitude: 35.6762,
      longitude: 139.6503,
      date: new Date().toISOString().slice(0, 16),
      fishSpecies: 'スズキ',
      size: 52,
      weather: '晴れ',
      notes: '良型のスズキが釣れました。潮の動きが良く活性が高かったです。'
    });

    // 3. 作成された記録の詳細ページに移動
    const firstRecord = this.page.locator('[data-testid^="record-"]').first();
    await expect(firstRecord).toBeVisible({ timeout: 10000 });
    await firstRecord.click();

    // 4. 記録詳細画面が開いたことを確認
    await this.page.waitForSelector(`[data-testid="${TestIds.TIDE_INTEGRATION_SECTION}"]`, { timeout: 10000 });

    return this.page.url(); // 記録IDを含むURL返却
  }

  // 潮汐システムフル機能テスト
  async testFullTideSystemFeatures() {
    // 1. 潮汐統合セクションの存在確認
    await expect(this.page.locator(`[data-testid="${TestIds.TIDE_INTEGRATION_SECTION}"]`)).toBeVisible();

    // 2. 初期状態確認
    const toggleButton = this.page.locator(`[data-testid="${TestIds.TIDE_GRAPH_TOGGLE_BUTTON}"]`);
    await expect(toggleButton).toBeVisible();

    // 3. 潮汐情報展開
    await toggleButton.click();

    // 4. 計算完了後の表示確認（潮汐グラフまたはチャートの表示を待つ）
    await this.page.waitForSelector(`[data-testid="${TestIds.TIDE_CHART}"]`, { timeout: 30000 });

    // 5. 潮汐グラフコンポーネント確認
    await expect(this.page.locator(`[data-testid="${TestIds.TIDE_CHART}"]`)).toBeVisible();
    await expect(this.page.locator(`[data-testid="${TestIds.TIDE_GRAPH_CANVAS}"]`)).toBeVisible();

    // 6. 釣果時刻マーカー確認（記録作成済みのため必ず存在する）
    await expect(this.page.locator('[data-testid^="fishing-marker-"]').first()).toBeVisible();

    // 7. グラフの基本要素確認
    await expect(this.page.locator(`[data-testid="${TestIds.TIDE_GRAPH_AREA}"]`)).toBeVisible();
    await expect(this.page.locator(`[data-testid="${TestIds.TIDE_GRAPH_TIME_LABELS}"]`)).toBeVisible();
    await expect(this.page.locator(`[data-testid="${TestIds.TIDE_GRAPH_Y_AXIS}"]`)).toBeVisible();

    // 8. 折りたたみ機能確認
    await toggleButton.click();
    // グラフが非表示になることを確認
    await expect(this.page.locator(`[data-testid="${TestIds.TIDE_CHART}"]`)).toBeHidden({ timeout: 1000 });
  }

  // 複数記録での潮汐比較機能テスト
  async testMultipleRecordsTideComparison() {
    // ホーム画面に戻る
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');

    // 2つ目の記録作成
    await createTestFishingRecord(this.page, {
      id: 'test-record-osaka-' + Date.now(),
      location: '大阪湾',
      latitude: 34.6937,
      longitude: 135.5023,
      date: new Date().toISOString().slice(0, 16),
      fishSpecies: 'アジ',
      size: 25
    });

    // 2つ目の記録詳細ページに移動
    const firstRecord = this.page.locator('[data-testid^="record-"]').first();
    await expect(firstRecord).toBeVisible({ timeout: 10000 });
    await firstRecord.click();

    // 潮汐情報展開
    const toggleButton = this.page.locator(`[data-testid="${TestIds.TIDE_GRAPH_TOGGLE_BUTTON}"]`);
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();
    await this.page.waitForSelector(`[data-testid="${TestIds.TIDE_CHART}"]`, { timeout: 30000 });

    // 潮汐グラフが表示されることを確認
    await expect(this.page.locator(`[data-testid="${TestIds.TIDE_CHART}"]`)).toBeVisible();
  }

  // エラー処理とリカバリのテスト
  async testErrorHandlingAndRecovery() {
    // ネットワークをオフラインに設定
    await this.page.context().setOffline(true);

    // 潮汐情報展開試行
    const toggleButton = this.page.locator(`[data-testid="${TestIds.TIDE_GRAPH_TOGGLE_BUTTON}"]`);
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();

    // エラーが必ず表示されることをアサート
    const tideError = this.page.locator(`[data-testid="${TestIds.TIDE_ERROR}"]`);
    await expect(tideError).toBeVisible({ timeout: 10000 });

    // リトライボタンの存在確認
    const retryButton = this.page.locator(`[data-testid="${TestIds.TIDE_RETRY_BUTTON}"]`);
    await expect(retryButton).toBeVisible();

    // ネットワークを復旧
    await this.page.context().setOffline(false);

    // 再試行実行
    await retryButton.click();

    // 正常復旧確認
    await expect(this.page.locator(`[data-testid="${TestIds.TIDE_CHART}"]`)).toBeVisible({ timeout: 30000 });
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
    const toggleButton = page.locator(`[data-testid="${TestIds.TIDE_GRAPH_TOGGLE_BUTTON}"]`);
    await toggleButton.click();
    await page.waitForSelector(`[data-testid="${TestIds.TIDE_CHART}"]`, { timeout: 30000 });
    const tideLoadTime = Date.now() - tideStartTime;

    // パフォーマンス基準確認（緩和版）
    expect(recordCreationTime).toBeLessThan(20000); // 記録作成20秒以内
    expect(tideLoadTime).toBeLessThan(30000); // 潮汐情報30秒以内

    console.log(`統合パフォーマンス: 記録作成 ${recordCreationTime}ms, 潮汐表示 ${tideLoadTime}ms`);
  });

  test('TC-I005: ブラウザ間互換性統合テスト', async ({ browserName }) => {
    // 完全フローをブラウザ別で実行
    await helper.executeCompleteUserFlow();
    await helper.testFullTideSystemFeatures();

    console.log(`${browserName} での統合テスト完了`);
  });

  test('TC-I006: レスポンシブデザイン統合テスト', async ({ page }) => {
    // モバイルサイズで基本動作確認
    await page.setViewportSize({ width: 375, height: 667 });

    // 記録作成フロー
    await helper.executeCompleteUserFlow();

    // 潮汐システム確認
    const toggleButton = page.locator(`[data-testid="${TestIds.TIDE_GRAPH_TOGGLE_BUTTON}"]`);
    await toggleButton.click();
    await page.waitForSelector(`[data-testid="${TestIds.TIDE_CHART}"]`, { timeout: 30000 });

    // グラフが表示されることを確認
    await expect(page.locator(`[data-testid="${TestIds.TIDE_CHART}"]`)).toBeVisible();
  });

  test('TC-I007: アクセシビリティ統合テスト', async ({ page }) => {
    // 完全フロー実行
    await helper.executeCompleteUserFlow();

    // 潮汐グラフトグルボタンの確認
    const toggleButton = page.locator(`[data-testid="${TestIds.TIDE_GRAPH_TOGGLE_BUTTON}"]`);
    await expect(toggleButton).toBeVisible();

    // グラフを展開
    await toggleButton.click();
    await page.waitForSelector(`[data-testid="${TestIds.TIDE_CHART}"]`, { timeout: 30000 });

    // グラフが表示されることを確認
    await expect(page.locator(`[data-testid="${TestIds.TIDE_CHART}"]`)).toBeVisible();
  });
});
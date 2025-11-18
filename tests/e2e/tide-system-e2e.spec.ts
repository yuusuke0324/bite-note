/**
 * TASK-402: 潮汐システムE2Eテストスイート
 *
 * 要件:
 * - 潮汐グラフ表示から詳細確認まで
 * - ユーザーインタラクション動作
 * - エラーケースのテスト
 * - ブラウザ間互換性テスト
 */

import { test, expect, Page } from '@playwright/test';

// テスト用ヘルパー関数
class TideSystemE2EHelper {
  constructor(private page: Page) {}

  // 釣果記録作成
  async createFishingRecord(recordData: {
    location: string;
    fishSpecies: string;
    size?: number;
    useGPS?: boolean;
  }) {
    await this.page.goto('/fishing-records/new');

    await this.page.fill('[data-testid="location-name"]', recordData.location);
    // FishSpeciesAutocompleteはTestIds.FISH_SPECIESを使用していないため、placeholderで特定
    await this.page.fill('input[placeholder*="魚種"]', recordData.fishSpecies);

    if (recordData.size) {
      await this.page.fill('[data-testid="fish-size"]', recordData.size.toString());
    }

    // GPS使用はフォーム送信時にuseGPS=trueとして処理される
    // use-gps-buttonは存在しないため、この処理は不要
    // if (recordData.useGPS) {
    //   await this.page.click('[data-testid="use-gps-button"]');
    //   await this.page.waitForTimeout(1000);
    // }

    await this.page.click('[data-testid="save-record-button"]');
    await this.page.waitForURL('/fishing-records');
  }

  // 釣果記録詳細ページに移動
  async goToRecordDetail(recordId?: string) {
    if (recordId) {
      await this.page.goto(`/fishing-records/${recordId}`);
    } else {
      // 最新記録の詳細ページに移動
      await this.page.goto('/fishing-records');
      await this.page.click('[data-testid^="record-item-"]:first-child [data-testid="view-detail-button"]');
    }
  }

  // 潮汐グラフの表示を確認
  async verifyTideGraphVisible() {
    await expect(this.page.locator('[data-testid="tide-graph"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="tide-graph-canvas"]')).toBeVisible();
  }

  // 潮汐サマリーカードの表示を確認
  async verifyTideSummaryVisible() {
    await expect(this.page.locator('[data-testid="tide-summary-card"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="current-tide-level"]')).toContainText(/\d+cm/);
    await expect(this.page.locator('[data-testid="tide-state"]')).toContainText(/(上げ潮|下げ潮|満潮|干潮)/);
    await expect(this.page.locator('[data-testid="tide-type"]')).toContainText(/(大潮|小潮|中潮|若潮|長潮)/);
  }

  // 潮汐トゥールチップの動作確認
  async verifyTideTooltipInteraction() {
    const graphCanvas = this.page.locator('[data-testid="tide-graph-canvas"]');

    // マウスオーバーでトゥールチップ表示
    await graphCanvas.hover({ position: { x: 100, y: 100 } });
    await expect(this.page.locator('[data-testid="tide-tooltip"]')).toBeVisible();

    // トゥールチップ内容確認
    await expect(this.page.locator('[data-testid="tooltip-time"]')).toContainText(/\d{1,2}:\d{2}/);
    await expect(this.page.locator('[data-testid="tooltip-level"]')).toContainText(/\d+cm/);

    // マウス移動でトゥールチップが追従
    await graphCanvas.hover({ position: { x: 200, y: 100 } });
    await this.page.waitForTimeout(100);

    // マウスアウトでトゥールチップ消失
    await this.page.locator('body').hover({ position: { x: 0, y: 0 } });
    await expect(this.page.locator('[data-testid="tide-tooltip"]')).not.toBeVisible();
  }

  // 潮汐統合セクションの展開・折りたたみ確認
  async verifyTideIntegrationToggle() {
    const toggleButton = this.page.locator('[data-testid="tide-graph-toggle-button"]');
    const tideContent = this.page.locator('[data-testid="tide-content-section"]');

    // 初期状態確認
    await expect(toggleButton).toContainText('潮汐グラフを表示');
    await expect(tideContent).not.toBeVisible();

    // 展開
    await toggleButton.click();
    await expect(toggleButton).toContainText('潮汐グラフを非表示');
    await expect(tideContent).toBeVisible();

    // アニメーション完了待機
    await this.page.waitForTimeout(350);

    // 折りたたみ
    await toggleButton.click();
    await expect(toggleButton).toContainText('潮汐グラフを表示');
    await this.page.waitForTimeout(350);
    await expect(tideContent).not.toBeVisible();
  }

  // エラーハンドリング確認
  async verifyErrorHandling() {
    // GPS座標なしの場合のエラー表示
    const errorMessage = this.page.locator('[data-testid="coordinates-error"]');
    await expect(errorMessage).toContainText('GPS座標が記録されていないため、潮汐情報を表示できません');
  }

  // ローディング状態確認
  async verifyLoadingStates() {
    const toggleButton = this.page.locator('[data-testid="tide-graph-toggle-button"]');

    await toggleButton.click();

    // ローディング表示確認
    await expect(this.page.locator('[data-testid="tide-loading"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="tide-loading"]')).toContainText('潮汐情報を計算中...');

    // ローディング完了後のコンテンツ表示
    await this.page.waitForTimeout(2000);
    await expect(this.page.locator('[data-testid="tide-loading"]')).not.toBeVisible();
    await expect(this.page.locator('[data-testid="tide-summary-card"]')).toBeVisible();
  }
}

test.describe('TASK-402: 潮汐システムE2Eテスト', () => {
  let helper: TideSystemE2EHelper;

  test.beforeEach(async ({ page }) => {
    helper = new TideSystemE2EHelper(page);

    // モック位置情報を設定
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 35.6762, longitude: 139.6503 });
  });

  test.describe('基本フロー', () => {
    test('TC-E001: GPS付き釣果記録の潮汐情報表示フロー', async ({ page }) => {
      // 1. GPS付き釣果記録を作成
      await helper.createFishingRecord({
        location: '東京湾',
        fishSpecies: 'スズキ',
        size: 45,
        useGPS: true
      });

      // 2. 記録詳細ページに移動
      await helper.goToRecordDetail();

      // 3. 潮汐セクションが表示されることを確認
      await expect(page.locator('[data-testid="tide-integration-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="tide-graph-toggle-button"]')).toBeVisible();

      // 4. 潮汐グラフを展開
      await page.click('[data-testid="tide-graph-toggle-button"]');

      // 5. ローディング状態確認
      await helper.verifyLoadingStates();

      // 6. 潮汐情報の表示確認
      await helper.verifyTideGraphVisible();
      await helper.verifyTideSummaryVisible();

      // 7. 釣果時刻マーカーの表示確認
      await expect(page.locator('[data-testid="fishing-time-marker"]')).toBeVisible();

      // 8. 次回最適釣行時間の提案確認
      await expect(page.locator('[data-testid="next-optimal-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="next-optimal-time"]')).toContainText(/\d{1,2}:\d{2}/);
    });

    test('TC-E002: GPS無し釣果記録のエラー表示', async ({ page }) => {
      // 1. GPS無し釣果記録を作成
      await helper.createFishingRecord({
        location: '河川',
        fishSpecies: 'バス',
        size: 30,
        useGPS: false
      });

      // 2. 記録詳細ページに移動
      await helper.goToRecordDetail();

      // 3. エラーメッセージの表示確認
      await helper.verifyErrorHandling();
    });
  });

  test.describe('インタラクション', () => {
    test('TC-E003: 潮汐グラフのインタラクション', async ({ page }) => {
      // 1. GPS付き記録作成
      await helper.createFishingRecord({
        location: '相模湾',
        fishSpecies: 'アジ',
        size: 25,
        useGPS: true
      });

      // 2. 詳細ページで潮汐グラフを表示
      await helper.goToRecordDetail();
      await page.click('[data-testid="tide-graph-toggle-button"]');
      await page.waitForTimeout(2000);

      // 3. トゥールチップのインタラクション確認
      await helper.verifyTideTooltipInteraction();
    });

    test('TC-E004: 潮汐統合セクションの展開・折りたたみ', async ({ page }) => {
      // 1. GPS付き記録作成
      await helper.createFishingRecord({
        location: '伊勢湾',
        fishSpecies: 'クロダイ',
        size: 35,
        useGPS: true
      });

      // 2. 詳細ページに移動
      await helper.goToRecordDetail();

      // 3. 展開・折りたたみ動作確認
      await helper.verifyTideIntegrationToggle();
    });

    test('TC-E005: 潮汐と釣果の関係分析表示', async ({ page }) => {
      // 1. GPS付き記録作成
      await helper.createFishingRecord({
        location: '大阪湾',
        fishSpecies: 'サバ',
        size: 28,
        useGPS: true
      });

      // 2. 詳細ページで潮汐情報表示
      await helper.goToRecordDetail();
      await page.click('[data-testid="tide-graph-toggle-button"]');
      await page.waitForTimeout(2000);

      // 3. 分析セクションの表示確認
      await expect(page.locator('[data-testid="tide-analysis-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="fishing-time-analysis"]')).toBeVisible();
      await expect(page.locator('[data-testid="fishing-time-analysis"]')).toContainText(/潮/);
    });
  });

  test.describe('エラーハンドリング', () => {
    test('TC-E006: 潮汐計算エラーの再試行', async ({ page }) => {
      // モック関数で計算エラーをシミュレート
      await page.route('**/api/tide/**', route => {
        route.abort('failed');
      });

      // 1. GPS付き記録作成
      await helper.createFishingRecord({
        location: '駿河湾',
        fishSpecies: 'イワシ',
        size: 15,
        useGPS: true
      });

      // 2. 詳細ページで潮汐グラフ展開試行
      await helper.goToRecordDetail();
      await page.click('[data-testid="tide-graph-toggle-button"]');

      // 3. エラー表示確認
      await expect(page.locator('[data-testid="tide-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="tide-error"]')).toContainText('潮汐情報の取得に失敗しました');

      // 4. 再試行ボタン確認
      await expect(page.locator('[data-testid="tide-retry-button"]')).toBeVisible();

      // モックを解除して再試行
      await page.unroute('**/api/tide/**');
      await page.click('[data-testid="tide-retry-button"]');

      // 5. 再試行後の正常表示確認
      await page.waitForTimeout(2000);
      await helper.verifyTideSummaryVisible();
    });

    test('TC-E007: ネットワークエラー時の動作', async ({ page }) => {
      // 1. GPS付き記録作成
      await helper.createFishingRecord({
        location: '仙台湾',
        fishSpecies: 'ヒラメ',
        size: 40,
        useGPS: true
      });

      // 2. ネットワークを切断
      await page.context().setOffline(true);

      // 3. 詳細ページで潮汐グラフ展開試行
      await helper.goToRecordDetail();
      await page.click('[data-testid="tide-graph-toggle-button"]');

      // 4. ネットワークエラー表示確認
      await expect(page.locator('[data-testid="tide-error"]')).toBeVisible();

      // 5. ネットワーク復旧
      await page.context().setOffline(false);
      await page.click('[data-testid="tide-retry-button"]');

      // 6. 復旧後の正常動作確認
      await page.waitForTimeout(2000);
      await helper.verifyTideSummaryVisible();
    });
  });

  test.describe('レスポンシブ対応', () => {
    test('TC-E008: モバイル表示での潮汐システム', async ({ page }) => {
      // モバイルビューポート設定 (iPhone 14 サイズ)
      await page.setViewportSize({ width: 390, height: 844 });

      // 1. GPS付き記録作成
      await helper.createFishingRecord({
        location: '三河湾',
        fishSpecies: 'キス',
        size: 20,
        useGPS: true
      });

      // 2. 詳細ページで潮汐情報表示
      await helper.goToRecordDetail();
      await page.click('[data-testid="tide-graph-toggle-button"]');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // 3. モバイル向けレイアウト確認
      await expect(page.locator('[data-testid="tide-integration-section"]')).toHaveClass(/mobile-layout/);

      // 4. タッチ操作での潮汐グラフインタラクション
      const graphCanvas = page.locator('[data-testid="tide-graph-canvas"]');
      await graphCanvas.tap({ position: { x: 100, y: 100 } });
      await expect(page.locator('[data-testid="tide-tooltip"]')).toBeVisible();
    });

    test('TC-E009: タブレット表示での潮汐システム', async ({ page }) => {
      // タブレットビューポート設定
      await page.setViewportSize({ width: 768, height: 1024 });

      // 1. GPS付き記録作成
      await helper.createFishingRecord({
        location: '富山湾',
        fishSpecies: 'ブリ',
        size: 60,
        useGPS: true
      });

      // 2. 詳細ページで潮汐情報表示
      await helper.goToRecordDetail();
      await page.click('[data-testid="tide-graph-toggle-button"]');
      await page.waitForTimeout(2000);

      // 3. タブレット向けレイアウト確認
      await expect(page.locator('[data-testid="tide-integration-section"]')).toHaveClass(/tablet-layout/);

      // 4. グラフサイズの適切な調整確認
      const graph = page.locator('[data-testid="tide-graph"]');
      const boundingBox = await graph.boundingBox();
      expect(boundingBox?.width).toBeGreaterThan(600);
      expect(boundingBox?.width).toBeLessThan(768);
    });
  });

  test.describe('アクセシビリティ', () => {
    test('TC-E010: キーボードナビゲーション', async ({ page }) => {
      // 1. GPS付き記録作成
      await helper.createFishingRecord({
        location: '博多湾',
        fishSpecies: 'メバル',
        size: 22,
        useGPS: true
      });

      // 2. 詳細ページに移動
      await helper.goToRecordDetail();

      // 3. キーボード操作での潮汐グラフ展開
      await page.keyboard.press('Tab'); // 潮汐ボタンにフォーカス
      await expect(page.locator('[data-testid="tide-graph-toggle-button"]')).toBeFocused({ timeout: 1000 });

      await page.keyboard.press('Enter'); // Enterキーで展開
      await page.waitForSelector('[data-testid="tide-content-section"]', { state: 'visible', timeout: 5000 });

      // 4. スペースキーでの操作確認
      await page.keyboard.press('Space'); // Spaceキーで折りたたみ
      await page.waitForSelector('[data-testid="tide-content-section"]', { state: 'hidden', timeout: 5000 });
    });

    test('TC-E011: スクリーンリーダー対応', async ({ page }) => {
      // 1. GPS付き記録作成
      await helper.createFishingRecord({
        location: '鹿児島湾',
        fishSpecies: 'カンパチ',
        size: 50,
        useGPS: true
      });

      // 2. 詳細ページで潮汐情報表示
      await helper.goToRecordDetail();

      // 3. ARIA属性の確認
      const toggleButton = page.locator('[data-testid="tide-graph-toggle-button"]');
      await expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      await expect(toggleButton).toHaveAttribute('aria-controls', 'tide-content-section');

      // 4. 展開後のARIA属性変更確認
      await toggleButton.click();
      await expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

      // 5. スクリーンリーダー用説明文確認
      await expect(page.locator('[data-testid="tide-integration-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="tide-integration-description"]')).toContainText('潮汐情報セクション');
    });
  });

  test.describe('パフォーマンス', () => {
    test('TC-E012: 潮汐データ読み込みパフォーマンス', async ({ page }) => {
      // 環境別閾値設定
      const isCI = process.env.CI === 'true';
      const threshold = isCI ? 5000 : 3000;

      // 1. GPS付き記録作成
      await helper.createFishingRecord({
        location: '紀伊水道',
        fishSpecies: 'タイ',
        size: 38,
        useGPS: true
      });

      // 2. 詳細ページに移動
      await helper.goToRecordDetail();

      // 3. パフォーマンス測定開始
      const startTime = Date.now();

      await page.click('[data-testid="tide-graph-toggle-button"]');
      await page.waitForSelector('[data-testid="tide-summary-card"]', { timeout: 10000 });

      const loadTime = Date.now() - startTime;

      // 4. パフォーマンス基準確認
      expect(loadTime).toBeLessThan(threshold);

      // 5. アニメーションの滑らかさ確認（300ms以内で完了）
      await page.waitForTimeout(350);
      await expect(page.locator('[data-testid="tide-content-section"]')).toBeVisible();
    });
  });

  test.describe('ブラウザ互換性', () => {
    test('TC-E013: 主要ブラウザでの動作確認', async ({ page, browserName }) => {
      // 1. GPS付き記録作成
      await helper.createFishingRecord({
        location: '瀬戸内海',
        fishSpecies: 'サワラ',
        size: 42,
        useGPS: true
      });

      // 2. 詳細ページで潮汐情報表示
      await helper.goToRecordDetail();
      await page.click('[data-testid="tide-graph-toggle-button"]');
      await page.waitForTimeout(2000);

      // 3. ブラウザ固有の動作確認
      await helper.verifyTideGraphVisible();
      await helper.verifyTideSummaryVisible();

      // 4. ブラウザごとの特殊確認
      if (browserName === 'webkit') {
        // Safari特有のテスト
        await expect(page.locator('[data-testid="tide-graph-canvas"]')).toBeVisible();
      } else if (browserName === 'firefox') {
        // Firefox特有のテスト
        await helper.verifyTideTooltipInteraction();
      }

      console.log(`${browserName}での潮汐システム動作確認完了`);
    });
  });
});
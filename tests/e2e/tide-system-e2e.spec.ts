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
import path from 'path';
import { fileURLToPath } from 'url';
import { TestIds } from '../../src/constants/testIds';
import { setupCleanPage } from './tide-chart/helpers';
import { createGPSPhoto, TEST_LOCATIONS } from '../fixtures/create-test-image';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// テスト用ヘルパー関数
class TideSystemE2EHelper {
  private readonly testPhotosDir = path.join(__dirname, '../fixtures/photos');
  private readonly testPhotoPath = path.join(this.testPhotosDir, 'tokyo-bay-test.jpg');

  constructor(private page: Page) {}

  // テスト画像生成（beforeAll で1回だけ実行）
  async setupTestPhoto() {
    await createGPSPhoto(TEST_LOCATIONS.TOKYO_BAY, this.testPhotoPath);
  }

  // 釣果記録作成
  async createFishingRecord(recordData: {
    location: string;
    fishSpecies: string;
    size?: number;
    useGPS?: boolean;
  }) {
    // 🟢 改善1: タブ切り替えをより堅牢に (ModernApp.tsx: nav-form パターン)
    const formTab = this.page.locator(`[data-testid="nav-form"]`);
    await formTab.waitFor({ state: 'visible', timeout: 10000 });
    await expect(formTab).toBeEnabled();
    await formTab.click();

    // 🟢 改善2: タブ切り替え完了を確認（waitForTimeoutの代わり）
    await this.page.waitForSelector(
      '[data-testid="location-name"]',
      { state: 'visible', timeout: 5000 }
    );

    // 🟢 改善3: フォーム入力後、値が正しく入力されたか確認
    await this.page.fill('[data-testid="location-name"]', recordData.location);
    await expect(this.page.locator('[data-testid="location-name"]')).toHaveValue(recordData.location);

    // FishSpeciesAutocompleteの処理
    const fishSpeciesInput = this.page.locator('input[placeholder*="魚種"]');
    await fishSpeciesInput.waitFor({ state: 'visible', timeout: 5000 });
    await fishSpeciesInput.fill(recordData.fishSpecies);
    await expect(fishSpeciesInput).toHaveValue(recordData.fishSpecies);

    if (recordData.size) {
      await this.page.fill('[data-testid="fish-size"]', recordData.size.toString());
      await expect(this.page.locator('[data-testid="fish-size"]')).toHaveValue(recordData.size.toString());
    }

    // GPS座標付き写真アップロード（本番フロー）
    if (recordData.useGPS) {
      // 写真アップロード
      const fileInput = this.page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(this.testPhotoPath);

      // EXIF処理完了 → coordinates設定 → 潮汐計算完了まで待機
      await this.page.waitForFunction(
        () => {
          const form = document.querySelector('[data-testid="fishing-record-form"]');
          return form?.getAttribute('data-has-coordinates') === 'true';
        },
        { timeout: 10000 }
      );

      // ℹ️ tide-graph-toggle-buttonは記録詳細ページにのみ存在
      // フォーム内では潮汐情報表示のみなので、ここでは確認しない
    }

    // 🟢 改善4: 保存ボタンが有効か確認してからクリック
    const saveButton = this.page.locator('[data-testid="save-record-button"]');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // 🟢 改善5: 保存後、リストタブに自動切り替わることを確認（waitForTimeoutの代わり）
    let switchedToList = await this.page.waitForSelector(
      `[data-testid="nav-list"][aria-current="page"]`,
      { timeout: 5000, state: 'visible' }
    ).then(() => true).catch(() => false);

    if (!switchedToList) {
      // 手動で切り替え (ModernApp.tsx: nav-list パターン、aria-current使用)
      await this.page.locator(`[data-testid="nav-list"]`).click();
      await this.page.waitForSelector(
        `[data-testid="nav-list"][aria-current="page"]`,
        { timeout: 5000, state: 'visible' }
      );
    }

    // 🟢 改善6: 保存された記録が表示されることを確認
    await this.page.waitForSelector(
      '[data-testid^="record-item-"]',
      { timeout: 5000, state: 'visible' }
    );
  }

  // 釣果記録詳細ページに移動
  async goToRecordDetail(recordId?: string) {
    // リストタブに切り替え (ModernApp.tsx: nav-list パターン)
    const listTab = this.page.locator(`[data-testid="nav-list"]`);
    await listTab.waitFor({ state: 'visible', timeout: 10000 });
    await expect(listTab).toBeEnabled();
    await listTab.click();

    // 🟢 改善1: タブ切り替え完了を確認
    await this.page.waitForSelector(
      '[data-testid^="record-item-"]',
      { timeout: 5000, state: 'visible' }
    );

    // 🟢 改善2: recordId指定がある場合は該当記録を探す
    let recordItem;
    if (recordId) {
      recordItem = this.page.locator(`[data-testid="record-item-${recordId}"]`);
      await recordItem.waitFor({ state: 'visible', timeout: 5000 });
    } else {
      recordItem = this.page.locator('[data-testid^="record-item-"]').first();
      await recordItem.waitFor({ state: 'visible', timeout: 5000 });
    }

    await recordItem.click();

    // 🟢 改善3: モーダル表示を確実に待機（waitForTimeoutの代わり）
    // FishingRecordDetailコンポーネントのモーダルを想定
    await this.page.waitForSelector(
      '[data-testid="record-detail-modal"], [role="dialog"]',
      { timeout: 5000, state: 'visible' }
    );

    // 🟢 改善4: モーダルが完全にレンダリングされるまで待機
    // record-detail-contentの存在確認（存在しない場合はダイアログで代替）
    const hasDetailContent = await this.page.locator('[data-testid="record-detail-content"]')
      .count().then(count => count > 0);

    if (hasDetailContent) {
      await this.page.waitForSelector('[data-testid="record-detail-content"]', {
        timeout: 5000, state: 'visible'
      });
    } else {
      // フォールバック: role="dialog" で確認
      await this.page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });
    }
  }

  // 潮汐情報の読み込み完了を待機
  async waitForTideDataLoad() {
    await this.page.waitForSelector(
      '[data-testid="tide-summary-card"]',
      { timeout: 10000, state: 'visible' }
    );
  }

  // 潮汐グラフの表示を確認
  async verifyTideGraphVisible() {
    // SVG要素はYAMLスナップショットに現れないため、より柔軟な検証を行う
    // 1. tide-graph-containerの存在確認
    const graphContainer = this.page.locator('[data-testid="tide-graph-container"]');

    // 2. または、潮汐グラフのSVG要素（role="img"）を確認
    const svgGraph = this.page.locator('svg[role="img"][aria-label*="潮汐グラフ"]');

    // 3. または、"潮位グラフ（24時間表示）"の見出しを確認
    const graphHeading = this.page.locator('h4:has-text("潮位グラフ（24時間表示）")');

    // いずれかが表示されていればOK
    const containerVisible = await graphContainer.isVisible().catch(() => false);
    const svgVisible = await svgGraph.isVisible().catch(() => false);
    const headingVisible = await graphHeading.isVisible().catch(() => false);

    if (!containerVisible && !svgVisible && !headingVisible) {
      throw new Error('潮汐グラフが表示されていません');
    }
  }

  // 潮汐サマリーカードの表示を確認
  async verifyTideSummaryVisible() {
    // tide-summary-cardセクションの表示確認
    await expect(this.page.locator('[data-testid="tide-summary-card"]')).toBeVisible();

    // 実際の表示内容を柔軟に確認（data-testidではなくテキストベース）
    // "🎣 釣果と潮汐の関係" の見出し
    const relationshipHeading = this.page.locator('h4:has-text("釣果と潮汐の関係")');
    await expect(relationshipHeading).toBeVisible();

    // "次回の最適釣行時間" の見出し
    const optimalTimeHeading = this.page.locator('h5:has-text("次回の最適釣行時間")');
    await expect(optimalTimeHeading).toBeVisible();
  }

  // 潮汐トゥールチップの動作確認
  async verifyTideTooltipInteraction() {
    // グラフ展開の完了を待つ（tide-content-sectionが完全に表示されるまで）
    const contentSection = this.page.locator('[data-testid="tide-content-section"]');
    await contentSection.waitFor({ state: 'visible', timeout: 5000 });

    // 展開アニメーション完了を待つ（TideIntegrationのアニメーション時間は250ms）
    // overflow: hidden → visible への変更完了を確実にするため1000ms待機
    // CI環境ではアニメーション処理が遅延する可能性があるため余裕を持たせる
    await this.page.waitForTimeout(1000);

    // グラフコンテナを取得
    const graphCanvas = this.page.locator('[data-testid="tide-graph-canvas"]');
    await graphCanvas.waitFor({ state: 'visible', timeout: 5000 });

    // mouse.move を使用してグラフ領域に直接カーソルを移動
    // これによりoverflow:hiddenの影響を回避
    const boundingBox = await graphCanvas.boundingBox();

    if (boundingBox) {
      // グラフの中央にマウスを移動してtooltipを表示
      await this.page.mouse.move(
        boundingBox.x + boundingBox.width / 2,
        boundingBox.y + boundingBox.height / 2
      );

      // tooltipが表示されるまで少し待機
      await this.page.waitForTimeout(500);

      // 複数の位置でtooltipを確認するため、別の位置にも移動
      await this.page.mouse.move(
        boundingBox.x + boundingBox.width * 0.3,
        boundingBox.y + boundingBox.height * 0.5
      );

      // tooltipの表示を確認
      const tooltip = this.page.locator('[data-testid="tide-tooltip"]');
      await tooltip.waitFor({ state: 'visible', timeout: 3000 });

      // トゥールチップ内容確認
      await expect(this.page.locator('[data-testid="tooltip-time"]')).toContainText(/\d{1,2}:\d{2}/);
      await expect(this.page.locator('[data-testid="tooltip-level"]')).toContainText(/\d+cm/);

      // マウス移動でトゥールチップが追従（別の位置に移動）
      await this.page.mouse.move(
        boundingBox.x + boundingBox.width * 0.7,
        boundingBox.y + boundingBox.height * 0.5
      );
      await expect(tooltip).toBeVisible();

      // マウスをグラフ外に移動してtooltipが消えることを確認
      await this.page.mouse.move(0, 0);
      await expect(tooltip).not.toBeVisible({ timeout: 3000 });
    } else {
      // boundingBoxが取得できない場合はテストをスキップ
      throw new Error('Unable to get graph bounding box for interaction test');
    }
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
    // アニメーション完了を待つ（waitForTimeoutの代わりにvisibility確認）
    await expect(tideContent).toBeVisible({ timeout: 1000 });

    // 折りたたみ
    await toggleButton.click();
    await expect(toggleButton).toContainText('潮汐グラフを表示');
    // アニメーション完了を待つ（waitForTimeoutの代わりにnot.toBeVisible確認）
    await expect(tideContent).not.toBeVisible({ timeout: 1000 });
  }

  // エラーハンドリング確認
  async verifyErrorHandling() {
    // GPS座標なしの場合のエラー表示
    const errorMessage = this.page.locator('[data-testid="coordinates-error"]');
    await expect(errorMessage).toContainText('GPS座標が記録されていないため、潮汐情報を表示できません');
  }

  // ローディング状態確認（高速ロード時はスキップ可能）
  async verifyLoadingStates() {
    // ローディング表示確認（オプション: 高速ロード時は表示されないことがある）
    const loadingIndicator = this.page.locator('[data-testid="tide-loading"]');
    const loadingVisible = await loadingIndicator.isVisible().catch(() => false);

    if (loadingVisible) {
      await expect(loadingIndicator).toContainText('潮汐情報を計算中...');
      // ローディング完了まで待機
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
    }

    // 最終的な表示確認（ローディングの有無に関わらず）
    await expect(this.page.locator('[data-testid="tide-summary-card"]')).toBeVisible({ timeout: 5000 });
  }
}

test.describe('TASK-402: 潮汐システムE2Eテスト', () => {
  let helper: TideSystemE2EHelper;

  // テスト画像を1回だけ生成（全テスト共通）
  test.beforeAll(async () => {
    const tempHelper = new TideSystemE2EHelper(null as any); // ページ不要
    await tempHelper.setupTestPhoto();
  });

  test.beforeEach(async ({ page }) => {
    // ⚠️ 重要: テスト間の状態分離のため、一意なDB名を使用
    // IndexedDB削除不要 → タイムアウトを30秒に短縮
    test.setTimeout(30000);
    await setupCleanPage(page);

    helper = new TideSystemE2EHelper(page);

    // モック位置情報を設定
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 35.6762, longitude: 139.6503 });
  });

  // テスト完了後にDB削除（クリーンアップ）
  test.afterEach(async ({ page }) => {
    await page.evaluate(async () => {
      const dbName = globalThis.__TEST_DB_NAME__;
      if (dbName && typeof indexedDB !== 'undefined') {
        try {
          await new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase(dbName);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve(); // エラーでも続行
          });
        } catch (e) {
          console.log('DB cleanup skipped:', e);
        }
      }
    });
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
      await helper.waitForTideDataLoad();

      // 3. グラフキャンバスの表示確認
      // Note: Rechartsコンポーネントはdata-testidをDOMに伝播しないため、
      // 内部要素(XAxis, YAxis, Line)のdata-testidはテストできない。
      // グラフ全体の描画確認とSVG要素の存在確認で代替する。
      const graphCanvas = page.locator('[data-testid="tide-graph-canvas"]');
      await expect(graphCanvas).toBeVisible();

      // 4. グラフ内のSVG要素が存在することを確認
      // Rechartsが生成する実際のクラス名を使用
      await expect(graphCanvas.locator('.recharts-wrapper')).toBeVisible();
      await expect(graphCanvas.locator('.recharts-surface')).toBeVisible();
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
      await helper.waitForTideDataLoad();

      // 3. 分析セクションの表示確認
      await expect(page.locator('[data-testid="tide-analysis-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="fishing-time-analysis"]')).toBeVisible();
      await expect(page.locator('[data-testid="fishing-time-analysis"]')).toContainText(/潮/);
    });
  });

  test.describe('エラーハンドリング', () => {
    // Note: TC-E006（APIエラーの再試行）とTC-E007（ネットワークエラー時の動作）は削除
    //
    // 削除理由:
    // アプリケーションは完全にローカルで潮汐計算を行うため、
    // APIモックやネットワークオフライン設定は無意味でテストとして成立しない
    //
    // 将来的に追加すべきエラーケースのテスト:
    // - 座標データ不正時のエラー表示
    // - 地域データ取得失敗時のフォールバック動作
    // - データ検証エラー時の段階的フォールバック
    // - 初期化失敗時のエラーハンドリング
    //
    // 削除経緯: Issue #145対応時に実装との矛盾を発見（2025-11-18）
    // 詳細: PR #146のコミット履歴参照
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
      await helper.waitForTideDataLoad();

      // 3. モバイル向けレイアウト確認
      await expect(page.locator('[data-testid="tide-integration-section"]')).toHaveClass(/mobile-layout/);

      // 4. グラフの表示確認
      // Note: タッチイベントのテストにはPlaywrightのhasTouchコンテキストオプションが必要。
      // 現在のCI環境では設定されていないため、表示確認のみ実施。
      const graphCanvas = page.locator('[data-testid="tide-graph-canvas"]');
      await expect(graphCanvas).toBeVisible();
    });

    test('TC-E009: タブレット表示での潮汐システム', async ({ page }) => {
      // タブレットビューポート設定 (769px以上がtablet判定)
      await page.setViewportSize({ width: 769, height: 1024 });

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
      await helper.waitForTideDataLoad();

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
      // Note: 詳細ページのフォーカス順序は動的であるため、Tabキーでの移動ではなく直接フォーカス設定を使用
      const toggleButton = page.locator('[data-testid="tide-graph-toggle-button"]');
      await toggleButton.focus();
      await expect(toggleButton).toBeFocused();

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
      await expect(page.locator('[data-testid="tide-content-section"]')).toBeVisible({ timeout: 1000 });
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
      await helper.waitForTideDataLoad();

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
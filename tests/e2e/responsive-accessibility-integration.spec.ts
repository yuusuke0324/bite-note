/**
 * TASK-301: レスポンシブ対応・アクセシビリティ統合テスト
 *
 * ⚠️ Issue #161: このテストファイルは一時的にスキップされています
 *
 * 理由: ボトムナビゲーションの潮汐タブが未実装のため、テストが実行できません。
 * 代替: tide-chart-accessibility.spec.ts で記録詳細画面内の潮汐グラフをテスト中。
 *
 * 再開条件: ボトムナビゲーション潮汐タブの実装完了後（将来のIssue）
 * 関連Issue: #161, #148
 */

import { test, expect, type Page } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';
import {
  createTestFishingRecord,
  navigateToRecordsList,
  openTideGraphTab,
  assertTideGraphVisible,
  checkResponsiveDisplay,
  checkBasicAccessibility
} from './helpers/test-helpers';
import { TestIds } from '../../src/constants/testIds';

// 全テストをスキップ
test.describe.skip('TASK-301: Responsive & Accessibility Integration Tests', () => {

// デバイスサイズ定義
const devices = {
  desktop: [
    { name: 'Full HD', width: 1920, height: 1080 },
    { name: 'HD', width: 1366, height: 768 },
    { name: 'Large Desktop', width: 2560, height: 1440 }
  ],
  tablet: [
    { name: 'iPad', width: 768, height: 1024, orientation: 'portrait' },
    { name: 'iPad Landscape', width: 1024, height: 768, orientation: 'landscape' },
    { name: 'Android Tablet', width: 800, height: 1280, orientation: 'portrait' }
  ],
  mobile: [
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'Pixel 5', width: 393, height: 851 },
    { name: 'iPhone SE', width: 375, height: 667 }
  ]
};

test.describe('TASK-301-005: デスクトップレスポンシブ表示', () => {
  devices.desktop.forEach(size => {
    test(`should display correctly on ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
      // Given: 指定サイズでのブラウザ表示
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto('/');

      // テスト用釣果記録を作成
      await setupTideGraphTest(page);

      // When: 潮汐グラフを表示
      await openTideGraphTab(page);
      await assertTideGraphVisible(page);

      // Then: 適切なレイアウトとサイズで表示される
      const tideGraph = await page.locator('[data-testid="tide-graph-canvas"]');
      await expect(tideGraph).toBeVisible();

      // グラフの幅がコンテナに適合している
      const graphBounds = await tideGraph.boundingBox();
      expect(graphBounds?.width).toBeGreaterThan(0);
      expect(graphBounds?.width).toBeLessThan(size.width);

      // 全ての要素が視認可能
      await expect(page.locator('[data-testid="tide-graph-legend"]')).toBeVisible();
      await expect(page.locator('[data-testid="tide-graph-controls"]')).toBeVisible();
      await expect(page.locator('[data-testid="tide-event-list"]')).toBeVisible();

      // スクロールが不要（グラフエリア内でコンテンツが収まる）
      const hasVerticalScrollbar = await page.evaluate(() => {
        return document.documentElement.scrollHeight > document.documentElement.clientHeight;
      });

      // デスクトップでは基本的にスクロールは不要
      if (size.height >= 768) {
        expect(hasVerticalScrollbar).toBeFalsy();
      }
    });
  });
});

test.describe('TASK-301-006: タブレット向け表示確認', () => {
  devices.tablet.forEach(device => {
    test(`should work on ${device.name}`, async ({ page }) => {
      // Given: タブレットサイズでの表示
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto('/');

      await setupTideGraphTest(page);

      // When: 潮汐グラフを表示
      await openTideGraphTab(page);
      await assertTideGraphVisible(page);

      // Then: タッチ操作対応の確認
      const tideGraph = await page.locator('[data-testid="tide-graph-canvas"]');

      // タッチジェスチャーのシミュレーション
      const graphBounds = await tideGraph.boundingBox();
      if (graphBounds) {
        // ピンチズーム（まだ実装されていないためテスト失敗予定）
        await page.touchScreen.tap(graphBounds.x + 100, graphBounds.y + 100);
        await page.touchScreen.tap(graphBounds.x + 200, graphBounds.y + 200);

        // ズーム機能の確認（失敗予定）
        const zoomLevel = await page.locator('[data-testid="zoom-level-indicator"]');
        await expect(zoomLevel).toBeVisible(); // 失敗予定
      }

      // 画面回転時の表示継続性
      if (device.orientation === 'portrait') {
        // 横向きに回転
        await page.setViewportSize({ width: device.height, height: device.width });
        await page.waitForSelector('[data-testid="tide-graph-canvas"]');

        // グラフが再描画されて適切に表示される
        const rotatedGraph = await page.locator('[data-testid="tide-graph-canvas"]');
        await expect(rotatedGraph).toBeVisible();

        // レイアウトが横向きに適応している（失敗予定）
        const landscapeLayout = await page.locator('[data-testid="landscape-layout"]');
        await expect(landscapeLayout).toBeVisible(); // 失敗予定
      }

      // グラフの可読性維持
      const graphLabels = await page.locator('[data-testid="tide-graph-y-axis"] text');
      const labelCount = await graphLabels.count();
      expect(labelCount).toBeGreaterThan(3); // 最低限の軸ラベルが表示
    });
  });
});

test.describe('TASK-301-007: モバイル端末での操作性', () => {
  devices.mobile.forEach(device => {
    test(`should be usable on ${device.name}`, async ({ page }) => {
      // Given: モバイルデバイスサイズ
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto('/');

      await setupTideGraphTest(page);

      // When: 潮汐グラフをタッチ操作
      await page.click('[data-testid="tide-graph-tab"]');
      await page.waitForSelector('[data-testid="tide-graph-canvas"]');

      // Then: スムーズなスクロール・ズーム
      const tideGraph = await page.locator('[data-testid="tide-graph-canvas"]');
      const graphBounds = await tideGraph.boundingBox();

      if (graphBounds) {
        // 水平スクロールの確認
        await page.touchScreen.tap(graphBounds.x + graphBounds.width / 2, graphBounds.y + 50);

        // スワイプ操作（左右移動）
        await page.mouse.move(graphBounds.x + 200, graphBounds.y + 100);
        await page.mouse.down();
        await page.mouse.move(graphBounds.x + 100, graphBounds.y + 100);
        await page.mouse.up();

        // タイムラインの移動が発生したか確認（失敗予定）
        const timeIndicator = await page.locator('[data-testid="current-time-indicator"]');
        await expect(timeIndicator).toBeVisible(); // 失敗予定
      }

      // 適切なタッチターゲットサイズ（44px以上）
      const touchTargets = await page.locator('[data-testid^="touch-target-"]');
      const targetCount = await touchTargets.count();

      for (let i = 0; i < targetCount; i++) {
        const target = touchTargets.nth(i);
        const bounds = await target.boundingBox();
        if (bounds) {
          expect(bounds.width).toBeGreaterThanOrEqual(44);
          expect(bounds.height).toBeGreaterThanOrEqual(44);
        }
      }

      // 読みやすいフォントサイズ（16px以上）
      const textElements = await page.locator('[data-testid="tide-graph-labels"] text');
      const textCount = await textElements.count();

      for (let i = 0; i < textCount; i++) {
        const fontSize = await textElements.nth(i).evaluate(el => {
          return window.getComputedStyle(el).fontSize;
        });
        const fontSizeValue = parseInt(fontSize.replace('px', ''));
        expect(fontSizeValue).toBeGreaterThanOrEqual(14); // モバイルでは14px以上
      }
    });
  });
});

test.describe('TASK-301-011: スクリーンリーダー対応確認', () => {
  test('should work with screen readers', async ({ page }) => {
    // Given: アクセシビリティツールの準備
    await injectAxe(page);
    await page.goto('/');

    await setupTideGraphTest(page);

    // When: 潮汐グラフを音声読み上げ
    await page.click('[data-testid="tide-graph-tab"]');
    await page.waitForSelector('[data-testid="tide-graph-canvas"]');

    // Then: 適切なARIA属性が設定されている
    const tideGraph = await page.locator('[data-testid="tide-graph-canvas"]');

    // canvas要素にaria-labelが設定されている（失敗予定）
    await expect(tideGraph).toHaveAttribute('aria-label'); // 失敗予定
    await expect(tideGraph).toHaveAttribute('role', 'img'); // 失敗予定

    // グラフの代替テキストが適切（失敗予定）
    const altText = await tideGraph.getAttribute('aria-label');
    expect(altText).toContain('潮汐グラフ'); // 失敗予定
    expect(altText).toContain('時間'); // 失敗予定
    expect(altText).toContain('潮位'); // 失敗予定

    // 時系列データが音声で理解可能な形式で提供されている（失敗予定）
    const dataTable = await page.locator('[data-testid="tide-data-table"]');
    await expect(dataTable).toBeVisible(); // 失敗予定
    await expect(dataTable).toHaveAttribute('aria-hidden', 'false'); // 失敗予定

    // axe-core による自動アクセシビリティチェック
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  });
});

test.describe('TASK-301-012: キーボードナビゲーション', () => {
  test('should support full keyboard navigation', async ({ page }) => {
    // Given: マウス使用不可の環境
    await page.goto('/');

    await setupTideGraphTest(page);

    // When: キーボードのみで操作
    await page.keyboard.press('Tab'); // ナビゲーションに移動
    await page.keyboard.press('Enter'); // 潮汐グラフタブを選択

    await page.waitForSelector('[data-testid="tide-graph-canvas"]');

    // Then: Tabキーで全要素にアクセス可能
    const focusedElement = await page.locator(':focus');
    let tabCount = 0;
    const maxTabs = 20; // 無限ループ防止

    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab');
      tabCount++;

      const newFocusedElement = await page.locator(':focus');
      const isVisible = await newFocusedElement.isVisible();

      if (isVisible) {
        // フォーカス可能な要素が見つかった
        const elementId = await newFocusedElement.getAttribute('data-testid');
        console.log(`Focused element: ${elementId}`);
      }

      // グラフエリアに到達したか確認
      const graphArea = await page.locator('[data-testid="tide-graph-area"]:focus');
      if (await graphArea.count() > 0) {
        break;
      }
    }

    // 矢印キーでグラフ内移動（失敗予定）
    await page.keyboard.press('ArrowRight');
    const timeMarker = await page.locator('[data-testid="keyboard-time-marker"]');
    await expect(timeMarker).toBeVisible(); // 失敗予定

    // Enterキーで詳細表示（失敗予定）
    await page.keyboard.press('Enter');
    const detailModal = await page.locator('[data-testid="tide-detail-modal"]');
    await expect(detailModal).toBeVisible(); // 失敗予定

    // Escapeキーで閉じる操作（失敗予定）
    await page.keyboard.press('Escape');
    await expect(detailModal).toBeHidden(); // 失敗予定
  });
});

test.describe('TASK-301-013: 色覚障害者対応確認', () => {
  test('should be accessible for color blind users', async ({ page }) => {
    await page.goto('/');

    await setupTideGraphTest(page);

    // Given: 色覚障害のシミュレート
    const colorBlindnessTypes = [
      { name: 'protanopia', filter: 'url(#protanopia)' },
      { name: 'deuteranopia', filter: 'url(#deuteranopia)' },
      { name: 'tritanopia', filter: 'url(#tritanopia)' }
    ];

    for (const type of colorBlindnessTypes) {
      // 色覚障害フィルターを適用（CSSフィルターで近似）
      await page.addStyleTag({
        content: `
          .tide-graph-canvas {
            filter: ${type.filter};
          }
        `
      });

      await page.click('[data-testid="tide-graph-tab"]');
      await page.waitForSelector('[data-testid="tide-graph-canvas"]');

      // Then: 色以外の手段でも情報が識別可能（失敗予定）
      const patternIndicators = await page.locator('[data-testid="tide-pattern-indicator"]');
      await expect(patternIndicators).toBeVisible(); // 失敗予定

      // 適切なコントラスト比が維持される
      const backgroundElements = await page.locator('[data-testid="tide-graph-background"]');
      const textElements = await page.locator('[data-testid="tide-graph-text"]');

      // コントラスト比の計算（簡易版）
      if (await backgroundElements.count() > 0 && await textElements.count() > 0) {
        const bgColor = await backgroundElements.first().evaluate(el =>
          window.getComputedStyle(el).backgroundColor
        );
        const textColor = await textElements.first().evaluate(el =>
          window.getComputedStyle(el).color
        );

        // 最低限のコントラスト比確認（詳細な計算は省略）
        expect(bgColor).not.toBe(textColor);
      }

      // パターンや形状での区別が可能（失敗予定）
      const shapeIndicators = await page.locator('[data-testid="tide-shape-indicator"]');
      await expect(shapeIndicators).toBeVisible(); // 失敗予定
    }
  });
});

}); // End of test.describe.skip

// ヘルパー関数: テスト環境のセットアップ
async function setupTideGraphTest(page: Page) {
  // ナビゲーションを通じて釣果記録一覧に移動
  await page.click('[data-testid="fishing-records-link"]');

  // サンプル釣果記録を作成
  await page.click('[data-testid="add-record-button"]');

  await page.fill('[data-testid="location-name"]', '東京湾');
  await page.fill('[data-testid="latitude"]', '35.6762');
  await page.fill('[data-testid="longitude"]', '139.6503');
  await page.fill('[data-testid="fishing-date"]', '2024-07-15');

  await page.click('[data-testid="save-record-button"]');
  await page.waitForSelector('[data-testid^="record-"]');

  // 記録の詳細画面を開く
  await page.click('[data-testid^="record-"]');
}
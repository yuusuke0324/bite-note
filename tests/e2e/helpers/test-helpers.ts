/**
 * TASK-301: E2Eテスト共通ヘルパー関数
 */

import { Page, expect } from '@playwright/test';
import { TestIds } from '../../../src/constants/testIds';

/**
 * アプリケーション初期化待機
 * App.tsxの初期化と基本UIの表示を確実に待機する
 *
 * 注意: ModernAppの初期タブは'home'なので、HOME_TABを待機する
 *
 * 使用範囲:
 * - 正常系フロー（HOME_TAB表示が前提）: 使用OK
 * - モーダル/セッション管理テスト: 使用しない（代わりに page.waitForSelector('[data-app-initialized]') を使用）
 *
 * 理由: この関数はHOME_TABの表示を待機するため、初期画面がHOME_TABでないテストでは
 * タイムアウトが発生します。セッション管理テストなど、モーダルの動作をテストする場合は
 * HOME_TABが表示されない可能性があるため、より汎用的な [data-app-initialized] の待機を使用してください。
 *
 * @see Issue #226 - session-management-extended.spec.ts での互換性問題
 */
export async function waitForAppInit(page: Page): Promise<void> {
  // App.tsx初期化完了を待機
  await page.waitForSelector('body[data-app-initialized="true"]', {
    timeout: 25000,
    state: 'attached'
  });

  // 初期表示されるナビゲーション要素を待機
  // BottomNavigationは data-testid="nav-${id}" パターンを使用
  await page.waitForSelector('[data-testid="nav-home"]', {
    timeout: 20000,
    state: 'visible'
  });
}

export interface TestFishingRecord {
  id: string;
  location: string;
  latitude: number;
  longitude: number;
  date: string;
  fishSpecies?: string;
  weather?: string;
  size?: number;
  notes?: string;
}

// デフォルトテストデータ
export const defaultTestRecord: TestFishingRecord = {
  id: 'test-record',
  location: '東京湾',
  latitude: 35.6762,
  longitude: 139.6503,
  date: '2024-07-15T10:00',
  fishSpecies: 'アジ',
  weather: '晴れ',
  size: 25,
  notes: 'テスト用記録'
};

/**
 * テスト用釣果記録を作成
 * QAエンジニアレビュー対応: waitForTimeoutを削除し、安定版に改善
 */
export async function createTestFishingRecord(
  page: Page,
  record: Partial<TestFishingRecord> = {}
): Promise<void> {
  const testRecord = { ...defaultTestRecord, ...record };

  // フォームタブが存在し、操作可能であることを事前確認
  // BottomNavigationは nav-${id} パターンを使用
  const formTabSelector = '[data-testid="nav-form"]';
  await page.waitForSelector(formTabSelector, {
    state: 'visible',
    timeout: 10000
  });

  // 記録登録タブに移動
  await page.click(formTabSelector);

  // タブが選択されたことを確認（BottomNavigationはaria-current="page"を使用）
  await page.waitForSelector(`${formTabSelector}[aria-current="page"]`, {
    state: 'visible',
    timeout: 5000
  });

  // CI環境でのレンダリング遅延を吸収（Service Worker初期化等の影響）
  await page.waitForTimeout(500);

  // すべての主要フォームフィールドが表示されるまで待機
  await Promise.all([
    page.waitForSelector(`[data-testid="${TestIds.LOCATION_NAME}"]`, { state: 'visible' }),
    page.waitForSelector(`[data-testid="${TestIds.LATITUDE}"]`, { state: 'visible' }),
    page.waitForSelector(`[data-testid="${TestIds.LONGITUDE}"]`, { state: 'visible' }),
    page.waitForSelector(`[data-testid="${TestIds.FISHING_DATE}"]`, { state: 'visible' }),
  ]);

  // フォーム入力
  await page.fill(`[data-testid="${TestIds.LOCATION_NAME}"]`, testRecord.location);
  await page.fill(`[data-testid="${TestIds.LATITUDE}"]`, testRecord.latitude.toString());
  await page.fill(`[data-testid="${TestIds.LONGITUDE}"]`, testRecord.longitude.toString());
  await page.fill(`[data-testid="${TestIds.FISHING_DATE}"]`, testRecord.date);

  if (testRecord.fishSpecies) {
    await page.fill(`[data-testid="${TestIds.FISH_SPECIES}"]`, testRecord.fishSpecies);
  }

  if (testRecord.weather) {
    await page.fill(`[data-testid="${TestIds.WEATHER}"]`, testRecord.weather);
  }

  if (testRecord.size) {
    await page.fill(`[data-testid="${TestIds.FISH_SIZE}"]`, testRecord.size.toString());
  }

  if (testRecord.notes) {
    await page.fill(`[data-testid="${TestIds.NOTES}"]`, testRecord.notes);
  }

  // 記録を保存
  await page.click(`[data-testid="${TestIds.SAVE_RECORD_BUTTON}"]`);

  // トースト表示またはタブ切り替えを待機（固定時間待機ではなく）
  // BottomNavigationは nav-${id} パターンと aria-current="page" を使用
  await page.waitForSelector(
    `[data-testid="${TestIds.TOAST_SUCCESS}"], [data-testid="nav-list"][aria-current="page"]`,
    { timeout: 5000 }
  );
}

/**
 * 釣果記録一覧に移動
 */
export async function navigateToRecordsList(page: Page): Promise<void> {
  // 記録一覧タブに移動（BottomNavigationは nav-${id} パターンを使用）
  await page.click('[data-testid="nav-list"]');
  // タブがアクティブになるまで待機（aria-current="page" を使用）
  await page.waitForSelector('[data-testid="nav-list"][aria-current="page"]', { timeout: 2000 });
}

/**
 * 潮汐グラフセクションを開く
 */
export async function openTideGraphTab(page: Page): Promise<void> {
  // 潮汐グラフトグルボタンをクリック
  await page.click(`[data-testid="${TestIds.TIDE_GRAPH_TOGGLE_BUTTON}"]`);
  // グラフが表示されるまで待機
  await page.waitForSelector(`[data-testid="${TestIds.TIDE_GRAPH_CANVAS}"]`, { timeout: 10000 });
}

/**
 * 潮汐グラフが表示されることを確認
 */
export async function assertTideGraphVisible(page: Page): Promise<void> {
  const tideGraph = page.locator(`[data-testid="${TestIds.TIDE_GRAPH_CANVAS}"]`);
  await expect(tideGraph).toBeVisible();

  // グラフの基本要素が存在することを確認
  await expect(page.locator(`[data-testid="${TestIds.TIDE_GRAPH_AREA}"]`)).toBeVisible();
  await expect(page.locator(`[data-testid="${TestIds.TIDE_GRAPH_TIME_LABELS}"]`)).toBeVisible();
  await expect(page.locator(`[data-testid="${TestIds.TIDE_GRAPH_Y_AXIS}"]`)).toBeVisible();
}

/**
 * パフォーマンス指標を取得
 */
export async function collectPerformanceMetrics(page: Page): Promise<{
  fcp?: number;
  lcp?: number;
  cls: number;
  loadTime: number;
}> {
  const performanceData = await page.evaluate(() => {
    return new Promise((resolve) => {
      // パフォーマンス監視の初期化
      const metrics = {
        fcp: 0,
        lcp: 0,
        cls: 0,
        layoutShifts: [] as number[]
      };

      // Paint Timing の取得
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            metrics.fcp = entry.startTime;
          }
          if (entry.name === 'largest-contentful-paint') {
            metrics.lcp = entry.startTime;
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

      // Layout Shift の取得
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            metrics.layoutShifts.push((entry as any).value);
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // 2秒後にメトリクスを返す
      setTimeout(() => {
        metrics.cls = metrics.layoutShifts.reduce((sum, shift) => sum + shift, 0);
        resolve(metrics);
      }, 2000);
    });
  });

  const navigationTiming = await page.evaluate(() => performance.timing);
  const loadTime = navigationTiming.loadEventEnd - navigationTiming.navigationStart;

  return {
    fcp: (performanceData as any).fcp,
    lcp: (performanceData as any).lcp,
    cls: (performanceData as any).cls,
    loadTime
  };
}

/**
 * アクセシビリティチェック用のヘルパー
 */
export async function checkBasicAccessibility(page: Page): Promise<void> {
  // フォーカス可能要素のチェック
  const focusableElements = await page.locator('[tabindex]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]').all();

  for (const element of focusableElements) {
    await element.focus();
    // フォーカスされた要素が見える状態かチェック
    await expect(element).toBeVisible();
  }
}

/**
 * レスポンシブ表示のチェック
 */
export async function checkResponsiveDisplay(
  page: Page,
  viewports: Array<{ width: number; height: number; name: string }>
): Promise<void> {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    // 潮汐グラフが適切に表示されることを確認
    await assertTideGraphVisible(page);

    // グラフのサイズが適切か確認
    const graphBounds = await page.locator(`[data-testid="${TestIds.TIDE_GRAPH_CANVAS}"]`).boundingBox();
    expect(graphBounds?.width).toBeGreaterThan(0);
    expect(graphBounds?.width).toBeLessThan(viewport.width);
  }
}
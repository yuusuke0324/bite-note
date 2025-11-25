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
  await page.waitForSelector('[data-testid="home-tab"]', {
    timeout: 20000,
    state: 'visible'
  });
}

export interface TestFishingRecord {
  id: string;
  location: string;
  latitude?: number;  // GPSLocationInputの手動入力モードでのみ使用可能
  longitude?: number; // GPSLocationInputの手動入力モードでのみ使用可能
  date: string;
  fishSpecies?: string;
  weather?: string;
  size?: number;
  notes?: string;
}

// デフォルトテストデータ
// 注意: 緯度・経度はGPSLocationInputの手動入力モードでのみ設定可能
// 現在のフォームUIでは写真からのGPS抽出またはGPSボタンで位置情報を取得するため、
// E2Eテストでは緯度・経度を直接入力しない
export const defaultTestRecord: TestFishingRecord = {
  id: 'test-record',
  location: '東京湾',
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
  const formTabSelector = '[data-testid="form-tab"]';
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

  // 主要フォームフィールドが表示されるまで待機
  // 注意: 緯度・経度フィールドはGPSLocationInputの手動入力モードでのみ表示されるため、
  // ここでは待機しない（現在のUIではGPS取得または写真からの自動抽出を使用）
  await Promise.all([
    page.waitForSelector(`[data-testid="${TestIds.LOCATION_NAME}"]`, { state: 'visible' }),
    page.waitForSelector(`[data-testid="${TestIds.FISHING_DATE}"]`, { state: 'visible' }),
  ]);

  // フォーム入力（緯度・経度は省略 - UIでは直接入力フィールドがない）
  await page.fill(`[data-testid="${TestIds.LOCATION_NAME}"]`, testRecord.location);
  await page.fill(`[data-testid="${TestIds.FISHING_DATE}"]`, testRecord.date);

  if (testRecord.fishSpecies) {
    // FishSpeciesAutocompleteコンポーネントはFISH_SPECIES_INPUTを使用
    await page.fill(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`, testRecord.fishSpecies);
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
  await page.waitForSelector(
    `[data-testid="${TestIds.TOAST_SUCCESS}"], [data-testid="list-tab"][aria-selected="true"]`,
    { timeout: 5000 }
  );

  // 保存完了後、記録一覧タブに移動（潮汐統合テスト等でrecord詳細ページへ遷移するため）
  await page.click('[data-testid="list-tab"]');
  await page.waitForSelector('[data-testid="list-tab"][aria-selected="true"]', { timeout: 2000 });
}

/**
 * 座標付き釣果記録をIndexedDBに直接作成（潮汐統合テスト用）
 *
 * 通常のcreateTestFishingRecordはフォーム経由で記録を作成するため、
 * 座標情報を保存できません（フォームにGPS座標の直接入力フィールドがないため）。
 *
 * この関数は、TideIntegrationコンポーネントのテストなど、
 * 座標情報が必須のテストケースで使用してください。
 *
 * @param page Playwrightのページオブジェクト
 * @param record 作成する記録データ（coordinatesは必須）
 */
export async function createTestFishingRecordWithCoordinates(
  page: Page,
  record: {
    location: string;
    latitude: number;
    longitude: number;
    date: string;
    fishSpecies?: string;
    size?: number;
    weather?: string;
    notes?: string;
  }
): Promise<void> {
  // IndexedDBに直接テストレコードを挿入
  await page.evaluate((data) => {
    return new Promise<void>((resolve, reject) => {
      const dbName = 'FishingRecordDB';
      const request = indexedDB.open(dbName);

      request.onerror = () => {
        console.error('[createTestFishingRecordWithCoordinates] IndexedDB open error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const db = request.result;

        // fishing_records テーブルが存在するか確認
        if (!db.objectStoreNames.contains('fishing_records')) {
          console.error('[createTestFishingRecordWithCoordinates] fishing_records table not found');
          db.close();
          reject(new Error('fishing_records table not found'));
          return;
        }

        const transaction = db.transaction(['fishing_records'], 'readwrite');
        const store = transaction.objectStore('fishing_records');

        // テスト用釣果記録データ
        const testRecord = {
          id: 'test-record-' + Date.now(),
          fishSpecies: data.fishSpecies || 'テスト魚種',
          size: data.size || 30,
          location: data.location,
          coordinates: {
            latitude: data.latitude,
            longitude: data.longitude
          },
          date: new Date(data.date),
          weather: data.weather || '晴れ',
          notes: data.notes || 'E2Eテスト用データ',
          photos: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const addRequest = store.add(testRecord);

        addRequest.onsuccess = () => {
          console.log('[createTestFishingRecordWithCoordinates] テストレコードをIndexedDBに挿入しました');
          db.close();
          resolve();
        };

        addRequest.onerror = () => {
          console.error('[createTestFishingRecordWithCoordinates] Add record error:', addRequest.error);
          db.close();
          reject(addRequest.error);
        };
      };
    });
  }, record);

  // ページをリロードしてデータを反映
  await page.reload();

  // アプリ初期化を待機
  await page.waitForSelector('[data-app-initialized]', { timeout: 10000 });

  // 記録一覧タブに移動して記録を表示
  await page.click('[data-testid="list-tab"]');
  await page.waitForSelector('[data-testid="list-tab"][aria-selected="true"]', { timeout: 5000 });
}

/**
 * 釣果記録一覧に移動
 */
export async function navigateToRecordsList(page: Page): Promise<void> {
  // 記録一覧タブに移動
  await page.click('[data-testid="list-tab"]');
  // タブがアクティブになるまで待機
  await page.waitForSelector('[data-testid="list-tab"][aria-selected="true"]', { timeout: 2000 });
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
  // Note: Recharts内部のSVG要素はvisibility制御されるため、toBeAttached()を使用
  await expect(page.locator(`[data-testid="${TestIds.TIDE_GRAPH_AREA}"]`)).toBeAttached();
  await expect(page.locator(`[data-testid="${TestIds.TIDE_GRAPH_TIME_LABELS}"]`)).toBeAttached();
  await expect(page.locator(`[data-testid="${TestIds.TIDE_GRAPH_Y_AXIS}"]`)).toBeAttached();
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
/**
 * TASK-301: 統合テストスイート拡張
 * 異なる釣果記録での潮汐グラフ包括テスト
 */

import { test, expect, type Page } from '@playwright/test';
import {
  createTestFishingRecord,
  navigateToRecordsList,
  openTideGraphTab,
  assertTideGraphVisible,
  TestFishingRecord
} from './helpers/test-helpers';
import { TestIds } from '../../src/constants/testIds';

// テストデータ: 様々な地域と季節の釣果記録
const testFishingRecords = {
  tokyoBaySummer: {
    id: 'test-record-tokyo-summer',
    location: {
      latitude: 35.6762,
      longitude: 139.6503,
      name: '東京湾'
    },
    date: '2024-07-15T12:00:00Z',
    fishCaught: [
      { species: 'スズキ', count: 2, size: 60 },
      { species: 'アジ', count: 5, size: 25 }
    ],
    tideCondition: 'spring', // 大潮
    expectedTideRange: { min: -0.5, max: 2.5 }
  },

  sagamiBayWinter: {
    id: 'test-record-sagami-winter',
    location: {
      latitude: 35.3213,
      longitude: 139.5459,
      name: '相模湾'
    },
    date: '2024-01-20T14:00:00Z',
    fishCaught: [
      { species: 'カワハギ', count: 3, size: 20 }
    ],
    tideCondition: 'neap', // 小潮
    expectedTideRange: { min: 0, max: 2.0 }
  },

  osakaByAutumn: {
    id: 'test-record-osaka-autumn',
    location: {
      latitude: 34.6937,
      longitude: 135.5023,
      name: '大阪湾'
    },
    date: '2024-10-10T16:00:00Z',
    fishCaught: [
      { species: 'チヌ', count: 1, size: 45 },
      { species: 'キビレ', count: 2, size: 30 }
    ],
    tideCondition: 'normal', // 中潮
    expectedTideRange: { min: 0, max: 2.8 }
  },

  hiroshimaBaySpring: {
    id: 'test-record-hiroshima-spring',
    location: {
      latitude: 34.3853,
      longitude: 132.4553,
      name: '広島湾'
    },
    date: '2024-04-05T08:00:00Z',
    fishCaught: [
      { species: 'メバル', count: 4, size: 18 }
    ],
    tideCondition: 'spring', // 大潮
    expectedTideRange: { min: -0.2, max: 4.2 }
  }
};

test.describe('TASK-301-001: 東京湾夏期記録での表示確認', () => {
  test('should display accurate tide pattern for Tokyo Bay summer record', async ({ page }) => {
    // Given: 東京湾での夏期釣果記録が存在する
    const record = testFishingRecords.tokyoBaySummer;

    // まず、釣果記録を作成（モック）
    await page.goto('/');

    // 釣果記録一覧ページに移動
    await navigateToRecordsList(page);

    // テスト用の釣果記録を作成
    await createTestFishingRecord(page, {
      id: record.id,
      location: record.location.name,
      latitude: record.location.latitude,
      longitude: record.location.longitude,
      date: record.date.slice(0, 16),
      fishSpecies: record.fishCaught[0]?.species || 'テスト魚',
      size: record.fishCaught[0]?.size,
      notes: `${record.tideCondition}潮のテストデータ`
    });

    // When: 釣果記録の詳細画面を開き、潮汐グラフを表示
    await page.click(`[data-testid="${TestIds.RECORD_ITEM(record.id)}"]`);

    // 潮汐グラフタブをクリック・表示確認
    await openTideGraphTab(page);
    await assertTideGraphVisible(page);

    // Then: 正確な潮汐パターンが表示される
    // 1. グラフが表示されている
    const tideGraph = await page.locator('[data-testid="tide-graph-canvas"]');
    await expect(tideGraph).toBeVisible();

    // 2. 適切な時間範囲が表示されている（24時間）
    const timeLabels = await page.locator('[data-testid="tide-graph-time-labels"]');
    await expect(timeLabels).toContainText('00:00');
    await expect(timeLabels).toContainText('12:00');
    await expect(timeLabels).toContainText('23:00');

    // 3. 潮位の軸範囲が適切に設定されている
    const yAxisLabels = await page.locator('[data-testid="tide-graph-y-axis"]');
    await expect(yAxisLabels).toContainText(record.expectedTideRange.min.toString());
    await expect(yAxisLabels).toContainText(record.expectedTideRange.max.toString());

    // 4. 大潮の特徴的なパターンが確認できる
    const tidePattern = await page.locator('[data-testid="tide-curve"]');
    await expect(tidePattern).toBeVisible();

    // 5. 満潮・干潮の回数が正しい（大潮では1日4回程度）
    const tideEvents = await page.locator('[data-testid="tide-event-marker"]');
    const eventCount = await tideEvents.count();
    expect(eventCount).toBeGreaterThanOrEqual(3);
    expect(eventCount).toBeLessThanOrEqual(5);

    // 6. TASK-101の動的スケール調整により適切な軸範囲が設定される
    // → これは実装されていないためテストが失敗するはず
    const scaleInfo = await page.locator('[data-testid="scale-adjustment-info"]');
    await expect(scaleInfo).toBeVisible(); // 失敗予定
    await expect(scaleInfo).toContainText('動的調整: ON'); // 失敗予定
  });
});

test.describe('TASK-301-002: 相模湾冬期記録での動的スケール確認', () => {
  test('should adapt scale dynamically for winter conditions', async ({ page }) => {
    const record = testFishingRecords.sagamiBayWinter;

    await page.goto('/');
    await navigateToRecordsList(page);
    await createTestFishingRecord(page, {
      id: record.id,
      location: record.location.name,
      latitude: record.location.latitude,
      longitude: record.location.longitude,
      date: record.date.slice(0, 16),
      fishSpecies: record.fishCaught[0]?.species || 'テスト魚',
      size: record.fishCaught[0]?.size,
      notes: `${record.tideCondition}潮のテストデータ`
    });

    // When: 潮汐グラフを表示
    await page.click(`[data-testid="${TestIds.RECORD_ITEM(record.id)}"]`);
    await openTideGraphTab(page);
    await assertTideGraphVisible(page);

    // Then: 小潮の小さな潮位変化に合わせてスケールが調整される
    const yAxisLabels = await page.locator('[data-testid="tide-graph-y-axis"]');

    // 小潮の範囲に合わせた適切なスケール（より細かい目盛り）
    await expect(yAxisLabels).toContainText('0.0');
    await expect(yAxisLabels).toContainText('0.5');
    await expect(yAxisLabels).toContainText('1.0');
    await expect(yAxisLabels).toContainText('1.5');
    await expect(yAxisLabels).toContainText('2.0');

    // TASK-101の動的スケール機能が正しく動作する
    const dynamicScaleIndicator = await page.locator('[data-testid="dynamic-scale-active"]');
    await expect(dynamicScaleIndicator).toBeVisible(); // 失敗予定（未実装）

    // 小潮特有の穏やかな潮位変化パターンを確認
    const tideAmplitude = await page.locator('[data-testid="tide-amplitude-info"]');
    await expect(tideAmplitude).toContainText('小潮パターン'); // 失敗予定
  });
});

test.describe('TASK-301-003: キャッシュ効果による高速化確認', () => {
  test('should improve load times with cache strategy', async ({ page }) => {
    const location = { latitude: 34.6937, longitude: 135.5023 }; // 大阪湾

    await page.goto('/');
    await navigateToRecordsList(page);

    // 初回ロードの時間を測定
    const startTime1 = Date.now();
    const record = testFishingRecords.osakaByAutumn;
    await createTestFishingRecord(page, {
      id: record.id,
      location: record.location.name,
      latitude: record.location.latitude,
      longitude: record.location.longitude,
      date: record.date.slice(0, 16),
      fishSpecies: record.fishCaught[0]?.species || 'テスト魚',
      size: record.fishCaught[0]?.size,
      notes: `${record.tideCondition}潮のテストデータ`
    });
    await page.click(`[data-testid="${TestIds.RECORD_ITEM(record.id)}"]`);
    await openTideGraphTab(page);
    await assertTideGraphVisible(page);
    const loadTime1 = Date.now() - startTime1;

    // 同じ地域の別の記録を作成（キャッシュ効果を確認するため）
    const secondRecord = {
      ...testFishingRecords.osakaByAutumn,
      id: 'test-record-osaka-second',
      date: '2024-10-11T10:00:00Z' // 翌日
    };

    await page.click('[data-testid="back-to-list"]');

    // 2回目ロードの時間を測定
    const startTime2 = Date.now();
    await createTestFishingRecord(page, {
      id: secondRecord.id,
      location: record.location.name,
      latitude: record.location.latitude,
      longitude: record.location.longitude,
      date: secondRecord.date.slice(0, 16),
      fishSpecies: record.fishCaught[0]?.species || 'テスト魚',
      size: record.fishCaught[0]?.size,
      notes: `${record.tideCondition}潮のテストデータ（2回目）`
    });
    await page.click(`[data-testid="${TestIds.RECORD_ITEM(secondRecord.id)}"]`);
    await openTideGraphTab(page);
    await assertTideGraphVisible(page);
    const loadTime2 = Date.now() - startTime2;

    // Then: TASK-201のキャッシュ戦略により高速化される
    console.log(`First load: ${loadTime1}ms, Second load: ${loadTime2}ms`);

    // 初回ロード < 2秒、2回目以降 < 1秒
    expect(loadTime1).toBeLessThan(2000);
    expect(loadTime2).toBeLessThan(1000);

    // キャッシュヒット情報が表示される
    const cacheInfo = await page.locator('[data-testid="cache-hit-indicator"]');
    await expect(cacheInfo).toBeVisible(); // 失敗予定（未実装）
    await expect(cacheInfo).toContainText('キャッシュから取得'); // 失敗予定

    // ネットワークリクエストが削減されている
    const networkRequests = await page.locator('[data-testid="network-request-count"]');
    await expect(networkRequests).toContainText('0件'); // 失敗予定
  });
});


/**
 * TASK-17 PR #3-A-1: statistics-serviceのテスト (Phase 1 + QA改善 + Tech-lead修正)
 *
 * 目標: カバレッジ 85%以上達成
 * テスト数: 40 (Phase 1: 36 + QA改善: 4)
 *
 * 配分:
 * - calculateOverallStats(): 15テスト
 * - calculateTimeAnalysis(): 15テスト
 * - calculateSizeDistribution(): 10テスト
 *
 * Tech-lead指摘対応:
 * - プライベートメソッド直接テスト削除（as any使用を排除）
 * - テストID生成を連番方式に変更（非決定性排除）
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { statisticsService } from '../statistics-service';
import type { FishingRecord } from '../../types';

// テストヘルパー関数
let testIdCounter = 0;

const createFishingRecord = (overrides?: Partial<FishingRecord>): FishingRecord => ({
  id: `test-id-${++testIdCounter}`,
  date: new Date('2024-01-15T10:00:00+09:00'),
  location: '東京湾',
  fishSpecies: 'スズキ',
  size: 50,
  weight: 1500,
  weather: '晴れ',
  temperature: 20,
  photoId: undefined,
  coordinates: undefined,
  notes: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

describe('StatisticsService', () => {
  beforeEach(() => {
    // IDカウンターをリセット
    testIdCounter = 0;
  });

  // ============================================================================
  // 1. calculateOverallStats() - 15テスト
  // ============================================================================

  describe('calculateOverallStats', () => {
    describe('正常系', () => {
      it('通常データセット（複数レコード、写真/GPS混在）', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ fishSpecies: 'スズキ', size: 50, weight: 1500, photoId: 'photo-1', coordinates: { latitude: 35.6, longitude: 139.7 } }),
          createFishingRecord({ fishSpecies: 'アジ', size: 25, weight: 200, photoId: undefined, coordinates: undefined }),
          createFishingRecord({ fishSpecies: 'サバ', size: 30, weight: 500, photoId: 'photo-2', coordinates: { latitude: 35.5, longitude: 139.6 } })
        ];

        const result = statisticsService.calculateOverallStats(records);

        expect(result.totalRecords).toBe(3);
        expect(result.totalCatches).toBe(3);
        expect(result.averageSize).toBeCloseTo(35, 1); // (50+25+30)/3 = 35
        expect(result.totalWeight).toBeCloseTo(2200, 1); // 1500+200+500
        expect(result.uniqueSpecies).toBe(3);
        expect(result.uniqueLocations).toBe(1); // 全て「東京湾」
        expect(result.recordsWithPhoto).toBe(2);
        expect(result.recordsWithGPS).toBe(2);
        expect(result.dateRange.daysCovered).toBe(1);
      });

      it('単一レコード', () => {
        const records: FishingRecord[] = [createFishingRecord()];

        const result = statisticsService.calculateOverallStats(records);

        expect(result.totalRecords).toBe(1);
        expect(result.averageSize).toBe(50);
        expect(result.uniqueSpecies).toBe(1);
        expect(result.uniqueLocations).toBe(1);
        expect(result.dateRange.daysCovered).toBe(1);
      });

      it('複数年・複数場所のデータセット', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2023-01-15'), location: '東京湾', fishSpecies: 'スズキ' }),
          createFishingRecord({ date: new Date('2024-06-20'), location: '相模湾', fishSpecies: 'アジ' }),
          createFishingRecord({ date: new Date('2024-12-25'), location: '駿河湾', fishSpecies: 'サバ' })
        ];

        const result = statisticsService.calculateOverallStats(records);

        expect(result.uniqueLocations).toBe(3);
        expect(result.uniqueSpecies).toBe(3);
        expect(result.dateRange.earliest).toEqual(new Date('2023-01-15'));
        expect(result.dateRange.latest).toEqual(new Date('2024-12-25'));
        expect(result.dateRange.daysCovered).toBeGreaterThan(700); // 約2年間
      });
    });

    describe('エッジケース', () => {
      it('空配列 → デフォルト値返却', () => {
        const records: FishingRecord[] = [];

        const result = statisticsService.calculateOverallStats(records);

        expect(result.totalRecords).toBe(0);
        expect(result.totalCatches).toBe(0);
        expect(result.averageSize).toBe(0);
        expect(result.totalWeight).toBe(0);
        expect(result.uniqueLocations).toBe(0);
        expect(result.uniqueSpecies).toBe(0);
        expect(result.dateRange.daysCovered).toBe(0);
        expect(result.recordsWithPhoto).toBe(0);
        expect(result.recordsWithGPS).toBe(0);
      });

      it('size/weightが全て0またはundefined → averageSize=0, totalWeight=0', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ size: 0, weight: 0 }),
          createFishingRecord({ size: undefined, weight: undefined })
        ];

        const result = statisticsService.calculateOverallStats(records);

        expect(result.averageSize).toBe(0);
        expect(result.totalWeight).toBe(0);
      });

      it('location/fishSpeciesが空文字列またはスペースのみ → Set.size=0', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ location: '', fishSpecies: '  ' }),
          createFishingRecord({ location: '   ', fishSpecies: '' })
        ];

        const result = statisticsService.calculateOverallStats(records);

        expect(result.uniqueLocations).toBe(0);
        expect(result.uniqueSpecies).toBe(0);
      });

      it('同一日付のレコードのみ → daysCovered=1', () => {
        const sameDate = new Date('2024-01-15');
        const records: FishingRecord[] = [
          createFishingRecord({ date: sameDate }),
          createFishingRecord({ date: sameDate }),
          createFishingRecord({ date: sameDate })
        ];

        const result = statisticsService.calculateOverallStats(records);

        expect(result.dateRange.daysCovered).toBe(1);
        expect(result.dateRange.earliest).toEqual(sameDate);
        expect(result.dateRange.latest).toEqual(sameDate);
      });

      it('photoId/coordinatesが全てundefined → recordsWithPhoto=0, recordsWithGPS=0', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ photoId: undefined, coordinates: undefined }),
          createFishingRecord({ photoId: undefined, coordinates: undefined })
        ];

        const result = statisticsService.calculateOverallStats(records);

        expect(result.recordsWithPhoto).toBe(0);
        expect(result.recordsWithGPS).toBe(0);
      });

      it('trim()後に空文字列になるlocation/fishSpecies', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ location: '  ', fishSpecies: '\t\n' })
        ];

        const result = statisticsService.calculateOverallStats(records);

        expect(result.uniqueLocations).toBe(0);
        expect(result.uniqueSpecies).toBe(0);
      });

      it('sizeが一部のみ有効', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ size: 50 }),
          createFishingRecord({ size: undefined }),
          createFishingRecord({ size: 0 }),
          createFishingRecord({ size: 30 })
        ];

        const result = statisticsService.calculateOverallStats(records);

        expect(result.averageSize).toBeCloseTo(40, 1); // (50+30)/2 = 40
      });

      it('weightが一部のみ有効', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ weight: 1500 }),
          createFishingRecord({ weight: undefined }),
          createFishingRecord({ weight: 0 }),
          createFishingRecord({ weight: 500 })
        ];

        const result = statisticsService.calculateOverallStats(records);

        expect(result.totalWeight).toBeCloseTo(2000, 1); // 1500+500
      });
    });

    describe('境界値', () => {
      it('1日差のレコード（earliest, latest確認）', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2024-01-15') }),
          createFishingRecord({ date: new Date('2024-01-16') })
        ];

        const result = statisticsService.calculateOverallStats(records);

        expect(result.dateRange.earliest).toEqual(new Date('2024-01-15'));
        expect(result.dateRange.latest).toEqual(new Date('2024-01-16'));
        expect(result.dateRange.daysCovered).toBe(2);
      });

      it('365日差のレコード（daysCovered計算）', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2024-01-01') }),
          createFishingRecord({ date: new Date('2024-12-31') })
        ];

        const result = statisticsService.calculateOverallStats(records);

        expect(result.dateRange.daysCovered).toBe(366); // 2024年はうるう年
      });

      it('size=0.1（最小値）', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ size: 0.1 })
        ];

        const result = statisticsService.calculateOverallStats(records);

        expect(result.averageSize).toBeCloseTo(0.1, 1);
      });

      it('weight=99999.9（最大値）', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ weight: 99999.9 })
        ];

        const result = statisticsService.calculateOverallStats(records);

        expect(result.totalWeight).toBeCloseTo(99999.9, 1);
      });
    });
  });

  // ============================================================================
  // 2. calculateTimeAnalysis() - 15テスト
  // ============================================================================

  describe('calculateTimeAnalysis', () => {
    describe('正常系', () => {
      it('複数年・複数月のデータセット', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2023-01-15'), size: 50 }),
          createFishingRecord({ date: new Date('2023-06-20'), size: 40 }),
          createFishingRecord({ date: new Date('2024-01-10'), size: 45 }),
          createFishingRecord({ date: new Date('2024-03-25'), size: 35 })
        ];

        const result = statisticsService.calculateTimeAnalysis(records);

        expect(result.monthly.length).toBe(4);
        expect(result.yearlyTrends.length).toBe(2);
        expect(result.yearlyTrends[0].year).toBe(2023);
        expect(result.yearlyTrends[1].year).toBe(2024);
      });

      it('単一月のレコードのみ', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2024-01-15') }),
          createFishingRecord({ date: new Date('2024-01-20') }),
          createFishingRecord({ date: new Date('2024-01-25') })
        ];

        const result = statisticsService.calculateTimeAnalysis(records);

        expect(result.monthly.length).toBe(1);
        expect(result.monthly[0].year).toBe(2024);
        expect(result.monthly[0].month).toBe(1);
        expect(result.monthly[0].count).toBe(3);
      });

      it('季節跨ぎのデータセット（春→夏→秋→冬）', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2024-03-15') }), // 春
          createFishingRecord({ date: new Date('2024-06-20') }), // 夏
          createFishingRecord({ date: new Date('2024-09-25') }), // 秋
          createFishingRecord({ date: new Date('2024-12-30') })  // 冬
        ];

        const result = statisticsService.calculateTimeAnalysis(records);

        expect(result.seasonal.spring).toBe(1);
        expect(result.seasonal.summer).toBe(1);
        expect(result.seasonal.autumn).toBe(1);
        expect(result.seasonal.winter).toBe(1);
      });

      it('複数年の年次トレンド', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2022-01-15'), size: 30 }),
          createFishingRecord({ date: new Date('2023-01-15'), size: 40 }),
          createFishingRecord({ date: new Date('2024-01-15'), size: 50 })
        ];

        const result = statisticsService.calculateTimeAnalysis(records);

        expect(result.yearlyTrends.length).toBe(3);
        expect(result.yearlyTrends[0].averageSize).toBe(30);
        expect(result.yearlyTrends[1].averageSize).toBe(40);
        expect(result.yearlyTrends[2].averageSize).toBe(50);
      });
    });

    describe('エッジケース', () => {
      it('空配列 → monthly=[], seasonal=全て0, yearlyTrends=[]', () => {
        const records: FishingRecord[] = [];

        const result = statisticsService.calculateTimeAnalysis(records);

        expect(result.monthly).toEqual([]);
        expect(result.seasonal.spring).toBe(0);
        expect(result.seasonal.summer).toBe(0);
        expect(result.seasonal.autumn).toBe(0);
        expect(result.seasonal.winter).toBe(0);
        expect(result.yearlyTrends).toEqual([]);
      });

      it('月初・月末のレコード', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2024-01-01') }),
          createFishingRecord({ date: new Date('2024-01-31') })
        ];

        const result = statisticsService.calculateTimeAnalysis(records);

        expect(result.monthly.length).toBe(1);
        expect(result.monthly[0].month).toBe(1);
        expect(result.monthly[0].count).toBe(2);
      });

      it('同一月に複数年のレコード（例: 2023/1, 2024/1）', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2023-01-15') }),
          createFishingRecord({ date: new Date('2024-01-15') })
        ];

        const result = statisticsService.calculateTimeAnalysis(records);

        expect(result.monthly.length).toBe(2);
        expect(result.monthly[0].year).toBe(2023);
        expect(result.monthly[0].month).toBe(1);
        expect(result.monthly[1].year).toBe(2024);
        expect(result.monthly[1].month).toBe(1);
      });

      it('1月・2月のみ（冬のみ）', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2024-01-15') }),
          createFishingRecord({ date: new Date('2024-02-20') })
        ];

        const result = statisticsService.calculateTimeAnalysis(records);

        expect(result.seasonal.spring).toBe(0);
        expect(result.seasonal.summer).toBe(0);
        expect(result.seasonal.autumn).toBe(0);
        expect(result.seasonal.winter).toBe(2);
      });

      it('3-5月のみ（春のみ）', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2024-03-15') }),
          createFishingRecord({ date: new Date('2024-04-20') }),
          createFishingRecord({ date: new Date('2024-05-25') })
        ];

        const result = statisticsService.calculateTimeAnalysis(records);

        expect(result.seasonal.spring).toBe(3);
        expect(result.seasonal.summer).toBe(0);
        expect(result.seasonal.autumn).toBe(0);
        expect(result.seasonal.winter).toBe(0);
      });

      it('Set<string>のspecies/locations重複処理', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2024-01-15'), fishSpecies: 'スズキ', location: '東京湾' }),
          createFishingRecord({ date: new Date('2024-01-20'), fishSpecies: 'スズキ', location: '東京湾' }),
          createFishingRecord({ date: new Date('2024-01-25'), fishSpecies: 'アジ', location: '相模湾' })
        ];

        const result = statisticsService.calculateTimeAnalysis(records);

        expect(result.monthly[0].species.size).toBe(2);
        expect(result.monthly[0].species.has('スズキ')).toBe(true);
        expect(result.monthly[0].species.has('アジ')).toBe(true);
        expect(result.monthly[0].locations.size).toBe(2);
        expect(result.monthly[0].locations.has('東京湾')).toBe(true);
        expect(result.monthly[0].locations.has('相模湾')).toBe(true);
      });
    });

    describe('境界値', () => {
      it('1月（winter）の境界', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2024-01-01') })
        ];

        const result = statisticsService.calculateTimeAnalysis(records);

        expect(result.seasonal.winter).toBe(1);
      });

      it('3月（spring開始）の境界', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2024-03-01') })
        ];

        const result = statisticsService.calculateTimeAnalysis(records);

        expect(result.seasonal.spring).toBe(1);
        expect(result.seasonal.winter).toBe(0);
      });

      it('6月（summer開始）の境界', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2024-06-01') })
        ];

        const result = statisticsService.calculateTimeAnalysis(records);

        expect(result.seasonal.summer).toBe(1);
        expect(result.seasonal.spring).toBe(0);
      });

      it('9月（autumn開始）の境界', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2024-09-01') })
        ];

        const result = statisticsService.calculateTimeAnalysis(records);

        expect(result.seasonal.autumn).toBe(1);
        expect(result.seasonal.summer).toBe(0);
      });

      it('12月（winter）の境界', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ date: new Date('2024-12-01') })
        ];

        const result = statisticsService.calculateTimeAnalysis(records);

        expect(result.seasonal.winter).toBe(1);
        expect(result.seasonal.autumn).toBe(0);
      });
    });
  });

  // ============================================================================
  // 3. calculateSizeDistribution() - 10テスト
  // ============================================================================

  describe('calculateSizeDistribution', () => {
    describe('正常系', () => {
      it('通常のサイズ分布（10-100cm）', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ size: 10 }),
          createFishingRecord({ size: 25 }),
          createFishingRecord({ size: 50 }),
          createFishingRecord({ size: 75 }),
          createFishingRecord({ size: 100 })
        ];

        const result = statisticsService.calculateSizeDistribution(records);

        expect(result.ranges.length).toBe(10);
        expect(result.percentiles.p50).toBe(50);
        expect(result.percentiles.p25).toBeCloseTo(25, 1);
        expect(result.percentiles.p75).toBeCloseTo(75, 1);
      });

      it('偏ったサイズ分布（全て同じ範囲）', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ size: 50 }),
          createFishingRecord({ size: 51 }),
          createFishingRecord({ size: 52 })
        ];

        const result = statisticsService.calculateSizeDistribution(records);

        expect(result.percentiles.p25).toBeCloseTo(50.5, 1);
        expect(result.percentiles.p50).toBe(51);
        expect(result.percentiles.p75).toBeCloseTo(51.5, 1);
      });

      it('広範囲のサイズ分布（1-200cm）', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ size: 1 }),
          createFishingRecord({ size: 50 }),
          createFishingRecord({ size: 100 }),
          createFishingRecord({ size: 150 }),
          createFishingRecord({ size: 200 })
        ];

        const result = statisticsService.calculateSizeDistribution(records);

        expect(result.ranges.length).toBe(10);
        const totalPercentage = result.ranges.reduce((sum, r) => sum + r.percentage, 0);
        expect(totalPercentage).toBeCloseTo(100, 1);
      });
    });

    describe('エッジケース', () => {
      it('空配列 → ranges=[], percentiles=全て0', () => {
        const records: FishingRecord[] = [];

        const result = statisticsService.calculateSizeDistribution(records);

        expect(result.ranges).toEqual([]);
        expect(result.percentiles.p25).toBe(0);
        expect(result.percentiles.p50).toBe(0);
        expect(result.percentiles.p75).toBe(0);
        expect(result.percentiles.p90).toBe(0);
        expect(result.percentiles.p95).toBe(0);
      });

      it('全レコードのsizeがundefined → 空配列返却', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ size: undefined }),
          createFishingRecord({ size: 0 })
        ];

        const result = statisticsService.calculateSizeDistribution(records);

        expect(result.ranges).toEqual([]);
        expect(result.percentiles.p50).toBe(0);
      });

      it('単一サイズのみ（例: 全て50cm） → percentiles全て同じ値', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ size: 50 }),
          createFishingRecord({ size: 50 }),
          createFishingRecord({ size: 50 })
        ];

        const result = statisticsService.calculateSizeDistribution(records);

        expect(result.percentiles.p25).toBe(50);
        expect(result.percentiles.p50).toBe(50);
        expect(result.percentiles.p75).toBe(50);
        expect(result.percentiles.p90).toBe(50);
        expect(result.percentiles.p95).toBe(50);
      });

      it('maxSizeがちょうど10の倍数（例: 100cm）', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ size: 10 }),
          createFishingRecord({ size: 100 })
        ];

        const result = statisticsService.calculateSizeDistribution(records);

        expect(result.ranges.length).toBe(10);
        expect(result.ranges[9].range).toBe('90-100cm');
      });

      it('最大値を含む範囲の調整（lastRange処理）', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ size: 1 }),
          createFishingRecord({ size: 100 })
        ];

        const result = statisticsService.calculateSizeDistribution(records);

        const lastRange = result.ranges[result.ranges.length - 1];
        expect(lastRange.count).toBe(1); // 100cmのみ
        expect(lastRange.range).toContain('100cm'); // ラベルに100を含む
      });
    });

    describe('境界値', () => {
      it('size=0.1（最小値）', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ size: 0.1 })
        ];

        const result = statisticsService.calculateSizeDistribution(records);

        expect(result.percentiles.p50).toBeCloseTo(0.1, 1);
      });

      it('size=999.9（最大値） → 10段階分割確認', () => {
        const records: FishingRecord[] = [
          createFishingRecord({ size: 999.9 })
        ];

        const result = statisticsService.calculateSizeDistribution(records);

        expect(result.ranges.length).toBe(10);
        expect(result.percentiles.p50).toBeCloseTo(999.9, 1);
      });
    });
  });
});

/**
 * 潮汐地域データベースサービス テスト
 *
 * TASK-002: 潮汐地域データベース初期化の検証
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RegionalDataService } from '../RegionalDataService';
import { JAPANESE_COASTAL_REGIONS, REGIONAL_DATA_STATS } from '../../../data/regional-tide-data';
import { calculateHaversineDistance } from '../utils/geo-utils';
import type { RegionalDataRecord, Coordinates } from '../../../types/tide';

// モックデータベースの設定
const mockDb = {
  tide_regional_data: {
    count: vi.fn(),
    toArray: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    add: vi.fn(),
    bulkAdd: vi.fn(),
    update: vi.fn(),
    toCollection: vi.fn()
  }
};

// データベースモック
vi.mock('../../../lib/database', () => ({
  db: mockDb
}));

describe('RegionalDataService', () => {
  let service: RegionalDataService;

  beforeEach(() => {
    service = new RegionalDataService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('データベース初期化', () => {
    it('RD-001: 新規データベースに50箇所のデータを一括挿入', async () => {
      // 新規データベース（件数0）をモック
      mockDb.tide_regional_data.count.mockResolvedValue(0);
      mockDb.tide_regional_data.bulkAdd.mockResolvedValue(undefined);

      const result = await service.initializeDatabase();

      expect(result.success).toBe(true);
      expect(result.inserted).toBe(JAPANESE_COASTAL_REGIONS.length);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockDb.tide_regional_data.bulkAdd).toHaveBeenCalledWith(JAPANESE_COASTAL_REGIONS);
    });

    it('RD-002: 既存データベースの部分更新処理', async () => {
      // 既存データベース（30件）をモック
      mockDb.tide_regional_data.count.mockResolvedValue(30);

      const mockWhere = {
        equals: vi.fn().mockReturnThis(),
        first: vi.fn()
      };
      mockDb.tide_regional_data.where.mockReturnValue(mockWhere);

      // 既存データが見つからない場合の処理をテスト
      mockWhere.first.mockResolvedValue(null);
      mockDb.tide_regional_data.add.mockResolvedValue(1);

      const result = await service.initializeDatabase();

      expect(result.success).toBe(true);
      expect(result.inserted).toBeGreaterThan(0);
      expect(mockDb.tide_regional_data.where).toHaveBeenCalledWith('regionId');
    });

    it('RD-003: データベース初期化エラーハンドリング', async () => {
      mockDb.tide_regional_data.count.mockRejectedValue(new Error('DB接続エラー'));

      const result = await service.initializeDatabase();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('DB接続エラー');
    });
  });

  describe('ハバーサイン距離による最寄り検索', () => {
    const tokyoCoords: Coordinates = { latitude: 35.6762, longitude: 139.6503 };
    const mockRegions: RegionalDataRecord[] = [
      {
        id: 1,
        regionId: 'tokyo_bay',
        name: '東京湾',
        latitude: 35.6762,
        longitude: 139.6503,
        m2Amplitude: 1.45,
        m2Phase: 25.0,
        s2Amplitude: 0.68,
        s2Phase: 28.0,
        dataQuality: 'high',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        regionId: 'yokohama',
        name: '横浜港',
        latitude: 35.4437,
        longitude: 139.6380,
        m2Amplitude: 1.38,
        m2Phase: 23.2,
        s2Amplitude: 0.64,
        s2Phase: 26.5,
        dataQuality: 'high',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    it('RD-004: 東京湾座標での最寄りステーション検索', async () => {
      const mockCollection = {
        filter: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockRegions)
      };
      mockDb.tide_regional_data.toCollection.mockReturnValue(mockCollection);

      const results = await service.findNearestStations(tokyoCoords, { limit: 2 });

      expect(results).toHaveLength(2);
      expect(results[0].region.regionId).toBe('tokyo_bay');
      expect(results[0].distance).toBeLessThan(results[1].distance);
      expect(results[0].distance).toBeCloseTo(0, 0); // 同じ座標なので距離0
    });

    it('RD-005: ハバーサイン公式の精度検証', async () => {
      const tokyo = { latitude: 35.6762, longitude: 139.6503 };
      const yokohama = { latitude: 35.4437, longitude: 139.6380 };

      const distance = calculateHaversineDistance(tokyo, yokohama);

      // 東京-横浜間の実際の距離は約26kmなので、25-30kmの範囲で検証
      expect(distance).toBeGreaterThan(25);
      expect(distance).toBeLessThan(30);
    });

    it('RD-006: 距離制限フィルタリングの動作確認', async () => {
      const mockCollection = {
        filter: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockRegions)
      };
      mockDb.tide_regional_data.toCollection.mockReturnValue(mockCollection);

      const results = await service.findNearestStations(
        tokyoCoords,
        { maxDistance: 10, limit: 10 }
      );

      // 距離10km以内の結果のみ取得されることを確認
      results.forEach(result => {
        expect(result.distance).toBeLessThanOrEqual(10);
      });
    });

    it('RD-007: データ品質フィルタリング', async () => {
      const mockHighQualityRegions = mockRegions.filter(r => r.dataQuality === 'high');

      const mockCollection = {
        filter: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockHighQualityRegions)
      };
      mockDb.tide_regional_data.toCollection.mockReturnValue(mockCollection);

      const results = await service.findNearestStations(
        tokyoCoords,
        { dataQuality: 'high' }
      );

      results.forEach(result => {
        expect(result.region.dataQuality).toBe('high');
      });
    });
  });

  describe('地域データ取得・検索機能', () => {
    it('RD-008: 地域IDによる特定データ取得', async () => {
      const mockRegion = mockRegions[0];
      const mockWhere = {
        equals: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockRegion)
      };
      mockDb.tide_regional_data.where.mockReturnValue(mockWhere);

      const result = await service.getRegionById('tokyo_bay');

      expect(result).toEqual(mockRegion);
      expect(mockDb.tide_regional_data.where).toHaveBeenCalledWith('regionId');
      expect(mockWhere.equals).toHaveBeenCalledWith('tokyo_bay');
    });

    it('RD-009: 存在しない地域IDでnull返却', async () => {
      const mockWhere = {
        equals: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(undefined)
      };
      mockDb.tide_regional_data.where.mockReturnValue(mockWhere);

      const result = await service.getRegionById('nonexistent');

      expect(result).toBeNull();
    });

    it('RD-010: 座標による最適地域データ取得', async () => {
      const mockCollection = {
        filter: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([mockRegions[0]])
      };
      mockDb.tide_regional_data.toCollection.mockReturnValue(mockCollection);

      const coords = { latitude: 35.6762, longitude: 139.6503 };
      const result = await service.getBestRegionForCoordinates(coords);

      expect(result).toEqual(mockRegions[0]);
    });
  });

  describe('データベース統計情報', () => {
    it('RD-011: 統計情報の正確性', async () => {
      mockDb.tide_regional_data.count.mockResolvedValue(50);

      const mockOrderBy = {
        reverse: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          updatedAt: new Date('2024-01-01')
        })
      };
      mockDb.tide_regional_data.orderBy.mockReturnValue(mockOrderBy);

      const stats = await service.getDatabaseStats();

      expect(stats.databaseCount).toBe(50);
      expect(stats.totalRegions).toBe(REGIONAL_DATA_STATS.totalRegions);
      expect(stats.highQualityRegions).toBe(REGIONAL_DATA_STATS.highQualityRegions);
      expect(stats.lastUpdated).toBeInstanceOf(Date);
    });

    it('RD-012: 品質別地域数の集計', async () => {
      const mixedQualityRegions = [
        { ...mockRegions[0], dataQuality: 'high', isActive: true },
        { ...mockRegions[1], dataQuality: 'medium', isActive: true },
        { ...mockRegions[0], dataQuality: 'high', isActive: false } // 非アクティブ
      ];

      mockDb.tide_regional_data.toArray.mockResolvedValue(mixedQualityRegions);

      const counts = await service.getRegionCountByQuality();

      expect(counts.high).toBe(1);    // アクティブなhighのみ
      expect(counts.medium).toBe(1);
      expect(counts.low).toBe(0);
      expect(counts.total).toBe(2);   // アクティブな総数
    });
  });

  describe('データ整合性チェック', () => {
    it('RD-013: 正常なデータベースの整合性確認', async () => {
      mockDb.tide_regional_data.count.mockResolvedValue(JAPANESE_COASTAL_REGIONS.length);
      mockDb.tide_regional_data.toArray.mockResolvedValue(
        JAPANESE_COASTAL_REGIONS.slice(0, 5).map((region, index) => ({
          ...region,
          id: index + 1
        }))
      );

      const integrity = await service.checkDatabaseIntegrity();

      expect(integrity.isValid).toBe(true);
      expect(integrity.issues).toHaveLength(0);
    });

    it('RD-014: データ不足の検出', async () => {
      mockDb.tide_regional_data.count.mockResolvedValue(10); // 不足
      mockDb.tide_regional_data.toArray.mockResolvedValue([]);

      const integrity = await service.checkDatabaseIntegrity();

      expect(integrity.isValid).toBe(false);
      expect(integrity.issues).toContain(
        expect.stringContaining('地域データが不足しています')
      );
    });

    it('RD-015: 不正座標の検出', async () => {
      const invalidRegions = [{
        ...mockRegions[0],
        latitude: 91, // 不正な緯度
        longitude: 181 // 不正な経度
      }];

      mockDb.tide_regional_data.count.mockResolvedValue(1);
      mockDb.tide_regional_data.toArray.mockResolvedValue(invalidRegions);

      const integrity = await service.checkDatabaseIntegrity();

      expect(integrity.isValid).toBe(false);
      expect(integrity.issues).toContain(
        expect.stringContaining('不正な座標のデータ')
      );
    });

    it('RD-016: 異常振幅値の検出', async () => {
      const invalidAmplitudeRegions = [{
        ...mockRegions[0],
        m2Amplitude: -1, // 負の値
        s2Amplitude: 10  // 異常に大きい値
      }];

      mockDb.tide_regional_data.count.mockResolvedValue(1);
      mockDb.tide_regional_data.toArray.mockResolvedValue(invalidAmplitudeRegions);

      const integrity = await service.checkDatabaseIntegrity();

      expect(integrity.isValid).toBe(false);
      expect(integrity.issues).toContain(
        expect.stringContaining('異常な振幅値のデータ')
      );
    });
  });

  describe('境界・範囲検索', () => {
    it('RD-017: 境界ボックス内の地域検索', async () => {
      const northEast = { latitude: 36.0, longitude: 140.0 };
      const southWest = { latitude: 35.0, longitude: 139.0 };

      const mockWhere = {
        between: vi.fn().mockReturnThis(),
        and: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockRegions.filter(r => r.isActive))
      };
      mockDb.tide_regional_data.where.mockReturnValue(mockWhere);

      const results = await service.getRegionsInBounds(northEast, southWest);

      expect(mockWhere.between).toHaveBeenCalledWith(
        southWest.latitude,
        northEast.latitude
      );
      expect(results.every(r => r.isActive)).toBe(true);
    });
  });

  describe('パフォーマンステスト', () => {
    it('RD-018: 大量データでの検索性能（100ms以内）', async () => {
      // 大量の模擬データを生成
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockRegions[0],
        id: i + 1,
        regionId: `region_${i}`,
        latitude: 35 + (i % 10) * 0.1,
        longitude: 139 + (i % 10) * 0.1
      }));

      const mockCollection = {
        filter: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(largeDataset)
      };
      mockDb.tide_regional_data.toCollection.mockReturnValue(mockCollection);

      const startTime = performance.now();

      await service.findNearestStations(
        { latitude: 35.6762, longitude: 139.6503 },
        { limit: 10 }
      );

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // 100ms以内
    });
  });

  describe('エラーハンドリング', () => {
    it('RD-019: データベースエラー時の適切な処理', async () => {
      mockDb.tide_regional_data.toCollection.mockImplementation(() => {
        throw new Error('データベース接続エラー');
      });

      const results = await service.findNearestStations(
        { latitude: 35.6762, longitude: 139.6503 }
      );

      expect(results).toEqual([]);
    });

    it('RD-020: 不正座標での検索エラーハンドリング', async () => {
      const invalidCoords = { latitude: NaN, longitude: NaN };

      const mockCollection = {
        filter: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([])
      };
      mockDb.tide_regional_data.toCollection.mockReturnValue(mockCollection);

      const results = await service.findNearestStations(invalidCoords);

      // エラーが発生しても空配列を返すことを確認
      expect(results).toEqual([]);
    });
  });
});

// テストデータの定義
const mockRegions: RegionalDataRecord[] = [
  {
    id: 1,
    regionId: 'tokyo_bay',
    name: '東京湾',
    latitude: 35.6762,
    longitude: 139.6503,
    m2Amplitude: 1.45,
    m2Phase: 25.0,
    s2Amplitude: 0.68,
    s2Phase: 28.0,
    dataQuality: 'high',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    regionId: 'yokohama',
    name: '横浜港',
    latitude: 35.4437,
    longitude: 139.6380,
    m2Amplitude: 1.38,
    m2Phase: 23.2,
    s2Amplitude: 0.64,
    s2Phase: 26.5,
    dataQuality: 'high',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];
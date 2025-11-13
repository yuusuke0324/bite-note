/**
 * TASK-17 PR #3-A: analytics-serviceのテスト (Phase 1 + Critical対応)
 *
 * 目標: カバレッジ 85%以上達成
 * テスト数: 35 (Phase 1: 30 + Critical異常系: 5)
 *
 * 配分:
 * - getAnalytics(): 11テスト (正常系9 + 異常系2)
 * - getAnalyticsByDateRange(): 8テスト (正常系7 + 異常系1)
 * - getSpeciesTrend(): 4テスト (正常系2 + 異常系2)
 * - getUniqueCount(): 2テスト
 * - calculateSizeStats(): 4テスト
 * - calculateDateStats(): 3テスト
 * - calculateMonthlyData(): 4テスト
 * - calculateSpeciesStats(): 3テスト
 * - calculateLocationStats(): 2テスト
 * - calculateGpsUsageRate(): 3テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from '../analytics-service';
import { fishingRecordService } from '../fishing-record-service';
import { photoService } from '../photo-service';
import type { FishingRecord } from '../../types';

// 依存サービスをモック
vi.mock('../fishing-record-service', () => ({
  fishingRecordService: {
    getRecords: vi.fn()
  }
}));

vi.mock('../photo-service', () => ({
  photoService: {
    getPhotoStatistics: vi.fn()
  }
}));

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  // モックデータ
  const mockRecords: FishingRecord[] = [
    {
      id: 1,
      fishSpecies: 'ブラックバス',
      location: '霞ヶ浦',
      size: 45.5,
      weight: 1200,
      date: new Date('2024-01-15'),
      coordinates: { latitude: 36.0, longitude: 140.0 },
      photoId: 'photo-1',
      notes: 'ルアーで釣れた',
      createdAt: new Date('2024-01-15T10:00:00'),
      updatedAt: new Date('2024-01-15T10:00:00')
    },
    {
      id: 2,
      fishSpecies: 'ブラックバス',
      location: '河口湖',
      size: 38.2,
      weight: 800,
      date: new Date('2024-02-20'),
      coordinates: { latitude: 35.5, longitude: 138.7 },
      photoId: 'photo-2',
      notes: 'ワームで釣れた',
      createdAt: new Date('2024-02-20T14:00:00'),
      updatedAt: new Date('2024-02-20T14:00:00')
    },
    {
      id: 3,
      fishSpecies: 'ニジマス',
      location: '河口湖',
      size: 30.7,
      weight: 500,
      date: new Date('2024-02-20'),
      coordinates: undefined,
      photoId: undefined,
      notes: '管理釣り場',
      createdAt: new Date('2024-02-20T15:00:00'),
      updatedAt: new Date('2024-02-20T15:00:00')
    }
  ];

  const mockPhotoStats = {
    totalPhotos: 2,
    totalSize: 5242880 // 5MB
  };

  beforeEach(() => {
    service = new AnalyticsService();
    vi.clearAllMocks();
  });

  // ============================================================================
  // 1. getAnalytics() - 9テスト
  // ============================================================================

  describe('getAnalytics', () => {
    it('正常系: 基本的な統計データ取得（全フィールド存在確認）', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: mockRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const analytics = result.data!;
      // 基本統計
      expect(analytics.totalRecords).toBeDefined();
      expect(analytics.totalPhotos).toBeDefined();
      expect(analytics.uniqueSpecies).toBeDefined();
      expect(analytics.uniqueLocations).toBeDefined();

      // 釣果統計
      expect(analytics.averageSize).toBeDefined();
      expect(analytics.maxSize).toBeDefined();
      expect(analytics.minSize).toBeDefined();
      expect(analytics.recordsWithPhotos).toBeDefined();

      // 期間統計
      expect(analytics.firstRecordDate).toBeDefined();
      expect(analytics.lastRecordDate).toBeDefined();
      expect(analytics.daysActive).toBeDefined();
      expect(analytics.recordsPerMonth).toBeDefined();

      // 魚種別統計
      expect(analytics.speciesStats).toBeDefined();

      // 場所別統計
      expect(analytics.locationStats).toBeDefined();

      // GPS使用率
      expect(analytics.gpsUsageRate).toBeDefined();

      // ストレージ使用量
      expect(analytics.totalStorageSize).toBeDefined();
    });

    it('正常系: 複数釣果の正確な集計（totalRecords、uniqueSpecies、uniqueLocations）', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: mockRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const analytics = result.data!;

      expect(analytics.totalRecords).toBe(3);
      expect(analytics.uniqueSpecies).toBe(2); // ブラックバス、ニジマス
      expect(analytics.uniqueLocations).toBe(2); // 霞ヶ浦、河口湖
    });

    it('正常系: photoService連携の正確性（totalPhotos、totalStorageSize）', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: mockRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const analytics = result.data!;

      expect(analytics.totalPhotos).toBe(2);
      expect(analytics.totalStorageSize).toBe(5242880);
    });

    it('エッジケース: 空データ（records=[]）→ すべてのフィールドがnull/0', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: []
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: { totalPhotos: 0, totalSize: 0 }
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const analytics = result.data!;

      expect(analytics.totalRecords).toBe(0);
      expect(analytics.uniqueSpecies).toBe(0);
      expect(analytics.uniqueLocations).toBe(0);
      expect(analytics.averageSize).toBeNull();
      expect(analytics.maxSize).toBeNull();
      expect(analytics.minSize).toBeNull();
      expect(analytics.recordsWithPhotos).toBe(0);
      expect(analytics.firstRecordDate).toBeNull();
      expect(analytics.lastRecordDate).toBeNull();
      expect(analytics.daysActive).toBe(0);
      expect(analytics.recordsPerMonth).toEqual([]);
      expect(analytics.speciesStats).toEqual([]);
      expect(analytics.locationStats).toEqual([]);
      expect(analytics.gpsUsageRate).toBe(0);
    });

    it('エッジケース: 1件のみ（最小データセット）', async () => {
      const singleRecord: FishingRecord[] = [mockRecords[0]];

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: singleRecord
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: { totalPhotos: 1, totalSize: 1024 }
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const analytics = result.data!;

      expect(analytics.totalRecords).toBe(1);
      expect(analytics.uniqueSpecies).toBe(1);
      expect(analytics.uniqueLocations).toBe(1);
      expect(analytics.averageSize).toBe(45.5);
      expect(analytics.maxSize).toBe(45.5);
      expect(analytics.minSize).toBe(45.5);
      expect(analytics.daysActive).toBe(1);
    });

    it('エッジケース: 写真なしデータ（recordsWithPhotos=0、totalPhotos=0）', async () => {
      const recordsWithoutPhotos: FishingRecord[] = [
        {
          ...mockRecords[0],
          photoId: undefined
        },
        {
          ...mockRecords[1],
          photoId: undefined
        }
      ];

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: recordsWithoutPhotos
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: { totalPhotos: 0, totalSize: 0 }
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const analytics = result.data!;

      expect(analytics.recordsWithPhotos).toBe(0);
      expect(analytics.totalPhotos).toBe(0);
      expect(analytics.totalStorageSize).toBe(0);
    });

    it('エッジケース: GPS使用率100%（全件GPS付き）', async () => {
      const recordsWithGPS: FishingRecord[] = [
        mockRecords[0],
        mockRecords[1],
        {
          ...mockRecords[2],
          coordinates: { latitude: 35.0, longitude: 138.0 }
        }
      ];

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: recordsWithGPS
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      expect(result.data!.gpsUsageRate).toBe(100);
    });

    it('データ整合性: recordsPerMonth配列のソート順（年月順）', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: mockRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const monthlyData = result.data!.recordsPerMonth;

      expect(monthlyData.length).toBeGreaterThan(0);
      // ソート順を確認（昇順）
      for (let i = 1; i < monthlyData.length; i++) {
        const prev = monthlyData[i - 1];
        const curr = monthlyData[i];
        const prevDate = prev.year * 12 + prev.month;
        const currDate = curr.year * 12 + curr.month;
        expect(currDate).toBeGreaterThanOrEqual(prevDate);
      }
    });

    it('データ整合性: speciesStats/locationStatsのソート順（count降順）', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: mockRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const { speciesStats, locationStats } = result.data!;

      // speciesStatsのソート順確認（count降順）
      for (let i = 1; i < speciesStats.length; i++) {
        expect(speciesStats[i - 1].count).toBeGreaterThanOrEqual(speciesStats[i].count);
      }

      // locationStatsのソート順確認（count降順）
      for (let i = 1; i < locationStats.length; i++) {
        expect(locationStats[i - 1].count).toBeGreaterThanOrEqual(locationStats[i].count);
      }
    });

    it('異常系: photoServiceがエラー返却時の処理', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: mockRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: false,
        error: {
          code: 'PHOTO_SERVICE_ERROR',
          message: 'Photo service failed'
        }
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('GET_PHOTO_STATS_FAILED');
      expect(result.error?.message).toContain('Failed to get photo statistics');
    });

    it('異常系: fishingRecordService.getRecordsが例外スロー時の処理', async () => {
      vi.mocked(fishingRecordService.getRecords).mockRejectedValue(
        new Error('Unexpected database error')
      );

      const result = await service.getAnalytics();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ANALYTICS_FAILED');
      expect(result.error?.message).toBe('Failed to calculate analytics');
    });
  });

  // ============================================================================
  // 2. getAnalyticsByDateRange() - 7テスト
  // ============================================================================

  describe('getAnalyticsByDateRange', () => {
    it('正常系: 期間内のデータフィルタリング（境界含む）', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: [mockRecords[0], mockRecords[1]]
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-02-28');

      const result = await service.getAnalyticsByDateRange(startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(fishingRecordService.getRecords).toHaveBeenCalledWith({
        filter: {
          dateRange: {
            start: startDate,
            end: endDate
          }
        }
      });
    });

    it('正常系: 返却データの型がPartial<AnalyticsData>', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: mockRecords
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const result = await service.getAnalyticsByDateRange(startDate, endDate);

      expect(result.success).toBe(true);
      const data = result.data!;

      // Partial型なので、一部のフィールドのみ存在
      expect(data.totalRecords).toBeDefined();
      expect(data.uniqueSpecies).toBeDefined();
      expect(data.uniqueLocations).toBeDefined();
      expect(data.recordsWithPhotos).toBeDefined();
      expect(data.speciesStats).toBeDefined();
      expect(data.locationStats).toBeDefined();
      expect(data.gpsUsageRate).toBeDefined();

      // 以下は含まれない
      expect(data.totalPhotos).toBeUndefined();
      expect(data.totalStorageSize).toBeUndefined();
      expect(data.firstRecordDate).toBeUndefined();
      expect(data.lastRecordDate).toBeUndefined();
      expect(data.daysActive).toBeUndefined();
      expect(data.recordsPerMonth).toBeUndefined();
    });

    it('エッジケース: 期間外データ完全除外', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: []
      });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      const result = await service.getAnalyticsByDateRange(startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.data!.totalRecords).toBe(0);
    });

    it('エッジケース: 期間内データなし（空配列）', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: []
      });

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      const result = await service.getAnalyticsByDateRange(startDate, endDate);

      expect(result.success).toBe(true);
      const data = result.data!;

      expect(data.totalRecords).toBe(0);
      expect(data.uniqueSpecies).toBe(0);
      expect(data.uniqueLocations).toBe(0);
      expect(data.averageSize).toBeNull();
      expect(data.recordsWithPhotos).toBe(0);
      expect(data.speciesStats).toEqual([]);
      expect(data.locationStats).toEqual([]);
      expect(data.gpsUsageRate).toBe(0);
    });

    it('エッジケース: startDate === endDate（同日のみ）', async () => {
      const sameDate = new Date('2024-02-20');

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: [mockRecords[1], mockRecords[2]]
      });

      const result = await service.getAnalyticsByDateRange(sameDate, sameDate);

      expect(result.success).toBe(true);
      expect(result.data!.totalRecords).toBe(2);
      expect(fishingRecordService.getRecords).toHaveBeenCalledWith({
        filter: {
          dateRange: {
            start: sameDate,
            end: sameDate
          }
        }
      });
    });

    it('エッジケース: startDate > endDate（逆転日付）', async () => {
      const startDate = new Date('2024-12-31');
      const endDate = new Date('2024-01-01');

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: []
      });

      const result = await service.getAnalyticsByDateRange(startDate, endDate);

      // サービスは呼び出しを許容するが、空データが返る
      expect(result.success).toBe(true);
      expect(result.data!.totalRecords).toBe(0);
    });

    it('異常系: fishingRecordServiceがエラー返却時の処理', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: false,
        error: {
          code: 'DB_ERROR',
          message: 'Database connection failed'
        }
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const result = await service.getAnalyticsByDateRange(startDate, endDate);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('GET_FILTERED_RECORDS_FAILED');
      expect(result.error?.message).toContain('Failed to get filtered records');
    });

    it('異常系: try-catch内で予期しない例外が発生した場合', async () => {
      vi.mocked(fishingRecordService.getRecords).mockRejectedValue(
        new Error('Network timeout')
      );

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const result = await service.getAnalyticsByDateRange(startDate, endDate);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILTERED_ANALYTICS_FAILED');
      expect(result.error?.message).toBe('Failed to calculate filtered analytics');
    });
  });

  // ============================================================================
  // 3. getSpeciesTrend() - 2テスト
  // ============================================================================

  describe('getSpeciesTrend', () => {
    it('正常系: 指定魚種の月別トレンド取得（デフォルト12ヶ月）', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: [mockRecords[0], mockRecords[1]]
      });

      const result = await service.getSpeciesTrend('ブラックバス');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);

      // fishingRecordServiceが正しいフィルタで呼ばれたか
      const callArgs = vi.mocked(fishingRecordService.getRecords).mock.calls[0][0];
      expect(callArgs?.filter?.fishSpecies).toEqual(['ブラックバス']);
      expect(callArgs?.filter?.dateRange).toBeDefined();
    });

    it('エッジケース: 存在しない魚種（空配列返却）', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: []
      });

      const result = await service.getSpeciesTrend('存在しない魚種');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('異常系: fishingRecordServiceがエラー返却時の処理', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: false,
        error: {
          code: 'DB_ERROR',
          message: 'Database error'
        }
      });

      const result = await service.getSpeciesTrend('ブラックバス');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('DB_ERROR');
    });

    it('異常系: 予期しない例外が発生した場合', async () => {
      vi.mocked(fishingRecordService.getRecords).mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await service.getSpeciesTrend('ブラックバス');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SPECIES_TREND_FAILED');
      expect(result.error?.message).toBe('Failed to calculate species trend');
    });
  });

  // ============================================================================
  // 4. getUniqueCount() - 2テスト (プライベートメソッドのテスト)
  // ============================================================================

  describe('getUniqueCount (private method test via getAnalytics)', () => {
    it('正常系: 重複データから正しいユニーク数を計算', async () => {
      const duplicateRecords: FishingRecord[] = [
        mockRecords[0],
        { ...mockRecords[0], id: 4 }, // 同じ魚種・場所
        mockRecords[1],
        { ...mockRecords[1], id: 5 }  // 同じ魚種・場所
      ];

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: duplicateRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      // ブラックバス(2件 + 2件重複) = 1ユニーク
      expect(result.data!.uniqueSpecies).toBe(1);
      // 霞ヶ浦(2件重複) + 河口湖(2件重複) = 2ユニーク
      expect(result.data!.uniqueLocations).toBe(2);
    });

    it('エッジケース: 空配列の場合（size=0）', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: []
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: { totalPhotos: 0, totalSize: 0 }
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      expect(result.data!.uniqueSpecies).toBe(0);
      expect(result.data!.uniqueLocations).toBe(0);
    });
  });

  // ============================================================================
  // 5. calculateSizeStats() - 4テスト (プライベートメソッドのテスト)
  // ============================================================================

  describe('calculateSizeStats (private method test via getAnalytics)', () => {
    it('正常系: 平均・最大・最小サイズの正確な計算', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: mockRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const { averageSize, maxSize, minSize } = result.data!;

      // mockRecords: 45.5, 38.2, 30.7
      expect(maxSize).toBe(45.5);
      expect(minSize).toBe(30.7);
      expect(averageSize).toBeCloseTo((45.5 + 38.2 + 30.7) / 3, 2);
    });

    it('エッジケース: サイズ未記録データ（size=null/undefined）→ null返却', async () => {
      const recordsWithoutSize: FishingRecord[] = [
        {
          ...mockRecords[0],
          size: undefined
        },
        {
          ...mockRecords[1],
          size: undefined
        }
      ];

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: recordsWithoutSize
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      expect(result.data!.averageSize).toBeNull();
      expect(result.data!.maxSize).toBeNull();
      expect(result.data!.minSize).toBeNull();
    });

    it('エッジケース: サイズ0のデータ（min=0、avg計算に含む）', async () => {
      const recordsWithZeroSize: FishingRecord[] = [
        { ...mockRecords[0], size: 0 },
        { ...mockRecords[1], size: 10 }
      ];

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: recordsWithZeroSize
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      expect(result.data!.minSize).toBe(0);
      expect(result.data!.maxSize).toBe(10);
      expect(result.data!.averageSize).toBe(5);
    });

    it('エッジケース: 小数点サイズの平均値精度', async () => {
      const recordsWithDecimalSize: FishingRecord[] = [
        { ...mockRecords[0], size: 25.3 },
        { ...mockRecords[1], size: 30.7 }
      ];

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: recordsWithDecimalSize
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      expect(result.data!.averageSize).toBeCloseTo(28.0, 1);
    });
  });

  // ============================================================================
  // 6. calculateDateStats() - 3テスト (プライベートメソッドのテスト)
  // ============================================================================

  describe('calculateDateStats (private method test via getAnalytics)', () => {
    it('正常系: 初回・最新釣行日の取得', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: mockRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const { firstRecordDate, lastRecordDate, daysActive } = result.data!;

      expect(firstRecordDate).toEqual(new Date('2024-01-15'));
      expect(lastRecordDate).toEqual(new Date('2024-02-20'));
      expect(daysActive).toBe(2); // 1/15と2/20の2日間
    });

    it('エッジケース: 空配列（null返却、daysActive=0）', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: []
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: { totalPhotos: 0, totalSize: 0 }
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      expect(result.data!.firstRecordDate).toBeNull();
      expect(result.data!.lastRecordDate).toBeNull();
      expect(result.data!.daysActive).toBe(0);
    });

    it('エッジケース: 同日複数釣果（daysActive=1、ユニーク日付計算）', async () => {
      const sameDayRecords: FishingRecord[] = [
        mockRecords[1],
        mockRecords[2]
      ];

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: sameDayRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      expect(result.data!.daysActive).toBe(1); // 2/20のみ
      expect(result.data!.firstRecordDate).toEqual(new Date('2024-02-20'));
      expect(result.data!.lastRecordDate).toEqual(new Date('2024-02-20'));
    });
  });

  // ============================================================================
  // 7. calculateMonthlyData() - 4テスト (プライベートメソッドのテスト)
  // ============================================================================

  describe('calculateMonthlyData (private method test via getAnalytics)', () => {
    it('正常系: 月別データの集計とソート', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: mockRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const monthlyData = result.data!.recordsPerMonth;

      expect(monthlyData.length).toBe(2); // 2024年1月と2月
      expect(monthlyData[0].year).toBe(2024);
      expect(monthlyData[0].month).toBe(1);
      expect(monthlyData[0].count).toBe(1);
      expect(monthlyData[1].year).toBe(2024);
      expect(monthlyData[1].month).toBe(2);
      expect(monthlyData[1].count).toBe(2);
    });

    it('エッジケース: 複数年にまたがるデータ（2024年12月→2025年1月）', async () => {
      const crossYearRecords: FishingRecord[] = [
        { ...mockRecords[0], date: new Date('2024-12-31') },
        { ...mockRecords[1], date: new Date('2025-01-01') }
      ];

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: crossYearRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const monthlyData = result.data!.recordsPerMonth;

      expect(monthlyData.length).toBe(2);
      expect(monthlyData[0].year).toBe(2024);
      expect(monthlyData[0].month).toBe(12);
      expect(monthlyData[1].year).toBe(2025);
      expect(monthlyData[1].month).toBe(1);
    });

    it('エッジケース: 月初（1日）と月末（31日）の境界処理', async () => {
      const boundaryRecords: FishingRecord[] = [
        { ...mockRecords[0], date: new Date('2024-01-01') },
        { ...mockRecords[1], date: new Date('2024-01-31') }
      ];

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: boundaryRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const monthlyData = result.data!.recordsPerMonth;

      expect(monthlyData.length).toBe(1);
      expect(monthlyData[0].year).toBe(2024);
      expect(monthlyData[0].month).toBe(1);
      expect(monthlyData[0].count).toBe(2); // 両方1月にカウント
    });

    it('エッジケース: サイズなしデータの月別averageSize=null', async () => {
      const recordsWithoutSize: FishingRecord[] = [
        { ...mockRecords[0], size: undefined },
        { ...mockRecords[1], size: undefined }
      ];

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: recordsWithoutSize
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const monthlyData = result.data!.recordsPerMonth;

      monthlyData.forEach(month => {
        expect(month.averageSize).toBeNull();
      });
    });
  });

  // ============================================================================
  // 8. calculateSpeciesStats() - 3テスト (プライベートメソッドのテスト)
  // ============================================================================

  describe('calculateSpeciesStats (private method test via getAnalytics)', () => {
    it('正常系: 魚種別統計の正確な計算', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: mockRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const speciesStats = result.data!.speciesStats;

      expect(speciesStats.length).toBe(2);

      // ブラックバス（2件）
      const bass = speciesStats.find(s => s.species === 'ブラックバス');
      expect(bass).toBeDefined();
      expect(bass!.count).toBe(2);
      expect(bass!.averageSize).toBeCloseTo((45.5 + 38.2) / 2, 2);
      expect(bass!.maxSize).toBe(45.5);
      expect(bass!.totalPhotos).toBe(2);
      expect(bass!.lastCaught).toEqual(new Date('2024-02-20'));

      // ニジマス（1件）
      const trout = speciesStats.find(s => s.species === 'ニジマス');
      expect(trout).toBeDefined();
      expect(trout!.count).toBe(1);
      expect(trout!.averageSize).toBe(30.7);
      expect(trout!.maxSize).toBe(30.7);
      expect(trout!.totalPhotos).toBe(0);
    });

    it('エッジケース: 同一魚種の複数釣果（集計の正確性）', async () => {
      const duplicateSpeciesRecords: FishingRecord[] = [
        mockRecords[0],
        mockRecords[1],
        { ...mockRecords[0], id: 4, date: new Date('2024-03-01') }
      ];

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: duplicateSpeciesRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const speciesStats = result.data!.speciesStats;

      const bass = speciesStats.find(s => s.species === 'ブラックバス');
      expect(bass!.count).toBe(3);
      expect(bass!.lastCaught).toEqual(new Date('2024-03-01'));
    });

    it('エッジケース: サイズなし魚種（averageSize=null、maxSize=null）', async () => {
      const recordsWithoutSize: FishingRecord[] = [
        { ...mockRecords[0], size: undefined },
        { ...mockRecords[1], size: undefined }
      ];

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: recordsWithoutSize
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const speciesStats = result.data!.speciesStats;

      speciesStats.forEach(stat => {
        expect(stat.averageSize).toBeNull();
        expect(stat.maxSize).toBeNull();
      });
    });
  });

  // ============================================================================
  // 9. calculateLocationStats() - 2テスト (プライベートメソッドのテスト)
  // ============================================================================

  describe('calculateLocationStats (private method test via getAnalytics)', () => {
    it('正常系: 場所別統計の計算', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: mockRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const locationStats = result.data!.locationStats;

      expect(locationStats.length).toBe(2);

      // 河口湖（2件、2魚種）
      const kawaguchiko = locationStats.find(l => l.location === '河口湖');
      expect(kawaguchiko).toBeDefined();
      expect(kawaguchiko!.count).toBe(2);
      expect(kawaguchiko!.uniqueSpecies).toBe(2); // ブラックバス、ニジマス
      expect(kawaguchiko!.totalPhotos).toBe(1);
      expect(kawaguchiko!.lastVisited).toEqual(new Date('2024-02-20'));

      // 霞ヶ浦（1件、1魚種）
      const kasumigaura = locationStats.find(l => l.location === '霞ヶ浦');
      expect(kasumigaura).toBeDefined();
      expect(kasumigaura!.count).toBe(1);
      expect(kasumigaura!.uniqueSpecies).toBe(1);
      expect(kasumigaura!.totalPhotos).toBe(1);
    });

    it('エッジケース: 同一場所の複数釣果・複数魚種（Set使用の検証）', async () => {
      const multipleSpeciesRecords: FishingRecord[] = [
        mockRecords[1],
        mockRecords[2],
        { ...mockRecords[1], id: 4, fishSpecies: 'ヤマメ' }
      ];

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: multipleSpeciesRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const locationStats = result.data!.locationStats;

      const kawaguchiko = locationStats.find(l => l.location === '河口湖');
      expect(kawaguchiko!.count).toBe(3);
      expect(kawaguchiko!.uniqueSpecies).toBe(3); // ブラックバス、ニジマス、ヤマメ
    });
  });

  // ============================================================================
  // 10. calculateGpsUsageRate() - 3テスト (プライベートメソッドのテスト)
  // ============================================================================

  describe('calculateGpsUsageRate (private method test via getAnalytics)', () => {
    it('正常系: GPS使用率の計算（パーセンテージ）', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: mockRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      // mockRecords: 3件中2件がGPS付き
      const expectedRate = (2 / 3) * 100;
      expect(result.data!.gpsUsageRate).toBeCloseTo(expectedRate, 2);
    });

    it('エッジケース: 空配列（0除算回避、0%返却）', async () => {
      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: []
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: { totalPhotos: 0, totalSize: 0 }
      });

      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      expect(result.data!.gpsUsageRate).toBe(0);
    });

    it('エッジケース: 全件GPS付き/なし（100%、0%）', async () => {
      // 全件GPS付き
      const allGpsRecords: FishingRecord[] = [
        mockRecords[0],
        mockRecords[1],
        { ...mockRecords[2], coordinates: { latitude: 35.0, longitude: 138.0 } }
      ];

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: allGpsRecords
      });
      vi.mocked(photoService.getPhotoStatistics).mockResolvedValue({
        success: true,
        data: mockPhotoStats
      });

      const resultAll = await service.getAnalytics();

      expect(resultAll.success).toBe(true);
      expect(resultAll.data!.gpsUsageRate).toBe(100);

      // 全件GPSなし
      const noGpsRecords: FishingRecord[] = [
        { ...mockRecords[0], coordinates: undefined },
        { ...mockRecords[1], coordinates: undefined },
        { ...mockRecords[2], coordinates: undefined }
      ];

      vi.mocked(fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: noGpsRecords
      });

      const resultNone = await service.getAnalytics();

      expect(resultNone.success).toBe(true);
      expect(resultNone.data!.gpsUsageRate).toBe(0);
    });
  });
});

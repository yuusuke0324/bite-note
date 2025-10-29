// 統計情報・分析サービス

import { fishingRecordService } from './fishing-record-service';
import { photoService } from './photo-service';
import type {
  DatabaseResult,
  FishingRecord
} from '../types';

export interface AnalyticsData {
  // 基本統計
  totalRecords: number;
  totalPhotos: number;
  uniqueSpecies: number;
  uniqueLocations: number;

  // 釣果統計
  averageSize: number | null;
  maxSize: number | null;
  minSize: number | null;
  recordsWithPhotos: number;

  // 期間統計
  firstRecordDate: Date | null;
  lastRecordDate: Date | null;
  daysActive: number;
  recordsPerMonth: MonthlyData[];

  // 魚種別統計
  speciesStats: SpeciesStats[];

  // 場所別統計
  locationStats: LocationStats[];

  // GPS使用率
  gpsUsageRate: number;

  // ストレージ使用量
  totalStorageSize: number;
}

export interface MonthlyData {
  year: number;
  month: number;
  count: number;
  averageSize: number | null;
}

export interface SpeciesStats {
  species: string;
  count: number;
  averageSize: number | null;
  maxSize: number | null;
  totalPhotos: number;
  lastCaught: Date;
}

export interface LocationStats {
  location: string;
  count: number;
  uniqueSpecies: number;
  averageSize: number | null;
  totalPhotos: number;
  lastVisited: Date;
}

export class AnalyticsService {

  // 全統計データの取得
  async getAnalytics(): Promise<DatabaseResult<AnalyticsData>> {
    try {
      // 釣果記録の取得
      const recordsResult = await fishingRecordService.getRecords();
      if (!recordsResult.success || !recordsResult.data) {
        return {
          success: false,
          error: {
            code: 'GET_RECORDS_FAILED',
            message: 'Failed to get fishing records for analytics',
            details: recordsResult.error
          }
        };
      }

      const records = recordsResult.data;

      // 写真統計の取得
      const photosStatsResult = await photoService.getPhotoStatistics();
      if (!photosStatsResult.success) {
        return {
          success: false,
          error: {
            code: 'GET_PHOTO_STATS_FAILED',
            message: 'Failed to get photo statistics',
            details: photosStatsResult.error
          }
        };
      }

      const photoStats = photosStatsResult.data!;

      // 統計データの計算
      const analytics: AnalyticsData = {
        // 基本統計
        totalRecords: records.length,
        totalPhotos: photoStats.totalPhotos,
        uniqueSpecies: this.getUniqueCount(records, 'fishSpecies'),
        uniqueLocations: this.getUniqueCount(records, 'location'),

        // 釣果統計
        ...this.calculateSizeStats(records),
        recordsWithPhotos: records.filter(r => r.photoId).length,

        // 期間統計
        ...this.calculateDateStats(records),
        recordsPerMonth: this.calculateMonthlyData(records),

        // 魚種別統計
        speciesStats: this.calculateSpeciesStats(records),

        // 場所別統計
        locationStats: this.calculateLocationStats(records),

        // GPS使用率
        gpsUsageRate: this.calculateGpsUsageRate(records),

        // ストレージ使用量
        totalStorageSize: photoStats.totalSize
      };

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_FAILED',
          message: 'Failed to calculate analytics',
          details: error
        }
      };
    }
  }

  // 特定期間の統計取得
  async getAnalyticsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<DatabaseResult<Partial<AnalyticsData>>> {
    try {
      const recordsResult = await fishingRecordService.getRecords({
        filter: {
          dateRange: {
            start: startDate,
            end: endDate
          }
        }
      });

      if (!recordsResult.success || !recordsResult.data) {
        return {
          success: false,
          error: {
            code: 'GET_FILTERED_RECORDS_FAILED',
            message: 'Failed to get filtered records',
            details: recordsResult.error
          }
        };
      }

      const records = recordsResult.data;

      const analytics: Partial<AnalyticsData> = {
        totalRecords: records.length,
        uniqueSpecies: this.getUniqueCount(records, 'fishSpecies'),
        uniqueLocations: this.getUniqueCount(records, 'location'),
        ...this.calculateSizeStats(records),
        recordsWithPhotos: records.filter(r => r.photoId).length,
        speciesStats: this.calculateSpeciesStats(records),
        locationStats: this.calculateLocationStats(records),
        gpsUsageRate: this.calculateGpsUsageRate(records)
      };

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FILTERED_ANALYTICS_FAILED',
          message: 'Failed to calculate filtered analytics',
          details: error
        }
      };
    }
  }

  // 魚種別のトレンド分析
  async getSpeciesTrend(species: string, months: number = 12): Promise<DatabaseResult<MonthlyData[]>> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - months);

      const recordsResult = await fishingRecordService.getRecords({
        filter: {
          fishSpecies: [species],
          dateRange: {
            start: startDate,
            end: endDate
          }
        }
      });

      if (!recordsResult.success || !recordsResult.data) {
        return {
          success: false,
          error: recordsResult.error
        };
      }

      const monthlyData = this.calculateMonthlyData(recordsResult.data);

      return {
        success: true,
        data: monthlyData
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SPECIES_TREND_FAILED',
          message: 'Failed to calculate species trend',
          details: error
        }
      };
    }
  }

  // プライベートメソッド: ユニーク件数の計算
  private getUniqueCount(records: FishingRecord[], field: keyof FishingRecord): number {
    const uniqueValues = new Set(records.map(record => record[field]));
    return uniqueValues.size;
  }

  // プライベートメソッド: サイズ統計の計算
  private calculateSizeStats(records: FishingRecord[]): {
    averageSize: number | null;
    maxSize: number | null;
    minSize: number | null;
  } {
    const sizesWithValue = records.filter(r => r.size !== undefined && r.size !== null);

    if (sizesWithValue.length === 0) {
      return {
        averageSize: null,
        maxSize: null,
        minSize: null
      };
    }

    const sizes = sizesWithValue.map(r => r.size!);

    return {
      averageSize: sizes.reduce((sum, size) => sum + size, 0) / sizes.length,
      maxSize: Math.max(...sizes),
      minSize: Math.min(...sizes)
    };
  }

  // プライベートメソッド: 日付統計の計算
  private calculateDateStats(records: FishingRecord[]): {
    firstRecordDate: Date | null;
    lastRecordDate: Date | null;
    daysActive: number;
  } {
    if (records.length === 0) {
      return {
        firstRecordDate: null,
        lastRecordDate: null,
        daysActive: 0
      };
    }

    const dates = records.map(r => r.date.getTime());
    const firstDate = new Date(Math.min(...dates));
    const lastDate = new Date(Math.max(...dates));

    // ユニークな日付の計算
    const uniqueDates = new Set(records.map(r => r.date.toDateString()));

    return {
      firstRecordDate: firstDate,
      lastRecordDate: lastDate,
      daysActive: uniqueDates.size
    };
  }

  // プライベートメソッド: 月別データの計算
  private calculateMonthlyData(records: FishingRecord[]): MonthlyData[] {
    const monthlyMap = new Map<string, { count: number; sizes: number[] }>();

    records.forEach(record => {
      const date = record.date;
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { count: 0, sizes: [] });
      }

      const data = monthlyMap.get(key)!;
      data.count++;

      if (record.size !== undefined && record.size !== null) {
        data.sizes.push(record.size);
      }
    });

    return Array.from(monthlyMap.entries()).map(([key, data]) => {
      const [year, month] = key.split('-').map(Number);
      return {
        year,
        month: month + 1, // 0-based to 1-based
        count: data.count,
        averageSize: data.sizes.length > 0
          ? data.sizes.reduce((sum, size) => sum + size, 0) / data.sizes.length
          : null
      };
    }).sort((a, b) => a.year - b.year || a.month - b.month);
  }

  // プライベートメソッド: 魚種別統計の計算
  private calculateSpeciesStats(records: FishingRecord[]): SpeciesStats[] {
    const speciesMap = new Map<string, {
      count: number;
      sizes: number[];
      photoCount: number;
      lastDate: Date;
    }>();

    records.forEach(record => {
      if (!speciesMap.has(record.fishSpecies)) {
        speciesMap.set(record.fishSpecies, {
          count: 0,
          sizes: [],
          photoCount: 0,
          lastDate: record.date
        });
      }

      const data = speciesMap.get(record.fishSpecies)!;
      data.count++;

      if (record.size !== undefined && record.size !== null) {
        data.sizes.push(record.size);
      }

      if (record.photoId) {
        data.photoCount++;
      }

      if (record.date > data.lastDate) {
        data.lastDate = record.date;
      }
    });

    return Array.from(speciesMap.entries()).map(([species, data]) => ({
      species,
      count: data.count,
      averageSize: data.sizes.length > 0
        ? data.sizes.reduce((sum, size) => sum + size, 0) / data.sizes.length
        : null,
      maxSize: data.sizes.length > 0 ? Math.max(...data.sizes) : null,
      totalPhotos: data.photoCount,
      lastCaught: data.lastDate
    })).sort((a, b) => b.count - a.count);
  }

  // プライベートメソッド: 場所別統計の計算
  private calculateLocationStats(records: FishingRecord[]): LocationStats[] {
    const locationMap = new Map<string, {
      count: number;
      species: Set<string>;
      sizes: number[];
      photoCount: number;
      lastDate: Date;
    }>();

    records.forEach(record => {
      if (!locationMap.has(record.location)) {
        locationMap.set(record.location, {
          count: 0,
          species: new Set(),
          sizes: [],
          photoCount: 0,
          lastDate: record.date
        });
      }

      const data = locationMap.get(record.location)!;
      data.count++;
      data.species.add(record.fishSpecies);

      if (record.size !== undefined && record.size !== null) {
        data.sizes.push(record.size);
      }

      if (record.photoId) {
        data.photoCount++;
      }

      if (record.date > data.lastDate) {
        data.lastDate = record.date;
      }
    });

    return Array.from(locationMap.entries()).map(([location, data]) => ({
      location,
      count: data.count,
      uniqueSpecies: data.species.size,
      averageSize: data.sizes.length > 0
        ? data.sizes.reduce((sum, size) => sum + size, 0) / data.sizes.length
        : null,
      totalPhotos: data.photoCount,
      lastVisited: data.lastDate
    })).sort((a, b) => b.count - a.count);
  }

  // プライベートメソッド: GPS使用率の計算
  private calculateGpsUsageRate(records: FishingRecord[]): number {
    if (records.length === 0) return 0;

    const recordsWithGps = records.filter(r => r.coordinates);
    return (recordsWithGps.length / records.length) * 100;
  }
}

// サービスインスタンスのシングルトン
export const analyticsService = new AnalyticsService();
/**
 * 潮汐地域データベースサービス
 *
 * 日本沿岸地域データの管理とハバーサイン距離による最寄りステーション検索
 */

import type { RegionalDataRecord, Coordinates } from '../../types/tide';
import { db } from '../../lib/database';
import { JAPANESE_COASTAL_REGIONS, REGIONAL_DATA_STATS } from '../../data/regional-tide-data';

/** ハバーサイン距離計算結果 */
export interface DistanceResult {
  region: RegionalDataRecord;
  distance: number; // km
}

/** 地域データ検索オプション */
export interface SearchOptions {
  maxDistance?: number;     // 最大距離 (km)
  limit?: number;          // 結果数制限
  dataQuality?: 'high' | 'medium' | 'low' | 'any';
  activeOnly?: boolean;    // アクティブな地域のみ
}

/** データベース初期化結果 */
export interface InitializationResult {
  success: boolean;
  message: string;
  inserted: number;
  updated: number;
  errors: string[];
}

/**
 * 潮汐地域データベースサービス
 */
export class RegionalDataService {
  /**
   * データベースを初期データで初期化
   */
  async initializeDatabase(): Promise<InitializationResult> {
    const result: InitializationResult = {
      success: false,
      message: '',
      inserted: 0,
      updated: 0,
      errors: []
    };

    try {
      // 既存データの確認
      const existingCount = await db.tide_regional_data.count();

      if (existingCount > 0) {
        // 既存データがある場合は更新処理
        result.message = `既存データ ${existingCount} 件を更新します`;

        for (const regionData of JAPANESE_COASTAL_REGIONS) {
          try {
            const existing = await db.tide_regional_data
              .where('regionId')
              .equals(regionData.regionId)
              .first();

            if (existing) {
              // 既存データを更新
              await db.tide_regional_data.update(existing.id!, {
                ...regionData,
                updatedAt: new Date()
              });
              result.updated++;
            } else {
              // 新規データを挿入
              await db.tide_regional_data.add(regionData);
              result.inserted++;
            }
          } catch (error) {
            result.errors.push(`地域 ${regionData.regionId} の処理に失敗: ${error}`);
          }
        }
      } else {
        // 新規データベースの場合は一括挿入
        result.message = '新規データベースを初期化します';

        try {
          await db.tide_regional_data.bulkAdd(JAPANESE_COASTAL_REGIONS);
          result.inserted = JAPANESE_COASTAL_REGIONS.length;
        } catch (error) {
          result.errors.push(`一括挿入に失敗: ${error}`);

          // 一括挿入が失敗した場合は個別挿入を試行
          for (const regionData of JAPANESE_COASTAL_REGIONS) {
            try {
              await db.tide_regional_data.add(regionData);
              result.inserted++;
            } catch (err) {
              result.errors.push(`地域 ${regionData.regionId} の挿入に失敗: ${err}`);
            }
          }
        }
      }

      // 成功判定
      const totalProcessed = result.inserted + result.updated;
      result.success = totalProcessed > 0 && result.errors.length === 0;

      if (result.success) {
        result.message = `データベース初期化完了: ${result.inserted} 件挿入, ${result.updated} 件更新`;
      } else {
        result.message = `初期化に問題が発生: ${result.errors.length} 件のエラー`;
      }

    } catch (error) {
      result.success = false;
      result.message = `データベース初期化エラー: ${error}`;
      result.errors.push(`${error}`);
    }

    return result;
  }

  /**
   * ハバーサイン公式による距離計算
   */
  private calculateHaversineDistance(
    point1: Coordinates,
    point2: Coordinates
  ): number {
    const R = 6371; // 地球の半径 (km)

    // デバッグログ（開発時かつ詳細デバッグ時のみ表示）
    if (process.env.NODE_ENV === 'development' && process.env.VITE_DEBUG_HAVERSINE === 'true') {
      console.log('🧮 ハバーサイン計算詳細:', {
        point1,
        point2,
        point1Types: {
          lat: typeof point1.latitude,
          lng: typeof point1.longitude
        },
        point2Types: {
          lat: typeof point2.latitude,
          lng: typeof point2.longitude
        }
      });
    }

    const lat1Rad = (point1.latitude * Math.PI) / 180;
    const lat2Rad = (point2.latitude * Math.PI) / 180;
    const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;

    // デバッグログ（開発時かつ詳細デバッグ時のみ表示）
    if (process.env.NODE_ENV === 'development' && process.env.VITE_DEBUG_HAVERSINE === 'true') {
      console.log('🧮 計算ステップ:', {
        lat1Rad: lat1Rad.toFixed(6),
        lat2Rad: lat2Rad.toFixed(6),
        deltaLatRad: deltaLatRad.toFixed(6),
        deltaLonRad: deltaLonRad.toFixed(6),
        a: a.toFixed(6),
        c: c.toFixed(6),
        distance: distance.toFixed(2) + 'km'
      });
    }

    return distance;
  }

  /**
   * 最寄りの地域ステーションを検索
   */
  async findNearestStations(
    coordinates: Coordinates,
    options: SearchOptions = {}
  ): Promise<DistanceResult[]> {
    const {
      maxDistance = 200,        // デフォルト最大距離 200km
      limit = 10,              // デフォルト上位10件
      dataQuality = 'any',
      activeOnly = true
    } = options;

    try {
      // データベースから地域データを取得
      let query = db.tide_regional_data.toCollection();

      // アクティブなデータのみフィルタ
      if (activeOnly) {
        query = query.filter(region => region.isActive);
      }

      // データ品質でフィルタ
      if (dataQuality !== 'any') {
        query = query.filter(region => region.dataQuality === dataQuality);
      }

      const regions = await query.toArray();

      // 各地域との距離を計算
      const distanceResults: DistanceResult[] = regions.map((region, index) => {
        const distance = this.calculateHaversineDistance(coordinates, {
          latitude: region.latitude,
          longitude: region.longitude
        });

        return {
          region,
          distance
        };
      });

      // 距離でソートし、最大距離以内のもののみ抽出
      const filteredResults = distanceResults
        .filter(result => result.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);

      return filteredResults;

    } catch (error) {
      console.error('最寄りステーション検索エラー:', error);
      return [];
    }
  }

  /**
   * 地域IDで特定の地域データを取得
   */
  async getRegionById(regionId: string): Promise<RegionalDataRecord | null> {
    try {
      return await db.tide_regional_data
        .where('regionId')
        .equals(regionId)
        .first() || null;
    } catch (error) {
      console.error('地域データ取得エラー:', error);
      return null;
    }
  }

  /**
   * 座標に基づく最適な地域データを取得
   */
  async getBestRegionForCoordinates(
    coordinates: Coordinates
  ): Promise<RegionalDataRecord | null> {
    const nearestStations = await this.findNearestStations(coordinates, {
      limit: 3,
      dataQuality: 'any',
      activeOnly: true,
      maxDistance: 500
    });

    if (nearestStations.length === 0) {
      // フォールバック：距離制限なしで最も近い地域を検索
      const allStations = await this.findNearestStations(coordinates, {
        limit: 1,
        dataQuality: 'any',
        activeOnly: true,
        maxDistance: 10000
      });

      return allStations.length > 0 ? allStations[0].region : null;
    }

    return nearestStations[0].region;
  }

  /**
   * 全地域データの統計情報を取得
   */
  async getDatabaseStats(): Promise<typeof REGIONAL_DATA_STATS & {
    databaseCount: number;
    lastUpdated: Date | null;
  }> {
    try {
      const count = await db.tide_regional_data.count();
      const lastRecord = await db.tide_regional_data
        .orderBy('updatedAt')
        .reverse()
        .first();

      return {
        ...REGIONAL_DATA_STATS,
        databaseCount: count,
        lastUpdated: lastRecord?.updatedAt || null
      };
    } catch (error) {
      console.error('統計情報取得エラー:', error);
      return {
        ...REGIONAL_DATA_STATS,
        databaseCount: 0,
        lastUpdated: null
      };
    }
  }

  /**
   * データベースの整合性をチェック
   */
  async checkDatabaseIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // 基本的な件数チェック
      const count = await db.tide_regional_data.count();
      if (count === 0) {
        issues.push('地域データが存在しません');
        recommendations.push('initializeDatabase() を実行してください');
        return { isValid: false, issues, recommendations };
      }

      if (count < JAPANESE_COASTAL_REGIONS.length) {
        issues.push(`地域データが不足しています (${count}/${JAPANESE_COASTAL_REGIONS.length})`);
        recommendations.push('不足データを補完してください');
      }

      // 重複データのチェック
      const allData = await db.tide_regional_data.toArray();
      const regionIds = allData.map(r => r.regionId);
      const uniqueRegionIds = new Set(regionIds);

      if (regionIds.length !== uniqueRegionIds.size) {
        issues.push('重複するregionIdが存在します');
        recommendations.push('重複データを削除してください');
      }

      // 座標の妥当性チェック
      const invalidCoordinates = allData.filter(region =>
        region.latitude < -90 || region.latitude > 90 ||
        region.longitude < -180 || region.longitude > 180
      );

      if (invalidCoordinates.length > 0) {
        issues.push(`不正な座標のデータが ${invalidCoordinates.length} 件存在します`);
        recommendations.push('座標データを修正してください');
      }

      // 振幅データの妥当性チェック
      const invalidAmplitudes = allData.filter(region =>
        region.m2Amplitude < 0 || region.m2Amplitude > 10 ||
        region.s2Amplitude < 0 || region.s2Amplitude > 5
      );

      if (invalidAmplitudes.length > 0) {
        issues.push(`異常な振幅値のデータが ${invalidAmplitudes.length} 件存在します`);
        recommendations.push('振幅データを確認してください');
      }

      // アクティブでないデータの確認
      const inactiveCount = allData.filter(r => !r.isActive).length;
      if (inactiveCount > 0) {
        recommendations.push(`${inactiveCount} 件の非アクティブなデータがあります`);
      }

    } catch (error) {
      issues.push(`整合性チェック中にエラーが発生: ${error}`);
      recommendations.push('データベース接続を確認してください');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * データベースの状態を取得
   */
  async getDatabaseStatus(): Promise<{
    totalRecords: number;
    activeRecords: number;
    highQualityRecords: number;
    isInitialized: boolean;
  }> {
    try {
      const totalRecords = await db.tide_regional_data.count();
      const allData = await db.tide_regional_data.toArray();
      const activeRecords = allData.filter(r => r.isActive).length;
      const highQualityRecords = allData.filter(r => r.dataQuality === 'high').length;

      return {
        totalRecords,
        activeRecords,
        highQualityRecords,
        isInitialized: totalRecords > 0
      };
    } catch (error) {
      console.error('データベース状態取得エラー:', error);
      return {
        totalRecords: 0,
        activeRecords: 0,
        highQualityRecords: 0,
        isInitialized: false
      };
    }
  }

  /**
   * 全ての地域データを取得
   */
  async getAllRegions(): Promise<RegionalDataRecord[]> {
    try {
      return await db.tide_regional_data.toArray();
    } catch (error) {
      console.error('全地域データ取得エラー:', error);
      return [];
    }
  }

  /**
   * 指定した範囲内の地域データを検索
   */
  async getRegionsInBounds(
    northEast: Coordinates,
    southWest: Coordinates
  ): Promise<RegionalDataRecord[]> {
    try {
      return await db.tide_regional_data
        .where('latitude')
        .between(southWest.latitude, northEast.latitude)
        .and(region =>
          region.longitude >= southWest.longitude &&
          region.longitude <= northEast.longitude &&
          region.isActive
        )
        .toArray();
    } catch (error) {
      console.error('範囲検索エラー:', error);
      return [];
    }
  }

  /**
   * データ品質別の地域数を取得
   */
  async getRegionCountByQuality(): Promise<Record<string, number>> {
    try {
      const allData = await db.tide_regional_data.toArray();

      return {
        high: allData.filter(r => r.dataQuality === 'high' && r.isActive).length,
        medium: allData.filter(r => r.dataQuality === 'medium' && r.isActive).length,
        low: allData.filter(r => r.dataQuality === 'low' && r.isActive).length,
        total: allData.filter(r => r.isActive).length
      };
    } catch (error) {
      console.error('品質別統計取得エラー:', error);
      return { high: 0, medium: 0, low: 0, total: 0 };
    }
  }
}

// サービスのシングルトンインスタンス
export const regionalDataService = new RegionalDataService();
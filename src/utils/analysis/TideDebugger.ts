/**
 * TASK-102: グラフパターンの多様性検証機能
 * TideDebugger - デバッグ情報収集・表示
 *
 * FR-203: デバッグ情報表示機能の実装
 */

import type {
  TideCalculationDebugInfo,
  HarmonicParameters,
  CoordinateVariationFactors,
  SeasonalVariationFactors
} from '../../types/analysis';
import type { FishingRecord } from '../../types/entities';

export class TideDebugger {
  // デバッグ情報キャッシュ
  private static readonly debugCache = new Map<string, TideCalculationDebugInfo>();
  private static readonly MAX_CACHE_SIZE = 20;

  /**
   * 潮汐計算のデバッグ情報を収集する
   *
   * @param record - 釣果記録
   * @returns デバッグ情報
   */
  static async collectDebugInfo(record: FishingRecord): Promise<TideCalculationDebugInfo> {
    const startTime = Date.now();

    try {
      // キャッシュチェック
      const cacheKey = this.generateDebugCacheKey(record);
      const cachedInfo = this.debugCache.get(cacheKey);
      if (cachedInfo) {
        return { ...cachedInfo };
      }

      // メモリ使用量測定開始
      const memoryBefore = this.getMemoryUsage();

      // 基本パラメータ生成
      const baseParameters = this.generateBaseParameters(record);

      // 座標変動係数計算
      const coordinateFactors = this.calculateCoordinateFactors(record.coordinates);

      // 季節変動係数計算
      const seasonalFactors = this.calculateSeasonalFactors(record.date);

      // 最終パラメータ生成
      const finalParameters = this.applyVariationFactors(
        baseParameters,
        coordinateFactors,
        seasonalFactors
      );

      // パフォーマンス・品質情報収集
      const calculationTime = Math.max(1, Date.now() - startTime); // 最小1ms
      const memoryAfter = this.getMemoryUsage();
      const memoryUsage = Math.max(0, (memoryAfter - memoryBefore) / 1024); // KB

      const debugInfo: TideCalculationDebugInfo = {
        calculation: {
          baseParameters,
          coordinateFactors,
          seasonalFactors,
          finalParameters
        },
        performance: {
          calculationTime,
          cacheHitRate: this.calculateCacheHitRate(),
          memoryUsage
        },
        quality: {
          dataIntegrity: this.validateDataIntegrity(record),
          calculationAccuracy: this.calculateAccuracyScore(baseParameters, finalParameters),
          warnings: this.generateWarnings(record, coordinateFactors, seasonalFactors)
        }
      };

      // キャッシュに保存
      this.saveToDebugCache(cacheKey, debugInfo);

      return debugInfo;

    } catch (error) {
      console.error('TideDebugger: Failed to collect debug info', error);
      return this.createEmptyDebugInfo();
    }
  }

  /**
   * デバッグキャッシュキー生成
   */
  private static generateDebugCacheKey(record: FishingRecord): string {
    try {
      if (!record.coordinates || !record.date) {
        return `fallback_${record.id}_${Date.now()}`;
      }

      const lat = Math.round(record.coordinates.latitude * 1000) / 1000;
      const lng = Math.round(record.coordinates.longitude * 1000) / 1000;
      const dateStr = record.date instanceof Date
        ? record.date.toISOString().substring(0, 10)
        : record.date.toString().substring(0, 10);

      return `${lat},${lng}@${dateStr}`;
    } catch (error) {
      return `error_${record.id}_${Date.now()}`;
    }
  }

  /**
   * 基本調和パラメータ生成
   */
  private static generateBaseParameters(record: FishingRecord): HarmonicParameters {
    // 最小実装: 標準的な東京湾のパラメータをベースに設定
    return {
      M2: 1.2,   // 主太陰半日潮
      S2: 0.4,   // 主太陽半日潮
      N2: 0.25,  // 長楕円体太陰半日潮
      K1: 0.6,   // 太陰太陽日潮
      O1: 0.4,   // 主太陰日潮
      P1: 0.2,   // 主太陽日潮
      Q1: 0.08   // 楕円体太陰日潮
    };
  }

  /**
   * 座標変動係数計算
   */
  private static calculateCoordinateFactors(coordinates?: { latitude: number; longitude: number }): CoordinateVariationFactors {
    // デフォルト値（座標なしの場合）
    if (!coordinates) {
      return {
        latitudeEffect: 0,
        longitudeEffect: 0,
        distanceFromReference: 0,
        geographicCorrection: 0
      };
    }

    // 東京湾を基準点として設定 (35.6762, 139.6503)
    const referenceLat = 35.6762;
    const referenceLng = 139.6503;

    const latDiff = coordinates.latitude - referenceLat;
    const lngDiff = coordinates.longitude - referenceLng;

    // 距離計算（簡易版）
    const distance = Math.sqrt(latDiff ** 2 + lngDiff ** 2) * 111; // 約111km/度

    return {
      latitudeEffect: latDiff * 0.01,    // 緯度1度あたり1%の影響
      longitudeEffect: lngDiff * 0.005,  // 経度1度あたり0.5%の影響
      distanceFromReference: distance,
      geographicCorrection: Math.min(0.2, distance * 0.001) // 距離に応じた補正（最大20%）
    };
  }

  /**
   * 季節変動係数計算
   */
  private static calculateSeasonalFactors(dateInput: Date | string): SeasonalVariationFactors {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const month = date.getMonth() + 1; // 1-12
    const dayOfYear = this.getDayOfYear(date);

    // 月別補正（冬季に潮位差大）
    const monthlyCorrection = Math.cos((month - 1) * Math.PI / 6) * 0.1; // ±10%

    // 季節振幅（夏至・冬至で最大）
    const seasonalAmplitude = Math.abs(Math.cos((dayOfYear - 172) * 2 * Math.PI / 365)) * 0.15; // 夏至基準

    // 月の近地点・遠地点効果（簡易版）
    const perigeeApogeeEffect = Math.sin(dayOfYear * 2 * Math.PI / 27.3) * 0.05; // 27.3日周期

    return {
      monthlyCorrection,
      seasonalAmplitude,
      perigeeApogeeEffect,
      solarCorrectionFactor: 1 + (monthlyCorrection * 0.5 + seasonalAmplitude * 0.5) // より控えめな補正
    };
  }

  /**
   * 変動係数を適用して最終パラメータを計算
   */
  private static applyVariationFactors(
    base: HarmonicParameters,
    coordinate: CoordinateVariationFactors,
    seasonal: SeasonalVariationFactors
  ): HarmonicParameters {
    const coordFactor = 1 + coordinate.geographicCorrection;
    const seasonalFactor = seasonal.solarCorrectionFactor;

    return {
      M2: base.M2 * coordFactor * seasonalFactor,
      S2: base.S2 * coordFactor * seasonalFactor,
      N2: base.N2 * coordFactor,
      K1: base.K1 * seasonalFactor,
      O1: base.O1 * seasonalFactor,
      P1: base.P1 * seasonalFactor,
      Q1: base.Q1 * coordFactor
    };
  }

  /**
   * データ整合性検証
   */
  private static validateDataIntegrity(record: FishingRecord): boolean {
    // 基本的な整合性チェック
    if (!record.coordinates || !record.date || !record.id) return false;

    const { latitude, longitude } = record.coordinates;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return false;

    const date = new Date(record.date);
    if (isNaN(date.getTime())) return false;

    return true;
  }

  /**
   * 計算精度スコア算出
   */
  private static calculateAccuracyScore(
    base: HarmonicParameters,
    final: HarmonicParameters
  ): number {
    // パラメータの変動が適切な範囲内かチェック
    const variations = [
      Math.abs(final.M2 - base.M2) / base.M2,
      Math.abs(final.S2 - base.S2) / base.S2,
      Math.abs(final.K1 - base.K1) / base.K1,
      Math.abs(final.O1 - base.O1) / base.O1
    ];

    const avgVariation = variations.reduce((sum, v) => sum + v, 0) / variations.length;

    // 変動が10%以内なら高精度、30%超なら低精度
    if (avgVariation < 0.1) return 0.95;
    if (avgVariation < 0.15) return 0.90;
    if (avgVariation < 0.2) return 0.85;
    if (avgVariation < 0.3) return 0.75;
    return 0.6;
  }

  /**
   * 警告メッセージ生成
   */
  private static generateWarnings(
    record: FishingRecord,
    coordinate: CoordinateVariationFactors,
    seasonal: SeasonalVariationFactors
  ): string[] {
    const warnings: string[] = [];

    // 座標関連の警告
    if (coordinate.distanceFromReference > 500) {
      warnings.push('Location is far from reference point (>500km). Results may be less accurate.');
    }

    // 季節関連の警告
    if (Math.abs(seasonal.monthlyCorrection) > 0.08) {
      warnings.push('Significant seasonal variation detected. Consider seasonal adjustment.');
    }

    // データ品質の警告
    if (!this.validateDataIntegrity(record)) {
      warnings.push('Data integrity issues detected. Please verify input data.');
    }

    return warnings;
  }

  /**
   * キャッシュヒット率計算
   */
  private static calculateCacheHitRate(): number {
    // TODO: 実際のキャッシュ統計を実装
    return 75; // 仮の値
  }

  /**
   * メモリ使用量取得
   */
  private static getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  /**
   * 年内通日計算
   */
  private static getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * デバッグキャッシュに保存
   */
  private static saveToDebugCache(key: string, info: TideCalculationDebugInfo): void {
    if (this.debugCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.debugCache.keys().next().value;
      this.debugCache.delete(firstKey);
    }

    this.debugCache.set(key, { ...info });
  }

  /**
   * 空のデバッグ情報生成
   */
  private static createEmptyDebugInfo(): TideCalculationDebugInfo {
    return {
      calculation: {
        baseParameters: { M2: 0, S2: 0, N2: 0, K1: 0, O1: 0, P1: 0, Q1: 0 },
        coordinateFactors: {
          latitudeEffect: 0,
          longitudeEffect: 0,
          distanceFromReference: 0,
          geographicCorrection: 0
        },
        seasonalFactors: {
          monthlyCorrection: 0,
          seasonalAmplitude: 0,
          perigeeApogeeEffect: 0,
          solarCorrectionFactor: 1
        },
        finalParameters: { M2: 0, S2: 0, N2: 0, K1: 0, O1: 0, P1: 0, Q1: 0 }
      },
      performance: {
        calculationTime: 0,
        cacheHitRate: 0,
        memoryUsage: 0
      },
      quality: {
        dataIntegrity: false,
        calculationAccuracy: 0,
        warnings: ['Failed to collect debug information']
      }
    };
  }

  /**
   * デバッグキャッシュクリア
   */
  static clearCache(): void {
    this.debugCache.clear();
  }
}
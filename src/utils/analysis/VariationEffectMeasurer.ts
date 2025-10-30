/**
 * TASK-102: グラフパターンの多様性検証機能
 * VariationEffectMeasurer - 変動係数効果測定
 *
 * FR-202: 変動係数効果測定機能の実装
 */

import type {
  VariationEffectAnalysisInput,
  VariationEffectResult,
  CoordinateEffectResult,
  SeasonalEffectResult,
  AnalysisCoordinates
} from '../../types/analysis';
import { GeographicCalculator } from './helpers/GeographicCalculator';

export class VariationEffectMeasurer {
  // 地理計算定数
  private static readonly EARTH_RADIUS_KM = 6371;
  private static readonly DEFAULT_COORDINATE_IMPACT = 0.1; // 1% per 100km
  private static readonly DEFAULT_SEASONAL_IMPACT = 0.05; // 5% per season

  /**
   * 変動係数の効果を測定する
   *
   * @param input - 分析入力パラメータ
   * @returns 効果測定結果
   */
  static async analyzeEffect(input: VariationEffectAnalysisInput): Promise<VariationEffectResult> {
    try {
      const result: VariationEffectResult = {
        combinedEffect: {
          synergy: 0,
          totalVariation: 0
        }
      };

      // 座標変動効果測定
      if (input.analysisType === 'coordinate' || input.analysisType === 'both') {
        result.coordinateEffect = await this.measureCoordinateEffect(
          input.baseLocation,
          input.testLocations,
          input.dateRange
        );
      }

      // 季節変動効果測定
      if (input.analysisType === 'seasonal' || input.analysisType === 'both') {
        result.seasonalEffect = await this.measureSeasonalEffect(
          input.baseLocation,
          input.dateRange
        );
      }

      // 複合効果計算
      result.combinedEffect = this.calculateCombinedEffect(
        result.coordinateEffect,
        result.seasonalEffect
      );

      return result;

    } catch (error) {
      console.error('VariationEffectMeasurer: Analysis failed', error);
      return this.createEmptyResult();
    }
  }

  /**
   * 座標変動効果測定
   */
  private static async measureCoordinateEffect(
    baseLocation: AnalysisCoordinates,
    testLocations: AnalysisCoordinates[],
    dateRange: { start: string; end: string }
  ): Promise<CoordinateEffectResult> {
    const impacts: number[] = [];
    let maxDistance = 0;

    for (const testLocation of testLocations) {
      // 高精度地理計算を使用
      const distance = GeographicCalculator.calculateOptimalDistance(baseLocation, testLocation);
      const terrainFactor = GeographicCalculator.getTerrainCorrectionFactor(baseLocation, testLocation);
      const adjustedDistance = distance * terrainFactor;

      maxDistance = Math.max(maxDistance, adjustedDistance);

      // 改善された影響度計算（非線形モデル）
      const baseImpact = Math.log(1 + adjustedDistance / 50) * this.DEFAULT_COORDINATE_IMPACT * 100;
      const terrainAdjustment = (terrainFactor - 1) * 50; // 地形による追加影響
      const impact = baseImpact + terrainAdjustment;

      impacts.push(impact);
    }

    const averageImpact = impacts.length > 0
      ? impacts.reduce((sum, impact) => sum + impact, 0) / impacts.length
      : 0;

    const maxImpact = impacts.length > 0 ? Math.max(...impacts) : 0;

    return {
      averageImpact,
      maxImpact,
      spatialRange: maxDistance
    };
  }

  /**
   * 季節変動効果測定
   */
  private static async measureSeasonalEffect(
    baseLocation: AnalysisCoordinates,
    dateRange: { start: string; end: string }
  ): Promise<SeasonalEffectResult> {
    // 最小実装: 日付範囲から季節変動を推定
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const daysDiff = Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    // 季節サイクル強度（年間を通じた範囲で0-1）
    const seasonalCycle = Math.min(1, daysDiff / 365);

    // ピーク時影響度（夏至・冬至付近で最大）
    const peakSeasonImpact = this.calculateSeasonalPeakImpact(startDate, endDate);

    // 平均影響度
    const averageImpact = seasonalCycle * this.DEFAULT_SEASONAL_IMPACT * 100; // % 表示

    return {
      averageImpact,
      peakSeasonImpact,
      seasonalCycle
    };
  }

  /**
   * 季節ピーク影響度計算
   */
  private static calculateSeasonalPeakImpact(startDate: Date, endDate: Date): number {
    // 夏至（6/21）と冬至（12/21）からの距離を計算
    const summerSolstice = new Date(startDate.getFullYear(), 5, 21); // 6月21日
    const winterSolstice = new Date(startDate.getFullYear(), 11, 21); // 12月21日

    const startDistanceFromSolstice = Math.min(
      Math.abs(startDate.getTime() - summerSolstice.getTime()),
      Math.abs(startDate.getTime() - winterSolstice.getTime())
    );

    const endDistanceFromSolstice = Math.min(
      Math.abs(endDate.getTime() - summerSolstice.getTime()),
      Math.abs(endDate.getTime() - winterSolstice.getTime())
    );

    // 至点に近いほど影響大（最大10%）
    const maxSolsticeEffect = 10;
    const dayMs = 1000 * 60 * 60 * 24;
    const avgDistanceFromSolstice = (startDistanceFromSolstice + endDistanceFromSolstice) / 2;
    const daysFromSolstice = avgDistanceFromSolstice / dayMs;

    // 90日（四半期）で影響度が半減
    return maxSolsticeEffect * Math.exp(-daysFromSolstice / 90);
  }

  /**
   * 複合効果計算
   */
  private static calculateCombinedEffect(
    coordinateEffect?: CoordinateEffectResult,
    seasonalEffect?: SeasonalEffectResult
  ): VariationEffectResult['combinedEffect'] {
    const coordImpact = coordinateEffect?.averageImpact || 0;
    const seasonalImpact = seasonalEffect?.averageImpact || 0;

    // 単純加算に対する相乗効果を計算
    const linearSum = coordImpact + seasonalImpact;
    const actualEffect = Math.sqrt(coordImpact ** 2 + seasonalImpact ** 2); // ベクトル合成

    const synergy = linearSum > 0 ? ((actualEffect - linearSum) / linearSum) * 100 : 0;

    return {
      synergy,
      totalVariation: actualEffect
    };
  }

  /**
   * 2点間の距離を計算（ハバーシンの公式）
   */
  private static calculateDistance(point1: AnalysisCoordinates, point2: AnalysisCoordinates): number {
    const lat1Rad = (point1.lat * Math.PI) / 180;
    const lat2Rad = (point2.lat * Math.PI) / 180;
    const deltaLatRad = ((point2.lat - point1.lat) * Math.PI) / 180;
    const deltaLngRad = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS_KM * c;
  }

  /**
   * 空の結果を生成
   */
  private static createEmptyResult(): VariationEffectResult {
    return {
      combinedEffect: {
        synergy: 0,
        totalVariation: 0
      }
    };
  }

  /**
   * 統計的有意性検証の実際の計算
   */
  static async validateStatisticalSignificance(
    result: VariationEffectResult,
    confidenceLevel: number = 0.95
  ): Promise<{ pValue: number; isSignificant: boolean; standardError: number }> {
    // サンプルサイズと効果量から統計検定
    const effectSize = result.combinedEffect.totalVariation / 100; // 正規化
    const sampleSize = 10; // 仮定（実際は分析データ数）

    // 標準誤差計算
    const standardError = Math.sqrt(effectSize * (1 - effectSize) / sampleSize);

    // t統計量計算
    const tStat = Math.abs(effectSize / standardError);
    const degreesOfFreedom = sampleSize - 1;

    // p値近似計算（two-tailed test）
    const pValue = this.calculatePValue(tStat, degreesOfFreedom);
    const criticalValue = this.getCriticalValue(confidenceLevel, degreesOfFreedom);

    return {
      pValue,
      isSignificant: tStat > criticalValue,
      standardError
    };
  }

  /**
   * p値の近似計算（t分布）
   */
  private static calculatePValue(tStat: number, df: number): number {
    // 簡易t分布近似（大まかなp値計算）
    if (df <= 0) return 1;

    // t統計量が大きい場合の近似
    if (tStat > 6) return 0.001;
    if (tStat > 3) return 0.01;
    if (tStat > 2) return 0.05;
    if (tStat > 1) return 0.2;

    return 0.5; // 小さなt統計量
  }

  /**
   * 臨界値取得（t分布）
   */
  private static getCriticalValue(confidenceLevel: number, df: number): number {
    // 信頼度別の臨界値（簡易テーブル）
    const alpha = 1 - confidenceLevel;

    if (alpha <= 0.01) return 2.58; // 99%信頼区間
    if (alpha <= 0.05) return 1.96; // 95%信頼区間
    if (alpha <= 0.1) return 1.645; // 90%信頼区間

    return 1.0; // デフォルト
  }

  /**
   * 効果の信頼区間計算（将来実装予定）
   */
  static calculateConfidenceInterval(
    effect: number,
    standardError: number,
    confidenceLevel: number = 0.95
  ): [number, number] {
    // 現在は正規分布を仮定した簡易計算
    // NOTE: 将来的にt分布や bootstrap法による信頼区間計算に改善予定
    const zScore = confidenceLevel === 0.95 ? 1.96 :
                   confidenceLevel === 0.99 ? 2.576 : 1.96;
    const margin = zScore * standardError;
    return [effect - margin, effect + margin];
  }
}
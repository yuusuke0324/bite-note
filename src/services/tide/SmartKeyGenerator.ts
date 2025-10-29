/**
 * TASK-201: スマートキー生成エンジン
 * SmartKeyGenerator - インテリジェントキー生成
 *
 * Step 3/6: 最小実装 (RED Phase)
 * Enhanced Cache Key 生成のための基本クラス
 */

import type {
  EnhancedCacheKey,
  PrecisionLevel,
  SeasonalContext,
  AnalysisType
} from '../../types/tide';

/**
 * スマートキー生成エンジン
 *
 * 機能:
 * - Enhanced Cache Key の生成・正規化
 * - 座標精度レベル処理
 * - 季節コンテキスト正規化
 * - 変動係数量子化
 * - キー一意性保証
 */
export class SmartKeyGenerator {
  private readonly VERSION = '1.0';

  /**
   * Enhanced Cache Key 生成
   * UT-301-01 対応: 基本キー生成の正確性
   */
  generateEnhancedKey(input: Partial<EnhancedCacheKey>): EnhancedCacheKey {
    // Step 3: 最小実装 - 基本的なキー生成
    const normalized = this.normalizeInput(input);
    return this.buildEnhancedKey(normalized);
  }

  /**
   * 入力データの正規化
   * UT-301-08 対応: キー正規化の一貫性
   */
  private normalizeInput(input: Partial<EnhancedCacheKey>): EnhancedCacheKey {
    // デフォルト値設定
    const location = input.location || {
      latitude: 35.6762,
      longitude: 139.6503,
      precision: 'high' as PrecisionLevel
    };

    const temporal = input.temporal || {
      date: '2024-01-01',
      seasonalContext: this.inferSeasonalContext('2024-01-01')
    };

    const variation = input.variation || {
      coordinateCoeff: 0.5,
      seasonalCoeff: 0.3,
      combinedEffect: 0.4
    };

    const metadata = input.metadata || {
      analysisType: 'both' as AnalysisType,
      precision: 2,
      version: this.VERSION
    };

    // Step 3: 基本検証のみ
    this.validateLocation(location);
    this.validateVariation(variation);

    return {
      location: this.normalizeLocation(location),
      temporal: this.normalizeTemporal(temporal),
      variation: this.normalizeVariation(variation),
      metadata
    };
  }

  /**
   * Enhanced Cache Key 構築
   */
  private buildEnhancedKey(normalized: EnhancedCacheKey): EnhancedCacheKey {
    // Step 3: 最小実装 - そのまま返す
    return normalized;
  }

  /**
   * 座標情報の正規化
   * UT-301-02 対応: 座標精度レベル処理
   */
  private normalizeLocation(location: EnhancedCacheKey['location']): EnhancedCacheKey['location'] {
    let precision: number;

    switch (location.precision) {
      case 'high':
        precision = 100; // 小数点2桁 (0.01度)
        break;
      case 'medium':
        precision = 10;  // 小数点1桁 (0.1度)
        break;
      case 'low':
        precision = 1;   // 整数 (1度)
        break;
    }

    return {
      latitude: Math.round(location.latitude * precision) / precision,
      longitude: Math.round(location.longitude * precision) / precision,
      precision: location.precision
    };
  }

  /**
   * 時間情報の正規化
   * UT-301-03, UT-301-05 対応: 季節コンテキスト・時間範囲処理
   */
  private normalizeTemporal(temporal: EnhancedCacheKey['temporal']): EnhancedCacheKey['temporal'] {
    // 日付正規化 (YYYY-M-D -> YYYY-MM-DD)
    let normalizedDate = temporal.date;
    if (!temporal.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const dateParts = temporal.date.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10);
        const day = parseInt(dateParts[2], 10);
        normalizedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // 季節コンテキスト推論（日付から）
    const inferredSeason = this.inferSeasonalContext(normalizedDate);

    return {
      date: normalizedDate,
      timeRange: temporal.timeRange,
      seasonalContext: temporal.seasonalContext || inferredSeason
    };
  }

  /**
   * 変動係数の正規化
   * UT-301-04 対応: 変動係数の量子化
   */
  private normalizeVariation(variation: EnhancedCacheKey['variation']): EnhancedCacheKey['variation'] {
    // 0.01精度での量子化 - より積極的な丸め
    const round = (val: number) => Math.round(val * 100) / 100;

    return {
      coordinateCoeff: round(variation.coordinateCoeff),
      seasonalCoeff: round(variation.seasonalCoeff),
      combinedEffect: round(variation.combinedEffect)
    };
  }

  /**
   * 季節コンテキスト推論
   */
  private inferSeasonalContext(date: string): SeasonalContext {
    const month = parseInt(date.split('-')[1], 10);

    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  /**
   * 座標検証
   * UT-301-07 対応: 無効入力エラーハンドリング
   */
  private validateLocation(location: EnhancedCacheKey['location']): void {
    if (isNaN(location.latitude) || isNaN(location.longitude)) {
      throw new Error('Invalid location coordinates');
    }

    if (location.latitude < -90 || location.latitude > 90) {
      throw new Error('Latitude out of range: must be between -90 and 90');
    }

    if (location.longitude < -180 || location.longitude > 180) {
      throw new Error('Longitude out of range: must be between -180 and 180');
    }
  }

  /**
   * 変動係数検証
   * UT-301-07 対応: 無効入力エラーハンドリング
   */
  private validateVariation(variation: EnhancedCacheKey['variation']): void {
    const { coordinateCoeff, seasonalCoeff, combinedEffect } = variation;

    if (coordinateCoeff < 0 || coordinateCoeff > 1 ||
        seasonalCoeff < 0 || seasonalCoeff > 1 ||
        combinedEffect < 0 || combinedEffect > 1) {
      throw new Error('Variation coefficients must be between 0 and 1');
    }
  }

  /**
   * キー文字列生成
   * UT-301-06 対応: メタデータバージョニング
   */
  generateKeyString(enhancedKey: EnhancedCacheKey): string {
    const location = `${enhancedKey.location.latitude},${enhancedKey.location.longitude},${enhancedKey.location.precision}`;

    let temporal = `${enhancedKey.temporal.date},${enhancedKey.temporal.seasonalContext}`;
    if (enhancedKey.temporal.timeRange) {
      temporal += `,${enhancedKey.temporal.timeRange.start}-${enhancedKey.temporal.timeRange.end}`;
    }

    const variation = `${enhancedKey.variation.coordinateCoeff},${enhancedKey.variation.seasonalCoeff},${enhancedKey.variation.combinedEffect}`;

    const metadata = `${enhancedKey.metadata.analysisType},${enhancedKey.metadata.precision},v${enhancedKey.metadata.version}`;

    return `${location}|${temporal}|${variation}|${metadata}`;
  }

  /**
   * キー一意性確保
   * UT-301-01, UT-301-06 対応
   */
  ensureUniqueness(key1: EnhancedCacheKey, key2: EnhancedCacheKey): boolean {
    const keyString1 = this.generateKeyString(key1);
    const keyString2 = this.generateKeyString(key2);
    return keyString1 !== keyString2;
  }
}
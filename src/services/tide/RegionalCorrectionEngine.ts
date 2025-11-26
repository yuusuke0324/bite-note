/**
 * TASK-103: 地域補正システム
 *
 * 潮汐の地域特性による補正計算エンジン
 * - 最寄りステーション検索アルゴリズム
 * - 振幅・位相補正計算
 * - 浅海・湾・海峡の共鳴効果適用
 * - 地域特性データベース活用
 */

import type {
  Coordinates,
  HarmonicConstant,
  RegionalDataRecord
} from '../../types/tide';
import { regionalDataService, type DistanceResult } from './RegionalDataService';
import { logger } from '../../lib/errors';

/** 補正オプション */
export interface CorrectionOptions {
  requireHighQuality?: boolean;
  maxDistance?: number;
  useShallowWaterEffect?: boolean;
  useResonanceEffect?: boolean;
  useStraitEffect?: boolean;
}

/** 浅海効果結果 */
export interface ShallowWaterEffect {
  constituent: string;
  amplitude: number;
  phase: number;
}

/** 共鳴効果結果 */
export interface ResonanceEffect {
  constituent: string;
  amplificationFactor: number;
  resonanceFrequency: number;
}

/** 海峡効果結果 */
export interface StraitEffect {
  constituent: string;
  phaseDelay: number;
  amplitudeAttenuation: number;
}

/**
 * 地域補正エンジン
 * 潮汐調和定数の地域特性による補正を実行
 */
export class RegionalCorrectionEngine {
  private readonly EARTH_RADIUS = 6371; // km

  /**
   * 座標間のハバーサイン距離を計算
   */
  async calculateDistance(point1: Coordinates, point2: Coordinates): Promise<number> {
    const lat1Rad = (point1.latitude * Math.PI) / 180;
    const lat2Rad = (point2.latitude * Math.PI) / 180;
    const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS * c;
  }

  /**
   * 最寄りステーションを検索
   */
  async findNearestStations(
    coordinates: Coordinates,
    options: { limit?: number; maxDistance?: number } = {}
  ): Promise<DistanceResult[]> {
    const { limit = 10, maxDistance = 200 } = options;

    return await regionalDataService.findNearestStations(coordinates, {
      limit,
      maxDistance,
      activeOnly: true
    });
  }

  /**
   * 指定座標の地域データを取得
   */
  async getRegionalData(coordinates: Coordinates): Promise<RegionalDataRecord | null> {
    return await regionalDataService.getBestRegionForCoordinates(coordinates);
  }

  /**
   * 座標の妥当性をチェック
   */
  private validateCoordinates(coordinates: Coordinates): void {
    if (coordinates.latitude < -90 || coordinates.latitude > 90) {
      throw new Error('Invalid coordinates: latitude must be between -90 and 90');
    }
    if (coordinates.longitude < -180 || coordinates.longitude > 180) {
      throw new Error('Invalid coordinates: longitude must be between -180 and 180');
    }
  }

  /**
   * 地域補正係数を適用
   */
  async applyCorrectionFactors(
    coordinates: Coordinates,
    harmonicConstants: HarmonicConstant[],
    options: CorrectionOptions = {}
  ): Promise<HarmonicConstant[]> {
    // 入力検証
    this.validateCoordinates(coordinates);

    if (!harmonicConstants || harmonicConstants.length === 0) {
      throw new Error('Harmonic constants cannot be empty');
    }

    const {
      requireHighQuality = false,
      maxDistance = 100,
      useShallowWaterEffect = true,
      useResonanceEffect = true,
      useStraitEffect = true
    } = options;

    try {
      // 最寄りの地域データを取得
      const nearestStations = await this.findNearestStations(coordinates, {
        limit: 1,
        maxDistance
      });

      if (nearestStations.length === 0) {
        // 地域データが見つからない場合はフォールバック（元の値を返す）
        return [...harmonicConstants];
      }

      const regionData = nearestStations[0].region;

      // データ品質チェック
      if (requireHighQuality && regionData.dataQuality !== 'high') {
        return [...harmonicConstants];
      }

      // 基本的な振幅・位相補正を適用
      let correctedConstants = this.applyBasicCorrection(harmonicConstants, regionData);

      // 浅海効果の適用
      if (useShallowWaterEffect) {
        correctedConstants = await this.applyShallowWaterEffect(
          coordinates,
          correctedConstants,
          regionData
        );
      }

      // 共鳴効果の適用
      if (useResonanceEffect) {
        correctedConstants = await this.applyResonanceEffect(
          coordinates,
          correctedConstants,
          regionData
        );
      }

      // 海峡効果の適用
      if (useStraitEffect) {
        correctedConstants = await this.applyStraitEffect(
          coordinates,
          correctedConstants,
          regionData
        );
      }

      // 元の調和定数のみに対して最終的な振幅係数の範囲チェック（0.5～2.0倍）
      const finalConstants = correctedConstants.map((constant, index) => {
        if (index < harmonicConstants.length) {
          // 元の調和定数に対してのみ範囲チェック
          const originalAmplitude = harmonicConstants[index].amplitude;
          const correctedAmplitude = constant.amplitude;
          const factor = correctedAmplitude / originalAmplitude;

          if (factor > 2.0 || factor < 0.5) {
            // 範囲外の場合は制限
            const clampedFactor = Math.max(0.5, Math.min(2.0, factor));
            return {
              ...constant,
              amplitude: originalAmplitude * clampedFactor
            };
          }
        }

        // 新しく追加された分潮（浅海効果など）はそのまま返す
        return constant;
      });

      return finalConstants;

    } catch (error) {
      logger.error('地域補正エラー', { error, component: 'RegionalCorrectionEngine', operation: 'applyCorrectionFactors' });
      // エラー時はフォールバック
      return [...harmonicConstants];
    }
  }

  /**
   * 基本的な振幅・位相補正を適用
   */
  private applyBasicCorrection(
    harmonicConstants: HarmonicConstant[],
    regionData: RegionalDataRecord
  ): HarmonicConstant[] {
    return harmonicConstants.map(constant => {
      let amplitudeFactor = 1.0;
      let phaseCorrection = 0.0;

      // 地域データに基づく分潮別補正（適切な基準値で正規化）
      switch (constant.constituent) {
        case 'M2':
          // M2の標準的な振幅値で正規化（日本沿岸平均値）
          amplitudeFactor = (regionData.m2Amplitude || 1.2) / 1.2;
          phaseCorrection = regionData.m2Phase || 0;
          break;
        case 'S2':
          // S2の標準的な振幅値で正規化
          amplitudeFactor = (regionData.s2Amplitude || 0.5) / 0.5;
          phaseCorrection = regionData.s2Phase || 0;
          break;
        default:
          // その他の分潮はM2係数を基準に補正
          amplitudeFactor = (regionData.m2Amplitude || 1.2) / 1.2;
          phaseCorrection = 0;
          break;
      }

      // 補正係数の範囲制限（0.5～2.0倍）
      amplitudeFactor = Math.max(0.5, Math.min(2.0, amplitudeFactor));

      // 位相の正規化（-180～+180度）
      let correctedPhase = constant.phase + phaseCorrection;
      while (correctedPhase > 180) correctedPhase -= 360;
      while (correctedPhase < -180) correctedPhase += 360;

      return {
        constituent: constant.constituent,
        amplitude: constant.amplitude * amplitudeFactor,
        phase: correctedPhase
      };
    });
  }

  /**
   * 浅海効果を計算・適用
   */
  async calculateShallowWaterEffect(
    coordinates: Coordinates,
    harmonicConstants: HarmonicConstant[]
  ): Promise<ShallowWaterEffect[]> {
    const regionData = await this.getRegionalData(coordinates);
    if (!regionData) return [];

    const shallowEffects: ShallowWaterEffect[] = [];

    // M2からM4を生成（浅海効果による倍音）
    const m2 = harmonicConstants.find(c => c.constituent === 'M2');
    const depth = (regionData as any).depth || 30; // デフォルト深度30m
    if (m2 && depth < 50) { // 50m以下で浅海効果
      const depthFactor = Math.max(0, 1 - depth / 50);

      shallowEffects.push({
        constituent: 'M4',
        amplitude: m2.amplitude * 0.1 * depthFactor,
        phase: m2.phase * 2
      });
    }

    // M2とS2からMS4を生成
    const s2 = harmonicConstants.find(c => c.constituent === 'S2');
    if (m2 && s2 && depth < 30) {
      const depthFactor = Math.max(0, 1 - depth / 30);

      shallowEffects.push({
        constituent: 'MS4',
        amplitude: Math.sqrt(m2.amplitude * s2.amplitude) * 0.05 * depthFactor,
        phase: m2.phase + s2.phase
      });
    }

    return shallowEffects;
  }

  /**
   * 浅海効果を適用
   */
  private async applyShallowWaterEffect(
    coordinates: Coordinates,
    harmonicConstants: HarmonicConstant[],
    __regionData: RegionalDataRecord
  ): Promise<HarmonicConstant[]> {
    const shallowEffects = await this.calculateShallowWaterEffect(coordinates, harmonicConstants);

    // 既存の調和定数に浅海効果で生成された高次分潮を追加
    const result = [...harmonicConstants];

    for (const effect of shallowEffects) {
      const existingIndex = result.findIndex(c => c.constituent === effect.constituent);
      if (existingIndex >= 0) {
        // 既存の場合は加算
        result[existingIndex].amplitude += effect.amplitude;
      } else {
        // 新規の場合は追加
        result.push({
          constituent: effect.constituent,
          amplitude: effect.amplitude,
          phase: effect.phase
        });
      }
    }

    return result;
  }

  /**
   * 共鳴効果を計算
   */
  async calculateResonanceEffect(
    coordinates: Coordinates,
    harmonicConstants: HarmonicConstant[]
  ): Promise<ResonanceEffect[]> {
    const regionData = await this.getRegionalData(coordinates);
    if (!regionData) return [];

    const resonanceEffects: ResonanceEffect[] = [];

    // 湾の固有周期に基づく共鳴効果
    const bayLength = (regionData as any).bayLength || 50; // デフォルト50km
    const depth = (regionData as any).depth || 20; // デフォルト20m

    // 湾の固有周期計算（Merian公式の簡略版）
    const waveSpeed = Math.sqrt(9.81 * depth); // 浅水波速度
    const naturalPeriod = 4 * bayLength * 1000 / waveSpeed / 3600; // 時間単位

    for (const __constituent of harmonicConstants) {
      let resonanceFreq = 0;

      switch (__constituent.constituent) {
        case 'M2': resonanceFreq = 12.42; break; // M2周期
        case 'S2': resonanceFreq = 12.00; break; // S2周期
        case 'K1': resonanceFreq = 23.93; break; // K1周期
        case 'O1': resonanceFreq = 25.82; break; // O1周期
        default: continue;
      }

      // 共鳴条件の判定（より広い範囲で共鳴効果を適用）
      const resonanceRatio = naturalPeriod / resonanceFreq;
      let amplificationFactor = 1.0;

      // 湾や内海では一般的に振幅が増大する傾向があるため、
      // ベースとなる増幅を適用
      const regionType = (regionData as any).regionType;
      const regionName = (regionData as any).regionName || regionData.name;
      if (regionType === 'bay' || regionName.includes('湾')) {
        amplificationFactor = 1.2; // 基本的な湾効果

        if (Math.abs(resonanceRatio - 1.0) < 0.3) {
          // 基本共鳴
          amplificationFactor = 1.8 + 0.7 * Math.exp(-Math.pow((resonanceRatio - 1.0) / 0.15, 2));
        } else if (Math.abs(resonanceRatio - 0.5) < 0.2) {
          // 1/2共鳴
          amplificationFactor = 1.4 + 0.4 * Math.exp(-Math.pow((resonanceRatio - 0.5) / 0.1, 2));
        } else if (Math.abs(resonanceRatio - 2.0) < 0.4) {
          // 2倍共鳴
          amplificationFactor = 1.3 + 0.3 * Math.exp(-Math.pow((resonanceRatio - 2.0) / 0.2, 2));
        }
      }

      resonanceEffects.push({
        constituent: __constituent.constituent,
        amplificationFactor,
        resonanceFrequency: resonanceFreq
      });
    }

    return resonanceEffects;
  }

  /**
   * 共鳴効果を適用
   */
  private async applyResonanceEffect(
    coordinates: Coordinates,
    harmonicConstants: HarmonicConstant[],
    __regionData: RegionalDataRecord
  ): Promise<HarmonicConstant[]> {
    const resonanceEffects = await this.calculateResonanceEffect(coordinates, harmonicConstants);

    return harmonicConstants.map(constant => {
      const effect = resonanceEffects.find(e => e.constituent === constant.constituent);
      if (effect) {
        return {
          ...constant,
          amplitude: constant.amplitude * effect.amplificationFactor
        };
      }
      return constant;
    });
  }

  /**
   * 海峡効果を計算
   */
  async calculateStraitEffect(
    coordinates: Coordinates,
    harmonicConstants: HarmonicConstant[]
  ): Promise<StraitEffect[]> {
    const regionData = await this.getRegionalData(coordinates);
    if (!regionData) return [];

    const straitEffects: StraitEffect[] = [];

    // 海峡効果（瀬戸内海などの狭い水路での効果）
    const regionType = (regionData as any).regionType;
    const regionName = (regionData as any).regionName || regionData.name;
    const isStraitRegion = regionType === 'strait' ||
                          regionName.includes('瀬戸内') ||
                          regionName.includes('海峡');

    if (isStraitRegion) {
      for (const constant of harmonicConstants) {
        const basePhaseDelay = this.calculatePhaseDelay(regionData, constant.constituent);
        const attenuationFactor = this.calculateAttenuation(regionData, constant.constituent);

        straitEffects.push({
          constituent: constant.constituent,
          phaseDelay: basePhaseDelay,
          amplitudeAttenuation: attenuationFactor
        });
      }
    }

    return straitEffects;
  }

  /**
   * 位相遅れを計算
   */
  private calculatePhaseDelay(regionData: RegionalDataRecord, constituent: string): number {
    const distance = (regionData as any).distanceFromOcean || 0;
    const depth = (regionData as any).depth || 20;

    // 水路での波速度
    const waveSpeed = Math.sqrt(9.81 * depth);

    // 伝播時間による位相遅れ（度）
    let frequency = 0;
    switch (constituent) {
      case 'M2': frequency = 28.984; break; // M2角周波数 (度/時)
      case 'S2': frequency = 30.000; break;
      case 'K1': frequency = 15.041; break;
      case 'O1': frequency = 13.943; break;
      default: frequency = 28.984; break;
    }

    const travelTime = distance * 1000 / waveSpeed / 3600; // 時間
    return frequency * travelTime; // 位相遅れ（度）
  }

  /**
   * 減衰を計算
   */
  private calculateAttenuation(regionData: RegionalDataRecord, __constituent: string): number {
    const distance = (regionData as any).distanceFromOcean || 0;
    const depth = (regionData as any).depth || 20;

    // 摩擦による減衰
    const frictionCoeff = 0.01; // 摩擦係数
    const attenuationPerKm = frictionCoeff / depth;

    return Math.exp(-attenuationPerKm * distance);
  }

  /**
   * 海峡効果を適用
   */
  private async applyStraitEffect(
    coordinates: Coordinates,
    harmonicConstants: HarmonicConstant[],
    __regionData: RegionalDataRecord
  ): Promise<HarmonicConstant[]> {
    const straitEffects = await this.calculateStraitEffect(coordinates, harmonicConstants);

    return harmonicConstants.map(constant => {
      const effect = straitEffects.find(e => e.constituent === constant.constituent);
      if (effect) {
        let correctedPhase = constant.phase + effect.phaseDelay;

        // 位相の正規化
        while (correctedPhase > 180) correctedPhase -= 360;
        while (correctedPhase < -180) correctedPhase += 360;

        return {
          ...constant,
          amplitude: constant.amplitude * effect.amplitudeAttenuation,
          phase: correctedPhase
        };
      }
      return constant;
    });
  }
}

// サービスのシングルトンインスタンス
export const regionalCorrectionEngine = new RegionalCorrectionEngine();
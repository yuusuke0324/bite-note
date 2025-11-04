/**
 * TASK-104: 潮汐分類システム
 *
 * 潮汐タイプと強度の分類・計算エンジン
 * - 月齢ベースの大潮・小潮判定
 * - 長潮・若潮・中潮の詳細分類
 * - 潮汐強度計算（0-100%）
 * - 近地点・遠地点効果考慮
 */

import type { TideType, MoonPhase } from '../../types/tide';
import { CelestialCalculator } from './CelestialCalculator';

/**
 * 潮汐分類エンジン
 * 月齢と月の距離に基づいて潮汐タイプと強度を計算
 */
export class TideClassificationEngine {
  private celestialCalculator: CelestialCalculator;

  constructor() {
    this.celestialCalculator = new CelestialCalculator();
  }

  /**
   * 月齢に基づく潮汐タイプの分類
   *
   * 天文学的事実に基づく月齢範囲：
   * - 新月（朔）: 0.00日
   * - 上弦: 7.38日
   * - 満月（望）: 14.77日
   * - 下弦: 22.15日
   * - 朔望月: 29.53日
   */
  classifyTideType(moonPhase: MoonPhase): TideType {
    // 入力検証
    this.validateMoonPhase(moonPhase);

    // 29.53の場合は0として扱う（新月）
    let age = moonPhase.age;
    if (age >= 29.53) {
      age = 0;
    }

    // 大潮：新月・満月の前後2.5日（潮位差が最大）
    // 満月周辺: 月齢12.0～17.5日
    // 新月周辺: 月齢0～2.5日、27.5～29.53日
    if ((age >= 0 && age <= 2.5) ||
        (age >= 27.5 && age < 29.53) ||
        (age >= 12.0 && age <= 17.5)) {
      return 'spring';
    }

    // 小潮：上弦・下弦の前後1.5日（潮位差が最小に近い）
    // 上弦周辺: 月齢5.5～9.0日
    // 下弦周辺: 月齢20.0～24.0日
    if ((age >= 5.5 && age <= 9.0) ||
        (age >= 20.0 && age <= 24.0)) {
      return 'neap';
    }

    // 長潮：小潮の後の期間（潮位差が最小で長く続く）
    // 月齢9.0～10.5日、24.0～25.5日
    if ((age > 9.0 && age <= 10.5) ||
        (age > 24.0 && age <= 25.5)) {
      return 'long';
    }

    // 若潮：長潮の後の期間（潮位差が次第に大きくなる）
    // 月齢10.5～12.0日、25.5～27.5日
    if ((age > 10.5 && age < 12.0) ||
        (age > 25.5 && age < 27.5)) {
      return 'young';
    }

    // 中潮：大潮と小潮の間の移行期
    // 月齢2.5～5.5日、17.5～20.0日
    return 'medium';
  }

  /**
   * 潮汐強度の計算（0-100%）
   * @param moonPhase 月相情報
   * @param moonDistance 月の地球からの距離（正規化値、1.0が平均距離）
   */
  calculateTideStrength(moonPhase: MoonPhase, moonDistance: number): number {
    // 入力検証
    this.validateMoonPhase(moonPhase);
    this.validateMoonDistance(moonDistance);

    const age = moonPhase.age;

    // 基本強度（月齢ベース）
    const baseStrength = this.calculateBaseStrength(age);

    // 月の距離による補正（距離の3乗に反比例）
    const distanceFactor = Math.pow(1.0 / moonDistance, 3);

    // 距離補正を適用（0.8～1.3の範囲に制限）
    const clampedDistanceFactor = Math.max(0.8, Math.min(1.3, distanceFactor));

    let strength = baseStrength * clampedDistanceFactor;

    // 季節補正（春分・秋分での増強効果）
    const seasonalFactor = this.calculateSeasonalFactor(new Date());
    strength *= seasonalFactor;

    // 0-100の範囲に正規化（近地点効果で100を超える場合も許容）
    return Math.max(0, Math.round(Math.min(120, strength)));
  }

  /**
   * 指定日時の月相を計算
   */
  calculateMoonPhaseForDate(date: Date): MoonPhase {
    return this.celestialCalculator.calculateMoonPhase(date);
  }

  /**
   * 月齢に基づく基本強度の計算
   */
  private calculateBaseStrength(age: number): number {
    // 新月・満月付近で最大、弦月付近で最小
    // コサイン関数を使用してスムーズな変化を実現

    // 新月（age=0）と満月（age=14.77）で最大
    const newMoonComponent = Math.cos((age / 29.53) * 2 * Math.PI);

    // 満月での強度を調整
    const fullMoonComponent = Math.cos(((age - 14.77) / 29.53) * 2 * Math.PI);

    // 2つの成分を組み合わせ
    const combined = Math.max(newMoonComponent, fullMoonComponent);

    // 0-100の範囲に正規化（最小10%、最大90%）
    // 弦月期でより低い値になるように調整
    return 10 + (combined + 1) * 40;
  }

  /**
   * 季節による補正因子の計算
   * 春分・秋分で太陽潮が強化される効果
   */
  private calculateSeasonalFactor(date: Date): number {
    const dayOfYear = this.getDayOfYear(date);

    // 春分（3/20頃 = 79日目）と秋分（9/22頃 = 265日目）
    const springEquinox = 79;
    const autumnEquinox = 265;

    // 春分からの距離
    const springDistance = Math.min(
      Math.abs(dayOfYear - springEquinox),
      Math.abs(dayOfYear - springEquinox - 365)
    );

    // 秋分からの距離
    const autumnDistance = Math.abs(dayOfYear - autumnEquinox);

    // 最も近い分点からの距離
    const nearestEquinoxDistance = Math.min(springDistance, autumnDistance);

    // 分点の前後30日で1.1倍、それ以外は1.0倍
    if (nearestEquinoxDistance <= 30) {
      return 1.0 + 0.1 * Math.exp(-nearestEquinoxDistance / 15);
    }

    return 1.0;
  }

  /**
   * 年の通算日を計算
   */
  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * 月相データの検証
   */
  private validateMoonPhase(moonPhase: MoonPhase): void {
    if (!moonPhase) {
      throw new Error('Moon phase is required');
    }
    if (typeof moonPhase.age !== 'number' || moonPhase.age < 0 || moonPhase.age > 29.53) {
      throw new Error('Invalid moon age: must be between 0 and 29.53');
    }
    if (typeof moonPhase.illumination !== 'number' ||
        moonPhase.illumination < 0 || moonPhase.illumination > 1) {
      throw new Error('Invalid illumination: must be between 0 and 1');
    }
  }

  /**
   * 月の距離データの検証
   */
  private validateMoonDistance(distance: number): void {
    if (typeof distance !== 'number' || distance <= 0) {
      throw new Error('Invalid moon distance: must be positive number');
    }
    if (distance < 0.8 || distance > 1.2) {
      console.warn(`Unusual moon distance: ${distance}. Expected range: 0.8-1.2`);
    }
  }
}

// サービスのシングルトンインスタンス
export const tideClassificationEngine = new TideClassificationEngine();
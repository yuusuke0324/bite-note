/**
 * 天体計算エンジン
 *
 * Zero API Dependency 潮汐システムの基盤となる天体計算
 * 月齢・太陽位置・月位置を高精度で計算
 */

import type { MoonPhase, CelestialPosition } from '../../types/tide';
import { normalizeAngle, julianDay, degreesToRadians } from './utils/celestial-utils';
import { logger } from '../../lib/errors';
import {
  SYNODIC_MONTH,
  J2000_EPOCH,
  JULIAN_CENTURY,
  SOLAR_MEAN_LONGITUDE,
  SOLAR_MEAN_ANOMALY,
  SOLAR_ECCENTRICITY as _SOLAR_ECCENTRICITY,
  SOLAR_CENTER_EQUATION,
  LUNAR_MEAN_LONGITUDE,
  LUNAR_MEAN_ELONGATION,
  LUNAR_MEAN_ANOMALY,
  LUNAR_ARGUMENT_OF_LATITUDE,
  LUNAR_DISTANCE,
  LUNAR_LONGITUDE_TERMS,
  LUNAR_LATITUDE_TERMS,
  LUNAR_DISTANCE_TERMS,
  MOON_PHASE_BOUNDARIES,
  CALCULATION_LIMITS
} from './constants/astronomical-constants';

export class CelestialCalculator {
  /**
   * 月齢と月相を計算
   * @param date 計算対象の日時
   * @returns 月齢情報
   */
  calculateMoonPhase(date: Date): MoonPhase {
    // 入力検証
    this.validateDate(date);

    // ユリウス日
    const jd = julianDay(date);

    // 年分数で精密なk値を計算
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

    // 年の正確な小数部を計算
    const dayOfYear = Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / (24 * 60 * 60 * 1000)) + 1;
    const daysInYear = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
    const yearFraction = year + (dayOfYear - 1 + hour / 24) / daysInYear;

    // J2000.0からの新月数を推定
    const k = Math.round((yearFraction - 2000) * 12.3685);

    // 現在日時を中心に前後の新月を探索
    let bestAge = Infinity;
    let foundValidAge = false;

    for (let offset = -2; offset <= 2; offset++) {
      const newMoonJD = this.calculateNewMoonJD(k + offset);
      const age = jd - newMoonJD;

      // 有効な月齢範囲（0 <= age < 朔望月）内で最小値を選択
      if (age >= 0 && age < SYNODIC_MONTH) {
        if (age < bestAge) {
          bestAge = age;
          foundValidAge = true;
        }
      }
    }

    // 有効な月齢が見つからない場合のフォールバック
    if (!foundValidAge) {
      // より広範囲で探索
      for (let offset = -5; offset <= 5; offset++) {
        const newMoonJD = this.calculateNewMoonJD(k + offset);
        const age = jd - newMoonJD;

        if (age >= 0 && age < SYNODIC_MONTH) {
          if (age < bestAge) {
            bestAge = age;
            foundValidAge = true;
          }
        }
      }
    }

    // 最終的に見つからない場合の安全処理
    if (!foundValidAge) {
      bestAge = 0;
    }

    // 月相判定
    const phase = this.determineMoonPhase(bestAge);

    // 照度計算
    const illumination = this.calculateMoonIllumination(bestAge);

    return {
      age: bestAge,
      phase,
      illumination
    };
  }

  /**
   * 太陽と月の天体位置を計算
   * @param date 計算対象の日時
   * @returns 天体位置情報
   */
  calculateCelestialPositions(date: Date): CelestialPosition {
    // 入力検証
    this.validateDate(date);

    const jd = julianDay(date);
    const T = (jd - J2000_EPOCH) / JULIAN_CENTURY;

    // 太陽位置計算（VSOP87簡略版・高精度化）
    const sunPosition = this.calculateSolarPosition(T);

    // 月位置計算（ELP2000簡略版・高精度化）
    const moonPosition = this.calculateLunarPosition(T);

    return {
      sun: sunPosition,
      moon: moonPosition
    };
  }

  /**
   * 月齢と天体位置を一括計算（最適化版）
   * @param date 計算対象の日時
   * @returns 月齢と天体位置の統合結果
   */
  calculateAll(date: Date): { moonPhase: MoonPhase; positions: CelestialPosition } {
    // 個別計算を呼び出し（最適化は後のRefactorフェーズで）
    const moonPhase = this.calculateMoonPhase(date);
    const positions = this.calculateCelestialPositions(date);

    return {
      moonPhase,
      positions
    };
  }

  /**
   * 入力日付の検証
   * @param date 検証対象の日付
   */
  private validateDate(date: Date): void {
    if (!date || isNaN(date.getTime())) {
      throw new Error('Invalid date provided');
    }

    const year = date.getUTCFullYear();
    if (year < CALCULATION_LIMITS.MIN_YEAR || year > CALCULATION_LIMITS.MAX_YEAR) {
      logger.warn(`Date is outside recommended range. Accuracy may be reduced.`, { component: 'CelestialCalculator', year, minYear: CALCULATION_LIMITS.MIN_YEAR, maxYear: CALCULATION_LIMITS.MAX_YEAR });
    }
  }

  /**
   * 月の照度を計算
   * @param age 月齢
   * @returns 照度（0-1）
   */
  private calculateMoonIllumination(age: number): number {
    // より正確な照度計算：位相角を考慮
    const normalizedAge = age / SYNODIC_MONTH;
    const phaseAngle = normalizedAge * 2 * Math.PI;

    // 月の満ち欠けは位相角の余弦に依存
    const illumination = (1 - Math.cos(phaseAngle)) / 2;

    // 0-1の範囲にクランプ
    return Math.max(0, Math.min(1, illumination));
  }

  /**
   * 月齢から月相フェーズを判定（改良版）
   * @param age 月齢（0-29.53）
   * @returns 月相フェーズ
   */
  private determineMoonPhase(age: number): MoonPhase['phase'] {
    // 定数を使用した月相分類
    if (age < MOON_PHASE_BOUNDARIES.NEW_MOON) return 'new';
    if (age < MOON_PHASE_BOUNDARIES.WAXING_CRESCENT) return 'waxing_crescent';
    if (age < MOON_PHASE_BOUNDARIES.FIRST_QUARTER) return 'first_quarter';
    if (age < MOON_PHASE_BOUNDARIES.WAXING_GIBBOUS) return 'waxing_gibbous';
    if (age < MOON_PHASE_BOUNDARIES.FULL_MOON) return 'full';
    if (age < MOON_PHASE_BOUNDARIES.WANING_GIBBOUS) return 'waning_gibbous';
    if (age < MOON_PHASE_BOUNDARIES.LAST_QUARTER) return 'last_quarter';
    if (age < MOON_PHASE_BOUNDARIES.WANING_CRESCENT) return 'waning_crescent';
    return 'new'; // 朔望月を超えた場合は新月に戻る
  }

  /**
   * 太陽位置計算（VSOP87理論簡略版・高精度化）
   * @param T J2000.0からの世紀数
   * @returns 太陽の地心経度・緯度
   */
  private calculateSolarPosition(T: number): { longitude: number; latitude: number } {
    // 太陽の平均経度（定数使用・高精度化）
    const L0 = SOLAR_MEAN_LONGITUDE.EPOCH +
               SOLAR_MEAN_LONGITUDE.RATE * T +
               SOLAR_MEAN_LONGITUDE.RATE2 * T * T;

    // 太陽の平均近点角（定数使用）
    const M = degreesToRadians(
      SOLAR_MEAN_ANOMALY.EPOCH +
      SOLAR_MEAN_ANOMALY.RATE * T +
      SOLAR_MEAN_ANOMALY.RATE2 * T * T
    );

    // 離心率（時間変化考慮・定数使用）
    // const __e = SOLAR_ECCENTRICITY.EPOCH +
    //           SOLAR_ECCENTRICITY.RATE * T +
    //           SOLAR_ECCENTRICITY.RATE2 * T * T;

    // 中心差（楕円軌道補正・定数使用）
    const C1 = (SOLAR_CENTER_EQUATION.C1.EPOCH +
                SOLAR_CENTER_EQUATION.C1.RATE * T +
                SOLAR_CENTER_EQUATION.C1.RATE2 * T * T) * Math.sin(M);

    const C2 = (SOLAR_CENTER_EQUATION.C2.EPOCH +
                SOLAR_CENTER_EQUATION.C2.RATE * T) * Math.sin(2 * M);

    const C3 = SOLAR_CENTER_EQUATION.C3.EPOCH * Math.sin(3 * M);

    const C = C1 + C2 + C3;

    // 真経度
    const trueLongitude = L0 + C;

    // 太陽の黄緯（簡略計算では0に近い）
    const latitude = 0;

    return {
      longitude: normalizeAngle(trueLongitude),
      latitude
    };
  }

  /**
   * 月位置計算（ELP2000理論簡略版・高精度化）
   * @param T J2000.0からの世紀数
   * @returns 月の地心経度・緯度・距離
   */
  private calculateLunarPosition(T: number): { longitude: number; latitude: number; distance: number } {
    // 月の基本引数（定数使用・高精度化）
    const L = this.calculateLunarMeanLongitude(T);
    const D = this.calculateLunarMeanElongation(T);
    const M = this.calculateSolarMeanAnomaly(T);
    const Mp = this.calculateLunarMeanAnomaly(T);
    const F = this.calculateLunarArgumentOfLatitude(T);

    // ラジアンに変換
    const Dr = degreesToRadians(D);
    const Mr = degreesToRadians(M);
    const Mpr = degreesToRadians(Mp);
    const Fr = degreesToRadians(F);

    // 主要項による補正（定数配列使用・高精度化）
    let deltaL = 0; // 経度補正
    let deltaB = 0; // 緯度補正
    let deltaR = 0; // 距離補正

    // L項：経度補正（定数配列使用）
    for (const [amplitude, d, m, mp, f] of LUNAR_LONGITUDE_TERMS) {
      const argument = d * Dr + m * Mr + mp * Mpr + f * Fr;
      deltaL += amplitude * Math.sin(argument);
    }

    // B項：緯度補正（定数配列使用）
    for (const [amplitude, d, m, mp, f] of LUNAR_LATITUDE_TERMS) {
      const argument = d * Dr + m * Mr + mp * Mpr + f * Fr;
      deltaB += amplitude * Math.sin(argument);
    }

    // R項：距離補正（定数配列使用）
    for (const [amplitude, d, m, mp, f] of LUNAR_DISTANCE_TERMS) {
      const argument = d * Dr + m * Mr + mp * Mpr + f * Fr;
      deltaR += amplitude * Math.cos(argument);
    }

    // 最終値
    const longitude = normalizeAngle(L + deltaL);
    const latitude = deltaB; // 月の緯度は±5度程度
    const distance = LUNAR_DISTANCE.MEAN + deltaR; // km単位で保持

    return {
      longitude,
      latitude,
      distance
    };
  }

  /**
   * 月の平均経度計算（高精度版）
   */
  private calculateLunarMeanLongitude(T: number): number {
    return LUNAR_MEAN_LONGITUDE.EPOCH +
           LUNAR_MEAN_LONGITUDE.RATE * T +
           LUNAR_MEAN_LONGITUDE.RATE2 * T * T +
           LUNAR_MEAN_LONGITUDE.RATE3 * T * T * T +
           LUNAR_MEAN_LONGITUDE.RATE4 * T * T * T * T;
  }

  /**
   * 月の平均距角計算（高精度版）
   */
  private calculateLunarMeanElongation(T: number): number {
    return LUNAR_MEAN_ELONGATION.EPOCH +
           LUNAR_MEAN_ELONGATION.RATE * T +
           LUNAR_MEAN_ELONGATION.RATE2 * T * T +
           LUNAR_MEAN_ELONGATION.RATE3 * T * T * T +
           LUNAR_MEAN_ELONGATION.RATE4 * T * T * T * T;
  }

  /**
   * 太陽の平均近点角計算（月位置用・高精度版）
   */
  private calculateSolarMeanAnomaly(T: number): number {
    return SOLAR_MEAN_ANOMALY.EPOCH +
           SOLAR_MEAN_ANOMALY.RATE * T +
           SOLAR_MEAN_ANOMALY.RATE2 * T * T;
  }

  /**
   * 月の平均近点角計算（高精度版）
   */
  private calculateLunarMeanAnomaly(T: number): number {
    return LUNAR_MEAN_ANOMALY.EPOCH +
           LUNAR_MEAN_ANOMALY.RATE * T +
           LUNAR_MEAN_ANOMALY.RATE2 * T * T +
           LUNAR_MEAN_ANOMALY.RATE3 * T * T * T +
           LUNAR_MEAN_ANOMALY.RATE4 * T * T * T * T;
  }

  /**
   * 月の平均昇交点引数計算（高精度版）
   */
  private calculateLunarArgumentOfLatitude(T: number): number {
    return LUNAR_ARGUMENT_OF_LATITUDE.EPOCH +
           LUNAR_ARGUMENT_OF_LATITUDE.RATE * T +
           LUNAR_ARGUMENT_OF_LATITUDE.RATE2 * T * T +
           LUNAR_ARGUMENT_OF_LATITUDE.RATE3 * T * T * T +
           LUNAR_ARGUMENT_OF_LATITUDE.RATE4 * T * T * T * T;
  }

  /**
   * 新月のユリウス日を計算（Meeus Chapter 49）
   * @param k 新月の順序番号
   * @returns 新月のユリウス日
   */
  private calculateNewMoonJD(k: number): number {
    const T = k / 1236.85; // k/1236.85がより正確

    // 平均新月時刻（Meeus式）- 2000年1月6日18:14 UTCを基準
    let JDE = 2451550.09766 +
              29.530588861 * k +
              0.00015437 * T * T -
              0.000000150 * T * T * T +
              0.00000000073 * T * T * T * T;

    // 太陽・月の平均近点角（度）
    const M = 2.5534 + 29.10535670 * k - 0.0000014 * T * T - 0.00000011 * T * T * T;
    const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T * T * T - 0.000000058 * T * T * T * T;

    // 月の平均距角（度）
    const F = 160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T * T * T + 0.000000011 * T * T * T * T;

    // 月の昇交点黄経（度）
    const Omega = 124.7746 - 1.56375588 * k + 0.0020672 * T * T + 0.00000215 * T * T * T;

    // ラジアン変換
    const Mr = degreesToRadians(M);
    const Mpr = degreesToRadians(Mp);
    const Fr = degreesToRadians(F);
    const Omegar = degreesToRadians(Omega);

    // 主要摂動項（Meeus Table 49.A）
    const corrections = [
      [-0.40720, Math.sin(Mpr)],
      [-0.01608, Math.sin(2 * Mpr)],
      [0.17241, Math.sin(Mr)],
      [-0.01739, Math.sin(Mpr - Mr)],
      [-0.01227, Math.sin(2 * Fr - Mpr)],
      [0.01039, Math.sin(2 * Fr)],
      [-0.00514, Math.sin(Mpr + Mr)],
      [-0.00339, Math.sin(2 * Mpr - Mr)],
      [0.00293, Math.sin(2 * Mr)],
      [-0.00249, Math.sin(2 * Mpr + Mr)],
      [-0.00111, Math.sin(Mpr - 2 * Fr)],
      [0.00109, Math.sin(2 * Fr + Mpr)],
      [-0.00057, Math.sin(Mpr - 2 * Mr)],
      [0.00056, Math.sin(Mpr + 2 * Mr)],
      [-0.00042, Math.sin(3 * Mpr)],
      [0.00042, Math.sin(2 * Fr + Mr)],
      [0.00038, Math.sin(Mr - Mpr)],
      [-0.00024, Math.sin(2 * Fr - Mr)],
      [-0.00017, Math.sin(Omegar)],
      [-0.00007, Math.sin(Mpr + 2 * Fr)],
      [0.00004, Math.sin(2 * Mpr - 2 * Fr)],
      [0.00004, Math.sin(3 * Mr)],
      [0.00003, Math.sin(Mpr + Mr - 2 * Fr)],
      [0.00003, Math.sin(2 * Mpr + 2 * Fr)],
      [-0.00003, Math.sin(Mpr + Mr + 2 * Fr)],
      [0.00003, Math.sin(Mpr - Mr + 2 * Fr)],
      [-0.00002, Math.sin(Mpr - Mr - 2 * Fr)],
      [-0.00002, Math.sin(3 * Mpr + Mr)],
      [0.00002, Math.sin(4 * Mpr)]
    ];

    // 摂動補正を適用
    for (const [amplitude, sinValue] of corrections) {
      JDE += amplitude * sinValue;
    }

    // 追加の高精度補正（E項、太陽視黄経の章動補正）
    const A1 = 299.77 + 0.107408 * k - 0.009173 * T * T;
    const A2 = 251.88 + 0.016321 * k;
    const A3 = 251.83 + 26.651886 * k;
    const A4 = 349.42 + 36.412478 * k;
    const A5 = 84.66 + 18.206239 * k;
    const A6 = 141.74 + 53.303771 * k;
    const A7 = 207.14 + 2.453732 * k;
    const A8 = 154.84 + 7.306860 * k;
    const A9 = 34.52 + 27.261239 * k;
    const A10 = 207.19 + 0.121824 * k;
    const A11 = 291.34 + 1.844379 * k;
    const A12 = 161.72 + 24.198154 * k;
    const A13 = 239.56 + 25.513099 * k;
    const A14 = 331.55 + 3.592518 * k;

    const additionalCorrections = [
      [0.000325, Math.sin(degreesToRadians(A1))],
      [0.000165, Math.sin(degreesToRadians(A2))],
      [0.000164, Math.sin(degreesToRadians(A3))],
      [0.000126, Math.sin(degreesToRadians(A4))],
      [0.000110, Math.sin(degreesToRadians(A5))],
      [0.000062, Math.sin(degreesToRadians(A6))],
      [0.000060, Math.sin(degreesToRadians(A7))],
      [0.000056, Math.sin(degreesToRadians(A8))],
      [0.000047, Math.sin(degreesToRadians(A9))],
      [0.000042, Math.sin(degreesToRadians(A10))],
      [0.000040, Math.sin(degreesToRadians(A11))],
      [0.000037, Math.sin(degreesToRadians(A12))],
      [0.000035, Math.sin(degreesToRadians(A13))],
      [0.000023, Math.sin(degreesToRadians(A14))]
    ];

    for (const [amplitude, sinValue] of additionalCorrections) {
      JDE += amplitude * sinValue;
    }

    return JDE;
  }

  /**
   * 太陽-月角度差の正規化
   * @param elongation 角度差（度）
   * @returns 正規化された角度差
   */
  /* private __normalizeElongation(elongation: number): number {
    let angle = elongation % 360;
    if (angle < 0) angle += 360;
    return angle;
  }

  // 位相補正の計算
  // @param elongation 太陽-月角度差
  // @param T 世紀数
  // @returns 位相補正（日数）
  //
  // private __calculatePhaseCorrection(elongation: number, T: number): number {
  //   // 高次項による微小補正（±0.01日程度）
  //   const elongationRad = degreesToRadians(elongation);
  //
  //   // 楕円軌道による位相のずれ補正
  //   const eccentricityCorrection = 0.01 * Math.sin(elongationRad);
  //
  //   // 月の昇交点移動による補正
  //   const nodalCorrection = 0.005 * Math.sin(elongationRad * 2) * T;
  //
  //   return eccentricityCorrection + nodalCorrection;
  // }
  */ // End of commented methods
}
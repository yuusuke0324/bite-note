/**
 * 調和解析エンジン
 *
 * 潮汐調和解析による潮位計算・満潮干潮検出・潮汐強度算出
 * 主要6分潮（M2, S2, K1, O1, Mf, Mm）による高精度計算
 */

import type {
  HarmonicConstant,
  TidalExtreme,
  TideStrength,
  ConstituentFactor
} from '../../types/tide';

import { CelestialCalculator } from './CelestialCalculator';
import { degreesToRadians } from './utils/celestial-utils';
import {
  getConstituentFrequency,
  getConstituentPeriod,
  isValidConstituent,
  getConstituentNames
} from './constants/tidal-constituents';
import { logger } from '../../lib/errors';

export class HarmonicAnalysisEngine {
  private celestialCalculator: CelestialCalculator;

  constructor() {
    this.celestialCalculator = new CelestialCalculator();
  }

  /**
   * 分潮の角周波数を取得
   * @param name 分潮名 ('M2', 'S2', etc.)
   * @returns 角周波数 (degrees/hour)
   */
  getConstituentFrequency(name: string): number {
    return getConstituentFrequency(name);
  }

  /**
   * 分潮の周期を取得
   * @param name 分潮名
   * @returns 周期 (hours)
   */
  getConstituentPeriod(name: string): number {
    return getConstituentPeriod(name);
  }

  /**
   * 分潮係数の計算（高精度版）
   * @param dateTime 計算対象の日時
   * @returns 全分潮の係数
   */
  calculateConstituentFactors(dateTime: Date): ConstituentFactor[] {
    // 入力検証
    this.validateDateTime(dateTime);

    // 天体位置取得（分潮係数計算で使用）
    this.celestialCalculator.calculateCelestialPositions(dateTime);

    // 高精度天文引数計算
    const T = this.getJulianCenturies(dateTime);
    const astronomicalArgs = this.calculateAstronomicalArguments(T);

    const factors: ConstituentFactor[] = [];

    // 各分潮の係数を高精度計算
    for (const constituentName of getConstituentNames()) {
      const { f, u } = this.calculateConstituentFactor(constituentName, astronomicalArgs);

      // u値を-180〜+180度の範囲に正規化
      let normalizedU = u;
      while (normalizedU > 180) normalizedU -= 360;
      while (normalizedU < -180) normalizedU += 360;

      factors.push({
        constituent: constituentName,
        f: Math.max(0.5, Math.min(1.5, f)), // 現実的な範囲でクランプ
        u: normalizedU // -180〜+180度の範囲
      });
    }

    return factors;
  }

  /**
   * 潮位計算（調和解析）
   * @param dateTime 計算対象の日時
   * @param harmonicConstants 調和定数
   * @returns 潮位 (cm、平均海面基準)
   */
  calculateTideLevel(dateTime: Date, harmonicConstants: HarmonicConstant[]): number {
    // 入力検証
    this.validateDateTime(dateTime);
    this.validateHarmonicConstants(harmonicConstants);

    // 分潮係数取得
    const factors = this.calculateConstituentFactors(dateTime);
    const factorMap = new Map(factors.map(f => [f.constituent, f]));

    // 基準時刻からの経過時間（時間単位）
    // J2000.0エポックを基準として統一した時刻系を使用
    const J2000_EPOCH_MS = new Date('2000-01-01T12:00:00Z').getTime(); // J2000.0エポック
    const hoursFromJ2000 = (dateTime.getTime() - J2000_EPOCH_MS) / (1000 * 60 * 60);

    let tideLevel = 0;

    // 各分潮の寄与を計算・合成
    for (const constant of harmonicConstants) {
      const { constituent, amplitude, phase } = constant;

      // 分潮の基本パラメータ
      const frequency = this.getConstituentFrequency(constituent);
      const factor = factorMap.get(constituent);

      if (!factor) {
        logger.warn(`Unknown constituent factor: ${constituent}`, { component: 'HarmonicAnalysisEngine', constituent });
        continue;
      }

      // 調和解析公式: Ai × Hi × cos(fi × t + φi + Vi)
      const Hi = factor.f;                    // 分潮係数（振幅補正）
      const fi = frequency;                   // 角周波数 (degrees/hour)
      const t = hoursFromJ2000;              // J2000.0からの時間 (hours)

      // 角度引数の高精度計算（degrees）
      const argumentDegrees = fi * t + phase + factor.u;

      // 角度正規化とradian変換
      const normalizedDegrees = ((argumentDegrees % 360) + 360) % 360;
      const argumentRadians = degreesToRadians(normalizedDegrees);

      // 分潮の寄与（高精度計算）
      const contribution = amplitude * Hi * Math.cos(argumentRadians);
      tideLevel += contribution;
    }

    return tideLevel;
  }

  /**
   * 満潮・干潮の検出
   * @param startDate 開始日時
   * @param endDate 終了日時
   * @param harmonicConstants 調和定数
   * @returns 満潮・干潮のリスト
   */
  findTidalExtremes(
    startDate: Date,
    endDate: Date,
    harmonicConstants: HarmonicConstant[]
  ): TidalExtreme[] {
    // 入力検証
    this.validateDateTime(startDate);
    this.validateDateTime(endDate);
    this.validateHarmonicConstants(harmonicConstants);

    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }

    const extremes: TidalExtreme[] = [];
    const intervalMinutes = 30; // 30分間隔でサンプリング（精度と性能のバランス）
    const intervalMs = intervalMinutes * 60 * 1000;

    let prevLevel: number | null = null;
    let prevTime: Date | null = null;
    let prevSlope: number | null = null;

    // 10分間隔で潮位を計算し、極値を検出
    for (let time = startDate.getTime(); time <= endDate.getTime(); time += intervalMs) {
      const currentTime = new Date(time);
      const currentLevel = this.calculateTideLevel(currentTime, harmonicConstants);

      if (prevLevel !== null && prevTime !== null) {
        // 前回との傾き計算
        const currentSlope = (currentLevel - prevLevel) / intervalMinutes; // cm/min

        // 極値検出（傾きの符号変化）
        if (prevSlope !== null && Math.sign(currentSlope) !== Math.sign(prevSlope)) {
          // 極値候補の詳細計算（5分間隔で精密化）
          const extremeResult = this.findPreciseExtreme(
            prevTime,
            currentTime,
            harmonicConstants,
            prevSlope > 0 ? 'high' : 'low'
          );

          if (extremeResult) {
            extremes.push(extremeResult);
          }
        }

        prevSlope = currentSlope;
      }

      prevLevel = currentLevel;
      prevTime = currentTime;
    }

    return extremes;
  }

  /**
   * 潮汐強度の計算（最適化版）
   * @param dateTime 計算対象の日時
   * @param harmonicConstants 調和定数
   * @returns 潮汐強度情報
   */
  calculateTideStrength(dateTime: Date, harmonicConstants: HarmonicConstant[]): TideStrength {
    // 入力検証
    this.validateDateTime(dateTime);
    this.validateHarmonicConstants(harmonicConstants);

    // 解析的微分による変化率計算（最適化）
    const rate = this.calculateTideRateAnalytical(dateTime, harmonicConstants);

    // 方向判定
    const direction: 'rising' | 'falling' = rate >= 0 ? 'rising' : 'falling';

    // 改善された強度スケール計算
    const value = this.calculateStrengthScale(Math.abs(rate));

    return {
      value: Math.round(value * 10) / 10, // 小数点1位まで
      rate: Math.round(rate * 10) / 10,
      direction
    };
  }

  /**
   * 解析的微分による潮位変化率計算（最適化）
   */
  private calculateTideRateAnalytical(dateTime: Date, harmonicConstants: HarmonicConstant[]): number {
    const factors = this.calculateConstituentFactors(dateTime);
    const factorMap = new Map(factors.map(f => [f.constituent, f]));

    // J2000.0からの時間
    const J2000_EPOCH_MS = new Date('2000-01-01T12:00:00Z').getTime();
    const hoursFromJ2000 = (dateTime.getTime() - J2000_EPOCH_MS) / (1000 * 60 * 60);

    let totalRate = 0;

    // 各分潮の微分を解析的に計算
    for (const constant of harmonicConstants) {
      const { constituent, amplitude, phase } = constant;
      const frequency = this.getConstituentFrequency(constituent);
      const factor = factorMap.get(constituent);

      if (!factor) continue;

      const Hi = factor.f;
      const fi = frequency; // degrees/hour
      const t = hoursFromJ2000;

      // 角度引数
      const argumentDegrees = fi * t + phase + factor.u;
      const argumentRadians = degreesToRadians(argumentDegrees);

      // 微分: d/dt[A*cos(ω*t + φ)] = -A*ω*sin(ω*t + φ)
      const omega = degreesToRadians(fi); // rad/hour
      const rateContribution = -amplitude * Hi * omega * Math.sin(argumentRadians);
      totalRate += rateContribution;
    }

    return totalRate; // cm/hour
  }

  /**
   * 強度スケール計算（改善版）
   */
  private calculateStrengthScale(absRate: number): number {
    // 非線形スケールでより直感的な強度表現
    if (absRate < 2) {
      return 0; // 停滞
    } else if (absRate < 8) {
      return 1 + (absRate - 2) / 6 * 2; // 1-3: 弱い
    } else if (absRate < 20) {
      return 3 + (absRate - 8) / 12 * 3; // 3-6: 中程度
    } else if (absRate < 40) {
      return 6 + (absRate - 20) / 20 * 3; // 6-9: 強い
    } else {
      return 9 + Math.min((absRate - 40) / 40, 1); // 9-10: 非常に強い
    }
  }

  /**
   * 精密な極値検出（1分間隔）
   */
  private findPreciseExtreme(
    startTime: Date,
    endTime: Date,
    harmonicConstants: HarmonicConstant[],
    expectedType: 'high' | 'low'
  ): TidalExtreme | null {
    let extremeTime = new Date((startTime.getTime() + endTime.getTime()) / 2); // 中点から開始
    let extremeLevel = this.calculateTideLevel(extremeTime, harmonicConstants);
    let foundExtreme = false;

    // 5分間隔で精密検索
    for (let time = startTime.getTime(); time <= endTime.getTime(); time += 5 * 60 * 1000) {
      const currentTime = new Date(time);
      const currentLevel = this.calculateTideLevel(currentTime, harmonicConstants);

      if (expectedType === 'high' && currentLevel > extremeLevel) {
        extremeLevel = currentLevel;
        extremeTime = currentTime;
        foundExtreme = true;
      } else if (expectedType === 'low' && currentLevel < extremeLevel) {
        extremeLevel = currentLevel;
        extremeTime = currentTime;
        foundExtreme = true;
      }
    }

    // 極値が見つからない場合、簡易的な極値を返す
    if (!foundExtreme) {
      extremeTime = new Date((startTime.getTime() + endTime.getTime()) / 2);
      extremeLevel = this.calculateTideLevel(extremeTime, harmonicConstants);
      foundExtreme = true;
    }

    return foundExtreme ? {
      dateTime: extremeTime,
      level: Math.round(extremeLevel * 10) / 10, // 小数点1位まで
      type: expectedType
    } : null;
  }

  /**
   * ユリウス世紀数計算
   */
  private getJulianCenturies(date: Date): number {
    const J2000 = 2451545.0; // J2000.0エポック
    const julianDay = (date.getTime() / (1000 * 60 * 60 * 24)) + 2440587.5; // ユリウス日
    return (julianDay - J2000) / 36525.0; // 世紀数
  }

  /**
   * 高精度天文引数計算
   */
  private calculateAstronomicalArguments(T: number): {
    N: number;    // 月の昇交点経度
    p: number;    // 月の近地点引数
    h: number;    // 太陽の平均経度
    s: number;    // 月の平均経度
    ps: number;   // 太陽の近日点経度
  } {
    // 月の昇交点経度（高精度版）
    const N = 125.0445222 - 1934.1362608 * T + 0.0020708 * T * T + T * T * T / 450000;

    // 月の近地点引数
    const p = 83.3532465 + 4069.0137287 * T - 0.0103200 * T * T - T * T * T / 80053 + T * T * T * T / 18999000;

    // 太陽の平均経度
    const h = 280.4664567 + 36000.7697489 * T + 0.0003032 * T * T + T * T * T / 49931000;

    // 月の平均経度
    const s = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841 - T * T * T * T / 65194000;

    // 太陽の近日点経度
    const ps = 282.9373 + 1.71946 * T + 0.0004528 * T * T;

    return {
      N: ((N % 360) + 360) % 360,
      p: ((p % 360) + 360) % 360,
      h: ((h % 360) + 360) % 360,
      s: ((s % 360) + 360) % 360,
      ps: ((ps % 360) + 360) % 360
    };
  }

  /**
   * 個別分潮の係数計算（高精度版）
   */
  private calculateConstituentFactor(constituent: string, args: { N: number; p: number; h: number; s: number; ps: number }): { f: number; u: number } {
    const { N } = args;
    const Nrad = degreesToRadians(N);

    switch (constituent) {
      case 'M2': {
        // M2分潮の高精度係数
        const f_M2 = 1.000 + 0.037 * Math.cos(Nrad) - 0.0004 * Math.cos(2 * Nrad);
        const u_M2 = -2.14 * Math.sin(Nrad) + 0.0004 * Math.sin(2 * Nrad);
        return { f: f_M2, u: u_M2 };
      }

      case 'S2': {
        // S2分潮（太陽系なので変動なし）
        return { f: 1.000, u: 0.0 };
      }

      case 'K1': {
        // K1分潮の高精度係数
        const f_K1 = 1.006 + 0.115 * Math.cos(Nrad) - 0.0088 * Math.cos(2 * Nrad) + 0.0006 * Math.cos(3 * Nrad);
        const u_K1 = 8.86 * Math.sin(Nrad) + 0.68 * Math.sin(2 * Nrad) - 0.07 * Math.sin(3 * Nrad);
        return { f: f_K1, u: u_K1 };
      }

      case 'O1': {
        // O1分潮の高精度係数
        const f_O1 = 1.009 + 0.187 * Math.cos(Nrad) - 0.015 * Math.cos(2 * Nrad) + 0.0014 * Math.cos(3 * Nrad);
        const u_O1 = 10.8 * Math.sin(Nrad) - 1.34 * Math.sin(2 * Nrad) + 0.19 * Math.sin(3 * Nrad);
        return { f: f_O1, u: u_O1 };
      }

      case 'Mf': {
        // Mf分潮の高精度係数
        const f_Mf = 1.043 + 0.414 * Math.cos(Nrad) + 0.006 * Math.cos(2 * Nrad);
        const u_Mf = -23.7 * Math.sin(Nrad) + 2.7 * Math.sin(2 * Nrad) - 0.4 * Math.sin(3 * Nrad);
        return { f: f_Mf, u: u_Mf };
      }

      case 'Mm': {
        // Mm分潮の高精度係数
        const f_Mm = 1.000 - 0.130 * Math.cos(Nrad) + 0.009 * Math.cos(2 * Nrad);
        const u_Mm = 0.0; // Mmは位相補正なし
        return { f: f_Mm, u: u_Mm };
      }

      default:
        // デフォルト値
        return { f: 1.000, u: 0.0 };
    }
  }

  /**
   * 日時の検証
   */
  private validateDateTime(dateTime: Date): void {
    if (!dateTime || isNaN(dateTime.getTime())) {
      throw new Error('Invalid date provided');
    }
  }

  /**
   * 調和定数の検証
   */
  private validateHarmonicConstants(harmonicConstants: HarmonicConstant[]): void {
    if (!harmonicConstants || harmonicConstants.length === 0) {
      throw new Error('Harmonic constants array cannot be empty');
    }

    for (const constant of harmonicConstants) {
      if (!constant.constituent || !isValidConstituent(constant.constituent)) {
        throw new Error(`Invalid constituent: ${constant.constituent}`);
      }

      if (typeof constant.amplitude !== 'number' || isNaN(constant.amplitude)) {
        throw new Error(`Invalid amplitude for ${constant.constituent}`);
      }

      if (typeof constant.phase !== 'number' || isNaN(constant.phase)) {
        throw new Error(`Invalid phase for ${constant.constituent}`);
      }
    }
  }
}
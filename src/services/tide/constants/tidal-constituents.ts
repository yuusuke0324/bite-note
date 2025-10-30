/**
 * 潮汐分潮定数
 *
 * 主要6分潮の角周波数、周期、分類を定義
 * IAU天文定数および現代調和解析理論に基づく標準値
 */

import type { TidalConstituentConstant } from '../../../types/tide';

// ==============================================
// 主要分潮定義
// ==============================================

/** 主要6分潮の基本定数 */
export const TIDAL_CONSTITUENTS: Record<string, TidalConstituentConstant> = {
  /** M2分潮 - 主太陰半日周潮 */
  M2: {
    name: 'M2',
    frequency: 28.984104,     // degrees/hour
    period: 12.4206012,       // hours (360/28.984104)
    type: 'semidiurnal'
  },

  /** S2分潮 - 主太陽半日周潮 */
  S2: {
    name: 'S2',
    frequency: 30.000000,     // degrees/hour
    period: 12.000000,        // hours (360/30.0)
    type: 'semidiurnal'
  },

  /** K1分潮 - 太陰太陽日周潮 */
  K1: {
    name: 'K1',
    frequency: 15.041069,     // degrees/hour
    period: 23.934470,        // hours (360/15.041069)
    type: 'diurnal'
  },

  /** O1分潮 - 主太陰日周潮 */
  O1: {
    name: 'O1',
    frequency: 13.943035,     // degrees/hour
    period: 25.819342,        // hours (360/13.943035)
    type: 'diurnal'
  },

  /** Mf分潮 - 太陰半月潮 */
  Mf: {
    name: 'Mf',
    frequency: 1.098033,      // degrees/hour
    period: 327.859729,       // hours (360/1.098033) ≈ 13.66日
    type: 'long_period'
  },

  /** Mm分潮 - 太陰月潮 */
  Mm: {
    name: 'Mm',
    frequency: 0.544375,      // degrees/hour
    period: 661.309534,       // hours (360/0.544375) ≈ 27.55日
    type: 'long_period'
  },

  /** M4分潮 - M2分潮の高次分潮（浅海効果） */
  M4: {
    name: 'M4',
    frequency: 57.968208,     // degrees/hour (M2の2倍: 28.984104 * 2)
    period: 6.2103006,        // hours (M2の半分: 12.4206012 / 2)
    type: 'quarter_diurnal'
  },

  /** MS4分潮 - M2+S2の高次分潮（浅海効果） */
  MS4: {
    name: 'MS4',
    frequency: 58.984104,     // degrees/hour (M2+S2: 28.984104 + 30.0)
    period: 6.103339,         // hours (360/58.984104)
    type: 'quarter_diurnal'
  }
};

// ==============================================
// 分潮アクセス関数
// ==============================================

/** 分潮の角周波数を取得 */
export function getConstituentFrequency(name: string): number {
  const constituent = TIDAL_CONSTITUENTS[name];
  if (!constituent) {
    throw new Error(`Unknown tidal constituent: ${name}`);
  }
  return constituent.frequency;
}

/** 分潮の周期を取得 */
export function getConstituentPeriod(name: string): number {
  const constituent = TIDAL_CONSTITUENTS[name];
  if (!constituent) {
    throw new Error(`Unknown tidal constituent: ${name}`);
  }
  return constituent.period;
}

/** 分潮の種別を取得 */
export function getConstituentType(name: string): 'semidiurnal' | 'diurnal' | 'long_period' | 'quarter_diurnal' {
  const constituent = TIDAL_CONSTITUENTS[name];
  if (!constituent) {
    throw new Error(`Unknown tidal constituent: ${name}`);
  }
  return constituent.type;
}

/** 全分潮名のリストを取得 */
export function getConstituentNames(): string[] {
  return Object.keys(TIDAL_CONSTITUENTS);
}

/** 分潮データを取得 */
export function getConstituent(name: string): TidalConstituentConstant {
  const constituent = TIDAL_CONSTITUENTS[name];
  if (!constituent) {
    throw new Error(`Unknown tidal constituent: ${name}`);
  }
  return { ...constituent }; // コピーを返す
}

// ==============================================
// 分潮係数計算用定数
// ==============================================

/** 分潮係数計算のための天文引数係数 */
export const CONSTITUENT_FACTORS = {
  /** M2分潮係数計算 */
  M2: {
    // f = 1.000 + 0.037 * cos(N) - 0.0004 * cos(2N)
    // u = -2.14 * sin(N) + 0.0004 * sin(2N)
    f_coeffs: [1.000, 0.037, -0.0004],
    u_coeffs: [-2.14, 0.0004]
  },

  /** S2分潮係数計算 */
  S2: {
    // f = 1.000 (太陽系なので変動なし)
    // u = 0.0 (太陽系なので変動なし)
    f_coeffs: [1.000],
    u_coeffs: [0.0]
  },

  /** K1分潮係数計算 */
  K1: {
    // f = 1.006 + 0.115 * cos(N) - 0.0088 * cos(2N)
    // u = 8.86 * sin(N) + 0.68 * sin(2N)
    f_coeffs: [1.006, 0.115, -0.0088],
    u_coeffs: [8.86, 0.68]
  },

  /** O1分潮係数計算 */
  O1: {
    // f = 1.009 + 0.187 * cos(N) - 0.015 * cos(2N)
    // u = 10.8 * sin(N) - 1.34 * sin(2N)
    f_coeffs: [1.009, 0.187, -0.015],
    u_coeffs: [10.8, -1.34]
  },

  /** Mf分潮係数計算 */
  Mf: {
    // f = 1.043 + 0.414 * cos(N)
    // u = -23.7 * sin(N) + 2.7 * sin(2N)
    f_coeffs: [1.043, 0.414],
    u_coeffs: [-23.7, 2.7]
  },

  /** Mm分潮係数計算 */
  Mm: {
    // f = 1.000 - 0.130 * cos(N)
    // u = 0.0
    f_coeffs: [1.000, -0.130],
    u_coeffs: [0.0]
  }
};

// ==============================================
// ユーティリティ関数
// ==============================================

/** 分潮が存在するかチェック */
export function isValidConstituent(name: string): boolean {
  return name in TIDAL_CONSTITUENTS;
}

/** 半日周分潮のリストを取得 */
export function getSemidiurnalConstituents(): string[] {
  return getConstituentNames().filter(name =>
    TIDAL_CONSTITUENTS[name].type === 'semidiurnal'
  );
}

/** 日周分潮のリストを取得 */
export function getDiurnalConstituents(): string[] {
  return getConstituentNames().filter(name =>
    TIDAL_CONSTITUENTS[name].type === 'diurnal'
  );
}

/** 長周期分潮のリストを取得 */
export function getLongPeriodConstituents(): string[] {
  return getConstituentNames().filter(name =>
    TIDAL_CONSTITUENTS[name].type === 'long_period'
  );
}

/** 四分日周分潮のリストを取得 */
export function getQuarterDiurnalConstituents(): string[] {
  return getConstituentNames().filter(name =>
    TIDAL_CONSTITUENTS[name].type === 'quarter_diurnal'
  );
}
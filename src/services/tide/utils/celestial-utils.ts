/**
 * 天体計算ユーティリティ関数
 *
 * 角度正規化、ユリウス日計算など基本的な天文計算を提供
 */

/**
 * 角度を0-360度の範囲に正規化
 * @param angle 入力角度（度）
 * @returns 0-360度の範囲に正規化された角度
 */
export function normalizeAngle(angle: number): number {
  let normalized = angle % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized;
}

/**
 * ユリウス日を計算
 * @param date 計算対象の日時
 * @returns ユリウス日
 */
export function julianDay(date: Date): number {
  // UTC時刻をユリウス日に変換
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // JavaScript月は0ベース
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();

  // 時分秒を日の小数部分に変換
  const dayFraction = (hour + minute / 60 + second / 3600) / 24;

  // ユリウス日計算（簡略版）
  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;

  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  return jdn + dayFraction - 0.5; // ユリウス日は正午基準
}

/**
 * 平均経度を計算
 * @param jd ユリウス日
 * @param period 周期（日）
 * @param epoch 元期での経度（度）
 * @returns 平均経度（度）
 */
export function meanLongitude(jd: number, period: number, epoch: number): number {
  const daysSinceJ2000 = jd - 2451545.0; // J2000.0からの経過日数
  const cycles = daysSinceJ2000 / period;
  const longitude = epoch + cycles * 360;
  return normalizeAngle(longitude);
}

/**
 * 度をラジアンに変換
 * @param degrees 度
 * @returns ラジアン
 */
export function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * ラジアンを度に変換
 * @param radians ラジアン
 * @returns 度
 */
export function radiansToDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}
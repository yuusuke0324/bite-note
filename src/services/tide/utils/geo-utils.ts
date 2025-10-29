/**
 * 地理計算ユーティリティ
 *
 * ハバーサイン公式・距離計算・地理的検索の最適化
 */

import type { Coordinates } from '../../../types/tide';

/** 地球の半径 (km) */
const EARTH_RADIUS_KM = 6371;

/** 度からラジアンへの変換係数 */
const DEG_TO_RAD = Math.PI / 180;

/** 距離計算結果 */
export interface DistanceCalculation {
  distanceKm: number;
  distanceMiles: number;
  bearingDegrees: number;
}

/** 地理的境界 */
export interface GeoBounds {
  northEast: Coordinates;
  southWest: Coordinates;
}

/** 地理的円形範囲 */
export interface GeoCircle {
  center: Coordinates;
  radiusKm: number;
}

/**
 * ハバーサイン公式による2点間の距離計算
 *
 * @param point1 開始座標
 * @param point2 終了座標
 * @returns 距離（キロメートル）
 */
export function calculateHaversineDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const lat1Rad = point1.latitude * DEG_TO_RAD;
  const lat2Rad = point2.latitude * DEG_TO_RAD;
  const deltaLatRad = (point2.latitude - point1.latitude) * DEG_TO_RAD;
  const deltaLonRad = (point2.longitude - point1.longitude) * DEG_TO_RAD;

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * 詳細な距離計算（距離・方位角含む）
 *
 * @param point1 開始座標
 * @param point2 終了座標
 * @returns 距離計算結果
 */
export function calculateDetailedDistance(
  point1: Coordinates,
  point2: Coordinates
): DistanceCalculation {
  const distanceKm = calculateHaversineDistance(point1, point2);
  const bearing = calculateBearing(point1, point2);

  return {
    distanceKm,
    distanceMiles: distanceKm * 0.621371, // km to miles
    bearingDegrees: bearing
  };
}

/**
 * 2点間の方位角計算
 *
 * @param point1 開始座標
 * @param point2 終了座標
 * @returns 方位角（度）0-360
 */
export function calculateBearing(
  point1: Coordinates,
  point2: Coordinates
): number {
  const lat1Rad = point1.latitude * DEG_TO_RAD;
  const lat2Rad = point2.latitude * DEG_TO_RAD;
  const deltaLonRad = (point2.longitude - point1.longitude) * DEG_TO_RAD;

  const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);

  const bearingRad = Math.atan2(y, x);
  const bearingDeg = bearingRad * (180 / Math.PI);

  // 0-360度の範囲に正規化
  return (bearingDeg + 360) % 360;
}

/**
 * 中心点から指定距離内の境界座標を計算
 *
 * @param center 中心座標
 * @param radiusKm 半径（km）
 * @returns 境界ボックス
 */
export function calculateBoundingBox(
  center: Coordinates,
  radiusKm: number
): GeoBounds {
  const latRad = center.latitude * DEG_TO_RAD;

  // 1度あたりの距離を計算
  const degLat = radiusKm / EARTH_RADIUS_KM * (180 / Math.PI);
  const degLon = radiusKm / EARTH_RADIUS_KM * (180 / Math.PI) / Math.cos(latRad);

  return {
    northEast: {
      latitude: center.latitude + degLat,
      longitude: center.longitude + degLon
    },
    southWest: {
      latitude: center.latitude - degLat,
      longitude: center.longitude - degLon
    }
  };
}

/**
 * 座標が指定した円形範囲内にあるかチェック
 *
 * @param point チェック対象の座標
 * @param circle 円形範囲
 * @returns 範囲内の場合true
 */
export function isPointInCircle(
  point: Coordinates,
  circle: GeoCircle
): boolean {
  const distance = calculateHaversineDistance(point, circle.center);
  return distance <= circle.radiusKm;
}

/**
 * 座標が指定した境界ボックス内にあるかチェック
 *
 * @param point チェック対象の座標
 * @param bounds 境界ボックス
 * @returns 範囲内の場合true
 */
export function isPointInBounds(
  point: Coordinates,
  bounds: GeoBounds
): boolean {
  return point.latitude >= bounds.southWest.latitude &&
         point.latitude <= bounds.northEast.latitude &&
         point.longitude >= bounds.southWest.longitude &&
         point.longitude <= bounds.northEast.longitude;
}

/**
 * 座標配列から最近接点を検索
 *
 * @param target 対象座標
 * @param candidates 候補座標配列
 * @returns 最近接点のインデックスと距離
 */
export function findNearestPoint(
  target: Coordinates,
  candidates: Coordinates[]
): { index: number; distance: number } | null {
  if (candidates.length === 0) return null;

  let minDistance = Infinity;
  let nearestIndex = -1;

  for (let i = 0; i < candidates.length; i++) {
    const distance = calculateHaversineDistance(target, candidates[i]);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  return { index: nearestIndex, distance: minDistance };
}

/**
 * 指定距離内の座標を高速フィルタリング
 *
 * @param center 中心座標
 * @param candidates 候補座標配列
 * @param maxDistanceKm 最大距離（km）
 * @returns フィルタされた座標とその距離
 */
export function filterPointsByDistance(
  center: Coordinates,
  candidates: { coordinates: Coordinates; data: unknown }[],
  maxDistanceKm: number
): Array<{ coordinates: Coordinates; data: unknown; distance: number }> {
  // まず境界ボックスで高速フィルタリング
  const bounds = calculateBoundingBox(center, maxDistanceKm);

  return candidates
    .filter(candidate => isPointInBounds(candidate.coordinates, bounds))
    .map(candidate => ({
      ...candidate,
      distance: calculateHaversineDistance(center, candidate.coordinates)
    }))
    .filter(item => item.distance <= maxDistanceKm)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * 座標の妥当性チェック
 *
 * @param coordinates チェック対象の座標
 * @returns 妥当な場合true
 */
export function isValidCoordinates(coordinates: Coordinates): boolean {
  return coordinates.latitude >= -90 &&
         coordinates.latitude <= 90 &&
         coordinates.longitude >= -180 &&
         coordinates.longitude <= 180 &&
         !isNaN(coordinates.latitude) &&
         !isNaN(coordinates.longitude);
}

/**
 * 度分秒形式から10進度に変換
 *
 * @param degrees 度
 * @param minutes 分
 * @param seconds 秒
 * @param direction 方向 ('N', 'S', 'E', 'W')
 * @returns 10進度
 */
export function dmsToDecimal(
  degrees: number,
  minutes: number,
  seconds: number,
  direction: 'N' | 'S' | 'E' | 'W'
): number {
  let decimal = degrees + minutes / 60 + seconds / 3600;

  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }

  return decimal;
}

/**
 * 10進度から度分秒形式に変換
 *
 * @param decimal 10進度
 * @param isLatitude 緯度の場合true、経度の場合false
 * @returns 度分秒オブジェクト
 */
export function decimalToDms(
  decimal: number,
  isLatitude: boolean
): {
  degrees: number;
  minutes: number;
  seconds: number;
  direction: 'N' | 'S' | 'E' | 'W';
} {
  const absDecimal = Math.abs(decimal);
  const degrees = Math.floor(absDecimal);
  const minutesFloat = (absDecimal - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;

  let direction: 'N' | 'S' | 'E' | 'W';
  if (isLatitude) {
    direction = decimal >= 0 ? 'N' : 'S';
  } else {
    direction = decimal >= 0 ? 'E' : 'W';
  }

  return { degrees, minutes, seconds, direction };
}

/**
 * 距離を人間に読みやすい形式で表示
 *
 * @param distanceKm 距離（km）
 * @param precision 小数点以下の桁数
 * @returns フォーマットされた距離文字列
 */
export function formatDistance(
  distanceKm: number,
  precision: number = 1
): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(precision)}km`;
  } else {
    return `${Math.round(distanceKm)}km`;
  }
}

/**
 * 方位角を方位文字列に変換
 *
 * @param bearingDegrees 方位角（度）
 * @returns 方位文字列
 */
export function bearingToCompass(bearingDegrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                     'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

  const index = Math.round(bearingDegrees / 22.5) % 16;
  return directions[index];
}
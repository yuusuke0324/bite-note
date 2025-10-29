/**
 * 地理計算ユーティリティ テスト
 *
 * ハバーサイン公式・距離計算・地理的検索の検証
 */

import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistance,
  calculateDetailedDistance,
  calculateBearing,
  calculateBoundingBox,
  isPointInCircle,
  isPointInBounds,
  findNearestPoint,
  filterPointsByDistance,
  isValidCoordinates,
  dmsToDecimal,
  decimalToDms,
  formatDistance,
  bearingToCompass
} from '../utils/geo-utils';
import type { Coordinates, GeoCircle, GeoBounds } from '../utils/geo-utils';

describe('地理計算ユーティリティ', () => {

  describe('ハバーサイン距離計算', () => {
    const tokyo: Coordinates = { latitude: 35.6762, longitude: 139.6503 };
    const yokohama: Coordinates = { latitude: 35.4437, longitude: 139.6380 };
    const osaka: Coordinates = { latitude: 34.6937, longitude: 135.5023 };

    it('GU-001: 東京-横浜間の距離計算精度', () => {
      const distance = calculateHaversineDistance(tokyo, yokohama);

      // 実際の距離は約26kmなので、25-30kmの範囲で検証
      expect(distance).toBeGreaterThan(25);
      expect(distance).toBeLessThan(30);
      expect(distance).toBeCloseTo(26, 0);
    });

    it('GU-002: 東京-大阪間の長距離計算', () => {
      const distance = calculateHaversineDistance(tokyo, osaka);

      // 実際の距離は約400kmなので、390-410kmの範囲で検証
      expect(distance).toBeGreaterThan(390);
      expect(distance).toBeLessThan(410);
    });

    it('GU-003: 同一座標での距離計算', () => {
      const distance = calculateHaversineDistance(tokyo, tokyo);
      expect(distance).toBe(0);
    });

    it('GU-004: 地球の反対側の距離計算', () => {
      const point1: Coordinates = { latitude: 0, longitude: 0 };
      const point2: Coordinates = { latitude: 0, longitude: 180 };

      const distance = calculateHaversineDistance(point1, point2);

      // 地球の半周なので約20015km
      expect(distance).toBeCloseTo(20015, -1);
    });
  });

  describe('詳細距離計算', () => {
    const tokyo: Coordinates = { latitude: 35.6762, longitude: 139.6503 };
    const yokohama: Coordinates = { latitude: 35.4437, longitude: 139.6380 };

    it('GU-005: 距離・方位角・マイル変換の統合計算', () => {
      const result = calculateDetailedDistance(tokyo, yokohama);

      expect(result.distanceKm).toBeGreaterThan(25);
      expect(result.distanceKm).toBeLessThan(30);
      expect(result.distanceMiles).toBeCloseTo(result.distanceKm * 0.621371, 1);
      expect(result.bearingDegrees).toBeGreaterThanOrEqual(0);
      expect(result.bearingDegrees).toBeLessThan(360);
    });
  });

  describe('方位角計算', () => {
    const center: Coordinates = { latitude: 35.6762, longitude: 139.6503 };

    it('GU-006: 真北方向の方位角', () => {
      const north: Coordinates = { latitude: 36.6762, longitude: 139.6503 };
      const bearing = calculateBearing(center, north);

      expect(bearing).toBeCloseTo(0, 0);
    });

    it('GU-007: 真東方向の方位角', () => {
      const east: Coordinates = { latitude: 35.6762, longitude: 140.6503 };
      const bearing = calculateBearing(center, east);

      expect(bearing).toBeCloseTo(90, 0);
    });

    it('GU-008: 真南方向の方位角', () => {
      const south: Coordinates = { latitude: 34.6762, longitude: 139.6503 };
      const bearing = calculateBearing(center, south);

      expect(bearing).toBeCloseTo(180, 0);
    });

    it('GU-009: 真西方向の方位角', () => {
      const west: Coordinates = { latitude: 35.6762, longitude: 138.6503 };
      const bearing = calculateBearing(center, west);

      expect(bearing).toBeCloseTo(270, 0);
    });
  });

  describe('境界ボックス計算', () => {
    const center: Coordinates = { latitude: 35.6762, longitude: 139.6503 };

    it('GU-010: 10km半径の境界ボックス計算', () => {
      const bounds = calculateBoundingBox(center, 10);

      expect(bounds.northEast.latitude).toBeGreaterThan(center.latitude);
      expect(bounds.northEast.longitude).toBeGreaterThan(center.longitude);
      expect(bounds.southWest.latitude).toBeLessThan(center.latitude);
      expect(bounds.southWest.longitude).toBeLessThan(center.longitude);

      // 境界の対称性を確認
      const latDiff = bounds.northEast.latitude - center.latitude;
      const latDiffSouth = center.latitude - bounds.southWest.latitude;
      expect(latDiff).toBeCloseTo(latDiffSouth, 3);
    });

    it('GU-011: 100km半径の大きな境界ボックス', () => {
      const bounds = calculateBoundingBox(center, 100);

      const latRange = bounds.northEast.latitude - bounds.southWest.latitude;
      const lonRange = bounds.northEast.longitude - bounds.southWest.longitude;

      expect(latRange).toBeGreaterThan(1); // 1度以上
      expect(lonRange).toBeGreaterThan(1); // 1度以上
    });
  });

  describe('円形範囲チェック', () => {
    const circle: GeoCircle = {
      center: { latitude: 35.6762, longitude: 139.6503 },
      radiusKm: 50
    };

    it('GU-012: 中心点は範囲内', () => {
      expect(isPointInCircle(circle.center, circle)).toBe(true);
    });

    it('GU-013: 範囲内の点の判定', () => {
      const nearbyPoint: Coordinates = { latitude: 35.7, longitude: 139.7 };
      expect(isPointInCircle(nearbyPoint, circle)).toBe(true);
    });

    it('GU-014: 範囲外の点の判定', () => {
      const farPoint: Coordinates = { latitude: 36.5, longitude: 140.5 };
      expect(isPointInCircle(farPoint, circle)).toBe(false);
    });
  });

  describe('境界ボックスチェック', () => {
    const bounds: GeoBounds = {
      northEast: { latitude: 36.0, longitude: 140.0 },
      southWest: { latitude: 35.0, longitude: 139.0 }
    };

    it('GU-015: 境界内の点の判定', () => {
      const insidePoint: Coordinates = { latitude: 35.5, longitude: 139.5 };
      expect(isPointInBounds(insidePoint, bounds)).toBe(true);
    });

    it('GU-016: 境界外の点の判定', () => {
      const outsidePoint: Coordinates = { latitude: 37.0, longitude: 141.0 };
      expect(isPointInBounds(outsidePoint, bounds)).toBe(false);
    });

    it('GU-017: 境界上の点の判定', () => {
      const boundaryPoint: Coordinates = { latitude: 36.0, longitude: 140.0 };
      expect(isPointInBounds(boundaryPoint, bounds)).toBe(true);
    });
  });

  describe('最近接点検索', () => {
    const target: Coordinates = { latitude: 35.6762, longitude: 139.6503 };
    const candidates: Coordinates[] = [
      { latitude: 35.7, longitude: 139.7 },      // 近い
      { latitude: 36.0, longitude: 140.0 },      // 中距離
      { latitude: 34.0, longitude: 138.0 },      // 遠い
      { latitude: 35.68, longitude: 139.66 }     // 最も近い
    ];

    it('GU-018: 最近接点の正確な検出', () => {
      const result = findNearestPoint(target, candidates);

      expect(result).not.toBeNull();
      expect(result!.index).toBe(3); // 最後の候補が最も近い
      expect(result!.distance).toBeLessThan(5); // 5km以内
    });

    it('GU-019: 空の候補配列でnull返却', () => {
      const result = findNearestPoint(target, []);
      expect(result).toBeNull();
    });
  });

  describe('距離フィルタリング', () => {
    const center: Coordinates = { latitude: 35.6762, longitude: 139.6503 };
    const candidatesWithData = [
      {
        coordinates: { latitude: 35.7, longitude: 139.7 },
        data: { name: 'Point1' }
      },
      {
        coordinates: { latitude: 36.0, longitude: 140.0 },
        data: { name: 'Point2' }
      },
      {
        coordinates: { latitude: 34.0, longitude: 138.0 },
        data: { name: 'Point3' }
      }
    ];

    it('GU-020: 50km以内のフィルタリング', () => {
      const results = filterPointsByDistance(center, candidatesWithData, 50);

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.distance <= 50)).toBe(true);

      // 距離順にソートされていることを確認
      for (let i = 1; i < results.length; i++) {
        expect(results[i].distance).toBeGreaterThanOrEqual(results[i-1].distance);
      }
    });

    it('GU-021: 極小範囲でのフィルタリング', () => {
      const results = filterPointsByDistance(center, candidatesWithData, 1);

      // 1km以内の点は存在しないはず
      expect(results.length).toBe(0);
    });
  });

  describe('座標妥当性チェック', () => {
    it('GU-022: 有効な座標の判定', () => {
      const validCoords: Coordinates = { latitude: 35.6762, longitude: 139.6503 };
      expect(isValidCoordinates(validCoords)).toBe(true);
    });

    it('GU-023: 無効な緯度の検出', () => {
      const invalidLat: Coordinates = { latitude: 91, longitude: 139.6503 };
      expect(isValidCoordinates(invalidLat)).toBe(false);

      const invalidLat2: Coordinates = { latitude: -91, longitude: 139.6503 };
      expect(isValidCoordinates(invalidLat2)).toBe(false);
    });

    it('GU-024: 無効な経度の検出', () => {
      const invalidLon: Coordinates = { latitude: 35.6762, longitude: 181 };
      expect(isValidCoordinates(invalidLon)).toBe(false);

      const invalidLon2: Coordinates = { latitude: 35.6762, longitude: -181 };
      expect(isValidCoordinates(invalidLon2)).toBe(false);
    });

    it('GU-025: NaN値の検出', () => {
      const nanCoords: Coordinates = { latitude: NaN, longitude: 139.6503 };
      expect(isValidCoordinates(nanCoords)).toBe(false);
    });
  });

  describe('度分秒変換', () => {
    it('GU-026: 度分秒から10進度への変換', () => {
      const decimal = dmsToDecimal(35, 40, 34.32, 'N');
      expect(decimal).toBeCloseTo(35.6762, 4);
    });

    it('GU-027: 南緯・西経の負の値変換', () => {
      const southLat = dmsToDecimal(35, 40, 34.32, 'S');
      const westLon = dmsToDecimal(139, 39, 1.08, 'W');

      expect(southLat).toBeCloseTo(-35.6762, 4);
      expect(westLon).toBeCloseTo(-139.6503, 4);
    });

    it('GU-028: 10進度から度分秒への変換', () => {
      const dms = decimalToDms(35.6762, true);

      expect(dms.degrees).toBe(35);
      expect(dms.minutes).toBe(40);
      expect(dms.seconds).toBeCloseTo(34.32, 1);
      expect(dms.direction).toBe('N');
    });

    it('GU-029: 負の値の度分秒変換', () => {
      const dms = decimalToDms(-139.6503, false);

      expect(dms.degrees).toBe(139);
      expect(dms.direction).toBe('W');
    });
  });

  describe('表示フォーマット', () => {
    it('GU-030: 距離の人間に読みやすい表示', () => {
      expect(formatDistance(0.5)).toBe('500m');
      expect(formatDistance(1.2)).toBe('1.2km');
      expect(formatDistance(15.7)).toBe('16km');
      expect(formatDistance(100.0)).toBe('100km');
    });

    it('GU-031: 方位角のコンパス表示', () => {
      expect(bearingToCompass(0)).toBe('N');
      expect(bearingToCompass(45)).toBe('NE');
      expect(bearingToCompass(90)).toBe('E');
      expect(bearingToCompass(135)).toBe('SE');
      expect(bearingToCompass(180)).toBe('S');
      expect(bearingToCompass(225)).toBe('SW');
      expect(bearingToCompass(270)).toBe('W');
      expect(bearingToCompass(315)).toBe('NW');
      expect(bearingToCompass(360)).toBe('N');
    });
  });

  describe('パフォーマンステスト', () => {
    it('GU-032: 大量座標での距離計算性能', () => {
      const center: Coordinates = { latitude: 35.6762, longitude: 139.6503 };
      const points: Coordinates[] = Array.from({ length: 1000 }, (_, i) => ({
        latitude: 35 + (i % 100) * 0.01,
        longitude: 139 + (i % 100) * 0.01
      }));

      const startTime = performance.now();

      points.forEach(point => {
        calculateHaversineDistance(center, point);
      });

      const duration = performance.now() - startTime;

      // 1000回の計算が50ms以内で完了することを確認
      expect(duration).toBeLessThan(50);
    });

    it('GU-033: 境界ボックスフィルタリングの性能', () => {
      const center: Coordinates = { latitude: 35.6762, longitude: 139.6503 };
      const candidates = Array.from({ length: 1000 }, (_, i) => ({
        coordinates: {
          latitude: 30 + (i % 100) * 0.1,
          longitude: 130 + (i % 100) * 0.1
        },
        data: { id: i }
      }));

      const startTime = performance.now();

      filterPointsByDistance(center, candidates, 100);

      const duration = performance.now() - startTime;

      // 境界ボックス最適化により高速処理が可能
      expect(duration).toBeLessThan(10);
    });
  });
});
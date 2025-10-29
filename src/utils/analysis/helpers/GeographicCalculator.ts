/**
 * TASK-102: 地理計算ヘルパー
 * 高精度な地理計算とTerrain補正機能
 */

import type { AnalysisCoordinates } from '../../../types/analysis';

export class GeographicCalculator {
  // 地球半径（WGS84楕円体）
  private static readonly EARTH_RADIUS_KM = 6371.0;
  private static readonly DEG_TO_RAD = Math.PI / 180;

  // 日本周辺の地理的特徴定義
  private static readonly GEOGRAPHIC_REGIONS = {
    TOKYO_BAY: {
      bounds: { latMin: 35.4, latMax: 35.8, lngMin: 139.4, lngMax: 140.0 },
      terrainFactor: 1.2,
      description: '東京湾（複雑な海岸線）'
    },
    OSAKA_BAY: {
      bounds: { latMin: 34.5, latMax: 34.8, lngMin: 135.0, lngMax: 135.5 },
      terrainFactor: 1.15,
      description: '大阪湾（中程度の複雑さ）'
    },
    OPEN_OCEAN: {
      bounds: { latMin: 20, latMax: 50, lngMin: 120, lngMax: 150 },
      terrainFactor: 1.0,
      description: '外洋（シンプルな海岸線）'
    }
  };

  /**
   * Great Circle Distance計算（高精度版）
   * ハバーシンの公式を使用
   */
  static calculateGreatCircleDistance(
    point1: AnalysisCoordinates,
    point2: AnalysisCoordinates
  ): number {
    const lat1Rad = this.toRadians(point1.lat);
    const lat2Rad = this.toRadians(point2.lat);
    const deltaLatRad = this.toRadians(point2.lat - point1.lat);
    const deltaLngRad = this.toRadians(point2.lng - point1.lng);

    const a = Math.sin(deltaLatRad / 2) ** 2 +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS_KM * c;
  }

  /**
   * Vincenty's formulae（より高精度、楕円体考慮）
   * 長距離の場合に使用
   */
  static calculateVincentyDistance(
    point1: AnalysisCoordinates,
    point2: AnalysisCoordinates
  ): number {
    // WGS84楕円体パラメータ
    const a = 6378137; // 長半径（メートル）
    const b = 6356752.314245; // 短半径（メートル）
    const f = 1 / 298.257223563; // 扁平率

    const lat1 = this.toRadians(point1.lat);
    const lat2 = this.toRadians(point2.lat);
    const deltaLng = this.toRadians(point2.lng - point1.lng);

    const U1 = Math.atan((1 - f) * Math.tan(lat1));
    const U2 = Math.atan((1 - f) * Math.tan(lat2));
    const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
    const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

    let lambda = deltaLng, lambdaP, iterLimit = 100;
    let cosSqAlpha, sinSigma, cos2SigmaM, cosSigma, sigma;

    do {
      const sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
      sinSigma = Math.sqrt((cosU2 * sinLambda) * (cosU2 * sinLambda) +
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda));

      if (sinSigma === 0) return 0; // 同一点

      cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
      sigma = Math.atan2(sinSigma, cosSigma);
      const sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
      cosSqAlpha = 1 - sinAlpha * sinAlpha;
      cos2SigmaM = cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha;

      if (isNaN(cos2SigmaM)) cos2SigmaM = 0; // 赤道線上

      const C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
      lambdaP = lambda;
      lambda = deltaLng + (1 - C) * f * sinAlpha *
        (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
    } while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);

    if (iterLimit === 0) {
      // フォールバック：ハバーシンの公式
      return this.calculateGreatCircleDistance(point1, point2);
    }

    const uSq = cosSqAlpha * (a * a - b * b) / (b * b);
    const A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    const B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
    const deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
      B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));

    const distance = b * A * (sigma - deltaSigma);
    return distance / 1000; // キロメートル変換
  }

  /**
   * 地形補正係数計算
   * 海岸線の複雑さや地理的特徴を考慮
   */
  static getTerrainCorrectionFactor(
    point1: AnalysisCoordinates,
    point2: AnalysisCoordinates
  ): number {
    const region1 = this.identifyGeographicRegion(point1);
    const region2 = this.identifyGeographicRegion(point2);

    // 両点が同じ地理区域にある場合
    if (region1 === region2) {
      return this.GEOGRAPHIC_REGIONS[region1].terrainFactor;
    }

    // 異なる地理区域の場合は平均値
    const factor1 = this.GEOGRAPHIC_REGIONS[region1].terrainFactor;
    const factor2 = this.GEOGRAPHIC_REGIONS[region2].terrainFactor;
    return (factor1 + factor2) / 2;
  }

  /**
   * 地理区域の識別
   */
  private static identifyGeographicRegion(point: AnalysisCoordinates): keyof typeof GeographicCalculator.GEOGRAPHIC_REGIONS {
    for (const [regionName, region] of Object.entries(this.GEOGRAPHIC_REGIONS)) {
      if (this.isPointInBounds(point, region.bounds)) {
        return regionName as keyof typeof GeographicCalculator.GEOGRAPHIC_REGIONS;
      }
    }
    return 'OPEN_OCEAN'; // デフォルト
  }

  /**
   * 点が指定範囲内にあるかチェック
   */
  private static isPointInBounds(
    point: AnalysisCoordinates,
    bounds: { latMin: number; latMax: number; lngMin: number; lngMax: number }
  ): boolean {
    return point.lat >= bounds.latMin && point.lat <= bounds.latMax &&
           point.lng >= bounds.lngMin && point.lng <= bounds.lngMax;
  }

  /**
   * 距離に応じた最適な計算方法の選択
   */
  static calculateOptimalDistance(
    point1: AnalysisCoordinates,
    point2: AnalysisCoordinates
  ): number {
    // 概算距離で計算方法を選択
    const roughDistance = this.calculateGreatCircleDistance(point1, point2);

    // 短距離（100km未満）はハバーシン、長距離はVincenty
    if (roughDistance < 100) {
      return this.calculateGreatCircleDistance(point1, point2);
    } else {
      return this.calculateVincentyDistance(point1, point2);
    }
  }

  /**
   * 方位角計算
   * point1からpoint2への方位角（度）
   */
  static calculateBearing(
    point1: AnalysisCoordinates,
    point2: AnalysisCoordinates
  ): number {
    const lat1Rad = this.toRadians(point1.lat);
    const lat2Rad = this.toRadians(point2.lat);
    const deltaLngRad = this.toRadians(point2.lng - point1.lng);

    const y = Math.sin(deltaLngRad) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLngRad);

    const bearingRad = Math.atan2(y, x);
    return (this.toDegrees(bearingRad) + 360) % 360;
  }

  /**
   * 中点計算
   */
  static calculateMidpoint(
    point1: AnalysisCoordinates,
    point2: AnalysisCoordinates
  ): AnalysisCoordinates {
    const lat1Rad = this.toRadians(point1.lat);
    const lat2Rad = this.toRadians(point2.lat);
    const deltaLngRad = this.toRadians(point2.lng - point1.lng);

    const bx = Math.cos(lat2Rad) * Math.cos(deltaLngRad);
    const by = Math.cos(lat2Rad) * Math.sin(deltaLngRad);

    const midLatRad = Math.atan2(
      Math.sin(lat1Rad) + Math.sin(lat2Rad),
      Math.sqrt((Math.cos(lat1Rad) + bx) * (Math.cos(lat1Rad) + bx) + by * by)
    );

    const midLngRad = this.toRadians(point1.lng) +
                      Math.atan2(by, Math.cos(lat1Rad) + bx);

    return {
      lat: this.toDegrees(midLatRad),
      lng: this.toDegrees(midLngRad)
    };
  }

  /**
   * 指定した距離と方位角で新しい点を計算
   */
  static calculateDestinationPoint(
    origin: AnalysisCoordinates,
    distanceKm: number,
    bearingDeg: number
  ): AnalysisCoordinates {
    const lat1Rad = this.toRadians(origin.lat);
    const lng1Rad = this.toRadians(origin.lng);
    const bearingRad = this.toRadians(bearingDeg);
    const angularDistance = distanceKm / this.EARTH_RADIUS_KM;

    const lat2Rad = Math.asin(
      Math.sin(lat1Rad) * Math.cos(angularDistance) +
      Math.cos(lat1Rad) * Math.sin(angularDistance) * Math.cos(bearingRad)
    );

    const lng2Rad = lng1Rad + Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1Rad),
      Math.cos(angularDistance) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
    );

    return {
      lat: this.toDegrees(lat2Rad),
      lng: ((this.toDegrees(lng2Rad) + 540) % 360) - 180 // 正規化
    };
  }

  /**
   * 度からラジアン変換
   */
  private static toRadians(degrees: number): number {
    return degrees * this.DEG_TO_RAD;
  }

  /**
   * ラジアンから度変換
   */
  private static toDegrees(radians: number): number {
    return radians / this.DEG_TO_RAD;
  }

  /**
   * 範囲チェック（ヘルパー）
   */
  static isInRange(value: number, range: [number, number]): boolean {
    return value >= range[0] && value <= range[1];
  }
}
/**
 * TASK-103: 地域補正システムのテスト
 *
 * 要件:
 * - 最寄りステーション検索アルゴリズム
 * - 振幅・位相補正計算
 * - 浅海・湾・海峡の共鳴効果適用
 * - 地域特性データベース活用
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RegionalCorrectionEngine } from '../RegionalCorrectionEngine';
import { regionalDataService } from '../RegionalDataService';
import type { Coordinates, HarmonicConstant, RegionalDataRecord } from '../../../types/tide';

// テスト用のモックデータ
const mockRegionalData: RegionalDataRecord[] = [
  {
    regionId: 'tokyo_bay',
    name: '東京湾',
    regionName: '東京湾',
    latitude: 35.655,
    longitude: 139.745,
    characteristics: '{}',
    coverageRadius: 50,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    dataQuality: 'high',
    m2Amplitude: 130.0,
    m2Phase: 10.0,
    s2Amplitude: 48.0,
    s2Phase: 35.0,
    k1Amplitude: 38.0,
    k1Phase: 125.0,
    o1Amplitude: 30.0,
    o1Phase: 185.0,
    depth: 25,
    bayLength: 60,
    regionType: 'bay',
    distanceFromOcean: 30
  },
  {
    regionId: 'osaka_bay',
    name: '大阪湾',
    regionName: '大阪湾',
    latitude: 34.6937,
    longitude: 135.5023,
    characteristics: '{}',
    coverageRadius: 40,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    dataQuality: 'high',
    m2Amplitude: 125.0,
    m2Phase: 15.0,
    s2Amplitude: 46.0,
    s2Phase: 40.0,
    k1Amplitude: 36.0,
    k1Phase: 130.0,
    o1Amplitude: 29.0,
    o1Phase: 190.0,
    depth: 30,
    bayLength: 40,
    regionType: 'bay',
    distanceFromOcean: 20
  },
  {
    regionId: 'hiroshima_bay',
    name: '広島湾',
    regionName: '広島湾',
    latitude: 34.3853,
    longitude: 132.4553,
    characteristics: '{}',
    coverageRadius: 35,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    dataQuality: 'medium',
    m2Amplitude: 140.0,
    m2Phase: 20.0,
    s2Amplitude: 52.0,
    s2Phase: 45.0,
    k1Amplitude: 40.0,
    k1Phase: 135.0,
    o1Amplitude: 32.0,
    o1Phase: 195.0,
    depth: 15,
    bayLength: 35,
    regionType: 'strait',
    distanceFromOcean: 50
  }
];

// RegionalDataServiceのモック
vi.mock('../RegionalDataService', () => ({
  regionalDataService: {
    findNearestStations: vi.fn(),
    getBestRegionForCoordinates: vi.fn()
  }
}));

describe('TASK-103: 地域補正システム', () => {
  let engine: RegionalCorrectionEngine;

  // テスト用の座標データ
  const tokyoBayCoords: Coordinates = { latitude: 35.655, longitude: 139.745 };
  const osakaBayCoords: Coordinates = { latitude: 34.6937, longitude: 135.5023 };
  const hiroshimaBayCoords: Coordinates = { latitude: 34.3853, longitude: 132.4553 };

  // テスト用の調和定数
  const baseHarmonicConstants: HarmonicConstant[] = [
    { constituent: 'M2', amplitude: 120.0, phase: 0.0 },
    { constituent: 'S2', amplitude: 45.0, phase: 30.0 },
    { constituent: 'K1', amplitude: 35.0, phase: 120.0 },
    { constituent: 'O1', amplitude: 28.0, phase: 180.0 },
    { constituent: 'Mf', amplitude: 8.0, phase: 45.0 },
    { constituent: 'Mm', amplitude: 6.0, phase: 90.0 }
  ];

  beforeEach(() => {
    engine = new RegionalCorrectionEngine();

    // モック関数の設定
    (regionalDataService.findNearestStations as any).mockImplementation(
      async (coordinates: Coordinates, options: any = {}) => {
        const { limit = 10, maxDistance = 200 } = options;

        // 距離計算
        const results = mockRegionalData.map(region => {
          const distance = calculateHaversineDistance(coordinates, {
            latitude: region.latitude,
            longitude: region.longitude
          });
          return { region, distance };
        });

        // 距離でソートし、条件でフィルタ
        return results
          .filter(result => result.distance <= maxDistance)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, limit);
      }
    );

    (regionalDataService.getBestRegionForCoordinates as any).mockImplementation(
      async (coordinates: Coordinates) => {
        // 最寄りの地域データを返す
        let nearest = mockRegionalData[0];
        let minDistance = Infinity;

        for (const region of mockRegionalData) {
          const distance = calculateHaversineDistance(coordinates, {
            latitude: region.latitude,
            longitude: region.longitude
          });
          if (distance < minDistance) {
            minDistance = distance;
            nearest = region;
          }
        }

        return nearest;
      }
    );
  });

  // ヘルパー関数: ハバーサイン距離計算
  function calculateHaversineDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371; // 地球の半径 (km)

    const lat1Rad = (point1.latitude * Math.PI) / 180;
    const lat2Rad = (point2.latitude * Math.PI) / 180;
    const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  describe('距離計算精度', () => {
    it('TC-R001: 最寄りステーション検索が正確な距離順で結果を返す', async () => {
      // 東京湾の近くだが完全に一致しない座標を使用
      const testCoords = { latitude: 35.65, longitude: 139.74 };
      const results = await engine.findNearestStations(testCoords, { limit: 5 });

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);

      // 距離の昇順でソートされていることを確認
      for (let i = 1; i < results.length; i++) {
        expect(results[i].distance).toBeGreaterThanOrEqual(results[i - 1].distance);
      }

      // 距離が現実的な範囲内であることを確認
      for (const result of results) {
        expect(result.distance).toBeGreaterThan(0);
        expect(result.distance).toBeLessThan(1000); // 1000km以内
      }
    });

    it('TC-R002: ハバーサイン距離計算の精度検証', async () => {
      // 東京-大阪間の距離をテスト（実際の距離: 約400km）
      const distance = await engine.calculateDistance(tokyoBayCoords, osakaBayCoords);

      expect(distance).toBeGreaterThan(350);
      expect(distance).toBeLessThan(450);
    });

    it('TC-R003: 同一座標での距離計算は0を返す', async () => {
      const distance = await engine.calculateDistance(tokyoBayCoords, tokyoBayCoords);

      expect(distance).toBe(0);
    });

    it('TC-R004: 最大距離フィルタが正常動作する', async () => {
      const maxDistance = 50; // 50km以内
      const results = await engine.findNearestStations(tokyoBayCoords, { maxDistance });

      expect(results.every(result => result.distance <= maxDistance)).toBe(true);
    });
  });

  describe('補正係数適用ロジック', () => {
    it('TC-R005: 振幅補正が正常に適用される', async () => {
      const correctedConstants = await engine.applyCorrectionFactors(
        tokyoBayCoords,
        baseHarmonicConstants
      );

      expect(correctedConstants).toBeDefined();
      expect(correctedConstants.length).toBeGreaterThanOrEqual(baseHarmonicConstants.length);

      // 補正後の振幅が元の値と異なることを確認
      const m2Base = baseHarmonicConstants.find(c => c.constituent === 'M2')!;
      const m2Corrected = correctedConstants.find(c => c.constituent === 'M2')!;

      expect(m2Corrected.amplitude).not.toBe(m2Base.amplitude);
      expect(m2Corrected.amplitude).toBeGreaterThan(0);
    });

    it('TC-R006: 位相補正が正常に適用される', async () => {
      const correctedConstants = await engine.applyCorrectionFactors(
        tokyoBayCoords,
        baseHarmonicConstants
      );

      // 位相が-180度から+180度の範囲内であることを確認
      for (const constant of correctedConstants) {
        expect(constant.phase).toBeGreaterThanOrEqual(-180);
        expect(constant.phase).toBeLessThanOrEqual(180);
      }
    });

    it('TC-R007: 分潮別補正係数の適切な適用', async () => {
      const correctedConstants = await engine.applyCorrectionFactors(
        tokyoBayCoords,
        baseHarmonicConstants
      );

      // 各分潮に対して適切な補正が適用されていることを確認
      const constituentNames = ['M2', 'S2', 'K1', 'O1', 'Mf', 'Mm'];

      for (const name of constituentNames) {
        const original = baseHarmonicConstants.find(c => c.constituent === name);
        const corrected = correctedConstants.find(c => c.constituent === name);

        expect(original).toBeDefined();
        expect(corrected).toBeDefined();
        expect(corrected!.constituent).toBe(name);
      }
    });

    it('TC-R008: 補正係数の現実的な範囲チェック', async () => {
      const correctedConstants = await engine.applyCorrectionFactors(
        tokyoBayCoords,
        baseHarmonicConstants
      );

      // 振幅補正係数が現実的な範囲内（0.5～2.0倍）であることを確認
      for (let i = 0; i < baseHarmonicConstants.length; i++) {
        const originalAmplitude = baseHarmonicConstants[i].amplitude;
        const correctedAmplitude = correctedConstants[i].amplitude;
        const factor = correctedAmplitude / originalAmplitude;

        expect(factor).toBeGreaterThan(0.5);
        expect(factor).toBeLessThanOrEqual(2.0);
      }
    });
  });

  describe('地域別精度検証', () => {
    it('TC-R009: 東京湾地域での補正精度', async () => {
      const correctedConstants = await engine.applyCorrectionFactors(
        tokyoBayCoords,
        baseHarmonicConstants
      );

      // 東京湾特有の補正が適用されていることを確認
      const m2Corrected = correctedConstants.find(c => c.constituent === 'M2')!;
      expect(m2Corrected).toBeDefined();

      // M2分潮の振幅が適切に補正されていることを確認
      expect(m2Corrected.amplitude).toBeGreaterThan(50);
      expect(m2Corrected.amplitude).toBeLessThan(300);
    });

    it('TC-R010: 大阪湾地域での補正精度', async () => {
      const correctedConstants = await engine.applyCorrectionFactors(
        osakaBayCoords,
        baseHarmonicConstants
      );

      expect(correctedConstants).toBeDefined();
      expect(correctedConstants.length).toBeGreaterThanOrEqual(6);

      // 大阪湾の地域特性が反映されていることを確認
      const regionData = await engine.getRegionalData(osakaBayCoords);
      expect(regionData).toBeDefined();
    });

    it('TC-R011: 瀬戸内海（広島湾）での補正精度', async () => {
      const correctedConstants = await engine.applyCorrectionFactors(
        hiroshimaBayCoords,
        baseHarmonicConstants
      );

      expect(correctedConstants).toBeDefined();

      // 瀬戸内海の浅海効果が適用されていることを確認
      const amplitudeSum = correctedConstants.reduce((sum, c) => sum + c.amplitude, 0);
      expect(amplitudeSum).toBeGreaterThan(0);
    });

    it('TC-R012: データ品質による補正精度の違い', async () => {
      // 高品質データ地域での補正
      const highQualityResult = await engine.applyCorrectionFactors(
        tokyoBayCoords,
        baseHarmonicConstants,
        { requireHighQuality: true }
      );

      // 任意品質データ地域での補正
      const anyQualityResult = await engine.applyCorrectionFactors(
        tokyoBayCoords,
        baseHarmonicConstants,
        { requireHighQuality: false }
      );

      expect(highQualityResult).toBeDefined();
      expect(anyQualityResult).toBeDefined();
    });

    it('TC-R013: 50箇所の主要釣り場対応の確認', async () => {
      // 主要釣り場の座標リスト（サンプル）
      const majorFishingSpots: Coordinates[] = [
        { latitude: 35.655, longitude: 139.745 }, // 東京湾
        { latitude: 34.6937, longitude: 135.5023 }, // 大阪湾
        { latitude: 34.3853, longitude: 132.4553 }, // 広島湾
        { latitude: 33.5904, longitude: 130.4017 }, // 博多湾
        { latitude: 26.2123, longitude: 127.6792 }, // 沖縄本島
      ];

      for (const coords of majorFishingSpots) {
        const correctedConstants = await engine.applyCorrectionFactors(coords, baseHarmonicConstants);

        expect(correctedConstants).toBeDefined();
        expect(correctedConstants.length).toBeGreaterThanOrEqual(6);

        // 全ての分潮で有効な補正が適用されていることを確認
        for (const constant of correctedConstants) {
          expect(constant.amplitude).toBeGreaterThan(0);
          expect(constant.phase).toBeGreaterThanOrEqual(-180);
          expect(constant.phase).toBeLessThanOrEqual(180);
        }
      }
    });
  });

  describe('浅海・湾・海峡の共鳴効果', () => {
    it('TC-R014: 浅海効果による高次分潮の生成', async () => {
      const shallowWaterEffect = await engine.calculateShallowWaterEffect(
        tokyoBayCoords,
        baseHarmonicConstants
      );

      expect(shallowWaterEffect).toBeDefined();

      // M4, MS4などの高次分潮が生成されていることを確認
      const hasHigherHarmonics = shallowWaterEffect.some(c =>
        c.constituent === 'M4' || c.constituent === 'MS4'
      );

      expect(hasHigherHarmonics).toBe(true);
    });

    it('TC-R015: 湾の共鳴効果による振幅増大', async () => {
      // 東京湾での共鳴効果をテスト
      const resonanceEffect = await engine.calculateResonanceEffect(
        tokyoBayCoords,
        baseHarmonicConstants
      );

      expect(resonanceEffect).toBeDefined();

      // 共鳴周波数付近での振幅増大を確認
      const m2Effect = resonanceEffect.find(c => c.constituent === 'M2');
      expect(m2Effect).toBeDefined();
      expect(m2Effect!.amplificationFactor).toBeGreaterThan(1.0);
    });

    it('TC-R016: 海峡効果による位相遅れ', async () => {
      // 瀬戸内海などの海峡効果をテスト
      const straitEffect = await engine.calculateStraitEffect(
        hiroshimaBayCoords,
        baseHarmonicConstants
      );

      expect(straitEffect).toBeDefined();

      // 海峡通過による位相遅れが適用されていることを確認
      const phaseDelays = straitEffect.map(c => c.phaseDelay);
      const hasPhaseDelay = phaseDelays.some(delay => Math.abs(delay) > 0);

      expect(hasPhaseDelay).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    it('TC-R017: 無効な座標でのエラーハンドリング', async () => {
      const invalidCoords: Coordinates = { latitude: 91, longitude: 181 };

      await expect(engine.applyCorrectionFactors(invalidCoords, baseHarmonicConstants))
        .rejects.toThrow('Invalid coordinates');
    });

    it('TC-R018: 空の調和定数配列でのエラーハンドリング', async () => {
      await expect(engine.applyCorrectionFactors(tokyoBayCoords, []))
        .rejects.toThrow('Harmonic constants cannot be empty');
    });

    it('TC-R019: 地域データが存在しない場合のフォールバック', async () => {
      const remoteCoords: Coordinates = { latitude: 89, longitude: 179 };

      const result = await engine.applyCorrectionFactors(remoteCoords, baseHarmonicConstants);

      // フォールバック処理により元の調和定数が返されることを確認
      expect(result).toEqual(baseHarmonicConstants);
    });
  });

  describe('パフォーマンステスト', () => {
    it('TC-R020: 補正計算が100ms以内で完了する', async () => {
      const startTime = performance.now();

      await engine.applyCorrectionFactors(tokyoBayCoords, baseHarmonicConstants);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
    });

    it('TC-R021: 大量データでの最寄りステーション検索性能', async () => {
      const startTime = performance.now();

      await engine.findNearestStations(tokyoBayCoords, { limit: 50 });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200);
    });
  });
});
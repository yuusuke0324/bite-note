/**
 * TASK-102: VariationEffectMeasurer テスト
 */

import { VariationEffectMeasurer } from '../../../utils/analysis/VariationEffectMeasurer';
import type { VariationEffectAnalysisInput } from '../../../types/analysis';

describe('VariationEffectMeasurer', () => {
  describe('座標変動効果測定', () => {
    test('距離に比例した座標変動効果', async () => {
      // Given: 基準点から異なる距離の測定点
      const baseLocation = { lat: 35.6762, lng: 139.6503 }; // 東京
      const testLocations = [
        { lat: 35.6762, lng: 139.7503 }, // 約8km東
        { lat: 35.5762, lng: 139.6503 }, // 約11km南
        { lat: 35.2139, lng: 139.6917 }  // 約50km南（横浜方向）
      ];

      // When: 座標変動効果を測定
      const result = await VariationEffectMeasurer.analyzeEffect({
        baseLocation,
        testLocations,
        dateRange: { start: '2024-01-01', end: '2024-01-07' },
        analysisType: 'coordinate'
      });

      // Then: 距離に応じた影響度の違い
      expect(result.coordinateEffect).toBeDefined();
      expect(result.coordinateEffect!.averageImpact).toBeGreaterThan(0);
      expect(result.coordinateEffect!.spatialRange).toBeGreaterThan(0);
      expect(result.combinedEffect.totalVariation).toBeGreaterThan(0);
    });

    test('最大影響度の検出', async () => {
      // Given: 極端に離れた座標での測定
      const extremeLocations = [
        { lat: 45.5152, lng: 141.3544 }, // 札幌
        { lat: 26.2124, lng: 127.6792 }  // 沖縄
      ];

      // When: 座標効果測定
      const result = await VariationEffectMeasurer.analyzeEffect({
        baseLocation: { lat: 35.6762, lng: 139.6503 },
        testLocations: extremeLocations,
        dateRange: { start: '2024-01-01', end: '2024-01-07' },
        analysisType: 'coordinate'
      });

      // Then: 顕著な最大影響度
      expect(result.coordinateEffect!.maxImpact).toBeGreaterThan(5); // 5%以上の影響
      expect(result.coordinateEffect!.spatialRange).toBeGreaterThan(500); // 500km以上の範囲
    });
  });

  describe('季節変動効果測定', () => {
    test('年間を通じた季節変動パターン', async () => {
      // Given: 年間の長期間
      const longTermPeriod = { start: '2024-01-01', end: '2024-12-31' };

      // When: 季節変動効果を測定
      const result = await VariationEffectMeasurer.analyzeEffect({
        baseLocation: { lat: 35.6762, lng: 139.6503 },
        testLocations: [{ lat: 35.6762, lng: 139.6503 }],
        dateRange: longTermPeriod,
        analysisType: 'seasonal'
      });

      // Then: 季節サイクルの検出
      expect(result.seasonalEffect).toBeDefined();
      expect(result.seasonalEffect!.seasonalCycle).toBeGreaterThan(0.5);
      expect(result.seasonalEffect!.averageImpact).toBeGreaterThan(0);
    });

    test('短期間での季節変動検出', async () => {
      // Given: 短期間（1ヶ月）
      const shortPeriod = { start: '2024-06-01', end: '2024-06-30' };

      // When: 季節効果分析
      const result = await VariationEffectMeasurer.analyzeEffect({
        baseLocation: { lat: 35.6762, lng: 139.6503 },
        testLocations: [{ lat: 35.6762, lng: 139.6503 }],
        dateRange: shortPeriod,
        analysisType: 'seasonal'
      });

      // Then: 短期間でも季節効果を検出
      expect(result.seasonalEffect!.seasonalCycle).toBeGreaterThanOrEqual(0);
      expect(result.seasonalEffect!.peakSeasonImpact).toBeGreaterThan(0);
    });
  });

  describe('複合効果測定', () => {
    test('座標・季節変動の複合効果', async () => {
      // Given: 地理的・時間的に多様な条件
      const diverseConditions: VariationEffectAnalysisInput = {
        baseLocation: { lat: 35.6762, lng: 139.6503 },
        testLocations: [
          { lat: 34.6937, lng: 135.5023 }, // 大阪
          { lat: 43.0642, lng: 141.3469 }  // 札幌
        ],
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
        analysisType: 'both'
      };

      // When: 複合効果測定
      const result = await VariationEffectMeasurer.analyzeEffect(diverseConditions);

      // Then: 複合効果の検出
      expect(result.coordinateEffect).toBeDefined();
      expect(result.seasonalEffect).toBeDefined();
      expect(result.combinedEffect.totalVariation).toBeGreaterThan(0);
      expect(typeof result.combinedEffect.synergy).toBe('number');
    });
  });

  describe('エラーハンドリング', () => {
    test('無効な座標でのフォールバック', async () => {
      // Given: 無効な座標
      const invalidInput: VariationEffectAnalysisInput = {
        baseLocation: { lat: 999, lng: 999 }, // 無効な座標
        testLocations: [{ lat: 35, lng: 139 }],
        dateRange: { start: '2024-01-01', end: '2024-01-07' },
        analysisType: 'coordinate'
      };

      // When: 分析実行（エラーなし）
      const result = await VariationEffectMeasurer.analyzeEffect(invalidInput);

      // Then: 安全なフォールバック
      expect(result.combinedEffect.totalVariation).toBeGreaterThanOrEqual(0);
    });

    test('無効な日付範囲でのフォールバック', async () => {
      // Given: 無効な日付範囲
      const invalidDateInput: VariationEffectAnalysisInput = {
        baseLocation: { lat: 35, lng: 139 },
        testLocations: [{ lat: 35, lng: 139 }],
        dateRange: { start: 'invalid-date', end: '2024-01-07' },
        analysisType: 'seasonal'
      };

      // When: 分析実行（エラーなし）
      const result = await VariationEffectMeasurer.analyzeEffect(invalidDateInput);

      // Then: 安全なフォールバック
      expect(result.combinedEffect).toBeDefined();
      expect(result.combinedEffect.totalVariation).toBeGreaterThanOrEqual(0);
    });
  });

  describe('距離計算の正確性', () => {
    test('既知の距離での計算精度', async () => {
      // Given: 東京-大阪間（約400km）
      const tokyoOsakaTest: VariationEffectAnalysisInput = {
        baseLocation: { lat: 35.6762, lng: 139.6503 }, // 東京
        testLocations: [{ lat: 34.6937, lng: 135.5023 }], // 大阪
        dateRange: { start: '2024-01-01', end: '2024-01-07' },
        analysisType: 'coordinate'
      };

      // When: 座標効果測定
      const result = await VariationEffectMeasurer.analyzeEffect(tokyoOsakaTest);

      // Then: 妥当な距離範囲での影響
      expect(result.coordinateEffect!.spatialRange).toBeGreaterThan(300);
      expect(result.coordinateEffect!.spatialRange).toBeLessThan(500);
    });
  });

  describe('統計的有意性検証（将来実装）', () => {
    test('統計的有意性検証のインターフェース', async () => {
      // Given: テスト結果
      const testResult = await VariationEffectMeasurer.analyzeEffect({
        baseLocation: { lat: 35, lng: 139 },
        testLocations: [{ lat: 36, lng: 140 }],
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
        analysisType: 'both'
      });

      // When: 統計的有意性検証
      const significance = await VariationEffectMeasurer.validateStatisticalSignificance(testResult);

      // Then: 検証結果が返される
      expect(typeof significance.pValue).toBe('number');
      expect(typeof significance.isSignificant).toBe('boolean');
      expect(significance.pValue).toBeGreaterThanOrEqual(0);
      expect(significance.pValue).toBeLessThanOrEqual(1);
    });
  });
});
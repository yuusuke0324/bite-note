/**
 * TASK-201: スマートキー生成エンジンのテスト
 * SmartKeyGenerator Test Suite
 *
 * Step 3/6: 最小実装 (RED Phase)
 * キー生成機能のテストケース実装
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SmartKeyGenerator } from '../../../services/tide/SmartKeyGenerator';
import type {
  EnhancedCacheKey,
  PrecisionLevel,
  SeasonalContext,
  AnalysisType
} from '../../../types/tide';

describe('TASK-201: Smart Key Generator', () => {
  let generator: SmartKeyGenerator;

  beforeEach(() => {
    generator = new SmartKeyGenerator();
  });

  describe('Enhanced Cache Key Generation', () => {
    it('should generate unique keys for different parameters', () => {
      const key1 = generator.generateEnhancedKey({
        location: { latitude: 35.67, longitude: 139.65, precision: 'high' },
        temporal: { date: '2024-01-01', seasonalContext: 'winter' },
        variation: { coordinateCoeff: 0.5, seasonalCoeff: 0.3, combinedEffect: 0.4 },
        metadata: { analysisType: 'both', precision: 2, version: '1.0' }
      });

      const key2 = generator.generateEnhancedKey({
        location: { latitude: 35.68, longitude: 139.65, precision: 'high' },
        temporal: { date: '2024-01-01', seasonalContext: 'winter' },
        variation: { coordinateCoeff: 0.5, seasonalCoeff: 0.3, combinedEffect: 0.4 },
        metadata: { analysisType: 'both', precision: 2, version: '1.0' }
      });

      const keyString1 = generator.generateKeyString(key1);
      const keyString2 = generator.generateKeyString(key2);

      expect(keyString1).not.toBe(keyString2);
      expect(keyString1.length).toBeGreaterThan(50);
      expect(keyString1.split('|')).toHaveLength(4);
    });

    it('should handle different precision levels correctly', () => {
      const highPrecisionKey = generator.generateEnhancedKey({
        location: { latitude: 35.678123, longitude: 139.653789, precision: 'high' }
      });

      const mediumPrecisionKey = generator.generateEnhancedKey({
        location: { latitude: 35.678123, longitude: 139.653789, precision: 'medium' }
      });

      const lowPrecisionKey = generator.generateEnhancedKey({
        location: { latitude: 35.678123, longitude: 139.653789, precision: 'low' }
      });

      const highKeyString = generator.generateKeyString(highPrecisionKey);
      const mediumKeyString = generator.generateKeyString(mediumPrecisionKey);
      const lowKeyString = generator.generateKeyString(lowPrecisionKey);

      // 高精度: 0.01度 (小数点2桁)
      expect(highKeyString).toContain('35.68,139.65');

      // 中精度: 0.1度 (小数点1桁)
      expect(mediumKeyString).toContain('35.7,139.7');

      // 低精度: 1度 (整数)
      expect(lowKeyString).toContain('36,140');
    });

    it('should normalize seasonal context consistently', () => {
      const winterKey = generator.generateEnhancedKey({
        temporal: { date: '2024-01-15', seasonalContext: 'winter' }
      });

      const springKey = generator.generateEnhancedKey({
        temporal: { date: '2024-04-15', seasonalContext: 'spring' }
      });

      const summerKey = generator.generateEnhancedKey({
        temporal: { date: '2024-07-15', seasonalContext: 'summer' }
      });

      const autumnKey = generator.generateEnhancedKey({
        temporal: { date: '2024-10-15', seasonalContext: 'autumn' }
      });

      const winterKeyString = generator.generateKeyString(winterKey);
      const springKeyString = generator.generateKeyString(springKey);
      const summerKeyString = generator.generateKeyString(summerKey);
      const autumnKeyString = generator.generateKeyString(autumnKey);

      expect(winterKeyString).toContain('winter');
      expect(springKeyString).toContain('spring');
      expect(summerKeyString).toContain('summer');
      expect(autumnKeyString).toContain('autumn');

      // 全て異なることを確認
      const keyStrings = [winterKeyString, springKeyString, summerKeyString, autumnKeyString];
      const uniqueKeyStrings = new Set(keyStrings);
      expect(uniqueKeyStrings.size).toBe(4);
    });

    it('should quantize variation coefficients appropriately', () => {
      const key1 = generator.generateEnhancedKey({
        variation: { coordinateCoeff: 0.501, seasonalCoeff: 0.502, combinedEffect: 0.503 }
      });

      const key2 = generator.generateEnhancedKey({
        variation: { coordinateCoeff: 0.502, seasonalCoeff: 0.503, combinedEffect: 0.504 }
      });

      const keyString1 = generator.generateKeyString(key1);
      const keyString2 = generator.generateKeyString(key2);

      // 0.01精度での量子化により同一キーになることを確認
      expect(keyString1).toBe(keyString2);
      expect(keyString1).toContain('0.5,0.5,0.5');
    });

    it('should handle time ranges correctly', () => {
      const timeRangeKey = generator.generateEnhancedKey({
        temporal: {
          date: '2024-01-01',
          timeRange: { start: '09:00', end: '17:00' },
          seasonalContext: 'winter'
        }
      });

      const keyString = generator.generateKeyString(timeRangeKey);
      expect(keyString).toContain('09:00-17:00');

      // 時間範囲なしのキーと比較
      const noTimeRangeKey = generator.generateEnhancedKey({
        temporal: {
          date: '2024-01-01',
          seasonalContext: 'winter'
        }
      });

      const noTimeRangeKeyString = generator.generateKeyString(noTimeRangeKey);
      expect(keyString).not.toBe(noTimeRangeKeyString);
    });

    it('should include metadata versioning', () => {
      const v1Key = generator.generateEnhancedKey({
        metadata: { analysisType: 'both', precision: 2, version: '1.0' }
      });

      const v2Key = generator.generateEnhancedKey({
        metadata: { analysisType: 'both', precision: 2, version: '2.0' }
      });

      const v1KeyString = generator.generateKeyString(v1Key);
      const v2KeyString = generator.generateKeyString(v2Key);

      expect(v1KeyString).toContain('v1.0');
      expect(v2KeyString).toContain('v2.0');
      expect(v1KeyString).not.toBe(v2KeyString);
    });

    it('should handle invalid inputs gracefully', () => {
      // 無効な座標
      expect(() => {
        generator.generateEnhancedKey({
          location: { latitude: NaN, longitude: 139.65, precision: 'high' }
        });
      }).toThrow('Invalid location coordinates');

      expect(() => {
        generator.generateEnhancedKey({
          location: { latitude: 35.67, longitude: NaN, precision: 'high' }
        });
      }).toThrow('Invalid location coordinates');

      // 範囲外座標
      expect(() => {
        generator.generateEnhancedKey({
          location: { latitude: 91, longitude: 139.65, precision: 'high' }
        });
      }).toThrow('Latitude out of range');

      expect(() => {
        generator.generateEnhancedKey({
          location: { latitude: -91, longitude: 139.65, precision: 'high' }
        });
      }).toThrow('Latitude out of range');

      expect(() => {
        generator.generateEnhancedKey({
          location: { latitude: 35.67, longitude: 181, precision: 'high' }
        });
      }).toThrow('Longitude out of range');

      expect(() => {
        generator.generateEnhancedKey({
          location: { latitude: 35.67, longitude: -181, precision: 'high' }
        });
      }).toThrow('Longitude out of range');

      // 無効な変動係数
      expect(() => {
        generator.generateEnhancedKey({
          variation: { coordinateCoeff: -1, seasonalCoeff: 0.5, combinedEffect: 0.4 }
        });
      }).toThrow('Variation coefficients must be between 0 and 1');

      expect(() => {
        generator.generateEnhancedKey({
          variation: { coordinateCoeff: 1.1, seasonalCoeff: 0.5, combinedEffect: 0.4 }
        });
      }).toThrow('Variation coefficients must be between 0 and 1');

      expect(() => {
        generator.generateEnhancedKey({
          variation: { coordinateCoeff: 0.5, seasonalCoeff: -0.1, combinedEffect: 0.4 }
        });
      }).toThrow('Variation coefficients must be between 0 and 1');

      expect(() => {
        generator.generateEnhancedKey({
          variation: { coordinateCoeff: 0.5, seasonalCoeff: 0.3, combinedEffect: 1.1 }
        });
      }).toThrow('Variation coefficients must be between 0 and 1');
    });

    it('should maintain key normalization consistency', () => {
      const unnormalizedInput = {
        location: { latitude: 35.678999, longitude: 139.653001, precision: 'high' as PrecisionLevel },
        temporal: { date: '2024-1-1', seasonalContext: 'winter' as SeasonalContext },
        variation: { coordinateCoeff: 0.50001, seasonalCoeff: 0.29999, combinedEffect: 0.4 }
      };

      // 同じ入力で複数回生成
      const key1 = generator.generateEnhancedKey(unnormalizedInput);
      const key2 = generator.generateEnhancedKey(unnormalizedInput);

      const keyString1 = generator.generateKeyString(key1);
      const keyString2 = generator.generateKeyString(key2);

      expect(keyString1).toBe(keyString2); // 一貫性確保
      expect(keyString1).toContain('35.68'); // 正規化確認
      expect(keyString1).toContain('2024-01-01'); // 日付正規化
      expect(keyString1).toContain('0.5,0.3,0.4'); // 変動係数正規化
    });
  });

  describe('Key Uniqueness and Consistency', () => {
    it('should ensure key uniqueness for different parameters', () => {
      const baseKey = generator.generateEnhancedKey({
        location: { latitude: 35.67, longitude: 139.65, precision: 'high' },
        temporal: { date: '2024-01-01', seasonalContext: 'winter' },
        variation: { coordinateCoeff: 0.5, seasonalCoeff: 0.3, combinedEffect: 0.4 },
        metadata: { analysisType: 'both', precision: 2, version: '1.0' }
      });

      // 座標違い
      const diffLocationKey = generator.generateEnhancedKey({
        location: { latitude: 35.68, longitude: 139.65, precision: 'high' },
        temporal: { date: '2024-01-01', seasonalContext: 'winter' },
        variation: { coordinateCoeff: 0.5, seasonalCoeff: 0.3, combinedEffect: 0.4 },
        metadata: { analysisType: 'both', precision: 2, version: '1.0' }
      });

      // 日付違い
      const diffDateKey = generator.generateEnhancedKey({
        location: { latitude: 35.67, longitude: 139.65, precision: 'high' },
        temporal: { date: '2024-01-02', seasonalContext: 'winter' },
        variation: { coordinateCoeff: 0.5, seasonalCoeff: 0.3, combinedEffect: 0.4 },
        metadata: { analysisType: 'both', precision: 2, version: '1.0' }
      });

      // 変動係数違い
      const diffVariationKey = generator.generateEnhancedKey({
        location: { latitude: 35.67, longitude: 139.65, precision: 'high' },
        temporal: { date: '2024-01-01', seasonalContext: 'winter' },
        variation: { coordinateCoeff: 0.6, seasonalCoeff: 0.3, combinedEffect: 0.4 },
        metadata: { analysisType: 'both', precision: 2, version: '1.0' }
      });

      expect(generator.ensureUniqueness(baseKey, diffLocationKey)).toBe(true);
      expect(generator.ensureUniqueness(baseKey, diffDateKey)).toBe(true);
      expect(generator.ensureUniqueness(baseKey, diffVariationKey)).toBe(true);
    });

    it('should handle date format normalization', () => {
      const formats = [
        '2024-1-1',
        '2024-01-01',
        '2024-1-01',
        '2024-01-1'
      ];

      const keys = formats.map(date =>
        generator.generateEnhancedKey({
          temporal: { date, seasonalContext: 'winter' }
        })
      );

      const keyStrings = keys.map(key => generator.generateKeyString(key));

      // すべて同じ正規化された文字列になることを確認
      const uniqueKeyStrings = new Set(keyStrings);
      expect(uniqueKeyStrings.size).toBe(1);
      expect(keyStrings[0]).toContain('2024-01-01');
    });

    it('should infer seasonal context from date when not provided', () => {
      const winterKey = generator.generateEnhancedKey({
        temporal: { date: '2024-01-15' } // seasonalContext省略
      });

      const springKey = generator.generateEnhancedKey({
        temporal: { date: '2024-04-15' }
      });

      const summerKey = generator.generateEnhancedKey({
        temporal: { date: '2024-07-15' }
      });

      const autumnKey = generator.generateEnhancedKey({
        temporal: { date: '2024-10-15' }
      });

      expect(winterKey.temporal.seasonalContext).toBe('winter');
      expect(springKey.temporal.seasonalContext).toBe('spring');
      expect(summerKey.temporal.seasonalContext).toBe('summer');
      expect(autumnKey.temporal.seasonalContext).toBe('autumn');
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary coordinates', () => {
      const boundaryKeys = [
        { latitude: -90, longitude: -180, precision: 'high' as PrecisionLevel },
        { latitude: 90, longitude: 180, precision: 'high' as PrecisionLevel },
        { latitude: 0, longitude: 0, precision: 'high' as PrecisionLevel }
      ];

      boundaryKeys.forEach(location => {
        const key = generator.generateEnhancedKey({ location });
        const keyString = generator.generateKeyString(key);
        expect(keyString).toBeDefined();
        expect(keyString.length).toBeGreaterThan(0);
      });
    });

    it('should handle boundary variation coefficients', () => {
      const boundaryVariations = [
        { coordinateCoeff: 0, seasonalCoeff: 0, combinedEffect: 0 },
        { coordinateCoeff: 1, seasonalCoeff: 1, combinedEffect: 1 },
        { coordinateCoeff: 0.5, seasonalCoeff: 0.5, combinedEffect: 0.5 }
      ];

      boundaryVariations.forEach(variation => {
        const key = generator.generateEnhancedKey({ variation });
        const keyString = generator.generateKeyString(key);
        expect(keyString).toBeDefined();
        expect(keyString.length).toBeGreaterThan(0);
      });
    });

    it('should handle all analysis types', () => {
      const analysisTypes: AnalysisType[] = ['coordinate', 'seasonal', 'both'];

      analysisTypes.forEach(analysisType => {
        const key = generator.generateEnhancedKey({
          metadata: { analysisType, precision: 2, version: '1.0' }
        });

        const keyString = generator.generateKeyString(key);
        expect(keyString).toContain(analysisType);
      });
    });

    it('should handle all precision levels', () => {
      const precisionLevels: PrecisionLevel[] = ['high', 'medium', 'low'];

      precisionLevels.forEach(precision => {
        const key = generator.generateEnhancedKey({
          location: { latitude: 35.678123, longitude: 139.653789, precision }
        });

        expect(key.location.precision).toBe(precision);

        const keyString = generator.generateKeyString(key);
        expect(keyString).toContain(precision);
      });
    });
  });
});
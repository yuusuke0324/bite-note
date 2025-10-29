/**
 * TASK-201: 拡張キャッシュシステムのテスト
 * EnhancedTideLRUCache Test Suite
 *
 * Step 3/6: 最小実装 (RED Phase)
 * 失敗するテストケースの実装
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnhancedTideLRUCache } from '../../../services/tide/EnhancedTideLRUCache';
import { SmartKeyGenerator } from '../../../services/tide/SmartKeyGenerator';
import type {
  EnhancedCacheKey,
  TideInfo,
  CacheStats,
  MatchingStrategy,
  AnalysisType,
  PrecisionLevel,
  SeasonalContext
} from '../../../types/tide';

describe('TASK-201: Enhanced Tide LRU Cache System', () => {
  let cache: EnhancedTideLRUCache;
  let keyGenerator: SmartKeyGenerator;

  // テスト用のTideInfoデータ生成
  const createTestTideInfo = (id: number = 1): TideInfo => ({
    location: { latitude: 35.6762, longitude: 139.6503 },
    date: new Date(`2024-01-${String(id).padStart(2, '0')}`),
    currentState: 'rising',
    currentLevel: 100 + id,
    tideType: 'spring',
    tideStrength: 80 + id,
    events: [],
    nextEvent: null,
    calculatedAt: new Date(),
    accuracy: 'high'
  });

  // テスト用のEnhancedCacheKey生成
  const createTestEnhancedKey = (overrides?: Partial<EnhancedCacheKey>): EnhancedCacheKey => ({
    location: {
      latitude: 35.6762,
      longitude: 139.6503,
      precision: 'high' as PrecisionLevel
    },
    temporal: {
      date: '2024-01-01',
      seasonalContext: 'winter' as SeasonalContext
    },
    variation: {
      coordinateCoeff: 0.5,
      seasonalCoeff: 0.3,
      combinedEffect: 0.4
    },
    metadata: {
      analysisType: 'both' as AnalysisType,
      precision: 2,
      version: '1.0'
    },
    ...overrides
  });

  beforeEach(() => {
    cache = new EnhancedTideLRUCache();
    keyGenerator = new SmartKeyGenerator();
  });

  afterEach(() => {
    cache.clear();
  });

  describe('UT-301: Enhanced Cache Key生成機能 (8テスト)', () => {
    describe('UT-301-01: 基本キー生成の正確性', () => {
      it('should generate unique keys for different parameters', () => {
        const key1 = keyGenerator.generateEnhancedKey({
          location: { latitude: 35.67, longitude: 139.65, precision: 'high' },
          temporal: { date: '2024-01-01', seasonalContext: 'winter' },
          variation: { coordinateCoeff: 0.5, seasonalCoeff: 0.3, combinedEffect: 0.4 },
          metadata: { analysisType: 'both', precision: 2, version: '1.0' }
        });

        const key2 = keyGenerator.generateEnhancedKey({
          location: { latitude: 35.68, longitude: 139.65, precision: 'high' }, // 異なる緯度
          temporal: { date: '2024-01-01', seasonalContext: 'winter' },
          variation: { coordinateCoeff: 0.5, seasonalCoeff: 0.3, combinedEffect: 0.4 },
          metadata: { analysisType: 'both', precision: 2, version: '1.0' }
        });

        const keyString1 = keyGenerator.generateKeyString(key1);
        const keyString2 = keyGenerator.generateKeyString(key2);

        expect(keyString1).not.toBe(keyString2);
        expect(keyString1.length).toBeGreaterThan(50); // 詳細キー情報
        expect(keyString1.split('|')).toHaveLength(4); // 4セクション構造
        expect(keyGenerator.ensureUniqueness(key1, key2)).toBe(true);
      });
    });

    describe('UT-301-02: 座標精度レベル処理', () => {
      it('should handle different precision levels correctly', () => {
        const highPrecisionKey = keyGenerator.generateEnhancedKey({
          location: { latitude: 35.678123, longitude: 139.653789, precision: 'high' }
        });

        const mediumPrecisionKey = keyGenerator.generateEnhancedKey({
          location: { latitude: 35.678123, longitude: 139.653789, precision: 'medium' }
        });

        const highKeyString = keyGenerator.generateKeyString(highPrecisionKey);
        const mediumKeyString = keyGenerator.generateKeyString(mediumPrecisionKey);

        // 高精度: 0.01度 (小数点2桁)
        expect(highKeyString).toContain('35.68,139.65');

        // 中精度: 0.1度 (小数点1桁)
        expect(mediumKeyString).toContain('35.7,139.7');
      });
    });

    describe('UT-301-03: 季節コンテキスト正規化', () => {
      it('should normalize seasonal context consistently', () => {
        // 異なる日付での季節判定
        const winterKey = keyGenerator.generateEnhancedKey({
          temporal: { date: '2024-01-15', seasonalContext: 'winter' }
        });

        const springKey = keyGenerator.generateEnhancedKey({
          temporal: { date: '2024-04-15', seasonalContext: 'spring' }
        });

        const winterKeyString = keyGenerator.generateKeyString(winterKey);
        const springKeyString = keyGenerator.generateKeyString(springKey);

        expect(winterKeyString).toContain('winter');
        expect(springKeyString).toContain('spring');
        expect(winterKeyString).not.toBe(springKeyString);
      });
    });

    describe('UT-301-04: 変動係数の量子化', () => {
      it('should quantize variation coefficients appropriately', () => {
        const key1 = keyGenerator.generateEnhancedKey({
          variation: { coordinateCoeff: 0.501, seasonalCoeff: 0.502, combinedEffect: 0.503 }
        });

        const key2 = keyGenerator.generateEnhancedKey({
          variation: { coordinateCoeff: 0.502, seasonalCoeff: 0.503, combinedEffect: 0.504 }
        });

        const keyString1 = keyGenerator.generateKeyString(key1);
        const keyString2 = keyGenerator.generateKeyString(key2);

        // 0.01精度での量子化により同一キーになることを確認
        expect(keyString1).toBe(keyString2);
      });
    });

    describe('UT-301-05: 時間範囲処理', () => {
      it('should handle time ranges correctly', () => {
        const timeRangeKey = keyGenerator.generateEnhancedKey({
          temporal: {
            date: '2024-01-01',
            timeRange: { start: '09:00', end: '17:00' },
            seasonalContext: 'winter'
          }
        });

        const keyString = keyGenerator.generateKeyString(timeRangeKey);
        expect(keyString).toContain('09:00-17:00');
      });
    });

    describe('UT-301-06: メタデータバージョニング', () => {
      it('should include metadata versioning', () => {
        const v1Key = keyGenerator.generateEnhancedKey({
          metadata: { analysisType: 'both', precision: 2, version: '1.0' }
        });

        const v2Key = keyGenerator.generateEnhancedKey({
          metadata: { analysisType: 'both', precision: 2, version: '2.0' }
        });

        const v1KeyString = keyGenerator.generateKeyString(v1Key);
        const v2KeyString = keyGenerator.generateKeyString(v2Key);

        expect(v1KeyString).toContain('v1.0');
        expect(v2KeyString).toContain('v2.0');
        expect(v1KeyString).not.toBe(v2KeyString);
      });
    });

    describe('UT-301-07: 無効入力エラーハンドリング', () => {
      it('should handle invalid inputs gracefully', () => {
        expect(() => {
          keyGenerator.generateEnhancedKey({
            location: { latitude: NaN, longitude: 139.65, precision: 'high' }
          });
        }).toThrow('Invalid location coordinates');

        expect(() => {
          keyGenerator.generateEnhancedKey({
            variation: { coordinateCoeff: -1, seasonalCoeff: 0.5, combinedEffect: 0.4 }
          });
        }).toThrow('Variation coefficients must be between 0 and 1');
      });
    });

    describe('UT-301-08: キー正規化の一貫性', () => {
      it('should maintain key normalization consistency', () => {
        const unnormalizedInput = {
          location: { latitude: 35.678999, longitude: 139.653001, precision: 'high' as PrecisionLevel },
          temporal: { date: '2024-1-1', seasonalContext: 'winter' as SeasonalContext },
          variation: { coordinateCoeff: 0.50001, seasonalCoeff: 0.29999, combinedEffect: 0.4 }
        };

        const key1 = keyGenerator.generateEnhancedKey(unnormalizedInput);
        const key2 = keyGenerator.generateEnhancedKey(unnormalizedInput);

        const keyString1 = keyGenerator.generateKeyString(key1);
        const keyString2 = keyGenerator.generateKeyString(key2);

        expect(keyString1).toBe(keyString2); // 一貫性確保
        expect(keyString1).toContain('35.68'); // 正規化確認
        expect(keyString1).toContain('2024-01-01'); // 日付正規化
      });
    });
  });

  describe('UT-302: スマートマッチング機能 (7テスト)', () => {
    describe('UT-302-01: 完全一致検索', () => {
      it('should find exact matches with highest priority', async () => {
        const exactKey = createTestEnhancedKey();
        const testData = createTestTideInfo();

        await cache.set(exactKey, testData);

        const result = await cache.findMatches(exactKey, {
          matchingStrategy: 'exact',
          maxResults: 1
        });

        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].confidence).toBe(1.0);
        expect(result.matches[0].matchType).toBe('exact');
      });
    });

    describe('UT-302-02: 地理的近接マッチング', () => {
      it('should find geographic proximity matches', async () => {
        const baseKey = createTestEnhancedKey({
          location: { latitude: 35.67, longitude: 139.65, precision: 'high' }
        });

        const nearbyKey = createTestEnhancedKey({
          location: { latitude: 35.68, longitude: 139.66, precision: 'high' }
        });

        await cache.set(baseKey, createTestTideInfo());

        const result = await cache.findMatches(nearbyKey, {
          matchingStrategy: 'proximity',
          geoTolerance: 2.0 // 2km tolerance
        });

        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].confidence).toBeGreaterThan(0.8);
        expect(result.matches[0].matchType).toBe('proximity');
      });
    });

    describe('UT-302-03: 時間的近似マッチング', () => {
      it('should handle temporal proximity matching', async () => {
        const baseKey = createTestEnhancedKey({
          temporal: { date: '2024-01-01', seasonalContext: 'winter' }
        });

        const nearKey = createTestEnhancedKey({
          temporal: { date: '2024-01-02', seasonalContext: 'winter' }
        });

        await cache.set(baseKey, createTestTideInfo());

        const result = await cache.findMatches(nearKey, {
          matchingStrategy: 'temporal',
          timeTolerance: 24 // 24 hours
        });

        expect(result.matches[0].confidence).toBeGreaterThan(0.9);
      });
    });

    describe('UT-302-04: 変動係数類似性マッチング', () => {
      it('should match similar variation coefficients', async () => {
        const baseKey = createTestEnhancedKey({
          variation: { coordinateCoeff: 0.5, seasonalCoeff: 0.3, combinedEffect: 0.4 }
        });

        const similarKey = createTestEnhancedKey({
          variation: { coordinateCoeff: 0.52, seasonalCoeff: 0.31, combinedEffect: 0.41 }
        });

        await cache.set(baseKey, createTestTideInfo());

        const result = await cache.findMatches(similarKey, {
          matchingStrategy: 'variation',
          variationTolerance: 0.05
        });

        expect(result.matches[0].confidence).toBeGreaterThan(0.85);
      });
    });

    describe('UT-302-05: 複合マッチング戦略', () => {
      it('should combine multiple matching strategies', async () => {
        const searchKey = createTestEnhancedKey();

        const result = await cache.findMatches(searchKey, {
          matchingStrategy: 'combined',
          weights: {
            exact: 1.0,
            proximity: 0.8,
            temporal: 0.6,
            variation: 0.7
          }
        });

        expect(result.matches).toBeInstanceOf(Array);
        expect(result.strategy).toBe('combined');
      });
    });

    describe('UT-302-06: マッチング信頼度計算', () => {
      it('should calculate confidence scores accurately', () => {
        // このテストは具体的な信頼度計算メソッドが実装されていないため失敗する
        // Step 4で実装予定
        expect(() => {
          // matcher.calculateConfidence() メソッドが存在しないためエラー
          const confidence = (cache as any).calculateConfidence?.({
            geoDistance: 1.5, // km
            timeDistance: 12, // hours
            variationDistance: 0.03
          });
          expect(confidence).toBeGreaterThan(0.7);
        }).toThrow();
      });
    });

    describe('UT-302-07: マッチング結果ソート', () => {
      it('should sort matches by confidence descending', async () => {
        // 複数のエントリを追加（実装されていないため失敗）
        const key1 = createTestEnhancedKey({ location: { latitude: 35.67, longitude: 139.65, precision: 'high' } });
        const key2 = createTestEnhancedKey({ location: { latitude: 35.68, longitude: 139.66, precision: 'high' } });
        const key3 = createTestEnhancedKey({ location: { latitude: 35.69, longitude: 139.67, precision: 'high' } });

        await cache.set(key1, createTestTideInfo(1));
        await cache.set(key2, createTestTideInfo(2));
        await cache.set(key3, createTestTideInfo(3));

        const searchKey = createTestEnhancedKey();
        const result = await cache.findMatches(searchKey, {
          matchingStrategy: 'combined',
          maxResults: 3
        });

        expect(result.matches).toHaveLength(3);
        expect(result.matches[0].confidence).toBeGreaterThanOrEqual(result.matches[1].confidence);
        expect(result.matches[1].confidence).toBeGreaterThanOrEqual(result.matches[2].confidence);
      });
    });
  });

  describe('UT-303: 基本キャッシュ機能テスト', () => {
    describe('基本操作', () => {
      it('should store and retrieve enhanced cache entries', async () => {
        const key = createTestEnhancedKey();
        const data = createTestTideInfo();

        await cache.set(key, data);
        const result = await cache.get(key);

        expect(result).toEqual(data);
        expect(cache.size()).toBe(1);
      });

      it('should handle cache miss correctly', async () => {
        const key = createTestEnhancedKey();
        const result = await cache.get(key);

        expect(result).toBeNull();
      });

      it('should update statistics correctly', async () => {
        const key = createTestEnhancedKey();
        const data = createTestTideInfo();

        // 初期統計
        let stats = cache.getStats();
        expect(stats.hitCount).toBe(0);
        expect(stats.missCount).toBe(0);

        // データ保存
        await cache.set(key, data);

        // キャッシュヒット
        await cache.get(key);
        stats = cache.getStats();
        expect(stats.hitCount).toBe(1);

        // キャッシュミス
        const missingKey = createTestEnhancedKey({ location: { latitude: 99.99, longitude: 99.99, precision: 'high' } });
        await cache.get(missingKey);
        stats = cache.getStats();
        expect(stats.missCount).toBe(1);
      });
    });

    describe('キャッシュクリア', () => {
      it('should clear all cache entries', async () => {
        const key1 = createTestEnhancedKey();
        const key2 = createTestEnhancedKey({ location: { latitude: 35.68, longitude: 139.66, precision: 'high' } });

        await cache.set(key1, createTestTideInfo(1));
        await cache.set(key2, createTestTideInfo(2));

        expect(cache.size()).toBe(2);

        cache.clear();

        expect(cache.size()).toBe(0);
        const stats = cache.getStats();
        expect(stats.totalEntries).toBe(0);
        expect(stats.hitCount).toBe(0);
        expect(stats.missCount).toBe(0);
      });
    });
  });

  describe('UT-304: デバッグ・統計機能テスト', () => {
    it('should provide debug information', () => {
      const debugInfo = cache.getDebugInfo();

      expect(debugInfo).toHaveProperty('realTimeStats');
      expect(debugInfo).toHaveProperty('historicalAnalysis');
      expect(debugInfo).toHaveProperty('keyAnalysis');
      expect(debugInfo.realTimeStats).toHaveProperty('currentHitRate');
      expect(debugInfo.realTimeStats).toHaveProperty('memoryPressure');
      expect(debugInfo.realTimeStats).toHaveProperty('hotspotAnalysis');
    });

    it('should calculate hit rate correctly', async () => {
      const key1 = createTestEnhancedKey();
      const key2 = createTestEnhancedKey({ location: { latitude: 35.68, longitude: 139.66, precision: 'high' } });

      await cache.set(key1, createTestTideInfo());

      // ヒット
      await cache.get(key1);
      // ミス
      await cache.get(key2);

      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(0.5, 1); // 50% hit rate
    });
  });
});
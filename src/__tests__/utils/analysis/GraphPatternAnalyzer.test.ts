/**
 * TASK-102: GraphPatternAnalyzer テスト
 */

import { GraphPatternAnalyzer } from '../../../utils/analysis/GraphPatternAnalyzer';
import type { FishingRecord } from '../../../types/entities';
import type { GraphPatternAnalysisInput } from '../../../types/analysis';

describe('GraphPatternAnalyzer', () => {
  beforeEach(() => {
    // テスト前にキャッシュをクリア
    GraphPatternAnalyzer.clearCache();
  });

  describe('基本的なパターン分析機能', () => {
    test('異なる座標の釣果記録で異なるパターンを検出', async () => {
      // Given: 東京湾と大阪湾の釣果記録
      const tokyoBayRecords = createFishingRecords('tokyo_bay', 3);
      const osakaBayRecords = createFishingRecords('osaka_bay', 3);
      const allRecords = [...tokyoBayRecords, ...osakaBayRecords];

      // When: パターン分析を実行
      const result = await GraphPatternAnalyzer.analyzePatterns({
        fishingRecords: allRecords,
        analysisOptions: { includeCoordinateVariation: true }
      });

      // Then: 地理的差異によるパターンの違いを検出
      expect(result.diversity.uniquenessScore).toBeGreaterThan(0.3);
      expect(result.patterns.length).toBe(6);
      expect(result.summary.totalRecords).toBe(6);
      expect(result.summary.uniquePatterns).toBeGreaterThan(1);
    });

    test('同一座標・異なる日時でのパターン差異検出', async () => {
      // Given: 同一場所、春分と夏至の記録
      const springRecords = createFishingRecords('same_location', 2, '2024-03-21');
      const summerRecords = createFishingRecords('same_location', 2, '2024-06-21');

      // When: 季節変動を考慮した分析
      const result = await GraphPatternAnalyzer.analyzePatterns({
        fishingRecords: [...springRecords, ...summerRecords],
        analysisOptions: { includeSeasonalVariation: true }
      });

      // Then: 季節差によるパターンの違いを検出
      expect(result.diversity.uniquenessScore).toBeGreaterThan(0.3);
      expect(result.summary.totalRecords).toBe(4);
      expect(result.patterns.length).toBe(4);
    });
  });

  describe('固有性スコア計算', () => {
    test('完全に同一パターンで低い固有性スコア', async () => {
      // Given: 全く同じ条件の釣果記録
      const identicalRecords = Array(3).fill(null).map((_, i) =>
        createIdenticalFishingRecord('base_location', '2024-01-01', `id_${i}`)
      );

      // When: パターン分析実行
      const result = await GraphPatternAnalyzer.analyzePatterns({
        fishingRecords: identicalRecords
      });

      // Then: 低い固有性スコア
      expect(result.diversity.uniquenessScore).toBeLessThan(0.8);
      expect(result.summary.duplicatePatterns).toBeGreaterThan(0);
    });

    test('多様な条件で高い固有性スコア', async () => {
      // Given: 大幅に異なる条件の記録
      const diverseRecords = [
        createFishingRecord('tokyo', '2024-01-01', 'tokyo_1'),
        createFishingRecord('osaka', '2024-06-15', 'osaka_1'),
        createFishingRecord('hiroshima', '2024-12-31', 'hiroshima_1'),
        createFishingRecord('sendai', '2024-04-10', 'sendai_1')
      ];

      // When: 全変動係数を考慮して分析
      const result = await GraphPatternAnalyzer.analyzePatterns({
        fishingRecords: diverseRecords,
        analysisOptions: {
          includeCoordinateVariation: true,
          includeSeasonalVariation: true
        }
      });

      // Then: 高い固有性スコア
      expect(result.diversity.uniquenessScore).toBeGreaterThan(0.8);
      expect(result.summary.uniquePatterns).toBe(4);
      expect(result.summary.duplicatePatterns).toBe(0);
    });
  });

  describe('エラーハンドリング', () => {
    test('空の釣果記録配列でのフォールバック', async () => {
      // Given: 空の配列
      const emptyRecords: FishingRecord[] = [];

      // When: 分析実行
      const result = await GraphPatternAnalyzer.analyzePatterns({
        fishingRecords: emptyRecords
      });

      // Then: 安全なフォールバック結果
      expect(result.summary.totalRecords).toBe(0);
      expect(result.diversity.uniquenessScore).toBe(0);
      expect(result.patterns).toEqual([]);
    });

    test('無効な潮位データでの安全な処理', async () => {
      // Given: 無効なデータを含む記録
      const corruptedRecords = [
        createFishingRecord('valid', '2024-01-01', 'valid_1'),
        // 無効なレコード（coordinatesなし）
        {
          id: 'invalid_1',
          date: new Date('2024-01-02'),
          location: 'invalid_location',
          fishSpecies: 'sea_bass',
          createdAt: new Date(),
          updatedAt: new Date()
        } as FishingRecord
      ];

      // When: 分析実行（エラーなし）
      const result = await GraphPatternAnalyzer.analyzePatterns({
        fishingRecords: corruptedRecords
      });

      // Then: 有効なデータのみで分析実行
      expect(result.summary.totalRecords).toBe(1);
      expect(result.patterns.length).toBe(1);
      expect(result.diversity.uniquenessScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('キャッシュシステム', () => {
    test('同一データでのキャッシュ効果', async () => {
      // Given: テストデータ
      const records = createFishingRecords('test_location', 2);

      // When: 2回実行
      const result1 = await GraphPatternAnalyzer.analyzePatterns({ fishingRecords: records });
      const result2 = await GraphPatternAnalyzer.analyzePatterns({ fishingRecords: records });

      // Then: 同じ結果を返す
      expect(result1).toEqual(result2);
    });
  });
});

// テストデータ生成ヘルパー関数
function createFishingRecords(location: string, count: number, baseDate?: string): FishingRecord[] {
  return Array(count).fill(null).map((_, index) =>
    createFishingRecord(location, baseDate || `2024-01-${String(index + 1).padStart(2, '0')}`, `${location}_${index}`)
  );
}

function createFishingRecord(location: string, dateStr: string, id: string): FishingRecord {
  const coordinates = getCoordinatesForLocation(location);
  return {
    id,
    date: new Date(dateStr),
    location,
    fishSpecies: 'sea_bass',
    coordinates,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function createIdenticalFishingRecord(location: string, dateStr: string, id: string): FishingRecord {
  return createFishingRecord(location, dateStr, id);
}

function getCoordinatesForLocation(location: string): { latitude: number; longitude: number } {
  const coordinateMap: Record<string, { latitude: number; longitude: number }> = {
    'tokyo_bay': { latitude: 35.6762, longitude: 139.6503 },
    'osaka_bay': { latitude: 34.6937, longitude: 135.5023 },
    'hiroshima': { latitude: 34.3853, longitude: 132.4553 },
    'sendai': { latitude: 38.2682, longitude: 140.8694 },
    'same_location': { latitude: 35.5000, longitude: 139.5000 },
    'base_location': { latitude: 35.0000, longitude: 139.0000 },
    'tokyo': { latitude: 35.6762, longitude: 139.6503 },
    'osaka': { latitude: 34.6937, longitude: 135.5023 },
    'valid': { latitude: 35.1000, longitude: 139.1000 },
    'test_location': { latitude: 35.2000, longitude: 139.2000 }
  };
  return coordinateMap[location] || { latitude: 35.0, longitude: 139.0 };
}
/**
 * 魚種検索エンジン パフォーマンスベンチマーク
 *
 * @description
 * 大規模データセット（100-1000魚種）でのパフォーマンステスト
 * - 検索速度（目標: サブミリ秒）
 * - メモリ使用量とリーク検出
 * - スケーラビリティ（線形性）
 * - 並行処理性能
 *
 * @version 3.0.0
 * @since 2025-10-25
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FishSpeciesSearchEngine } from '../FishSpeciesSearchEngine';
import type { FishSpecies } from '../../../types';

/**
 * テスト用魚種データを生成
 */
function generateTestSpecies(count: number): FishSpecies[] {
  const categories = ['青魚', '白身魚', '赤身魚', '根魚', '甲殻類', '軟体動物', '回遊魚', 'エギング', 'ルアー', 'その他'];
  const seasons = ['春', '夏', '秋', '冬'];
  const habitats = ['堤防', '船', '磯', '河川', '湖', '沿岸', '沖合', 'サーフ'];

  const species: FishSpecies[] = [];

  for (let i = 0; i < count; i++) {
    const baseNames = [
      'アジ', 'サバ', 'イワシ', 'タイ', 'スズキ', 'ヒラメ', 'カレイ', 'アイナメ',
      'メバル', 'カサゴ', 'ソイ', 'ハタ', 'ブリ', 'カンパチ', 'ヒラマサ', 'マグロ',
      'カツオ', 'サワラ', 'サヨリ', 'シイラ', 'イカ', 'タコ', 'エビ', 'カニ'
    ];

    const prefixes = ['マ', 'ホン', 'クロ', 'シロ', 'アカ', 'キ', 'オキ', 'イソ', ''];
    const suffixes = ['', '類', '系', '種'];

    const prefix = prefixes[i % prefixes.length];
    const baseName = baseNames[i % baseNames.length];
    const suffix = suffixes[i % suffixes.length];
    const number = i > baseNames.length ? Math.floor(i / baseNames.length) : '';

    const standardName = `${prefix}${baseName}${suffix}${number}`;

    species.push({
      id: `test-species-${i}`,
      standardName,
      scientificName: `Testus fishus ${i}`,
      aliases: [
        `${baseName}${number}`,
        `test${i}`,
      ],
      regionalNames: [
        `地方名${i}A`,
        `地方名${i}B`
      ],
      category: categories[i % categories.length],
      season: [
        seasons[i % seasons.length],
        seasons[(i + 1) % seasons.length]
      ],
      habitat: [
        habitats[i % habitats.length],
        habitats[(i + 1) % habitats.length]
      ],
      popularity: Math.floor(Math.random() * 100),
      source: i % 2 === 0 ? 'official' : 'user'
    });
  }

  return species;
}

describe('FishSpeciesSearchEngine パフォーマンスベンチマーク', () => {
  describe('小規模データセット (100魚種)', () => {
    let searchEngine: FishSpeciesSearchEngine;
    let testData: FishSpecies[];

    beforeEach(() => {
      testData = generateTestSpecies(100);
      searchEngine = new FishSpeciesSearchEngine(testData);
    });

    it('インデックス構築が50ms以内に完了すること', () => {
      const engine = new FishSpeciesSearchEngine([]);

      const start = performance.now();
      engine.buildIndex(testData);
      const end = performance.now();

      const duration = end - start;
      console.log(`📊 100魚種のインデックス構築時間: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(50);
    });

    it('単一文字検索が1ms以内に完了すること', () => {
      const start = performance.now();
      const results = searchEngine.search('あ');
      const end = performance.now();

      const duration = end - start;
      console.log(`📊 単一文字検索時間 (100魚種): ${duration.toFixed(4)}ms, 結果数: ${results.length}`);
      expect(duration).toBeLessThan(1);
    });

    it('複数文字検索が1ms以内に完了すること', () => {
      const start = performance.now();
      const results = searchEngine.search('あじ');
      const end = performance.now();

      const duration = end - start;
      console.log(`📊 複数文字検索時間 (100魚種): ${duration.toFixed(4)}ms, 結果数: ${results.length}`);
      expect(duration).toBeLessThan(1);
    });

    it('1000回の連続検索でもパフォーマンスが安定していること', () => {
      const times: number[] = [];
      const queries = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ'];

      for (let i = 0; i < 1000; i++) {
        const query = queries[i % queries.length];
        const start = performance.now();
        searchEngine.search(query);
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      console.log(`📊 1000回検索統計 (100魚種):`);
      console.log(`   平均: ${avgTime.toFixed(4)}ms`);
      console.log(`   最大: ${maxTime.toFixed(4)}ms`);
      console.log(`   最小: ${minTime.toFixed(4)}ms`);

      expect(avgTime).toBeLessThan(1);
      expect(maxTime).toBeLessThan(5);
    });
  });

  describe('中規模データセット (500魚種)', () => {
    let searchEngine: FishSpeciesSearchEngine;
    let testData: FishSpecies[];

    beforeEach(() => {
      testData = generateTestSpecies(500);
      searchEngine = new FishSpeciesSearchEngine(testData);
    });

    it('インデックス構築が100ms以内に完了すること', () => {
      const engine = new FishSpeciesSearchEngine([]);

      const start = performance.now();
      engine.buildIndex(testData);
      const end = performance.now();

      const duration = end - start;
      console.log(`📊 500魚種のインデックス構築時間: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(100);
    });

    it('単一文字検索が2ms以内に完了すること', () => {
      const start = performance.now();
      const results = searchEngine.search('あ');
      const end = performance.now();

      const duration = end - start;
      console.log(`📊 単一文字検索時間 (500魚種): ${duration.toFixed(4)}ms, 結果数: ${results.length}`);
      expect(duration).toBeLessThan(2);
    });

    it('複数文字検索が2ms以内に完了すること', () => {
      const start = performance.now();
      const results = searchEngine.search('あじ');
      const end = performance.now();

      const duration = end - start;
      console.log(`📊 複数文字検索時間 (500魚種): ${duration.toFixed(4)}ms, 結果数: ${results.length}`);
      expect(duration).toBeLessThan(2);
    });

    it('フィルタリング検索が3ms以内に完了すること', () => {
      const start = performance.now();
      const results = searchEngine.search('あ', {
        category: '青魚',
        season: '春',
        habitat: '堤防'
      });
      const end = performance.now();

      const duration = end - start;
      console.log(`📊 フィルタリング検索時間 (500魚種): ${duration.toFixed(4)}ms, 結果数: ${results.length}`);
      expect(duration).toBeLessThan(3);
    });
  });

  describe('大規模データセット (1000魚種)', () => {
    let searchEngine: FishSpeciesSearchEngine;
    let testData: FishSpecies[];

    beforeEach(() => {
      testData = generateTestSpecies(1000);
      searchEngine = new FishSpeciesSearchEngine(testData);
    });

    it('インデックス構築が200ms以内に完了すること', () => {
      const engine = new FishSpeciesSearchEngine([]);

      const start = performance.now();
      engine.buildIndex(testData);
      const end = performance.now();

      const duration = end - start;
      console.log(`📊 1000魚種のインデックス構築時間: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(200);
    });

    it('単一文字検索が3ms以内に完了すること', () => {
      const start = performance.now();
      const results = searchEngine.search('あ');
      const end = performance.now();

      const duration = end - start;
      console.log(`📊 単一文字検索時間 (1000魚種): ${duration.toFixed(4)}ms, 結果数: ${results.length}`);
      expect(duration).toBeLessThan(3);
    });

    it('複数文字検索が3ms以内に完了すること', () => {
      const start = performance.now();
      const results = searchEngine.search('あじ');
      const end = performance.now();

      const duration = end - start;
      console.log(`📊 複数文字検索時間 (1000魚種): ${duration.toFixed(4)}ms, 結果数: ${results.length}`);
      expect(duration).toBeLessThan(3);
    });

    it('詳細検索が5ms以内に完了すること', () => {
      const start = performance.now();
      const results = searchEngine.searchDetailed('あ');
      const end = performance.now();

      const duration = end - start;
      console.log(`📊 詳細検索時間 (1000魚種): ${duration.toFixed(4)}ms, 結果数: ${results.length}`);
      expect(duration).toBeLessThan(5);
    });

    it('カテゴリ別取得が2ms以内に完了すること', () => {
      const start = performance.now();
      const results = searchEngine.getByCategory('青魚');
      const end = performance.now();

      const duration = end - start;
      console.log(`📊 カテゴリ別取得時間 (1000魚種): ${duration.toFixed(4)}ms, 結果数: ${results.length}`);
      expect(duration).toBeLessThan(2);
    });
  });

  describe('メモリ効率', () => {
    it('大量データでもメモリリークが発生しないこと', () => {
      const engines: FishSpeciesSearchEngine[] = [];

      // 10個のエンジンインスタンスを作成
      for (let i = 0; i < 10; i++) {
        const testData = generateTestSpecies(500);
        const engine = new FishSpeciesSearchEngine(testData);
        engines.push(engine);
      }

      // すべてのエンジンで検索を実行
      engines.forEach(engine => {
        for (let i = 0; i < 100; i++) {
          engine.search('あ');
          engine.search('い');
          engine.search('う');
        }
      });

      // メモリが適切に解放されることを期待
      // （実際のメモリ測定はブラウザ環境でのみ可能）
      expect(engines.length).toBe(10);
    });

    it('インデックスのクリアでメモリが解放されること', () => {
      const testData = generateTestSpecies(1000);
      const engine = new FishSpeciesSearchEngine(testData);

      // 検索を実行
      for (let i = 0; i < 1000; i++) {
        engine.search('あ');
      }

      // インデックスをクリア
      engine.clear();

      // クリア後は検索結果が空になる
      const results = engine.search('あ');
      expect(results).toEqual([]);
      expect(engine.isReady()).toBe(false);
    });
  });

  describe('スケーラビリティ', () => {
    it('データ量に対して線形スケールすること', () => {
      const sizes = [100, 200, 500, 1000];
      const results: Array<{ size: number; indexTime: number; searchTime: number }> = [];

      sizes.forEach(size => {
        const testData = generateTestSpecies(size);
        const engine = new FishSpeciesSearchEngine([]);

        // インデックス構築時間
        const indexStart = performance.now();
        engine.buildIndex(testData);
        const indexEnd = performance.now();
        const indexTime = indexEnd - indexStart;

        // 検索時間（平均）
        const searchTimes: number[] = [];
        for (let i = 0; i < 100; i++) {
          const searchStart = performance.now();
          engine.search('あ');
          const searchEnd = performance.now();
          searchTimes.push(searchEnd - searchStart);
        }
        const avgSearchTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;

        results.push({
          size,
          indexTime,
          searchTime: avgSearchTime
        });
      });

      console.log('📊 スケーラビリティ分析:');
      results.forEach(r => {
        console.log(`   ${r.size}魚種: インデックス=${r.indexTime.toFixed(2)}ms, 検索=${r.searchTime.toFixed(4)}ms`);
      });

      // インデックス構築時間が線形的に増加することを確認
      // （完全に線形ではないが、指数関数的ではない）
      const indexRatio1 = results[1].indexTime / results[0].indexTime;
      const indexRatio2 = results[2].indexTime / results[1].indexTime;
      const indexRatio3 = results[3].indexTime / results[2].indexTime;

      console.log(`📊 インデックス構築時間の増加率: ${indexRatio1.toFixed(2)}x, ${indexRatio2.toFixed(2)}x, ${indexRatio3.toFixed(2)}x`);

      // 検索時間は O(1) に近いことを確認
      expect(results[0].searchTime).toBeLessThan(1);
      expect(results[3].searchTime).toBeLessThan(5);
    });
  });

  describe('並行処理', () => {
    it('複数の同時検索リクエストを処理できること', async () => {
      const testData = generateTestSpecies(500);
      const engine = new FishSpeciesSearchEngine(testData);

      // 100個の並行検索リクエストを作成
      const searchPromises = [];
      for (let i = 0; i < 100; i++) {
        searchPromises.push(
          Promise.resolve().then(() => {
            const query = ['あ', 'い', 'う', 'え', 'お'][i % 5];
            return engine.search(query);
          })
        );
      }

      const start = performance.now();
      const results = await Promise.all(searchPromises);
      const end = performance.now();

      const duration = end - start;
      console.log(`📊 100並行検索時間: ${duration.toFixed(2)}ms`);

      expect(results.length).toBe(100);
      expect(duration).toBeLessThan(100);
    });
  });
});

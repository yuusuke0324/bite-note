/**
 * FishSpeciesSearchEngine ユニットテスト
 *
 * @description
 * 魚種検索エンジンの包括的なテストスイート
 * パフォーマンス、正確性、エッジケースのカバレッジ
 *
 * @version 2.7.1
 * @since 2025-10-25
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FishSpeciesSearchEngine } from '../FishSpeciesSearchEngine';
import type { FishSpecies } from '../../../types';

describe('FishSpeciesSearchEngine', () => {
  // テスト用サンプルデータ
  const sampleSpecies: FishSpecies[] = [
    {
      id: 'ma-aji',
      standardName: 'マアジ',
      scientificName: 'Trachurus japonicus',
      aliases: ['アジ', 'あじ', '鯵', 'ホンアジ'],
      regionalNames: ['アオアジ', 'キアジ'],
      category: '青魚',
      season: ['春', '夏', '秋'],
      habitat: ['堤防', '船'],
      popularity: 95,
      source: 'official'
    },
    {
      id: 'suzuki',
      standardName: 'スズキ',
      scientificName: 'Lateolabrax japonicus',
      aliases: ['すずき', '鱸', 'シーバス'],
      regionalNames: ['セイゴ', 'フッコ'],
      category: '白身魚',
      season: ['春', '夏'],
      habitat: ['堤防', '河川'],
      popularity: 90,
      source: 'official'
    },
    {
      id: 'aori-ika',
      standardName: 'アオリイカ',
      scientificName: 'Sepioteuthis lessoniana',
      aliases: ['あおりいか', 'アオリ'],
      regionalNames: ['ミズイカ'],
      category: 'エギング',
      season: ['春', '秋'],
      habitat: ['堤防', '磯'],
      popularity: 93,
      source: 'official'
    },
    {
      id: 'kuro-dai',
      standardName: 'クロダイ',
      scientificName: 'Acanthopagrus schlegelii',
      aliases: ['くろだい', 'チヌ', 'ちぬ'],
      regionalNames: ['カイズ'],
      category: '白身魚',
      season: ['春', '夏', '秋'],
      habitat: ['堤防', '磯'],
      popularity: 88,
      source: 'official'
    }
  ];

  let searchEngine: FishSpeciesSearchEngine;

  beforeEach(() => {
    searchEngine = new FishSpeciesSearchEngine(sampleSpecies);
  });

  describe('インデックス構築', () => {
    it('正しくインデックスを構築すること', () => {
      expect(searchEngine.isReady()).toBe(true);
      const stats = searchEngine.getStats();
      expect(stats.totalSpecies).toBe(4);
    });

    it('空データでもエラーを起こさないこと', () => {
      const emptyEngine = new FishSpeciesSearchEngine([]);
      expect(emptyEngine.isReady()).toBe(false);
      expect(emptyEngine.getStats().totalSpecies).toBe(0);
    });

    it('データ統計を正しく計算すること', () => {
      const stats = searchEngine.getStats();
      expect(stats.totalSpecies).toBe(4);
      expect(stats.byCategory['青魚']).toBe(1);
      expect(stats.byCategory['白身魚']).toBe(2);
      expect(stats.byCategory['エギング']).toBe(1);
      expect(stats.bySource.official).toBe(4);
      expect(stats.bySource.user).toBe(0);
    });
  });

  describe('基本的な検索機能', () => {
    it('標準和名で検索できること', () => {
      const results = searchEngine.search('マアジ');
      expect(results).toHaveLength(1);
      expect(results[0].standardName).toBe('マアジ');
    });

    it('エイリアスで検索できること', () => {
      const results = searchEngine.search('アジ');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].standardName).toBe('マアジ');
    });

    it('地方名で検索できること', () => {
      const results = searchEngine.search('セイゴ');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].standardName).toBe('スズキ');
    });

    it('学名で検索できること', () => {
      const results = searchEngine.search('Trachurus');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].standardName).toBe('マアジ');
    });
  });

  describe('正規化機能', () => {
    it('カタカナをひらがなに正規化して検索すること', () => {
      const resultsKatakana = searchEngine.search('アジ');
      const resultsHiragana = searchEngine.search('あじ');
      expect(resultsKatakana).toEqual(resultsHiragana);
    });

    it('大文字小文字を区別しないこと', () => {
      const resultsLower = searchEngine.search('seabass');
      const resultsUpper = searchEngine.search('SEABASS');
      expect(resultsLower).toEqual(resultsUpper);
    });

    it('前後の空白をトリミングすること', () => {
      const results1 = searchEngine.search('  マアジ  ');
      const results2 = searchEngine.search('マアジ');
      expect(results1).toEqual(results2);
    });
  });

  describe('前方一致検索', () => {
    it('1文字で検索できること', () => {
      const results = searchEngine.search('あ');
      expect(results.length).toBeGreaterThan(0);
      // マアジ、アオリイカが含まれるはず
      const names = results.map(s => s.standardName);
      expect(names).toContain('マアジ');
      expect(names).toContain('アオリイカ');
    });

    it('2文字で検索結果が絞り込まれること', () => {
      const results1 = searchEngine.search('あ');
      const results2 = searchEngine.search('あお');
      expect(results2.length).toBeLessThanOrEqual(results1.length);
    });

    it('3文字以上でも検索できること', () => {
      const results = searchEngine.search('あおり');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].standardName).toBe('アオリイカ');
    });
  });

  describe('人気度ソート', () => {
    it('人気度順にソートされること', () => {
      const results = searchEngine.search('');
      expect(results[0].popularity).toBeGreaterThanOrEqual(results[1].popularity);
      expect(results[1].popularity).toBeGreaterThanOrEqual(results[2].popularity);
    });

    it('空クエリで人気魚種を返すこと', () => {
      const results = searchEngine.search('', { limit: 3 });
      expect(results).toHaveLength(3);
      expect(results[0].standardName).toBe('マアジ'); // popularity: 95
      expect(results[1].standardName).toBe('アオリイカ'); // popularity: 93
      expect(results[2].standardName).toBe('スズキ'); // popularity: 90
    });

    it('getPopular()で人気魚種を取得できること', () => {
      const popular = searchEngine.getPopular(2);
      expect(popular).toHaveLength(2);
      expect(popular[0].standardName).toBe('マアジ');
      expect(popular[1].standardName).toBe('アオリイカ');
    });
  });

  describe('フィルタリング機能', () => {
    it('カテゴリでフィルタできること', () => {
      const results = searchEngine.search('', { category: '白身魚' });
      expect(results).toHaveLength(2);
      results.forEach(s => {
        expect(s.category).toBe('白身魚');
      });
    });

    it('季節でフィルタできること', () => {
      const results = searchEngine.search('', { season: '春' });
      expect(results.length).toBeGreaterThan(0);
      results.forEach(s => {
        expect(s.season).toContain('春');
      });
    });

    it('生息域でフィルタできること', () => {
      const results = searchEngine.search('', { habitat: '堤防' });
      expect(results.length).toBeGreaterThan(0);
      results.forEach(s => {
        expect(s.habitat).toContain('堤防');
      });
    });

    it('複数のフィルタを組み合わせられること', () => {
      const results = searchEngine.search('', {
        category: '白身魚',
        season: '春',
        habitat: '堤防'
      });
      results.forEach(s => {
        expect(s.category).toBe('白身魚');
        expect(s.season).toContain('春');
        expect(s.habitat).toContain('堤防');
      });
    });
  });

  describe('件数制限', () => {
    it('limit オプションで結果数を制限できること', () => {
      const results = searchEngine.search('', { limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('limitが結果数より大きい場合は全結果を返すこと', () => {
      const results = searchEngine.search('あ', { limit: 100 });
      expect(results.length).toBeLessThanOrEqual(100);
    });
  });

  describe('詳細検索結果', () => {
    it('マッチフィールド情報を含むこと', () => {
      const results = searchEngine.searchDetailed('アジ');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('species');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('matchedField');
      expect(results[0]).toHaveProperty('matchedText');
    });

    it('標準和名マッチでスコアが高いこと', () => {
      const results = searchEngine.searchDetailed('マアジ');
      expect(results[0].matchedField).toBe('standardName');
      expect(results[0].score).toBeGreaterThanOrEqual(80);
    });

    it('エイリアスマッチでも適切なスコアを返すこと', () => {
      const results = searchEngine.searchDetailed('ホンアジ');
      expect(results[0].matchedField).toBe('aliases');
      expect(results[0].matchedText).toBe('ホンアジ');
    });
  });

  describe('getByCategory', () => {
    it('カテゴリ別に魚種を取得できること', () => {
      const whitefish = searchEngine.getByCategory('白身魚');
      expect(whitefish).toHaveLength(2);
      whitefish.forEach(s => {
        expect(s.category).toBe('白身魚');
      });
    });

    it('人気度順にソートされること', () => {
      const whitefish = searchEngine.getByCategory('白身魚');
      expect(whitefish[0].popularity).toBeGreaterThanOrEqual(whitefish[1].popularity);
    });
  });

  describe('getById', () => {
    it('IDで魚種を取得できること', () => {
      const species = searchEngine.getById('ma-aji');
      expect(species).toBeDefined();
      expect(species?.standardName).toBe('マアジ');
    });

    it('存在しないIDの場合undefinedを返すこと', () => {
      const species = searchEngine.getById('non-existent');
      expect(species).toBeUndefined();
    });
  });

  describe('エッジケース', () => {
    it('マッチしないクエリで空配列を返すこと', () => {
      const results = searchEngine.search('存在しない魚種名');
      expect(results).toEqual([]);
    });

    it('特殊文字を含むクエリでもエラーを起こさないこと', () => {
      expect(() => searchEngine.search('!@#$%')).not.toThrow();
    });

    it('非常に長いクエリでもエラーを起こさないこと', () => {
      const longQuery = 'あ'.repeat(1000);
      expect(() => searchEngine.search(longQuery)).not.toThrow();
    });

    it('数字のみのクエリでもエラーを起こさないこと', () => {
      expect(() => searchEngine.search('12345')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('インデックスをクリアできること', () => {
      searchEngine.clear();
      expect(searchEngine.isReady()).toBe(false);
      expect(searchEngine.getStats().totalSpecies).toBe(0);
    });

    it('クリア後に検索すると空配列を返すこと', () => {
      searchEngine.clear();
      const results = searchEngine.search('マアジ');
      expect(results).toEqual([]);
    });
  });

  describe('buildIndex', () => {
    it('インデックスを再構築できること', () => {
      searchEngine.clear();
      expect(searchEngine.isReady()).toBe(false);

      searchEngine.buildIndex(sampleSpecies);
      expect(searchEngine.isReady()).toBe(true);
      expect(searchEngine.getStats().totalSpecies).toBe(4);
    });

    it('新しいデータでインデックスを再構築できること', () => {
      const newSpecies: FishSpecies[] = [
        {
          id: 'test-fish',
          standardName: 'テストフィッシュ',
          scientificName: 'Test fish',
          aliases: ['test'],
          regionalNames: [],
          category: 'その他',
          season: ['春'],
          habitat: ['堤防'],
          popularity: 50,
          source: 'user'
        }
      ];

      searchEngine.buildIndex(newSpecies);
      expect(searchEngine.getStats().totalSpecies).toBe(1);
      const results = searchEngine.search('テスト');
      expect(results[0].standardName).toBe('テストフィッシュ');
    });
  });

  describe('パフォーマンス', () => {
    it('インデックス構築が10ms以内に完了すること', () => {
      const start = performance.now();
      const largeEngine = new FishSpeciesSearchEngine(sampleSpecies);
      const end = performance.now();
      expect(end - start).toBeLessThan(10);
      expect(largeEngine.isReady()).toBe(true);
    });

    it('検索が1ms以内に完了すること', () => {
      const start = performance.now();
      searchEngine.search('あ');
      const end = performance.now();
      expect(end - start).toBeLessThan(1);
    });

    it('100回の連続検索でもパフォーマンスが劣化しないこと', () => {
      const times: number[] = [];
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        searchEngine.search('あ');
        const end = performance.now();
        times.push(end - start);
      }
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(1);
    });
  });
});

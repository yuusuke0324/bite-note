/**
 * FishSpeciesDataService ユニットテスト
 *
 * @description
 * 魚種データサービスの包括的なテストスイート
 * データ読み込み、キャッシュ管理、フィルタリング、エラーハンドリングのカバレッジ
 *
 * @version 2.7.1
 * @since 2025-10-25
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FishSpeciesDataService } from '../FishSpeciesDataService';

describe('FishSpeciesDataService', () => {
  let service: FishSpeciesDataService;

  beforeEach(() => {
    service = new FishSpeciesDataService();
  });

  describe('コンストラクタ', () => {
    it('デフォルト設定で初期化できること', () => {
      const defaultService = new FishSpeciesDataService();
      expect(defaultService).toBeInstanceOf(FishSpeciesDataService);
    });

    it('カスタム設定で初期化できること', () => {
      const customService = new FishSpeciesDataService({
        debug: true,
        sourceFilter: 'official'
      });
      expect(customService).toBeInstanceOf(FishSpeciesDataService);
    });
  });

  describe('loadSpecies', () => {
    it('魚種データを読み込めること', async () => {
      const species = await service.loadSpecies();
      expect(species).toBeInstanceOf(Array);
      expect(species.length).toBeGreaterThan(0);
    });

    it('読み込んだデータが正しい構造を持つこと', async () => {
      const species = await service.loadSpecies();
      const firstSpecies = species[0];

      // 必須フィールドの検証
      expect(firstSpecies).toHaveProperty('id');
      expect(firstSpecies).toHaveProperty('standardName');
      expect(firstSpecies).toHaveProperty('scientificName');
      expect(firstSpecies).toHaveProperty('aliases');
      expect(firstSpecies).toHaveProperty('regionalNames');
      expect(firstSpecies).toHaveProperty('category');
      expect(firstSpecies).toHaveProperty('season');
      expect(firstSpecies).toHaveProperty('habitat');
      expect(firstSpecies).toHaveProperty('popularity');
      expect(firstSpecies).toHaveProperty('source');

      // 型の検証
      expect(typeof firstSpecies.id).toBe('string');
      expect(typeof firstSpecies.standardName).toBe('string');
      expect(typeof firstSpecies.scientificName).toBe('string');
      expect(Array.isArray(firstSpecies.aliases)).toBe(true);
      expect(Array.isArray(firstSpecies.regionalNames)).toBe(true);
      expect(Array.isArray(firstSpecies.season)).toBe(true);
      expect(Array.isArray(firstSpecies.habitat)).toBe(true);
      expect(typeof firstSpecies.popularity).toBe('number');
      expect(['official', 'user']).toContain(firstSpecies.source);
    });

    it('2回目の呼び出しではキャッシュから取得すること', async () => {
      const firstCall = await service.loadSpecies();
      const secondCall = await service.loadSpecies();

      // 同じ参照を返すこと（キャッシュされている）
      expect(firstCall).toBe(secondCall);
    });

    it('キャッシュクリア後は再読み込みすること', async () => {
      const firstCall = await service.loadSpecies();
      service.clearCache();
      const secondCall = await service.loadSpecies();

      // 異なる参照を返すこと（再読み込みされている）
      expect(firstCall).not.toBe(secondCall);
      // ただし内容は同じ
      expect(firstCall).toEqual(secondCall);
    });

    it('updatedAtがDate型に変換されること', async () => {
      const species = await service.loadSpecies();
      const speciesWithUpdatedAt = species.find(s => s.updatedAt);

      if (speciesWithUpdatedAt) {
        expect(speciesWithUpdatedAt.updatedAt).toBeInstanceOf(Date);
      }
    });

    it('createdAtがDate型に変換されること（存在する場合）', async () => {
      const species = await service.loadSpecies();
      const speciesWithCreatedAt = species.find(s => s.createdAt);

      if (speciesWithCreatedAt) {
        expect(speciesWithCreatedAt.createdAt).toBeInstanceOf(Date);
      }
    });
  });

  describe('sourceFilter', () => {
    it('official フィルタで公式データのみを取得すること', async () => {
      const officialService = new FishSpeciesDataService({
        sourceFilter: 'official'
      });

      const species = await officialService.loadSpecies();
      expect(species.length).toBeGreaterThan(0);
      species.forEach(s => {
        expect(s.source).toBe('official');
      });
    });

    it('user フィルタでユーザーデータのみを取得すること', async () => {
      const userService = new FishSpeciesDataService({
        sourceFilter: 'user'
      });

      const species = await userService.loadSpecies();
      // ユーザーデータが存在しない場合は空配列
      species.forEach(s => {
        expect(s.source).toBe('user');
      });
    });

    it('all フィルタで全データを取得すること', async () => {
      const allService = new FishSpeciesDataService({
        sourceFilter: 'all'
      });

      const species = await allService.loadSpecies();
      expect(species.length).toBeGreaterThan(0);
    });

    it('フィルタなしの場合は全データを取得すること', async () => {
      const defaultService = new FishSpeciesDataService();
      const species = await defaultService.loadSpecies();
      expect(species.length).toBeGreaterThan(0);
    });
  });

  describe('clearCache', () => {
    it('キャッシュをクリアできること', async () => {
      await service.loadSpecies();
      service.clearCache();

      // 内部キャッシュがクリアされているか確認するため、
      // 再読み込み時に新しいインスタンスが返されることを確認
      const firstLoad = await service.loadSpecies();
      service.clearCache();
      const secondLoad = await service.loadSpecies();

      expect(firstLoad).not.toBe(secondLoad);
    });

    it('データ未読み込み状態でクリアしてもエラーが起きないこと', () => {
      expect(() => service.clearCache()).not.toThrow();
    });
  });

  describe('getVersion', () => {
    it('バージョン情報を取得できること', () => {
      const version = service.getVersion();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
      expect(version).toMatch(/^\d+\.\d+\.\d+(-\w+)?$/); // セマンティックバージョニング形式（prerelease対応）
    });

    it('データ読み込み前でもバージョン情報を取得できること', () => {
      const freshService = new FishSpeciesDataService();
      const version = freshService.getVersion();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });
  });

  describe('getLastUpdated', () => {
    it('最終更新日時を取得できること', () => {
      const lastUpdated = service.getLastUpdated();
      expect(lastUpdated).toBeInstanceOf(Date);
      expect(lastUpdated.getTime()).toBeGreaterThan(0);
    });

    it('有効な日付を返すこと', () => {
      const lastUpdated = service.getLastUpdated();
      expect(isNaN(lastUpdated.getTime())).toBe(false);
    });

    it('データ読み込み前でも最終更新日時を取得できること', () => {
      const freshService = new FishSpeciesDataService();
      const lastUpdated = freshService.getLastUpdated();
      expect(lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('getDataStats', () => {
    it('データ統計を取得できること', () => {
      const stats = service.getDataStats();

      expect(stats).toHaveProperty('version');
      expect(stats).toHaveProperty('updatedAt');
      expect(stats).toHaveProperty('totalCount');
      expect(stats).toHaveProperty('description');
    });

    it('統計情報が正しい型を持つこと', () => {
      const stats = service.getDataStats();

      expect(typeof stats.version).toBe('string');
      expect(stats.updatedAt).toBeInstanceOf(Date);
      expect(typeof stats.totalCount).toBe('number');
      expect(typeof stats.description).toBe('string');
    });

    it('totalCountが正の整数であること', () => {
      const stats = service.getDataStats();
      expect(stats.totalCount).toBeGreaterThan(0);
      expect(Number.isInteger(stats.totalCount)).toBe(true);
    });

    it('versionがセマンティックバージョニング形式であること', () => {
      const stats = service.getDataStats();
      expect(stats.version).toMatch(/^\d+\.\d+\.\d+(-\w+)?$/);
    });

    it('updatedAtが有効な日付であること', () => {
      const stats = service.getDataStats();
      expect(isNaN(stats.updatedAt.getTime())).toBe(false);
    });

    it('データ読み込み前でも統計情報を取得できること', () => {
      const freshService = new FishSpeciesDataService();
      const stats = freshService.getDataStats();

      expect(stats).toBeDefined();
      expect(stats.version).toBeDefined();
      expect(stats.totalCount).toBeGreaterThan(0);
    });
  });

  describe('デバッグモード', () => {
    it('debugモードで初期化できること', () => {
      const debugService = new FishSpeciesDataService({ debug: true });
      expect(debugService).toBeInstanceOf(FishSpeciesDataService);
    });

    it('debugモードでもデータを正常に読み込めること', async () => {
      const debugService = new FishSpeciesDataService({ debug: true });
      const species = await debugService.loadSpecies();
      expect(species.length).toBeGreaterThan(0);
    });

    it('debugモードでもキャッシュが正常に動作すること', async () => {
      const debugService = new FishSpeciesDataService({ debug: true });
      const firstCall = await debugService.loadSpecies();
      const secondCall = await debugService.loadSpecies();
      expect(firstCall).toBe(secondCall);
    });
  });

  describe('データ整合性', () => {
    it('全ての魚種にIDがあること', async () => {
      const species = await service.loadSpecies();
      species.forEach(s => {
        expect(s.id).toBeTruthy();
        expect(typeof s.id).toBe('string');
      });
    });

    it('全ての魚種に標準和名があること', async () => {
      const species = await service.loadSpecies();
      species.forEach(s => {
        expect(s.standardName).toBeTruthy();
        expect(typeof s.standardName).toBe('string');
        expect(s.standardName.length).toBeGreaterThan(0);
      });
    });

    it('人気度が0-100の範囲内であること', async () => {
      const species = await service.loadSpecies();
      species.forEach(s => {
        expect(s.popularity).toBeGreaterThanOrEqual(0);
        expect(s.popularity).toBeLessThanOrEqual(100);
      });
    });

    it('重複するIDがないこと', async () => {
      const species = await service.loadSpecies();
      const ids = species.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('カテゴリが有効な値であること', async () => {
      const species = await service.loadSpecies();
      const validCategories = [
        '青魚',
        '白身魚',
        '赤身魚',
        '根魚',
        '甲殻類',
        '軟体動物',
        '回遊魚',
        'エギング',
        'ルアー',
        'その他'
      ];

      species.forEach(s => {
        expect(validCategories).toContain(s.category);
      });
    });

    it('季節が有効な値であること', async () => {
      const species = await service.loadSpecies();
      const validSeasons = ['春', '夏', '秋', '冬'];

      species.forEach(s => {
        expect(Array.isArray(s.season)).toBe(true);
        s.season.forEach(season => {
          expect(validSeasons).toContain(season);
        });
      });
    });

    it('生息域が有効な値であること', async () => {
      const species = await service.loadSpecies();
      const validHabitats = ['堤防', '船', '磯', '河川', '湖', '沿岸', '沖合', 'サーフ'];

      species.forEach(s => {
        expect(Array.isArray(s.habitat)).toBe(true);
        s.habitat.forEach(habitat => {
          expect(validHabitats).toContain(habitat);
        });
      });
    });
  });

  describe('パフォーマンス', () => {
    it('初回読み込みが50ms以内に完了すること', async () => {
      const freshService = new FishSpeciesDataService();
      const start = performance.now();
      await freshService.loadSpecies();
      const end = performance.now();

      expect(end - start).toBeLessThan(50);
    });

    it('キャッシュからの取得が1ms以内に完了すること', async () => {
      await service.loadSpecies(); // キャッシュを作成

      const start = performance.now();
      await service.loadSpecies();
      const end = performance.now();

      expect(end - start).toBeLessThan(1);
    });

    it('100回の連続読み込みでもパフォーマンスが劣化しないこと', async () => {
      const times: number[] = [];

      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await service.loadSpecies();
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(1); // キャッシュから取得するので非常に高速
    });

    it('clearCacheが1ms以内に完了すること', async () => {
      await service.loadSpecies();

      const start = performance.now();
      service.clearCache();
      const end = performance.now();

      expect(end - start).toBeLessThan(1);
    });
  });

  describe('エッジケース', () => {
    it('複数のサービスインスタンスが独立して動作すること', async () => {
      const service1 = new FishSpeciesDataService();
      const service2 = new FishSpeciesDataService();

      const data1 = await service1.loadSpecies();
      const data2 = await service2.loadSpecies();

      // 異なるインスタンス（キャッシュが独立）
      expect(data1).not.toBe(data2);
      // ただし内容は同じ
      expect(data1).toEqual(data2);
    });

    it('フィルタが異なる場合はキャッシュも独立すること', async () => {
      const officialService = new FishSpeciesDataService({ sourceFilter: 'official' });
      const allService = new FishSpeciesDataService({ sourceFilter: 'all' });

      const officialData = await officialService.loadSpecies();
      const allData = await allService.loadSpecies();

      expect(officialData).not.toBe(allData);
      expect(officialData.length).toBeLessThanOrEqual(allData.length);
    });
  });

  describe('シングルトンインスタンス', () => {
    it('エクスポートされたシングルトンが使用できること', async () => {
      const { fishSpeciesDataService } = await import('../FishSpeciesDataService');
      expect(fishSpeciesDataService).toBeInstanceOf(FishSpeciesDataService);
    });

    it('シングルトンインスタンスが正常にデータを読み込めること', async () => {
      const { fishSpeciesDataService } = await import('../FishSpeciesDataService');
      const species = await fishSpeciesDataService.loadSpecies();
      expect(species.length).toBeGreaterThan(0);
    });
  });
});

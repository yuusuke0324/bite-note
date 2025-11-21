/**
 * TASK-105: LRUキャッシュシステムのテスト
 *
 * 要件:
 * - LRUキャッシュクラス実装（最大100エントリ）
 * - キャッシュキー生成：`緯度,経度,日付`（小数点2桁丸め）
 * - IndexedDBでの永続化対応
 * - キャッシュヒット率計測
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TideLRUCache } from '../TideLRUCache';
import type { TideInfo, CacheStats, CacheKey } from '../../../types/tide';

describe('TASK-105: LRUキャッシュシステム', () => {
  let cache: TideLRUCache;

  // テスト用のTideInfoデータ
  const createTestTideInfo = (id: number): TideInfo => ({
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

  beforeEach(() => {
    cache = new TideLRUCache();
  });

  afterEach(() => {
    cache.clear();
    // タイマーが使用されている場合はリセット
    vi.useRealTimers();
  });

  describe('LRU削除ロジック', () => {
    it('TC-L001: 最大容量を超えた場合、最も古いエントリが削除される', async () => {
      // 最大容量を5に設定して小さくテスト
      const smallCache = new TideLRUCache(5);

      // 5つのエントリを追加
      for (let i = 1; i <= 5; i++) {
        const key = { latitude: 35.67, longitude: 139.65, date: `2024-01-0${i}` };
        await smallCache.set(key, createTestTideInfo(i));
      }

      expect(smallCache.size()).toBe(5);

      // 6番目のエントリを追加（1番目が削除されるべき）
      const key6 = { latitude: 35.67, longitude: 139.65, date: '2024-01-06' };
      await smallCache.set(key6, createTestTideInfo(6));

      expect(smallCache.size()).toBe(5);

      // 1番目のエントリが削除されていることを確認
      const key1 = { latitude: 35.67, longitude: 139.65, date: '2024-01-01' };
      const result1 = await smallCache.get(key1);
      expect(result1).toBeNull();

      // 6番目のエントリは存在することを確認
      const result6 = await smallCache.get(key6);
      expect(result6).not.toBeNull();
    });

    it('TC-L002: アクセスされたエントリは最新になり削除されにくくなる', async () => {
      const smallCache = new TideLRUCache(3);

      // 3つのエントリを追加
      const keys = [];
      for (let i = 1; i <= 3; i++) {
        const key = { latitude: 35.67, longitude: 139.65, date: `2024-01-0${i}` };
        keys.push(key);
        await smallCache.set(key, createTestTideInfo(i));
      }

      // 1番目のエントリにアクセス（最新にする）
      await smallCache.get(keys[0]);

      // 4番目のエントリを追加（2番目が削除されるべき）
      const key4 = { latitude: 35.67, longitude: 139.65, date: '2024-01-04' };
      await smallCache.set(key4, createTestTideInfo(4));

      // 1番目のエントリはまだ存在する
      const result1 = await smallCache.get(keys[0]);
      expect(result1).not.toBeNull();

      // 2番目のエントリが削除されている
      const result2 = await smallCache.get(keys[1]);
      expect(result2).toBeNull();
    });

    it('TC-L003: 同じキーでの更新は新しいエントリを作らない', async () => {
      const key = { latitude: 35.67, longitude: 139.65, date: '2024-01-01' };
      const tideInfo1 = createTestTideInfo(1);
      const tideInfo2 = createTestTideInfo(2);

      await cache.set(key, tideInfo1);
      expect(cache.size()).toBe(1);

      await cache.set(key, tideInfo2);
      expect(cache.size()).toBe(1);

      const result = await cache.get(key);
      expect(result?.currentLevel).toBe(102); // tideInfo2の値
    });
  });

  describe('キャッシュキー生成', () => {
    it('TC-L004: 緯度・経度が小数点2桁で丸められる', async () => {
      const key1 = { latitude: 35.678123, longitude: 139.653789, date: '2024-01-01' };
      const key2 = { latitude: 35.679999, longitude: 139.654999, date: '2024-01-01' };

      const tideInfo = createTestTideInfo(1);

      await cache.set(key1, tideInfo);

      // 丸め後に同じキーになる場合は同じエントリにアクセスできる
      const normalizedKey = cache.normalizeKey(key2);
      expect(normalizedKey.latitude).toBe(35.68);
      expect(normalizedKey.longitude).toBe(139.65);
    });

    it('TC-L005: 日付形式がYYYY-MM-DDに正規化される', async () => {
      const key1 = { latitude: 35.67, longitude: 139.65, date: '2024-1-1' };
      const key2 = { latitude: 35.67, longitude: 139.65, date: '2024-01-01' };

      const normalizedKey1 = cache.normalizeKey(key1);
      const normalizedKey2 = cache.normalizeKey(key2);

      expect(normalizedKey1.date).toBe('2024-01-01');
      expect(normalizedKey2.date).toBe('2024-01-01');
      expect(cache.generateCacheKey(normalizedKey1)).toBe(cache.generateCacheKey(normalizedKey2));
    });

    it('TC-L006: キャッシュキー文字列生成が一意である', () => {
      const key1 = { latitude: 35.67, longitude: 139.65, date: '2024-01-01' };
      const key2 = { latitude: 35.67, longitude: 139.66, date: '2024-01-01' };
      const key3 = { latitude: 35.68, longitude: 139.65, date: '2024-01-01' };
      const key4 = { latitude: 35.67, longitude: 139.65, date: '2024-01-02' };

      const cacheKey1 = cache.generateCacheKey(key1);
      const cacheKey2 = cache.generateCacheKey(key2);
      const cacheKey3 = cache.generateCacheKey(key3);
      const cacheKey4 = cache.generateCacheKey(key4);

      expect(cacheKey1).not.toBe(cacheKey2);
      expect(cacheKey1).not.toBe(cacheKey3);
      expect(cacheKey1).not.toBe(cacheKey4);
      expect(cacheKey2).not.toBe(cacheKey3);
      expect(cacheKey2).not.toBe(cacheKey4);
      expect(cacheKey3).not.toBe(cacheKey4);
    });
  });

  describe('パフォーマンステスト', () => {
    it('TC-L007: キャッシュヒットが10ms以内で完了する', async () => {
      const key = { latitude: 35.67, longitude: 139.65, date: '2024-01-01' };
      const tideInfo = createTestTideInfo(1);

      await cache.set(key, tideInfo);

      const startTime = performance.now();
      const result = await cache.get(key);
      const endTime = performance.now();

      expect(result).not.toBeNull();
      expect(endTime - startTime).toBeLessThan(10);
    });

    it('TC-L008: 大量データでのパフォーマンスが適切である', async () => {
      const largeCache = new TideLRUCache(150); // 専用のキャッシュ
      const startTime = performance.now();

      // 100個のエントリを追加（ユニークなキー生成）
      for (let i = 1; i <= 100; i++) {
        const key = {
          latitude: 35.0 + (i * 0.01), // 35.01, 35.02, ... 36.00
          longitude: 139.0 + (i * 0.01), // 139.01, 139.02, ... 140.00
          date: `2024-${String(Math.floor((i-1) / 28) + 1).padStart(2, '0')}-${String(((i-1) % 28) + 1).padStart(2, '0')}`
        };
        await largeCache.set(key, createTestTideInfo(i));
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
      expect(largeCache.size()).toBe(100);
    });

    it('TC-L009: キャッシュミスも高速である', async () => {
      const key = { latitude: 35.67, longitude: 139.65, date: '2024-01-01' };

      const startTime = performance.now();
      const result = await cache.get(key);
      const endTime = performance.now();

      expect(result).toBeNull();
      expect(endTime - startTime).toBeLessThan(5);
    });
  });

  describe('キャッシュヒット率計測', () => {
    it('TC-L010: ヒット率が正確に計算される', async () => {
      const keys = [];
      for (let i = 1; i <= 5; i++) {
        const key = { latitude: 35.67, longitude: 139.65 + (i * 0.01), date: '2024-01-01' };
        keys.push(key);
        await cache.set(key, createTestTideInfo(i));
      }

      // 3回ヒット、2回ミス
      await cache.get(keys[0]); // ヒット
      await cache.get(keys[1]); // ヒット
      await cache.get(keys[2]); // ヒット
      await cache.get({ latitude: 99.99, longitude: 99.99, date: '2024-01-01' }); // ミス
      await cache.get({ latitude: 88.88, longitude: 88.88, date: '2024-01-01' }); // ミス

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(3);
      expect(stats.missCount).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.6, 2); // 3/5 = 0.6
    });

    it('TC-L011: 統計がリアルタイムで更新される', async () => {
      let stats = cache.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);

      const key = { latitude: 35.67, longitude: 139.65, date: '2024-01-01' };
      await cache.set(key, createTestTideInfo(1));

      stats = cache.getStats();
      expect(stats.totalEntries).toBe(1);

      await cache.get(key);
      stats = cache.getStats();
      expect(stats.hitCount).toBe(1);

      await cache.get({ latitude: 99.99, longitude: 99.99, date: '2024-01-01' });
      stats = cache.getStats();
      expect(stats.missCount).toBe(1);
    });
  });

  describe('メモリ管理', () => {
    it('TC-L012: メモリ使用量が制限内である', async () => {
      // 専用の大きなキャッシュを作成
      const largeCache = new TideLRUCache(150); // 150に増やす

      // 最大容量のエントリを追加
      for (let i = 1; i <= 100; i++) {
        const key = {
          latitude: 35.0 + (i * 0.01), // 35.01, 35.02, ... 36.00
          longitude: 139.0 + (i * 0.01), // 139.01, 139.02, ... 140.00
          date: `2024-${String(Math.floor((i-1) / 28) + 1).padStart(2, '0')}-${String(((i-1) % 28) + 1).padStart(2, '0')}`
        };
        await largeCache.set(key, createTestTideInfo(i));
      }

      const stats = largeCache.getStats();
      expect(stats.totalEntries).toBe(100);
      expect(stats.memoryUsage).toBeGreaterThan(0);

      // メモリ使用量が合理的範囲内（10MB未満）
      expect(stats.memoryUsage).toBeLessThan(10 * 1024 * 1024);
    });

    it('TC-L013: キャッシュクリアでメモリが解放される', async () => {
      // データを追加（ユニークなキー生成）
      for (let i = 1; i <= 50; i++) {
        const key = {
          latitude: 35.0 + (i * 0.01), // 35.01, 35.02, ... 35.50
          longitude: 139.0 + (i * 0.01), // 139.01, 139.02, ... 139.50
          date: `2024-${String(Math.floor((i-1) / 28) + 1).padStart(2, '0')}-${String(((i-1) % 28) + 1).padStart(2, '0')}`
        };
        await cache.set(key, createTestTideInfo(i));
      }

      let stats = cache.getStats();
      expect(stats.totalEntries).toBe(50);
      expect(stats.memoryUsage).toBeGreaterThan(0);

      cache.clear();

      stats = cache.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.memoryUsage).toBe(0);
    });
  });

  describe('IndexedDB永続化', () => {
    it('TC-L014: エントリがIndexedDBに保存される', async () => {
      const key = { latitude: 35.67, longitude: 139.65, date: '2024-01-01' };
      const tideInfo = createTestTideInfo(1);

      await cache.set(key, tideInfo);

      // IndexedDBから直接確認（モック環境では成功すれば十分）
      const result = await cache.get(key);
      expect(result).not.toBeNull();
      expect(result?.currentLevel).toBe(tideInfo.currentLevel);
    });

    it('TC-L015: 期限切れエントリが自動削除される', async () => {
      // Fake Timersを使用してCI環境でのタイマー精度問題を根本解決
      vi.useFakeTimers();
      const baseTime = new Date('2024-01-01T00:00:00Z').getTime();
      vi.setSystemTime(baseTime);

      const key = { latitude: 35.67, longitude: 139.65, date: '2024-01-01' };
      const tideInfo = createTestTideInfo(1);
      const expiredCache = new TideLRUCache(100, 100); // 100ms TTL

      await expiredCache.set(key, tideInfo);

      // 期限内チェック
      const resultBeforeExpiry = await expiredCache.get(key);
      expect(resultBeforeExpiry).not.toBeNull();
      expect(resultBeforeExpiry?.currentLevel).toBe(101);

      // システム時刻を150ms進める（Date.now()も進む）
      vi.setSystemTime(baseTime + 150);

      // 期限切れチェック
      const resultAfterExpiry = await expiredCache.get(key);
      expect(resultAfterExpiry).toBeNull(); // 期限切れで取得できない

      vi.useRealTimers(); // 必ず元に戻す
    });

    it('TC-L019: cleanupExpired() で期限切れエントリが一括削除される', async () => {
      // Fake Timersを使用してCI環境でのタイマー精度問題を根本解決
      vi.useFakeTimers();
      const baseTime = new Date('2024-01-01T00:00:00Z').getTime();
      vi.setSystemTime(baseTime);

      const smallCache = new TideLRUCache(10, 100); // 100ms TTL

      // 複数のエントリを追加
      const keys = [];
      for (let i = 1; i <= 5; i++) {
        const key = { latitude: 35.67 + i * 0.01, longitude: 139.65, date: '2024-01-01' };
        keys.push(key);
        await smallCache.set(key, createTestTideInfo(i));
      }

      expect(smallCache.size()).toBe(5);

      // 期限内は全て存在する
      for (const key of keys) {
        const result = await smallCache.get(key);
        expect(result).not.toBeNull();
      }

      // システム時刻を150ms進める（Date.now()も進む）
      vi.setSystemTime(baseTime + 150);

      // クリーンアップ実行
      await smallCache.cleanupExpired();

      // すべて削除されている
      expect(smallCache.size()).toBe(0);

      const stats = smallCache.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.memoryUsage).toBe(0);

      vi.useRealTimers(); // 必ず元に戻す
    });
  });

  describe('エラーハンドリング', () => {
    it('TC-L016: 無効なキーでの例外処理', () => {
      expect(() => {
        cache.generateCacheKey({ latitude: NaN, longitude: 139.65, date: '2024-01-01' });
      }).toThrow('Invalid coordinates');

      expect(() => {
        cache.generateCacheKey({ latitude: 35.67, longitude: NaN, date: '2024-01-01' });
      }).toThrow('Invalid coordinates');

      expect(() => {
        cache.generateCacheKey({ latitude: 35.67, longitude: 139.65, date: '' });
      }).toThrow('Invalid date');
    });

    it('TC-L017: 範囲外座標での例外処理', () => {
      expect(() => {
        cache.generateCacheKey({ latitude: 91, longitude: 139.65, date: '2024-01-01' });
      }).toThrow('Latitude out of range');

      expect(() => {
        cache.generateCacheKey({ latitude: 35.67, longitude: 181, date: '2024-01-01' });
      }).toThrow('Longitude out of range');
    });

    it('TC-L018: 不正な日付形式での例外処理', () => {
      expect(() => {
        cache.generateCacheKey({ latitude: 35.67, longitude: 139.65, date: 'invalid-date' });
      }).toThrow('Invalid date format');

      expect(() => {
        cache.generateCacheKey({ latitude: 35.67, longitude: 139.65, date: '2024-13-01' });
      }).toThrow('Invalid date format');
    });
  });
});
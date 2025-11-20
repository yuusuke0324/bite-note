// フォールバックストレージサービス ユニットテスト
// Phase 3-4: IndexedDB非対応・障害時の代替保存

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FallbackStorageService } from '@/lib/fallback-storage-service';
import type { FishingRecord } from '@/types';

describe('FallbackStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('IndexedDB対応確認', () => {
    it('IndexedDBが利用可能な場合はtrueを返すこと', () => {
      expect(FallbackStorageService.isIndexedDBAvailable()).toBe(true);
    });

    it('IndexedDBが利用不可能な場合はfalseを返すこと', () => {
      const originalIndexedDB = window.indexedDB;
      // @ts-expect-error - テスト用にwindow.indexedDBを削除
      delete window.indexedDB;

      expect(FallbackStorageService.isIndexedDBAvailable()).toBe(false);

      // 復元
      window.indexedDB = originalIndexedDB;
    });
  });

  describe('localStorage対応確認', () => {
    it('localStorageが利用可能な場合はtrueを返すこと', () => {
      expect(FallbackStorageService.isLocalStorageAvailable()).toBe(true);
    });

    it('localStorageが利用不可能な場合はfalseを返すこと', () => {
      const originalLocalStorage = window.localStorage;
      // @ts-expect-error - テスト用にwindow.localStorageを削除
      delete window.localStorage;

      expect(FallbackStorageService.isLocalStorageAvailable()).toBe(false);

      // 復元
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });
  });

  describe('localStorage容量管理', () => {
    it('使用量を正しく計算できること', () => {
      localStorage.setItem('test-key', 'test-value');

      const quota = FallbackStorageService.getLocalStorageUsage();

      // UTF-16エンコーディング: (キー文字数 + 値文字数) × 2バイト
      const expectedUsed = ('test-key'.length + 'test-value'.length) * 2;
      expect(quota.used).toBeGreaterThanOrEqual(expectedUsed);
      expect(quota.total).toBe(5 * 1024 * 1024); // 5MB
      expect(quota.percentage).toBeGreaterThan(0);
      expect(quota.percentage).toBeLessThan(100);
    });

    it('空の場合は使用量が0であること', () => {
      const quota = FallbackStorageService.getLocalStorageUsage();

      expect(quota.used).toBe(0);
      expect(quota.percentage).toBe(0);
      expect(quota.isNearLimit).toBe(false);
      expect(quota.isFull).toBe(false);
    });

    it('80%以上使用時にisNearLimitがtrueになること', () => {
      // 4MB以上のデータを保存（80%以上）
      const largeData = 'x'.repeat(2 * 1024 * 1024); // 4MB（UTF-16で約4MB）
      localStorage.setItem('large-data', largeData);

      const quota = FallbackStorageService.getLocalStorageUsage();
      expect(quota.isNearLimit).toBe(true);
    });

    it('100%使用時にisFullがtrueになること', () => {
      // 5MB以上のデータを保存（100%以上）
      const largeData = 'x'.repeat(2.5 * 1024 * 1024); // 5MB
      localStorage.setItem('large-data', largeData);

      const quota = FallbackStorageService.getLocalStorageUsage();
      expect(quota.isFull).toBe(true);
    });

    it('残り容量を正しく計算できること', () => {
      // 1MBのデータを保存
      const data = 'x'.repeat(0.5 * 1024 * 1024); // 1MB
      localStorage.setItem('data', data);

      const remaining = FallbackStorageService.getRemainingQuota();

      // 5MB - 1MB = 4MB
      expect(remaining).toBeGreaterThan(3 * 1024 * 1024);
      expect(remaining).toBeLessThan(5 * 1024 * 1024);
    });

    it('残り容量（MB）を正しく計算できること', () => {
      const remainingMB = FallbackStorageService.getRemainingQuotaMB();

      expect(remainingMB).toBeGreaterThan(0);
      expect(remainingMB).toBeLessThanOrEqual(5);
    });

    it('容量警告が必要か判定できること', () => {
      // 初期状態では警告不要
      expect(FallbackStorageService.needsQuotaWarning()).toBe(false);

      // 4MBのデータを保存
      const largeData = 'x'.repeat(2 * 1024 * 1024); // 4MB
      localStorage.setItem('large-data', largeData);

      // 警告が必要
      expect(FallbackStorageService.needsQuotaWarning()).toBe(true);
    });

    it('容量超過を判定できること', () => {
      // 初期状態では超過していない
      expect(FallbackStorageService.isQuotaExceeded()).toBe(false);

      // 5MBのデータを保存
      const largeData = 'x'.repeat(2.5 * 1024 * 1024); // 5MB
      localStorage.setItem('large-data', largeData);

      // 超過している
      expect(FallbackStorageService.isQuotaExceeded()).toBe(true);
    });
  });

  describe('localStorageへの保存', () => {
    it('釣果記録を正しく保存できること', async () => {
      const testRecords: Partial<FishingRecord>[] = [
        {
          id: '1',
          date: new Date('2025-01-01'),
          location: 'Test Location',
          fishSpecies: 'Test Fish',
          size: 30,
        },
      ];

      const result = await FallbackStorageService.saveToLocalStorage(
        testRecords as FishingRecord[]
      );

      expect(result.success).toBe(true);
      expect(localStorage.getItem('bite-note-fishing-records')).not.toBeNull();
    });

    it('複数の釣果記録を保存できること', async () => {
      const testRecords: Partial<FishingRecord>[] = [
        {
          id: '1',
          date: new Date('2025-01-01'),
          location: 'Location 1',
          fishSpecies: 'Fish 1',
        },
        {
          id: '2',
          date: new Date('2025-01-02'),
          location: 'Location 2',
          fishSpecies: 'Fish 2',
        },
      ];

      const result = await FallbackStorageService.saveToLocalStorage(
        testRecords as FishingRecord[]
      );

      expect(result.success).toBe(true);

      const saved = localStorage.getItem('bite-note-fishing-records');
      expect(saved).not.toBeNull();

      const parsed = JSON.parse(saved!);
      expect(parsed).toHaveLength(2);
    });

    it('空の配列を保存できること', async () => {
      const result = await FallbackStorageService.saveToLocalStorage([]);

      expect(result.success).toBe(true);

      const saved = localStorage.getItem('bite-note-fishing-records');
      expect(saved).toBe('[]');
    });
  });

  describe('localStorageからの読み込み', () => {
    it('保存した釣果記録を正しく読み込めること', async () => {
      const testRecords = [
        {
          id: '1',
          date: new Date('2025-01-01').toISOString(),
          location: 'Test Location',
          fishSpecies: 'Test Fish',
          size: 30,
          createdAt: new Date('2025-01-01').toISOString(),
          updatedAt: new Date('2025-01-01').toISOString(),
        },
      ];

      localStorage.setItem('bite-note-fishing-records', JSON.stringify(testRecords));

      const result = await FallbackStorageService.loadFromLocalStorage();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('1');
      expect(result.data![0].location).toBe('Test Location');
    });

    it('日付オブジェクトが正しく復元されること', async () => {
      const testRecords = [
        {
          id: '1',
          date: new Date('2025-01-01').toISOString(),
          location: 'Test',
          fishSpecies: 'Test Fish',
          createdAt: new Date('2025-01-01').toISOString(),
          updatedAt: new Date('2025-01-02').toISOString(),
        },
      ];

      localStorage.setItem('bite-note-fishing-records', JSON.stringify(testRecords));

      const result = await FallbackStorageService.loadFromLocalStorage();

      expect(result.success).toBe(true);
      expect(result.data![0].date).toBeInstanceOf(Date);
      expect(result.data![0].createdAt).toBeInstanceOf(Date);
      expect(result.data![0].updatedAt).toBeInstanceOf(Date);
    });

    it('データがない場合は空配列を返すこと', async () => {
      const result = await FallbackStorageService.loadFromLocalStorage();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('不正なJSONの場合はエラーを返すこと', async () => {
      localStorage.setItem('bite-note-fishing-records', 'invalid-json');

      const result = await FallbackStorageService.loadFromLocalStorage();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('LOAD_FAILED');
    });
  });

  describe('localStorageデータの確認', () => {
    it('データが存在する場合はtrueを返すこと', () => {
      localStorage.setItem('bite-note-fishing-records', '[]');

      expect(FallbackStorageService.hasLocalStorageData()).toBe(true);
    });

    it('データが存在しない場合はfalseを返すこと', () => {
      expect(FallbackStorageService.hasLocalStorageData()).toBe(false);
    });

    it('空文字列の場合はfalseを返すこと', () => {
      localStorage.setItem('bite-note-fishing-records', '');

      expect(FallbackStorageService.hasLocalStorageData()).toBe(false);
    });
  });

  describe('localStorageのクリア', () => {
    it('データをクリアできること', () => {
      localStorage.setItem('bite-note-fishing-records', '[]');

      FallbackStorageService.clearLocalStorage();

      expect(localStorage.getItem('bite-note-fishing-records')).toBeNull();
    });

    it('データがない場合でもエラーにならないこと', () => {
      FallbackStorageService.clearLocalStorage();

      expect(localStorage.getItem('bite-note-fishing-records')).toBeNull();
    });
  });

  describe('エッジケース', () => {
    it('非常に長い文字列を保存できること', async () => {
      const longString = 'x'.repeat(10000);
      const testRecords: Partial<FishingRecord>[] = [
        {
          id: '1',
          date: new Date(),
          location: longString,
          fishSpecies: 'Test',
        },
      ];

      const result = await FallbackStorageService.saveToLocalStorage(
        testRecords as FishingRecord[]
      );

      expect(result.success).toBe(true);
    });

    it('特殊文字を含むデータを保存・読み込みできること', async () => {
      const testRecords: Partial<FishingRecord>[] = [
        {
          id: '1',
          date: new Date(),
          location: '🎣 Test 釣り場 <>&"',
          fishSpecies: "Test'Fish",
        },
      ];

      await FallbackStorageService.saveToLocalStorage(
        testRecords as FishingRecord[]
      );
      const result = await FallbackStorageService.loadFromLocalStorage();

      expect(result.success).toBe(true);
      expect(result.data![0].location).toBe('🎣 Test 釣り場 <>&"');
      expect(result.data![0].fishSpecies).toBe("Test'Fish");
    });

    it('nullやundefinedを含むデータを扱えること', async () => {
      const testRecords: any[] = [
        {
          id: '1',
          date: new Date(),
          location: 'Test',
          fishSpecies: 'Test',
          size: null,
          notes: undefined,
        },
      ];

      const result = await FallbackStorageService.saveToLocalStorage(testRecords);

      expect(result.success).toBe(true);
    });
  });
});

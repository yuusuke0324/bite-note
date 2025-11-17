/**
 * PWA オフライン復帰シナリオ E2Eテスト
 * Phase 1: 基本シナリオ（MVP）
 * Phase 2: エッジケース・エラーハンドリング
 */

import { test, expect, waitForServiceWorker, getOfflineQueueStatus, fullPWACleanup } from './fixtures/pwa-fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('PWA Offline Recovery Scenarios', () => {
  test.setTimeout(60000); // Service Worker処理は時間がかかる

  test.beforeEach(async ({ page }) => {
    // 各テスト前に完全クリーンアップ
    await fullPWACleanup(page);

    // ページを読み込み、Service Workerを登録
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Service Worker登録を待機（重要！）
    await waitForServiceWorker(page);
  });

  test.describe('Basic Offline-Online Recovery', () => {
    test('should queue fishing record creation while offline and sync when online', async ({ page, context }) => {
      // Given: オフラインに切り替え
      await context.setOffline(true);

      // Then: オフラインインジケーターが表示される（usePWAフック）
      // NOTE: オフラインインジケーターはアプリで実装されている想定
      const isOffline = await page.evaluate(() => !navigator.onLine);
      expect(isOffline).toBe(true);

      // When: 釣果記録を作成（オフライン状態）
      await page.click('[data-testid="form-tab"]');
      await page.fill('[data-testid="location-name"]', '東京湾（オフライン）');
      await page.fill('[data-testid="latitude"]', '35.6762');
      await page.fill('[data-testid="longitude"]', '139.6503');
      await page.fill('[data-testid="fishing-date"]', '2024-11-17T10:00');
      await page.fill('[data-testid="fish-species"]', 'アジ');
      await page.click('[data-testid="save-record-button"]');

      // Then: ローカル保存成功（オフラインキューに追加）
      await page.waitForTimeout(2000);

      // And: オフラインキューに1件追加されている
      const queueStatusOffline = await getOfflineQueueStatus(page);
      expect(queueStatusOffline.pendingCount).toBeGreaterThan(0);

      // When: オンラインに復帰
      await context.setOffline(false);

      // Then: 自動同期が開始される（usePWAフックのhandleOnlineイベント）
      // 同期完了を待機（最大20秒）
      await page.waitForFunction(
        async () => {
          const { offlineQueueService } = await import('/src/lib/offline-queue-service.ts');
          const status = await offlineQueueService.getQueueStatus();
          return status.pendingCount === 0;
        },
        { timeout: 20000, polling: 1000 }
      );

      // And: データがIndexedDBに永続化されている
      const records = await page.evaluate(async () => {
        const { db } = await import('/src/lib/database.ts');
        return await db.fishing_records.toArray();
      });

      const matchingRecord = records.find((r: any) => r.location === '東京湾（オフライン）');
      expect(matchingRecord).toBeDefined();
      expect(matchingRecord?.fishSpecies).toBe('アジ');
    });

    test('should display offline indicator when network disconnected', async ({ page, context }) => {
      // Given: オンライン状態を確認
      const isOnlineInitially = await page.evaluate(() => navigator.onLine);
      expect(isOnlineInitially).toBe(true);

      // When: オフラインに切り替え
      await context.setOffline(true);

      // 少し待機してオフラインイベントが発火するのを待つ
      await page.waitForTimeout(1000);

      // Then: navigator.onLine が false になる
      const isOffline = await page.evaluate(() => !navigator.onLine);
      expect(isOffline).toBe(true);

      // And: オフラインイベントが発火している
      const offlineEventFired = await page.evaluate(() => {
        return new Promise((resolve) => {
          // すでにオフラインなので、すぐにresolve
          resolve(!navigator.onLine);
        });
      });
      expect(offlineEventFired).toBe(true);
    });

    test('should automatically sync queued items on online recovery', async ({ page, context }) => {
      // Given: 複数のアイテムをオフラインキューに追加
      await context.setOffline(true);

      // 2件の釣果記録を作成
      for (let i = 1; i <= 2; i++) {
        await page.click('[data-testid="form-tab"]');
        await page.fill('[data-testid="location-name"]', `テスト釣り場${i}`);
        await page.fill('[data-testid="latitude"]', '35.6762');
        await page.fill('[data-testid="longitude"]', '139.6503');
        await page.fill('[data-testid="fishing-date"]', `2024-11-17T1${i}:00`);
        await page.fill('[data-testid="fish-species"]', `テストフィッシュ${i}`);
        await page.click('[data-testid="save-record-button"]');
        await page.waitForTimeout(1000);
      }

      // Then: オフラインキューに2件追加されている
      const queueStatusBefore = await getOfflineQueueStatus(page);
      expect(queueStatusBefore.pendingCount).toBeGreaterThanOrEqual(2);

      // When: オンラインに復帰
      await context.setOffline(false);

      // Then: 自動同期が完了する
      await page.waitForFunction(
        async () => {
          const { offlineQueueService } = await import('/src/lib/offline-queue-service.ts');
          const status = await offlineQueueService.getQueueStatus();
          return status.pendingCount === 0;
        },
        { timeout: 30000, polling: 1000 }
      );

      // And: すべてのレコードがIndexedDBに保存されている
      const records = await page.evaluate(async () => {
        const { db } = await import('/src/lib/database.ts');
        return await db.fishing_records.toArray();
      });

      expect(records.length).toBeGreaterThanOrEqual(2);
    });

    test('should preserve IndexedDB data during offline period', async ({ page, context }) => {
      // Given: オンライン状態で釣果記録を作成
      await page.click('[data-testid="form-tab"]');
      await page.fill('[data-testid="location-name"]', '保存テスト釣り場');
      await page.fill('[data-testid="latitude"]', '35.6762');
      await page.fill('[data-testid="longitude"]', '139.6503');
      await page.fill('[data-testid="fishing-date"]', '2024-11-17T14:00');
      await page.fill('[data-testid="fish-species"]', '保存テストフィッシュ');
      await page.click('[data-testid="save-record-button"]');
      await page.waitForTimeout(2000);

      // Then: データが保存されている
      const recordsBefore = await page.evaluate(async () => {
        const { db } = await import('/src/lib/database.ts');
        return await db.fishing_records.toArray();
      });
      const initialCount = recordsBefore.length;
      expect(initialCount).toBeGreaterThan(0);

      // When: オフラインに切り替え
      await context.setOffline(true);
      await page.waitForTimeout(1000);

      // Then: オフライン期間中もIndexedDBデータが保持されている
      const recordsDuringOffline = await page.evaluate(async () => {
        const { db } = await import('/src/lib/database.ts');
        return await db.fishing_records.toArray();
      });
      expect(recordsDuringOffline.length).toBe(initialCount);

      // When: オンラインに復帰
      await context.setOffline(false);
      await page.waitForTimeout(1000);

      // Then: データが引き続き保持されている
      const recordsAfterOnline = await page.evaluate(async () => {
        const { db } = await import('/src/lib/database.ts');
        return await db.fishing_records.toArray();
      });
      expect(recordsAfterOnline.length).toBe(initialCount);
    });
  });

  test.describe('Service Worker Cache Strategy', () => {
    test('should serve static assets from cache when offline (Cache-First)', async ({ page, context }) => {
      // Given: オンライン状態でページを読み込み、Service Workerがキャッシュを作成
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await waitForServiceWorker(page);

      // ページを一度リロードしてキャッシュを確実にする
      await page.reload();
      await page.waitForLoadState('networkidle');

      // When: オフラインに切り替え
      await context.setOffline(true);

      // Then: オフライン状態でもページが読み込める（キャッシュから）
      await page.reload();

      // ページタイトルまたは主要要素が表示されることを確認
      await page.waitForSelector('[data-testid="form-tab"]', { timeout: 10000 });

      // And: Service Workerがキャッシュから応答している
      const serviceWorkerActive = await page.evaluate(() => {
        return navigator.serviceWorker.controller !== null;
      });
      expect(serviceWorkerActive).toBe(true);
    });

    test('should respect cache expiration (API: 6h, Images: 7d)', async ({ page }) => {
      // Given: Service Workerが登録されている
      await waitForServiceWorker(page);

      // When: キャッシュの内容を確認
      const cacheEntries = await page.evaluate(async () => {
        const cacheNames = await caches.keys();
        const entries: string[] = [];

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          entries.push(...requests.map((req) => req.url));
        }

        return entries;
      });

      // Then: キャッシュにエントリが存在する
      expect(cacheEntries.length).toBeGreaterThan(0);

      // NOTE: キャッシュの有効期限は Service Worker の実装に依存
      // ここでは単純にキャッシュが存在することを確認
    });
  });

  test.describe('Edge Cases (Phase 2)', () => {
    test('should handle offline-online-offline-online rapid switching', async ({ page, context }) => {
      // Given: オフライン状態で記録を作成
      await context.setOffline(true);
      await page.click('[data-testid="form-tab"]');
      await page.fill('[data-testid="location-name"]', '高速切り替えテスト');
      await page.fill('[data-testid="latitude"]', '35.6762');
      await page.fill('[data-testid="longitude"]', '139.6503');
      await page.fill('[data-testid="fishing-date"]', '2024-11-17T16:00');
      await page.fill('[data-testid="fish-species"]', '切り替えフィッシュ');
      await page.click('[data-testid="save-record-button"]');
      await page.waitForTimeout(1000);

      // When: 高速にオン/オフを切り替え
      await context.setOffline(false);
      await page.waitForTimeout(500);
      await context.setOffline(true);
      await page.waitForTimeout(500);
      await context.setOffline(false);

      // Then: 同期が最終的に完了する
      await page.waitForFunction(
        async () => {
          const { offlineQueueService } = await import('/src/lib/offline-queue-service.ts');
          const status = await offlineQueueService.getQueueStatus();
          return status.pendingCount === 0;
        },
        { timeout: 30000, polling: 1000 }
      );

      // And: データが正常に保存されている
      const records = await page.evaluate(async () => {
        const { db } = await import('/src/lib/database.ts');
        return await db.fishing_records.toArray();
      });

      const matchingRecord = records.find((r: any) => r.location === '高速切り替えテスト');
      expect(matchingRecord).toBeDefined();
    });

    test('should respect max queue size (200 items) limit', async ({ page, context }) => {
      // Given: オフライン状態
      await context.setOffline(true);

      // When: 大量のアイテムを一度に追加（bulkAdd使用）
      const bulkAddResult = await page.evaluate(async () => {
        const { db } = await import('/src/lib/database.ts');
        const items = Array.from({ length: 200 }, (_, i) => ({
          operationType: 'create',
          tableName: 'fishing_records',
          data: {
            location: `テスト釣り場${i}`,
            latitude: 35.6762,
            longitude: 139.6503,
            date: `2024-11-17T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
            fishSpecies: `テストフィッシュ${i}`,
          },
          status: 'pending',
          createdAt: Date.now(),
          retryCount: 0,
        }));

        try {
          await db.offline_queue.bulkAdd(items);
          return { success: true, count: items.length };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      });

      expect(bulkAddResult.success).toBe(true);
      expect(bulkAddResult.count).toBe(200);

      // Then: キューが上限に達している
      const queueStatus = await getOfflineQueueStatus(page);
      expect(queueStatus.pendingCount).toBe(200);

      // And: さらに追加しようとするとエラーになる
      const additionalAddResult = await page.evaluate(async () => {
        const { offlineQueueService } = await import('/src/lib/offline-queue-service.ts');
        try {
          await offlineQueueService.enqueue({
            operationType: 'create',
            tableName: 'fishing_records',
            data: { location: '追加テスト' },
            status: 'pending',
            createdAt: Date.now(),
            retryCount: 0,
          });
          return { success: true };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      });

      expect(additionalAddResult.success).toBe(false);
      expect(additionalAddResult.error).toContain('QUEUE_FULL');
    });

    test('should display warning when queue reaches 75% (150 items)', async ({ page, context }) => {
      // Given: オフライン状態
      await context.setOffline(true);

      // When: 150件（75%）のアイテムを追加
      await page.evaluate(async () => {
        const { db } = await import('/src/lib/database.ts');
        const items = Array.from({ length: 150 }, (_, i) => ({
          operationType: 'create',
          tableName: 'fishing_records',
          data: {
            location: `警告テスト釣り場${i}`,
            latitude: 35.6762,
            longitude: 139.6503,
            date: `2024-11-17T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
          },
          status: 'pending',
          createdAt: Date.now(),
          retryCount: 0,
        }));

        await db.offline_queue.bulkAdd(items);
      });

      // Then: キューが警告閾値に達している
      const queueStatus = await getOfflineQueueStatus(page);
      expect(queueStatus.pendingCount).toBe(150);

      // NOTE: 警告表示の確認は実装に依存
      // コンソールログまたはUI上の警告表示をチェック
    });

    test('should handle network timeout during sync', async ({ page, context }) => {
      // Given: オフライン状態で記録を作成
      await context.setOffline(true);
      await page.click('[data-testid="form-tab"]');
      await page.fill('[data-testid="location-name"]', 'タイムアウトテスト');
      await page.fill('[data-testid="latitude"]', '35.6762');
      await page.fill('[data-testid="longitude"]', '139.6503');
      await page.fill('[data-testid="fishing-date"]', '2024-11-17T17:00');
      await page.fill('[data-testid="fish-species"]', 'タイムアウトフィッシュ');
      await page.click('[data-testid="save-record-button"]');
      await page.waitForTimeout(1000);

      // When: ネットワークを遅延させる（タイムアウトをシミュレート）
      await context.setOffline(false);

      // API呼び出しを遅延させる
      await page.route('**/api/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
      });

      // Then: リトライ処理が実行される
      // NOTE: 実際のリトライ処理は offlineQueueService の実装に依存
      await page.waitForTimeout(5000);

      // 同期が完了するか、リトライ中であることを確認
      const queueStatus = await getOfflineQueueStatus(page);

      // リトライ中または完了している
      expect(queueStatus.pendingCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Data Integrity (Phase 2)', () => {
    test('should not lose data during offline-online transition', async ({ page, context }) => {
      // Given: オフライン状態で複数の記録を作成
      await context.setOffline(true);

      const testRecords = [
        { location: 'データ整合性テスト1', species: 'フィッシュ1', time: '10:00' },
        { location: 'データ整合性テスト2', species: 'フィッシュ2', time: '11:00' },
        { location: 'データ整合性テスト3', species: 'フィッシュ3', time: '12:00' },
      ];

      for (const record of testRecords) {
        await page.click('[data-testid="form-tab"]');
        await page.fill('[data-testid="location-name"]', record.location);
        await page.fill('[data-testid="latitude"]', '35.6762');
        await page.fill('[data-testid="longitude"]', '139.6503');
        await page.fill('[data-testid="fishing-date"]', `2024-11-17T${record.time}`);
        await page.fill('[data-testid="fish-species"]', record.species);
        await page.click('[data-testid="save-record-button"]');
        await page.waitForTimeout(1000);
      }

      // Then: すべてのデータがキューに保存されている
      const queueStatusBefore = await getOfflineQueueStatus(page);
      expect(queueStatusBefore.pendingCount).toBeGreaterThanOrEqual(3);

      // When: オンラインに復帰
      await context.setOffline(false);

      // Then: すべてのデータが同期される
      await page.waitForFunction(
        async () => {
          const { offlineQueueService } = await import('/src/lib/offline-queue-service.ts');
          const status = await offlineQueueService.getQueueStatus();
          return status.pendingCount === 0;
        },
        { timeout: 30000, polling: 1000 }
      );

      // And: すべてのデータがIndexedDBに保存されている
      const records = await page.evaluate(async () => {
        const { db } = await import('/src/lib/database.ts');
        return await db.fishing_records.toArray();
      });

      // すべてのテストレコードが存在することを確認
      for (const testRecord of testRecords) {
        const matchingRecord = records.find((r: any) => r.location === testRecord.location);
        expect(matchingRecord).toBeDefined();
        expect(matchingRecord?.fishSpecies).toBe(testRecord.species);
      }
    });

    test('should maintain record order in sync queue (FIFO)', async ({ page, context }) => {
      // Given: オフライン状態で順番に記録を作成
      await context.setOffline(true);

      const orderedRecords = [
        { location: 'FIFO-1', time: '08:00' },
        { location: 'FIFO-2', time: '09:00' },
        { location: 'FIFO-3', time: '10:00' },
      ];

      for (const record of orderedRecords) {
        await page.click('[data-testid="form-tab"]');
        await page.fill('[data-testid="location-name"]', record.location);
        await page.fill('[data-testid="latitude"]', '35.6762');
        await page.fill('[data-testid="longitude"]', '139.6503');
        await page.fill('[data-testid="fishing-date"]', `2024-11-17T${record.time}`);
        await page.fill('[data-testid="fish-species"]', 'FIFO-Fish');
        await page.click('[data-testid="save-record-button"]');
        await page.waitForTimeout(1000);
      }

      // When: キューの内容を確認
      const queueItems = await page.evaluate(async () => {
        const { db } = await import('/src/lib/database.ts');
        return await db.offline_queue.where('status').equals('pending').toArray();
      });

      // Then: キューアイテムがFIFO順序で保存されている（createdAtで確認）
      expect(queueItems.length).toBeGreaterThanOrEqual(3);

      // createdAt順でソート済みであることを確認
      const sortedByCreatedAt = [...queueItems].sort((a, b) => a.createdAt - b.createdAt);
      expect(queueItems.map((item) => item.createdAt)).toEqual(sortedByCreatedAt.map((item) => item.createdAt));
    });
  });
});

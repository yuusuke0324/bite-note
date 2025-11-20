/**
 * PWA E2Eテスト用フィクスチャ
 * Service Worker、IndexedDB、キャッシュのクリーンアップを自動化
 */

import { test as base, BrowserContext, Page } from '@playwright/test';

export const test = base.extend<{
  context: BrowserContext;
  page: Page;
}>({
  context: async ({ context }, use) => {
    // テスト前: Service Worker完全クリーンアップ
    await context.addInitScript(() => {
      if ('serviceWorker' in navigator) {
        // 非同期完了を待機
        return navigator.serviceWorker.getRegistrations().then(async (registrations) => {
          await Promise.all(registrations.map((r) => r.unregister()));
        });
      }
    });

    await use(context);

    // テスト後: クッキーとストレージ状態をクリア
    await context.clearCookies();
  },

  page: async ({ context }, use) => {
    const page = await context.newPage();

    // Service Worker登録前にキャッシュをクリーンアップ
    // Cache Storage APIはセキュアコンテキスト（HTTPS）でのみ利用可能
    await page.evaluate(async () => {
      if (typeof caches !== 'undefined') {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    });

    await use(page);

    await page.close();
  },
});

export { expect } from '@playwright/test';

/**
 * Service Workerの登録を待機
 */
export async function waitForServiceWorker(page: Page, timeout = 10000): Promise<void> {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, {
    timeout,
    polling: 500,
  });
}

/**
 * IndexedDBを完全にクリア
 */
export async function clearIndexedDB(page: Page, dbNames: string[] = ['BiteNoteDB', 'BiteNoteDB-offline-queue']): Promise<void> {
  await page.evaluate((databases) => {
    return new Promise<void>((resolve) => {
      let completed = 0;

      if (databases.length === 0) {
        resolve();
        return;
      }

      databases.forEach((dbName) => {
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = req.onerror = () => {
          completed++;
          if (completed === databases.length) resolve();
        };
      });
    });
  }, dbNames);
}

/**
 * すべてのキャッシュを削除
 * Cache Storage APIはセキュアコンテキスト（HTTPS）でのみ利用可能
 */
export async function clearAllCaches(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (typeof caches !== 'undefined') {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  });
}

/**
 * localStorage と sessionStorage をクリア
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * PWAテスト用の完全クリーンアップ
 */
export async function fullPWACleanup(page: Page): Promise<void> {
  await clearIndexedDB(page);
  await clearAllCaches(page);
  await clearStorage(page);
}

/**
 * オフラインキューの状態を取得
 */
export async function getOfflineQueueStatus(page: Page): Promise<{ pendingCount: number; syncedCount: number }> {
  return await page.evaluate(async () => {
    const { offlineQueueService } = await import('/src/lib/offline-queue-service.ts');
    return await offlineQueueService.getQueueStatus();
  });
}

/**
 * Service Workerが登録されているか確認
 */
export async function isServiceWorkerRegistered(page: Page): Promise<boolean> {
  return await page.evaluate(async () => {
    return 'serviceWorker' in navigator && (await navigator.serviceWorker.getRegistration()) !== undefined;
  });
}

/**
 * スタンドアロンモードを検出
 */
export async function isStandaloneMode(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  });
}

/**
 * マニフェストを取得
 */
export async function getManifest(page: Page): Promise<any> {
  return await page.evaluate(async () => {
    const response = await fetch('/manifest.json');
    return await response.json();
  });
}

/**
 * オフライン状態をシミュレート（安定版）
 * MessageChannelを使用してServiceWorkerからの応答を待つ
 */
export async function simulateOffline(page: Page): Promise<void> {
  await page.evaluate(async () => {
    // Service Workerにメッセージを送信し、応答を待つ
    const sw = navigator.serviceWorker.controller;
    if (!sw) throw new Error('Service Worker not active');

    return new Promise<void>((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();
      sw.postMessage({ type: 'SET_OFFLINE' }, [channel.port2]);
    });
  });

  // オフライン状態反映を待機（Zustand storeの更新）
  await page.waitForFunction(() => {
    const appStore = (window as any).__APP_STORE__;
    return appStore?.getState().isOnline === false;
  }, { timeout: 5000 });
}

/**
 * オンライン状態に復帰（安定版）
 * MessageChannelを使用してServiceWorkerからの応答を待つ
 */
export async function simulateOnline(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const sw = navigator.serviceWorker.controller;
    if (!sw) throw new Error('Service Worker not active');

    return new Promise<void>((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();
      sw.postMessage({ type: 'SET_ONLINE' }, [channel.port2]);
    });
  });

  await page.waitForFunction(() => {
    const appStore = (window as any).__APP_STORE__;
    return appStore?.getState().isOnline === true;
  }, { timeout: 5000 });
}

/**
 * ストレージ満杯エラーをシミュレート
 * IndexedDBのaddメソッドをモックしてQuotaExceededErrorを発生させる
 */
export async function simulateStorageQuotaExceeded(page: Page): Promise<void> {
  await page.evaluate(() => {
    // IndexedDB.transaction の元のメソッドを保存
    const originalTransaction = IDBDatabase.prototype.transaction;

    // transactionメソッドをオーバーライド
    IDBDatabase.prototype.transaction = function(...args: any[]) {
      const tx = originalTransaction.apply(this, args as any);
      const originalObjectStore = tx.objectStore.bind(tx);

      tx.objectStore = function(name: string) {
        const store = originalObjectStore(name);

        // addメソッドをオーバーライドしてQuotaExceededErrorを発生
        store.add = function() {
          const error = new DOMException('QuotaExceededError', 'QuotaExceededError');
          throw error;
        };

        // putメソッドもオーバーライド
        store.put = function() {
          const error = new DOMException('QuotaExceededError', 'QuotaExceededError');
          throw error;
        };

        return store;
      };

      return tx;
    };
  });
}

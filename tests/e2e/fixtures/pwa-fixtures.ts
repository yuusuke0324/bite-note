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
 * IndexedDB APIはセキュアコンテキスト（HTTPS）でのみ利用可能
 */
export async function clearIndexedDB(page: Page, dbNames: string[] = ['BiteNoteDB', 'BiteNoteDB-offline-queue']): Promise<void> {
  await page.evaluate((databases) => {
    return new Promise<void>((resolve) => {
      // IndexedDB APIが利用できない場合はスキップ
      if (typeof indexedDB === 'undefined') {
        resolve();
        return;
      }

      let completed = 0;

      if (databases.length === 0) {
        resolve();
        return;
      }

      databases.forEach((dbName) => {
        try {
          const req = indexedDB.deleteDatabase(dbName);
          req.onsuccess = req.onerror = () => {
            completed++;
            if (completed === databases.length) resolve();
          };
        } catch (err) {
          // セキュアコンテキストでない場合のエラーをキャッチ
          completed++;
          if (completed === databases.length) resolve();
        }
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
 * Storage APIはセキュアコンテキスト（HTTPS）でのみ利用可能
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    } catch (err) {
      // Access denied の場合はスキップ
    }
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
    } catch (err) {
      // Access denied の場合はスキップ
    }
  });
}

// TODO: Issue #203 - Removed unimplemented PWA features
// - fullPWACleanup
// - getOfflineQueueStatus
// - simulateOffline
// - simulateOnline
// - simulateStorageQuotaExceeded
// These will be implemented when needed

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

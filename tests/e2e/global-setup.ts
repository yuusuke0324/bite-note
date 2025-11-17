import { chromium, FullConfig } from '@playwright/test';

/**
 * Playwright Global Setup
 *
 * 全テスト実行前の共通セットアップ処理
 * - IndexedDB のクリーンアップ
 * - Service Worker のクリア
 * - ブラウザキャッシュのクリア
 *
 * Issue #129: Sharding Strategy の一環として実装
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  if (!baseURL) {
    console.warn('[Global Setup] baseURL が設定されていません。スキップします。');
    return;
  }

  console.log('[Global Setup] テスト環境の初期化を開始...');

  // ブラウザを起動してクリーンアップ
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // アプリケーションにアクセス
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });

    // IndexedDB をクリア
    await page.evaluate(async () => {
      const databases = await window.indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
          console.log(`[Global Setup] IndexedDB削除: ${db.name}`);
        }
      }
    });

    // Service Worker をクリア
    await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('[Global Setup] Service Worker登録解除完了');
      }
    });

    // localStorage と sessionStorage をクリア
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      console.log('[Global Setup] ストレージクリア完了');
    });

    console.log('[Global Setup] テスト環境の初期化が完了しました。');
  } catch (error) {
    console.error('[Global Setup] エラーが発生しました:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;

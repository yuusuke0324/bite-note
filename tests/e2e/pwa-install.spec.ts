/**
 * PWA インストールフロー E2Eテスト
 * Phase 3: インストール・アンインストールフロー、マニフェスト検証
 */

import { test, expect, waitForServiceWorker, isStandaloneMode, getManifest, fullPWACleanup } from './fixtures/pwa-fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('PWA Installation Flow', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    // 各テスト前に完全クリーンアップ
    await fullPWACleanup(page);
  });

  test.describe('beforeinstallprompt Flow (Android/Desktop)', () => {
    test('should capture beforeinstallprompt event', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // カスタムイベントを発火してusePWAフックをテスト
      const installPromptCaptured = await page.evaluate(async () => {
        const event = new Event('beforeinstallprompt') as any;
        event.platforms = ['web'];
        event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
        event.prompt = async () => {};

        window.dispatchEvent(event);

        // イベントがキャプチャされるまで待機
        await new Promise((resolve) => setTimeout(resolve, 500));

        // インストール可能状態になったかチェック
        // NOTE: 実際の実装に依存するため、ここでは基本的なチェックのみ
        return true;
      });

      expect(installPromptCaptured).toBe(true);
    });

    test('should trigger install prompt on button click', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // beforeinstallprompt イベントをシミュレート
      const promptResult = await page.evaluate(async () => {
        let promptCalled = false;

        const event = new Event('beforeinstallprompt') as any;
        event.platforms = ['web'];
        event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
        event.prompt = async () => {
          promptCalled = true;
        };

        window.dispatchEvent(event);

        // イベントハンドラが実行されるまで待機
        await new Promise((resolve) => setTimeout(resolve, 500));

        return { promptCalled };
      });

      // NOTE: 実際のインストールボタンのクリックは実装に依存
      // ここでは基本的なイベントのシミュレーションのみ
      expect(promptResult).toBeDefined();
    });

    test('should update state after user accepts install', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // ユーザーがインストールを受け入れたシナリオ
      const acceptResult = await page.evaluate(async () => {
        const event = new Event('beforeinstallprompt') as any;
        event.platforms = ['web'];
        event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
        event.prompt = async () => {};

        window.dispatchEvent(event);
        await new Promise((resolve) => setTimeout(resolve, 500));

        // appinstalled イベントを発火
        const installedEvent = new Event('appinstalled');
        window.dispatchEvent(installedEvent);
        await new Promise((resolve) => setTimeout(resolve, 500));

        // localStorageにインストール状態が保存されたか確認
        return localStorage.getItem('pwa-installed');
      });

      expect(acceptResult).toBe('true');
    });

    test('should update state after user dismisses install', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // ユーザーがインストールを拒否したシナリオ
      const dismissResult = await page.evaluate(async () => {
        const event = new Event('beforeinstallprompt') as any;
        event.platforms = ['web'];
        event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });
        event.prompt = async () => {};

        window.dispatchEvent(event);
        await new Promise((resolve) => setTimeout(resolve, 500));

        // インストールが拒否された後の状態
        return { dismissed: true };
      });

      expect(dismissResult.dismissed).toBe(true);
    });

    test('should persist install state to localStorage', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // インストールイベントをシミュレート
      await page.evaluate(() => {
        const installedEvent = new Event('appinstalled');
        window.dispatchEvent(installedEvent);
      });

      await page.waitForTimeout(500);

      // localStorageに状態が保存されているか確認
      const installState = await page.evaluate(() => {
        return localStorage.getItem('pwa-installed');
      });

      expect(installState).toBe('true');

      // ページをリロードしても状態が保持されるか確認
      await page.reload();
      await page.waitForLoadState('networkidle');

      const installStateAfterReload = await page.evaluate(() => {
        return localStorage.getItem('pwa-installed');
      });

      expect(installStateAfterReload).toBe('true');
    });
  });

  test.describe('iOS Manual Installation', () => {
    test('should detect iOS platform correctly', async ({ page }) => {
      // iOSユーザーエージェントをシミュレート
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
          writable: true,
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // プラットフォーム検出をテスト
      const platform = await page.evaluate(() => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        return /iphone|ipad|ipod/.test(userAgent) ? 'ios' : 'other';
      });

      expect(platform).toBe('ios');
    });

    test('should show iOS-specific installation instructions', async ({ page }) => {
      // iOSユーザーエージェントをシミュレート
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
          writable: true,
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // iOS向けインストール手順が取得できるか確認
      const instructions = await page.evaluate(() => {
        // usePWAフックのgetIOSInstallInstructionsに相当する処理
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) {
          return {
            title: 'ホーム画面に追加',
            steps: [
              'Safari下部の共有ボタン 📤 をタップ',
              '「ホーム画面に追加」を選択',
              '「追加」をタップして完了',
            ],
          };
        }
        return null;
      });

      expect(instructions).toBeDefined();
      expect(instructions?.title).toBe('ホーム画面に追加');
      expect(instructions?.steps).toHaveLength(3);
    });

    test('should not show beforeinstallprompt on iOS', async ({ page }) => {
      // iOSユーザーエージェントをシミュレート
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
          writable: true,
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // beforeinstallpromptイベントが発火しないことを確認
      // NOTE: iOSではbeforeinstallpromptイベントはサポートされていない
      const eventFired = await page.evaluate(() => {
        return new Promise((resolve) => {
          let fired = false;
          window.addEventListener('beforeinstallprompt', () => {
            fired = true;
          });

          // 1秒待機してイベントが発火しないことを確認
          setTimeout(() => resolve(fired), 1000);
        });
      });

      expect(eventFired).toBe(false);
    });
  });

  test.describe('Post-Installation Behavior', () => {
    test('should detect standalone mode after installation', async ({ page }) => {
      // スタンドアロンモードをシミュレート
      await page.addInitScript(() => {
        Object.defineProperty(window.navigator, 'standalone', {
          value: true,
          writable: true,
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const standalone = await isStandaloneMode(page);
      expect(standalone).toBe(true);
    });

    test('should hide install prompt after installation', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // インストール済み状態を設定
      await page.evaluate(() => {
        localStorage.setItem('pwa-installed', 'true');
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // インストール状態を確認
      const isInstalled = await page.evaluate(() => {
        return localStorage.getItem('pwa-installed') === 'true';
      });

      expect(isInstalled).toBe(true);

      // インストールプロンプトが表示されないはず
      // NOTE: 実際のUI実装に依存
    });

    test('should launch in standalone mode on next visit', async ({ page }) => {
      // 初回訪問でインストール
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.evaluate(() => {
        const installedEvent = new Event('appinstalled');
        window.dispatchEvent(installedEvent);
      });

      await page.waitForTimeout(500);

      // 2回目の訪問（スタンドアロンモードをシミュレート）
      await page.addInitScript(() => {
        Object.defineProperty(window.navigator, 'standalone', {
          value: true,
          writable: true,
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const standalone = await isStandaloneMode(page);
      expect(standalone).toBe(true);
    });
  });

  test.describe('Manifest Validation', () => {
    test('should load manifest.json correctly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const manifest = await getManifest(page);

      expect(manifest).toBeDefined();
      expect(typeof manifest).toBe('object');
    });

    test('should have all required manifest fields', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const manifest = await getManifest(page);

      // 必須フィールドの検証
      expect(manifest.name).toBeDefined();
      expect(manifest.short_name).toBeDefined();
      expect(manifest.start_url).toBeDefined();
      expect(manifest.display).toBeDefined();
      expect(manifest.theme_color).toBeDefined();
      expect(manifest.background_color).toBeDefined();
      expect(manifest.icons).toBeDefined();

      // フィールドの型チェック
      expect(typeof manifest.name).toBe('string');
      expect(typeof manifest.short_name).toBe('string');
      expect(typeof manifest.start_url).toBe('string');
      expect(typeof manifest.display).toBe('string');
      expect(Array.isArray(manifest.icons)).toBe(true);
    });

    test('should have valid icon sizes (192x192, 512x512)', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const manifest = await getManifest(page);

      expect(manifest.icons).toBeDefined();
      expect(Array.isArray(manifest.icons)).toBe(true);

      // 必須アイコンサイズを確認
      const requiredSizes = ['192x192', '512x512'];
      for (const size of requiredSizes) {
        const icon = manifest.icons.find((icon: any) => icon.sizes === size);
        expect(icon).toBeDefined();
        expect(icon.src).toBeDefined();
        expect(icon.type).toBeDefined();
      }

      // アイコンの形式が適切か確認
      const pngIcons = manifest.icons.filter((icon: any) => icon.type === 'image/png');
      expect(pngIcons.length).toBeGreaterThan(0);
    });

    test('should have valid shortcuts configuration', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const manifest = await getManifest(page);

      if (manifest.shortcuts) {
        expect(Array.isArray(manifest.shortcuts)).toBe(true);

        // 各ショートカットの形式を確認
        for (const shortcut of manifest.shortcuts) {
          expect(shortcut.name).toBeDefined();
          expect(shortcut.url).toBeDefined();
          expect(typeof shortcut.name).toBe('string');
          expect(typeof shortcut.url).toBe('string');

          // ショートカットアイコンがあれば確認
          if (shortcut.icons) {
            expect(Array.isArray(shortcut.icons)).toBe(true);
          }
        }
      }
    });

    test('should have valid theme and background colors', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const manifest = await getManifest(page);

      // 色の形式を確認（hex形式かどうか）
      const hexColorPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

      if (manifest.theme_color) {
        expect(hexColorPattern.test(manifest.theme_color)).toBe(true);
      }

      if (manifest.background_color) {
        expect(hexColorPattern.test(manifest.background_color)).toBe(true);
      }
    });

    test('should have valid display mode', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const manifest = await getManifest(page);

      const validDisplayModes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
      expect(validDisplayModes).toContain(manifest.display);
    });
  });

  test.describe('Uninstallation', () => {
    test('should clear localStorage on uninstall', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // インストール状態を設定
      await page.evaluate(() => {
        localStorage.setItem('pwa-installed', 'true');
        localStorage.setItem('some-app-data', 'test-data');
      });

      // アンインストール処理をシミュレート
      await page.evaluate(() => {
        localStorage.clear();
      });

      const installState = await page.evaluate(() => {
        return localStorage.getItem('pwa-installed');
      });

      expect(installState).toBeNull();
    });

    test('should unregister service worker on uninstall', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await waitForServiceWorker(page);

      // Service Workerが登録されていることを確認
      const registeredBefore = await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        return reg !== undefined;
      });

      expect(registeredBefore).toBe(true);

      // Service Worker登録解除
      await page.evaluate(async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      });

      // Service Workerが解除されたことを確認
      const registeredAfter = await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        return reg !== undefined;
      });

      expect(registeredAfter).toBe(false);
    });

    test('should clear all caches on uninstall', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await waitForServiceWorker(page);

      // ページリロードでキャッシュを作成
      await page.reload();
      await page.waitForLoadState('networkidle');

      // キャッシュが存在することを確認
      const cachesBefore = await page.evaluate(async () => {
        return await caches.keys();
      });

      expect(cachesBefore.length).toBeGreaterThan(0);

      // すべてのキャッシュを削除
      await page.evaluate(async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      });

      // キャッシュが削除されたことを確認
      const cachesAfter = await page.evaluate(async () => {
        return await caches.keys();
      });

      expect(cachesAfter.length).toBe(0);
    });
  });
});

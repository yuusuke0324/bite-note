import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * CI環境の最適化 (Issue #129):
 * - タイムアウト: 30秒（テスト）、10秒（アサーション）
 * - ワーカー数: 2（CI）、unlimited（ローカル）
 * - ブラウザ: chromium + PWA（CI）、全ブラウザ（ローカル）
 * - レポート: html + github + list（CI）、html（ローカル）
 * - スクリーンショット・ビデオ: 失敗時のみ（CI）
 *
 * テスト数: 約255個（CI）、約1,107個（ローカル）
 * 推定実行時間: 5-7分（CI）
 *
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* タイムアウト設定を明示 (Issue #129) */
  timeout: 60000,  // 各テスト: 60秒（CI環境を考慮）

  expect: {
    timeout: 15000,  // アサーション: 15秒（CI環境を考慮）
  },

  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* CI環境でも並列化（1 → 2ワーカー） (Issue #129) */
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [['html'], ['github'], ['list']]
    : 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',

    /* スクリーンショットを失敗時のみ (Issue #129) */
    screenshot: process.env.CI ? 'only-on-failure' : 'off',

    /* ビデオを失敗時のみ保存 (Issue #129) */
    video: process.env.CI ? 'retain-on-failure' : 'off',

    /* PWAテスト用のパーミッション設定 (Issue #85) */
    permissions: ['geolocation', 'notifications'],
    geolocation: { latitude: 35.6762, longitude: 139.6503 },

    /* Service Worker有効化（重要！） */
    serviceWorkers: 'allow',
  },

  /* Configure projects for major browsers */
  /* CI環境ではchromium + PWAのみ (Issue #129) */
  projects: process.env.CI
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'pwa-chromium',
          use: {
            ...devices['Desktop Chrome'],
            channel: 'chrome',
          },
          testMatch: /pwa-.*\.spec\.ts/,
        },
      ]
    : [
        // ローカル環境: 全ブラウザ
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
        {
          name: 'Mobile Chrome',
          use: { ...devices['Pixel 5'] },
        },
        {
          name: 'Mobile Safari',
          use: { ...devices['iPhone 12'] },
        },
        {
          name: 'pwa-chromium',
          use: {
            ...devices['Desktop Chrome'],
            channel: 'chrome',
          },
          testMatch: /pwa-.*\.spec\.ts/,
        },
      ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
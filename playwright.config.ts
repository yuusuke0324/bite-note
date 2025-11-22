import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * CI環境の最適化 (Issue #129 - Sharding Strategy):
 * - タイムアウト: 20秒（テスト）、10秒（アサーション）
 * - ワーカー数: 8（CI）、unlimited（ローカル）
 * - Sharding: PR時3並列、main merge時5並列
 * - ブラウザ: chromium（CI・PR時）、chromium + PWA（CI・main時）、全ブラウザ（ローカル）
 * - テスト分類: PR時はSmoke testsのみ、main merge時はFull suite
 * - レポート: html + github + list（CI）、html（ローカル）
 * - スクリーンショット・ビデオ: 失敗時のみ（CI）
 * - webServer: 本番ビルド（CI）、開発サーバー（ローカル）
 *
 * テスト数: 約28個（PR時）、約255個（main merge時）、約1,107個（ローカル）
 * 推定実行時間: 3分（PR時）、8-10分（main merge時）
 *
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* Global setup for test environment initialization (Issue #129) */
  globalSetup: './tests/e2e/global-setup.ts',

  /* タイムアウト設定を最適化 (Issue #129 - Sharding) */
  timeout: 20000,  // 各テスト: 20秒（30秒 → 20秒に短縮）

  expect: {
    timeout: 10000,  // アサーション: 10秒
  },

  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only - リトライなしで高速化 (Issue #129) */
  retries: 0,  // 1 → 0に削減（Sharding導入により不要）
  /* CI環境でワーカー数を8に増加 (Issue #129 - Sharding) */
  workers: process.env.CI ? 8 : undefined,
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
  /* CI環境: PR時はSmoke tests、main merge時はFull suite (Issue #129) */
  projects: process.env.CI
    ? [
        // PR時: Smoke tests（重要なテストのみ + パフォーマンステスト）
        // 注: パフォーマンステストを含めることで、mainマージ前に劣化を検出
        ...(process.env.GITHUB_EVENT_NAME === 'pull_request'
          ? [
              {
                name: 'smoke',
                testMatch: [
                  '**/app-navigation.spec.ts',
                  '**/record-creation-flow.spec.ts',
                  '**/record-list-operations.spec.ts',
                  '**/tide-system-e2e.spec.ts',  // #136: CI品質ゲート強化
                  '**/tide-chart/performance.spec.ts',  // パフォーマンステスト（mainとの差異検出）
                ],
                use: { ...devices['Desktop Chrome'] },
              },
            ]
          : [
              // main merge時: Full suite
              {
                name: 'chromium',
                testMatch: '**/*.spec.ts',
                testIgnore: '**/performance-*.spec.ts',
                use: { ...devices['Desktop Chrome'] },
              },
              {
                name: 'pwa-chromium',
                testMatch: /pwa-.*\.spec\.ts/,
                use: {
                  ...devices['Desktop Chrome'],
                  channel: 'chrome',
                },
              },
            ]),
      ]
    : [
        // ローカル環境: Desktop Chromeのみ（Mobile環境はCI環境で初期化が遅延するため除外）
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        // 将来的にCI環境でMobileテスト専用jobを追加予定
        // {
        //   name: 'firefox',
        //   use: { ...devices['Desktop Firefox'] },
        // },
        // {
        //   name: 'webkit',
        //   use: { ...devices['Desktop Safari'] },
        // },
        // {
        //   name: 'Mobile Chrome',
        //   use: { ...devices['Pixel 5'] },
        // },
        // {
        //   name: 'Mobile Safari',
        //   use: { ...devices['iPhone 12'] },
        // },
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
    reuseExistingServer: !process.env.CI,  // CIでは各shardで新規起動、ローカルでは再利用
    timeout: 120000,  // 2分
    env: {
      VITE_E2E_TEST: 'true',  // E2Eテスト用フラグを設定
    },
  },
});

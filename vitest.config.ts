/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: true,
    // メモリ制限とパフォーマンス改善（最適化版）
    // forksモードを使用してvi.useFakeTimers()のCI環境での安定性を確保（Issue #127対応）
    // threadsモードではfake timersがワーカースレッド全体でグローバルになり、
    // 並列実行時に他テストと競合する問題が発生するため、プロセス分離を採用
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // 並列実行を維持
        execArgv: ['--max-old-space-size=4096'], // メモリ最適化
      },
    },
    maxConcurrency: process.env.CI ? 4 : 8, // CI環境でも並列度を上げる
    isolate: false,
    testTimeout: 10000, // CI環境でハングするテストを早期検出（15s → 10s）
    hookTimeout: 10000,
    // テストファイル毎にクリーンアップを強制
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    // カバレッジ設定（Issue #17 - PR #1）
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',

      // PR #1では閾値を設定しない（測定のみ）
      // PR #2以降で段階的に有効化
      // thresholds: {
      //   global: {
      //     lines: 70,
      //     branches: 65,
      //     functions: 75,
      //     statements: 70,
      //   },
      // },

      include: [
        'src/**/*.{ts,tsx}',
      ],

      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.{ts,js,mjs}',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/__tests__/**',
        'src/setupTests.ts',
        'src/**/__mocks__/**',
        'src/types/**',
        'src/**/*.types.ts',
        'src/constants/**',
        'src/dev/**',
        'scripts/**',
        'tests/e2e/**',
        'playwright.config.ts',
        '**/*.performance.test.{ts,tsx}',
        '**/*.a11y.test.{ts,tsx}',
        '**/*.red.test.{ts,tsx}',
      ],

      all: true,
      excludeAfterRemap: true,
    },
    /**
     * NOTE: このexclude設定は、vitest.workspace.ts使用時には参照されません。
     * 各テストプロジェクトのexclude設定は、vitest.workspace.ts内で定義されています。
     *
     * - test:fast → すべてのworkspaceプロジェクトを実行（この設定は無視される）
     * - test:perf → performanceプロジェクトのみ実行
     * - test:a11y → accessibilityプロジェクトのみ実行
     *
     * @see vitest.workspace.ts - 各プロジェクトのexclude設定
     */
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/tests/e2e/**',
      // NOTE: 特殊テスト（*.performance.test.{ts,tsx}, *.a11y.test.tsx）は
      // workspace設定で制御されるため、ここでは除外しない
    ],
  },
  esbuild: {
    jsx: 'automatic',
  },
});
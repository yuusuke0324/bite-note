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
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // 複数フォークで並行実行
        execArgv: ['--max-old-space-size=4096'],
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
    // スレッドプール再利用を有効化してスタートアップコストを削減
    poolMatch: {
      '**/*.test.tsx': 'forks',
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/tests/e2e/**',
      // パフォーマンステストはデフォルトでスキップ（test:perfで実行）
      '**/*.performance.test.tsx',
      // アクセシビリティテストもデフォルトでスキップ（test:a11yで実行）
      '**/*.accessibility.test.tsx'
    ],
  },
  esbuild: {
    jsx: 'automatic',
  },
});
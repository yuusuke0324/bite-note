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
    // すべての環境でforksモードを使用（threadsモードはCI環境でグローバルPolyfillとクラスインスタンスの初期化問題あり）
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
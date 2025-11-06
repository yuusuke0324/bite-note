import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  // 高速・安定したユニットテスト
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: ['src/**/*.test.{ts,tsx}'],
      exclude: [
        '**/node_modules/**',
        '**/integration.test.{ts,tsx}',
        '**/*.a11y.test.{ts,tsx}',
        '**/*.performance.test.{ts,tsx}',
        '**/components/**/*.test.tsx', // コンポーネントは別枠
      ],
    },
  },
  // コンポーネントテスト
  {
    extends: './vitest.config.ts',
    test: {
      name: 'components',
      include: ['src/components/**/*.test.tsx'],
      exclude: [
        '**/*.a11y.test.tsx',
        '**/integration.test.tsx',
        '**/*.performance.test.tsx',
      ],
      // setupFiles を明示的に指定（singleFork時の継承問題を解決）
      setupFiles: ['./src/setupTests.ts'],
      // コンポーネント用の設定（メモリ使用量を抑えるため順次実行）
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },
      testTimeout: 30000, // コンポーネントテストは長めのタイムアウト
    },
  },
  // 統合テスト（重い）
  {
    extends: './vitest.config.ts',
    test: {
      name: 'integration',
      include: ['**/integration.test.{ts,tsx}'],
      // 統合テストは順次実行
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: true, // 統合テストは順次実行
        },
      },
      testTimeout: 30000, // 統合テストは長めのタイムアウト
    },
  },
])
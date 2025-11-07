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
  // コンポーネントテスト（軽量UI）
  {
    extends: './vitest.config.ts',
    test: {
      name: 'components-ui',
      include: [
        'src/components/__tests__/FishSpeciesAutocomplete.test.tsx',
        'src/components/__tests__/TideSummaryCard.test.tsx',
        // TODO: 将来のIssueでTASK-203実装後に有効化（TideTooltipテストが15分タイムアウトする問題あり）
        // 'src/components/__tests__/TideTooltip.test.tsx',
      ],
      setupFiles: ['./src/setupTests.ts'],
      /**
       * プール戦略の環境別設定
       *
       * 【背景】
       * FishSpeciesDataServiceがシングルトンパターンを使用しており、
       * threadsモードでのシリアライゼーション時にクラスインスタンスが正常に
       * 初期化されない問題が発生（CI環境でのみ再現）。
       *
       * 【対策】
       * - CI環境: threads を明示的に指定
       *   → クラスインスタンスのシリアライゼーションが安定して動作
       *   → GitHub Actions環境での確実なテスト実行を保証
       *
       * - ローカル環境: undefined（vitest.config.tsから forks を継承）
       *   → forksモードの方がローカル開発時のパフォーマンスが良好
       *   → 開発者体験を最適化
       *
       * 【検証済み】
       * - CI=true (threads): 23/23 tests passing
       * - CI=undefined (forks): 23/23 tests passing
       *
       * @see https://github.com/[repo]/issues/37 - CI失敗の根本原因分析
       * @see src/services/fish-species/FishSpeciesDataService.ts:150 - シングルトンインスタンス
       */
      pool: process.env.CI ? 'threads' : undefined,
      testTimeout: 20000,
    },
  },
  // コンポーネントテスト（Chart系・重い）
  {
    extends: './vitest.config.ts',
    test: {
      name: 'components-chart',
      include: [
        'src/components/chart/**/*.test.tsx',
        'src/components/__tests__/TideGraph.test.tsx',
      ],
      exclude: [
        '**/*.a11y.test.tsx',
        '**/*.accessibility.test.tsx',
        '**/*.performance.test.tsx',
      ],
      setupFiles: ['./src/setupTests.ts'],
      testTimeout: 20000,
    },
  },
  // コンポーネントテスト（複雑系）
  {
    extends: './vitest.config.ts',
    test: {
      name: 'components-complex',
      include: [
        'src/components/__tests__/TideGraph.axis-labels.test.tsx',
        'src/components/__tests__/TideIntegration.test.tsx',
      ],
      setupFiles: ['./src/setupTests.ts'],
      testTimeout: 20000,
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
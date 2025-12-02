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
        '**/*.red.test.{ts,tsx}', // TDD Red Phase テストを除外
        '**/components/**/*.test.tsx', // コンポーネントは別枠
        'src/__tests__/components/**/*.test.tsx', // src/__tests__/components/ も除外
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
        'src/components/__tests__/PWAInstallPrompt.test.tsx',
        'src/components/__tests__/ErrorBoundary.test.tsx',
        'src/components/__tests__/FeedbackToast.test.tsx', // Phase 3-3追加
        'src/components/common/__tests__/OfflineIndicator.test.tsx', // Phase 3-3追加
        'src/components/__tests__/ReAuthPrompt.test.tsx', // Issue #216追加
        'src/components/__tests__/TideTooltip.test.tsx', // Issue #249: TC-T013修正後に有効化
        'src/components/__tests__/Icon.test.tsx', // Issue #208: アイコンコンポーネント
        'src/components/__tests__/GlassBadge.test.tsx', // Issue #318: Glass Morphism UIコンポーネント
        'src/components/__tests__/GlassPanel.test.tsx', // Issue #318: Glass Morphism UIコンポーネント
        'src/components/__tests__/PhotoHeroCard.test.tsx', // Issue #319: PhotoHeroCard
        'src/components/__tests__/RecordGrid.test.tsx', // Issue #320: RecordGrid
        'src/components/__tests__/FishIcon.test.tsx', // Issue #321: FishIcon
        'src/components/__tests__/Skeleton.test.tsx', // Issue #327: Skeleton統一
        'src/components/__tests__/HeartAnimation.test.tsx', // Issue #324: HeartAnimation
      ],
      setupFiles: ['./src/setupTests.ts'],
      environment: 'jsdom',
      environmentOptions: {
        jsdom: {
          resources: 'usable',
          runScripts: 'dangerously',
        },
      },
      /**
       * プール戦略: forksモード（CI/ローカル共通）
       *
       * 【背景】
       * FishSpeciesDataServiceのシングルトンパターンとReact Testing Libraryの組み合わせで、
       * threadsモードではCI環境でコンポーネントが全くレンダリングされない問題が発生。
       *
       * **根本原因（Tech-lead分析結果）:**
       * 1. threadsモードでのグローバルPolyfill（ResizeObserver等）の初期化タイミング問題
       * 2. クラスインスタンスのスレッド間シリアライゼーション失敗
       * 3. React DOMのマウント時に必要なブラウザAPIが欠如
       *
       * 【対策】
       * - **すべての環境でforksモードを使用**
       *   → プロセス分離により、グローバル状態の問題を完全に回避
       *   → setupTests.tsのPolyfillが各テストで確実に有効化
       *   → クラスインスタンスのシリアライゼーション問題を回避
       *
       * - メモリ最適化: execArgv で Node.js ヒープサイズを4GBに設定
       *   → GitHub Actions の標準メモリ制限（7GB）内で安定動作
       *
       * 【検証済み】
       * - ローカル環境 (forks): 23/23 tests passing ✅
       * - CI環境 (threads): 23 failed ❌ → forksで解決予定
       *
       * @see https://github.com/[repo]/issues/37 - CI失敗の根本原因分析
       * @see src/services/fish-species/FishSpeciesDataService.ts:150 - シングルトンインスタンス
       * @see tech-lead review - threadsモードでのグローバルPolyfill初期化問題
       */
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: false, // 並列実行を維持
          execArgv: ['--max-old-space-size=4096'], // 4GB heap size
        },
      },
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
        '**/*.red.test.{ts,tsx}', // TDD Red Phase テストを除外
      ],
      setupFiles: ['./src/setupTests.ts'],
      environment: 'jsdom',
      environmentOptions: {
        jsdom: {
          resources: 'usable',
          runScripts: 'dangerously',
        },
      },
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: false,
          execArgv: ['--max-old-space-size=4096'],
        },
      },
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
        // TideIntegration.test.tsx は Issue #322 で削除（PhotoHeroCardオーバーレイに置換）
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
  // アクセシビリティテスト
  {
    extends: './vitest.config.ts',
    test: {
      name: 'accessibility',
      include: [
        '**/*.accessibility.test.tsx',
        '**/*.a11y.test.tsx',
      ],
      // 基本設定のexcludeをオーバーライド（accessibilityファイルを除外しない）
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/cypress/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/tests/e2e/**',
        '**/*.performance.test.tsx',
        // NOTE: **/*.accessibility.test.tsx を除外しない
      ],
      setupFiles: ['./src/setupTests.ts'],
      environment: 'jsdom',
      testTimeout: 20000,
    },
  },
  // パフォーマンステスト
  {
    extends: './vitest.config.ts',
    test: {
      name: 'performance',
      include: [
        '**/*.performance.test.tsx',
        '**/*.performance.test.ts',
      ],
      // 基本設定のexcludeをオーバーライド（performanceファイルを除外しない）
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/cypress/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/tests/e2e/**',
        '**/*.accessibility.test.tsx',
        '**/*.a11y.test.tsx',
        // TDD Red Phase テスト（最適化未実装を検証）はCI対象外
        '**/*.red.test.tsx',
        '**/*.red.test.ts',
        // NOTE: **/*.performance.test.{ts,tsx} を除外しない
      ],
      setupFiles: ['./src/setupTests.ts'],
      environment: 'jsdom',
      testTimeout: 30000, // パフォーマンステストは長めのタイムアウト推奨
    },
  },
])
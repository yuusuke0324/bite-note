# TASK-302: アクセシビリティ対応実装 - テストケース設計

## TDD Step 2/6: Red Phase テストケース設計

### 概要

WCAG 2.1 AA準拠のアクセシビリティ機能実装に向けた包括的テストケース設計。要件定義（REQ-401, REQ-402）に基づき、ARIA属性、キーボードナビゲーション、スクリーンリーダー対応、フォーカス管理の各機能について詳細なテストケースを作成。

## テストスイート構成

### 主要テストファイル

1. **TideChart.accessibility.test.tsx**: アクセシビリティ機能統合テスト
2. **AriaManager.test.tsx**: ARIA属性管理テスト
3. **KeyboardNavigation.test.tsx**: キーボードナビゲーション専用テスト
4. **ScreenReader.test.tsx**: スクリーンリーダー対応テスト
5. **FocusManager.test.tsx**: フォーカス管理テスト
6. **HighContrast.test.tsx**: 高コントラストテーマテスト

## テストケース詳細

### TC-A001: ARIA属性実装テスト

#### TC-A001-01: 基本ARIA属性設定
```typescript
describe('Basic ARIA Attributes', () => {
  test('should set role="img" for chart container', () => {
    // 検証: role="img"属性が正しく設定される
  });

  test('should generate dynamic aria-label based on data', () => {
    // 検証: データに基づく動的aria-label生成
  });

  test('should set aria-describedby reference', () => {
    // 検証: aria-describedby属性の正しい参照
  });

  test('should configure aria-live for updates', () => {
    // 検証: aria-live="polite"設定
  });
});
```

#### TC-A001-02: 数値範囲ARIA属性
```typescript
describe('Numeric Range ARIA Attributes', () => {
  test('should set aria-valuemin from data minimum', () => {
    // 検証: データの最小値からaria-valuemin設定
  });

  test('should set aria-valuemax from data maximum', () => {
    // 検証: データの最大値からaria-valuemax設定
  });

  test('should set aria-valuenow from current selection', () => {
    // 検証: 現在選択値からaria-valuenow設定
  });

  test('should update numeric ARIA attributes when data changes', () => {
    // 検証: データ変更時の動的更新
  });
});
```

#### TC-A001-03: ARIA属性動的更新
```typescript
describe('Dynamic ARIA Updates', () => {
  test('should update aria-label when data changes', () => {
    // 検証: データ変更時のaria-label自動更新
  });

  test('should announce updates through aria-live', () => {
    // 検証: aria-liveによる変更通知
  });

  test('should maintain ARIA consistency during interactions', () => {
    // 検証: インタラクション中のARIA整合性
  });
});
```

### TC-K001: キーボードナビゲーションテスト

#### TC-K001-01: 基本キーナビゲーション
```typescript
describe('Basic Keyboard Navigation', () => {
  test('should focus chart on Tab key', () => {
    // 検証: Tabキーでチャートにフォーカス
  });

  test('should move to next data point on ArrowRight', () => {
    // 検証: ArrowRightで次のデータポイントへ移動
  });

  test('should move to previous data point on ArrowLeft', () => {
    // 検証: ArrowLeftで前のデータポイントへ移動
  });

  test('should move to first data point on Home', () => {
    // 検証: Homeキーで最初のデータポイントへ移動
  });

  test('should move to last data point on End', () => {
    // 検証: Endキーで最後のデータポイントへ移動
  });
});
```

#### TC-K001-02: 詳細ナビゲーション
```typescript
describe('Advanced Keyboard Navigation', () => {
  test('should focus higher value on ArrowUp', () => {
    // 検証: ArrowUpで高い値にフォーカス
  });

  test('should focus lower value on ArrowDown', () => {
    // 検証: ArrowDownで低い値にフォーカス
  });

  test('should show details on Enter key', () => {
    // 検証: Enterキーで詳細情報表示
  });

  test('should toggle selection on Space key', () => {
    // 検証: Spaceキーで選択状態切替
  });

  test('should exit navigation on Escape key', () => {
    // 検証: Escapeキーでナビゲーション終了
  });
});
```

#### TC-K001-03: キーボードナビゲーション状態管理
```typescript
describe('Keyboard Navigation State', () => {
  test('should maintain focused index state', () => {
    // 検証: フォーカスインデックス状態維持
  });

  test('should handle navigation mode transitions', () => {
    // 検証: ナビゲーションモード遷移
  });

  test('should preserve navigation state during re-render', () => {
    // 検証: 再レンダリング時の状態保持
  });

  test('should reset navigation state on data change', () => {
    // 検証: データ変更時の状態リセット
  });
});
```

### TC-S001: スクリーンリーダー対応テスト

#### TC-S001-01: チャート概要読み上げ
```typescript
describe('Chart Summary Screen Reader', () => {
  test('should generate comprehensive chart summary', () => {
    // 検証: 包括的なチャート概要生成
  });

  test('should include data point count in summary', () => {
    // 検証: データポイント数を含む概要
  });

  test('should describe tide patterns in summary', () => {
    // 検証: 潮汐パターンの説明
  });

  test('should announce min/max values in summary', () => {
    // 検証: 最小/最大値の音声化
  });
});
```

#### TC-S001-02: データポイント詳細読み上げ
```typescript
describe('Data Point Details Screen Reader', () => {
  test('should announce data point position and value', () => {
    // 検証: データポイントの位置と値の音声化
  });

  test('should identify tide type (high/low) if applicable', () => {
    // 検証: 潮汐タイプ（満潮/干潮）の識別
  });

  test('should provide context for current selection', () => {
    // 検証: 現在選択のコンテキスト提供
  });

  test('should announce navigation instructions', () => {
    // 検証: ナビゲーション指示の音声化
  });
});
```

#### TC-S001-03: 傾向分析読み上げ
```typescript
describe('Trend Analysis Screen Reader', () => {
  test('should analyze and announce tide trends', () => {
    // 検証: 潮汐傾向の分析と音声化
  });

  test('should identify pattern changes', () => {
    // 検証: パターン変化の識別
  });

  test('should describe overall tide behavior', () => {
    // 検証: 全体的な潮汐動作の説明
  });
});
```

### TC-F001: フォーカス管理テスト

#### TC-F001-01: 視覚的フォーカスインジケーター
```typescript
describe('Visual Focus Indicators', () => {
  test('should display visible focus outline', () => {
    // 検証: 視覚的フォーカスアウトライン表示
  });

  test('should meet 3:1 contrast ratio for focus indicators', () => {
    // 検証: フォーカスインジケーターの3:1コントラスト比
  });

  test('should highlight focused data point clearly', () => {
    // 検証: フォーカスされたデータポイントの明確な強調
  });

  test('should show focus state for interactive elements', () => {
    // 検証: インタラクティブ要素のフォーカス状態表示
  });
});
```

#### TC-F001-02: フォーカス順序とトラップ
```typescript
describe('Focus Order and Trapping', () => {
  test('should maintain logical focus order', () => {
    // 検証: 論理的なフォーカス順序維持
  });

  test('should trap focus within chart during navigation', () => {
    // 検証: ナビゲーション中のチャート内フォーカストラップ
  });

  test('should restore focus after modal interactions', () => {
    // 検証: モーダル操作後のフォーカス復元
  });

  test('should handle focus restoration on component unmount', () => {
    // 検証: コンポーネントアンマウント時のフォーカス復元
  });
});
```

#### TC-F001-03: フォーカス状態管理
```typescript
describe('Focus State Management', () => {
  test('should track current focus element', () => {
    // 検証: 現在のフォーカス要素追跡
  });

  test('should maintain focus history stack', () => {
    // 検証: フォーカス履歴スタック維持
  });

  test('should handle focus transitions smoothly', () => {
    // 検証: スムーズなフォーカス遷移
  });
});
```

### TC-C001: 高コントラスト対応テスト

#### TC-C001-01: コントラスト比検証
```typescript
describe('Contrast Ratio Compliance', () => {
  test('should meet 4.5:1 contrast for normal text', () => {
    // 検証: 通常テキストの4.5:1コントラスト比
  });

  test('should meet 3:1 contrast for large text', () => {
    // 検証: 大きなテキストの3:1コントラスト比
  });

  test('should meet 3:1 contrast for non-text elements', () => {
    // 検証: 非テキスト要素の3:1コントラスト比
  });

  test('should meet 3:1 contrast for focus states', () => {
    // 検証: フォーカス状態の3:1コントラスト比
  });
});
```

#### TC-C001-02: 高コントラストテーマ
```typescript
describe('High Contrast Themes', () => {
  test('should apply light high contrast theme', () => {
    // 検証: ライト高コントラストテーマ適用
  });

  test('should apply dark high contrast theme', () => {
    // 検証: ダーク高コントラストテーマ適用
  });

  test('should apply accessibility high contrast theme', () => {
    // 検証: アクセシビリティ高コントラストテーマ適用
  });

  test('should switch themes dynamically', () => {
    // 検証: 動的テーマ切替
  });
});
```

#### TC-C001-03: 色覚多様性対応
```typescript
describe('Color Vision Diversity', () => {
  test('should distinguish elements without relying on color alone', () => {
    // 検証: 色のみに依存しない要素区別
  });

  test('should provide pattern-based differentiation', () => {
    // 検証: パターンベースの差別化提供
  });

  test('should work with monochrome displays', () => {
    // 検証: モノクロディスプレイでの動作
  });
});
```

### TC-E001: エラーハンドリングテスト

#### TC-E001-01: アクセシビリティエラー処理
```typescript
describe('Accessibility Error Handling', () => {
  test('should handle ARIA attribute setup failures', () => {
    // 検証: ARIA属性設定失敗の処理
  });

  test('should gracefully degrade when screen reader unavailable', () => {
    // 検証: スクリーンリーダー利用不可時の優雅な劣化
  });

  test('should provide fallback for keyboard navigation failures', () => {
    // 検証: キーボードナビゲーション失敗時のフォールバック
  });

  test('should handle focus management errors', () => {
    // 検証: フォーカス管理エラーの処理
  });
});
```

#### TC-E001-02: フォールバック機能
```typescript
describe('Fallback Functionality', () => {
  test('should provide text table fallback for chart', () => {
    // 検証: チャートのテキストテーブルフォールバック
  });

  test('should show keyboard shortcuts when navigation fails', () => {
    // 検証: ナビゲーション失敗時のキーボードショートカット表示
  });

  test('should offer manual settings when auto-detection fails', () => {
    // 検証: 自動検出失敗時の手動設定提供
  });
});
```

### TC-P001: パフォーマンス・アクセシビリティ統合テスト

#### TC-P001-01: 最適化との互換性
```typescript
describe('Performance Integration', () => {
  test('should maintain accessibility with React.memo optimization', () => {
    // 検証: React.memo最適化下でのアクセシビリティ維持
  });

  test('should preserve ARIA attributes during data sampling', () => {
    // 検証: データサンプリング中のARIA属性保持
  });

  test('should handle accessibility during performance monitoring', () => {
    // 検証: パフォーマンス監視中のアクセシビリティ処理
  });
});
```

#### TC-P001-02: レスポンス時間要件
```typescript
describe('Response Time Requirements', () => {
  test('should respond to keyboard input within 100ms', () => {
    // 検証: キーボード入力への100ms以内応答
  });

  test('should update screen reader content within 200ms', () => {
    // 検証: スクリーンリーダーコンテンツの200ms以内更新
  });

  test('should maintain smooth focus transitions', () => {
    // 検証: スムーズなフォーカス遷移維持
  });
});
```

## WCAG 2.1 AA準拠検証テスト

### TC-W001: 知覚可能（Perceivable）
```typescript
describe('WCAG Perceivable Requirements', () => {
  test('should provide text alternatives for non-text content', () => {
    // WCAG 1.1.1 Non-text Content (Level A)
  });

  test('should provide captions and alternatives for time-based media', () => {
    // WCAG 1.2 Time-based Media (Level A/AA)
  });

  test('should present information without loss of meaning in different layouts', () => {
    // WCAG 1.3 Adaptable (Level A/AA)
  });

  test('should make it easier to see and hear content', () => {
    // WCAG 1.4 Distinguishable (Level A/AA)
  });
});
```

### TC-W002: 操作可能（Operable）
```typescript
describe('WCAG Operable Requirements', () => {
  test('should make all functionality available via keyboard', () => {
    // WCAG 2.1 Keyboard Accessible (Level A)
  });

  test('should give users enough time to read content', () => {
    // WCAG 2.2 Enough Time (Level A/AA)
  });

  test('should not cause seizures or physical reactions', () => {
    // WCAG 2.3 Seizures and Physical Reactions (Level A/AA)
  });

  test('should help users navigate and find content', () => {
    // WCAG 2.4 Navigable (Level A/AA)
  });

  test('should make it easier to use inputs other than keyboard', () => {
    // WCAG 2.5 Input Modalities (Level A/AA)
  });
});
```

### TC-W003: 理解可能（Understandable）
```typescript
describe('WCAG Understandable Requirements', () => {
  test('should make text readable and understandable', () => {
    // WCAG 3.1 Readable (Level A/AA)
  });

  test('should make content appear and operate predictably', () => {
    // WCAG 3.2 Predictable (Level A/AA)
  });

  test('should help users avoid and correct mistakes', () => {
    // WCAG 3.3 Input Assistance (Level A/AA)
  });
});
```

### TC-W004: 堅牢（Robust）
```typescript
describe('WCAG Robust Requirements', () => {
  test('should maximize compatibility with assistive technologies', () => {
    // WCAG 4.1 Compatible (Level A/AA)
  });
});
```

## テスト実行構成

### 実行環境設定
```typescript
// Jest設定拡張
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.ts',
    '<rootDir>/src/test/accessibility-setup.ts'
  ],
  testMatch: [
    '**/__tests__/**/*.accessibility.test.{ts,tsx}',
    '**/__tests__/**/*.a11y.test.{ts,tsx}'
  ]
};
```

### アクセシビリティテストユーティリティ
```typescript
// test/accessibility-setup.ts
import { toHaveNoViolations } from 'jest-axe';
import { configure } from '@testing-library/react';

expect.extend(toHaveNoViolations);

configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000
});

// Mock setup for screen readers
global.mockScreenReader = {
  announce: jest.fn(),
  read: jest.fn(),
  navigate: jest.fn()
};
```

## 受け入れ基準マッピング

### 必須基準テストマッピング
- **WCAG 2.1 AA準拠**: TC-W001～TC-W004 (自動テスト95%以上)
- **スクリーンリーダー対応**: TC-S001-01～TC-S001-03
- **キーボード操作**: TC-K001-01～TC-K001-03
- **高コントラスト**: TC-C001-01～TC-C001-03

### 推奨基準テストマッピング
- **WCAG 2.1 AAA部分対応**: TC-W001拡張
- **多様な支援技術**: TC-S001-02拡張
- **ユーザビリティ**: TC-F001-02拡張
- **パフォーマンス影響**: TC-P001-01～TC-P001-02

## テスト実行計画

### Phase 1: Red Phase (テスト先行作成)
1. 全73テストケース作成
2. テスト実行確認（全失敗想定）
3. テストカバレッジ確認

### Phase 2: Green Phase (最小実装)
1. 基本ARIA機能実装
2. キーボードナビゲーション実装
3. スクリーンリーダー対応実装
4. フォーカス管理実装

### Phase 3: Refactor Phase (品質向上)
1. パフォーマンス最適化
2. エラーハンドリング強化
3. WCAG準拠度向上
4. コード品質改善

---

**テストケース設計完了日**: 2025-09-30
**総テストケース数**: 73個
**カバレッジ目標**: WCAG 2.1 AA 95%以上
**次段階**: Red Phase実装 (tdd-red.md)
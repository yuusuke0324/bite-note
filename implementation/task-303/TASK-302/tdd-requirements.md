# TASK-302: アクセシビリティ対応実装 - 要件定義

## 概要

TideChartコンポーネントにWCAG 2.1 AA準拠のアクセシビリティ機能を実装し、視覚・聴覚・運動機能に制約のあるユーザーが潮汐グラフを効果的に利用できるようにする。

## 要件詳細

### REQ-401: アクセシビリティ機能実装

#### 機能要件

1. **ARIA属性の包括的実装**
   - `role="img"`: グラフを画像として識別
   - `aria-label`: グラフの概要説明（動的生成）
   - `aria-describedby`: 詳細説明への参照
   - `aria-live`: データ更新時の動的通知
   - `aria-valuemin/max/now`: 数値範囲の明示

2. **キーボードナビゲーション拡張**
   - Tab順序最適化
   - 矢印キーによるデータポイント移動
   - Enter/Spaceキーによる詳細情報表示
   - Escキーによるフォーカス解除
   - ホームキー（最初）/エンドキー（最後）への移動

3. **スクリーンリーダー対応**
   - グラフ概要の音声読み上げ
   - データポイント詳細情報の音声化
   - 傾向・パターンの説明生成
   - エラー状態の明確な通知

4. **フォーカス管理**
   - 視覚的フォーカスインジケーター
   - フォーカス順序の論理的配置
   - モーダル操作時のフォーカストラップ
   - ページ遷移時のフォーカス復元

#### 非機能要件

- **レスポンス時間**: キーボード操作から反応まで100ms以内
- **互換性**: 主要スクリーンリーダー（NVDA、JAWS、VoiceOver）対応
- **ユーザビリティ**: キーボードのみで全機能利用可能

### REQ-402: WCAG 2.1 AA準拠

#### 機能要件

1. **知覚可能（Perceivable）**
   - 色覚多様性対応（高コントラスト）
   - 代替テキスト提供
   - 音声・動画の代替手段
   - 適応可能なレイアウト

2. **操作可能（Operable）**
   - キーボードアクセス可能
   - 適切な操作時間
   - 光過敏性発作の回避
   - ナビゲーション支援

3. **理解可能（Understandable）**
   - 読みやすく理解しやすいテキスト
   - 予測可能な動作
   - 入力支援

4. **堅牢（Robust）**
   - 支援技術での解釈可能
   - 将来的互換性確保

#### コントラスト要件

- **通常テキスト**: 4.5:1以上
- **大きなテキスト**: 3:1以上
- **非テキスト要素**: 3:1以上
- **フォーカス状態**: 3:1以上

## 実装アプローチ

### 1. ARIA実装戦略

```typescript
interface AriaConfiguration {
  role: string;
  label: string;
  describedBy: string;
  live: 'polite' | 'assertive' | 'off';
  valuemin?: number;
  valuemax?: number;
  valuenow?: number;
}

const generateAriaConfiguration = (data: TideChartData[]): AriaConfiguration => {
  const tideValues = data.map(d => d.tide);
  const min = Math.min(...tideValues);
  const max = Math.max(...tideValues);
  const current = data[data.length - 1]?.tide;

  return {
    role: 'img',
    label: `潮汐グラフ: ${data[0]?.time}から${data[data.length - 1]?.time}までの潮位変化、最高${max}cm、最低${min}cm`,
    describedBy: 'tide-chart-description',
    live: 'polite',
    valuemin: min,
    valuemax: max,
    valuenow: current
  };
};
```

### 2. キーボードナビゲーション実装

```typescript
interface KeyboardNavigationState {
  focusedIndex: number;
  mode: 'chart' | 'data-point' | 'marker';
  isActive: boolean;
}

const keyboardHandlers = {
  'ArrowRight': () => moveToNextDataPoint(),
  'ArrowLeft': () => moveToPreviousDataPoint(),
  'ArrowUp': () => focusHigherValue(),
  'ArrowDown': () => focusLowerValue(),
  'Home': () => moveToFirstDataPoint(),
  'End': () => moveToLastDataPoint(),
  'Enter': () => announceDataPointDetails(),
  ' ': () => toggleDataPointSelection(),
  'Escape': () => exitNavigationMode()
};
```

### 3. スクリーンリーダー対応

```typescript
interface ScreenReaderContent {
  chartSummary: string;
  dataPointDescription: string;
  trendAnalysis: string;
  errorMessages: string;
}

const generateScreenReaderContent = (data: TideChartData[]): ScreenReaderContent => {
  const analysis = analyzeTideTrends(data);

  return {
    chartSummary: `潮汐グラフには${data.length}個のデータポイントが含まれており、${analysis.highTideCount}回の満潮と${analysis.lowTideCount}回の干潮が記録されています。`,
    dataPointDescription: (point: TideChartData, index: number) =>
      `${index + 1}番目のデータポイント: ${point.time}の潮位は${point.tide}センチメートル${point.type ? `、${point.type === 'high' ? '満潮' : '干潮'}ポイント` : ''}`,
    trendAnalysis: `傾向分析: ${analysis.overallTrend}`,
    errorMessages: 'データの読み込みに失敗しました。再度お試しください。'
  };
};
```

### 4. 高コントラスト対応

```typescript
interface HighContrastTheme {
  background: string;
  foreground: string;
  accent: string;
  focus: string;
  error: string;
}

const highContrastThemes = {
  light: {
    background: '#FFFFFF',
    foreground: '#000000',
    accent: '#0066CC',
    focus: '#FF6600',
    error: '#CC0000'
  },
  dark: {
    background: '#000000',
    foreground: '#FFFFFF',
    accent: '#66CCFF',
    focus: '#FFCC00',
    error: '#FF6666'
  },
  highContrast: {
    background: '#000000',
    foreground: '#FFFFFF',
    accent: '#FFFF00',
    focus: '#00FF00',
    error: '#FF0000'
  }
};
```

## 技術仕様

### アクセシビリティAPI統合

#### 1. Accessibility Object Model (AOM)
```typescript
interface AccessibilityObject {
  role: string;
  name: string;
  description: string;
  value: string;
  states: Set<string>;
  properties: Map<string, any>;
}

const createAccessibilityObject = (element: HTMLElement): AccessibilityObject => {
  return {
    role: element.getAttribute('role') || '',
    name: element.getAttribute('aria-label') || '',
    description: getDescriptionText(element),
    value: element.getAttribute('aria-valuenow') || '',
    states: new Set(['focusable', 'enabled']),
    properties: new Map([
      ['valuemin', element.getAttribute('aria-valuemin')],
      ['valuemax', element.getAttribute('aria-valuemax')]
    ])
  };
};
```

#### 2. Focus Management API
```typescript
interface FocusManager {
  currentFocus: HTMLElement | null;
  focusHistory: HTMLElement[];
  trapStack: HTMLElement[];
}

class TideChartFocusManager implements FocusManager {
  currentFocus: HTMLElement | null = null;
  focusHistory: HTMLElement[] = [];
  trapStack: HTMLElement[] = [];

  setFocus(element: HTMLElement): void {
    if (this.currentFocus) {
      this.focusHistory.push(this.currentFocus);
    }
    this.currentFocus = element;
    element.focus();
    this.announceToScreenReader(element);
  }

  restoreFocus(): void {
    const previousFocus = this.focusHistory.pop();
    if (previousFocus) {
      this.setFocus(previousFocus);
    }
  }

  private announceToScreenReader(element: HTMLElement): void {
    const announcement = this.generateAnnouncement(element);
    this.liveRegion.textContent = announcement;
  }
}
```

### パフォーマンス考慮事項

#### 1. スクリーンリーダー最適化
- 大量データ時の段階的読み上げ
- 不要な更新通知の抑制
- 効率的なARIA属性更新

#### 2. キーボードナビゲーション最適化
- 仮想化による大量データ対応
- デバウンシングによる連続操作対応
- メモ化による再計算防止

## エラーハンドリング

### アクセシビリティエラー

```typescript
enum AccessibilityError {
  ARIA_INVALID = 'ARIA_INVALID',
  FOCUS_TRAP_FAILED = 'FOCUS_TRAP_FAILED',
  SCREEN_READER_UNAVAILABLE = 'SCREEN_READER_UNAVAILABLE',
  KEYBOARD_NAVIGATION_FAILED = 'KEYBOARD_NAVIGATION_FAILED',
  CONTRAST_INSUFFICIENT = 'CONTRAST_INSUFFICIENT'
}

interface AccessibilityErrorHandler {
  handleError(error: AccessibilityError, context: any): void;
  generateFallback(error: AccessibilityError): string;
  reportAccessibilityIssue(error: AccessibilityError): void;
}
```

### フォールバック戦略

1. **スクリーンリーダー利用不可時**
   - テキスト形式データテーブル提供
   - キーボードショートカット一覧表示
   - 音声代替手段案内

2. **キーボードナビゲーション失敗時**
   - マウス操作へのフォールバック
   - 静的データ表示
   - 操作説明の提供

3. **高コントラスト適用失敗時**
   - システム設定の尊重
   - ユーザー設定保存
   - 手動設定オプション提供

## テスト要件

### 単体テスト
- [ ] ARIA属性正確性テスト
- [ ] キーボードイベントハンドリングテスト
- [ ] スクリーンリーダー対応文字列生成テスト
- [ ] フォーカス管理機能テスト
- [ ] 高コントラストテーマ適用テスト

### 統合テスト
- [ ] スクリーンリーダーでの実際の読み上げテスト
- [ ] キーボードのみでの操作完了テスト
- [ ] 色覚異常シミュレーションテスト
- [ ] WCAG準拠自動テスト
- [ ] アクセシビリティツールでの検証

### ユーザビリティテスト
- [ ] 視覚障害ユーザーでの使用性テスト
- [ ] 運動機能制約ユーザーでの操作性テスト
- [ ] 認知機能配慮での理解しやすさテスト

## 受け入れ基準

### 必須基準
- ✅ WCAG 2.1 AA準拠（自動テスト95%以上）
- ✅ 主要スクリーンリーダーでの正常動作
- ✅ キーボードのみでの全機能利用可能
- ✅ 高コントラスト4.5:1以上確保

### 推奨基準
- ✅ WCAG 2.1 AAA部分対応
- ✅ 多様な支援技術での動作確認
- ✅ ユーザビリティテスト結果良好
- ✅ パフォーマンス影響最小限

## 実装制約

### 技術制約
- 既存TideChart機能の完全保持
- パフォーマンス最適化との両立
- recharts制約内でのARIA実装
- TypeScript strict mode準拠

### 互換性制約
- IE11以降のブラウザサポート（可能な範囲）
- モバイルアクセシビリティ対応
- 既存APIの変更禁止
- CSS-in-JS対応継続

---

**要件定義完了日**: 2025-09-30
**承認者**: Accessibility Expert
**次段階**: テストケース作成 (tdd-testcases.md)
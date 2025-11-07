# TideSummaryCard Grid Layout - Design Review

**Reviewer**: designer エージェント
**Date**: 2025-11-07
**Issue**: #26
**Review Type**: 実装前UI/UXデザインレビュー
**Status**: 実装前レビュー完了

---

## 総評

承認済みのPRD仕様を確認しました。4項目グリッドレイアウトと今日の潮汐イベント一覧を統合したデザインは、情報アーキテクチャの観点で優れています。ただし、**WCAG 2.1 AA準拠の観点から、プログレスバーの色分け（blue-300/500/700）にアクセシビリティ上の重大な懸念があります**。また、レスポンシブ設計とインタラクションデザインに改善の余地があります。既存のPWAInstallPromptコンポーネントが優れたWCAG準拠を実現している点を参考にすべきです。

---

## ✅ 良い点（Strengths）

1. **情報階層の明確性**: 4項目グリッド → イベント一覧 → 詳細ボタンの3層構造が論理的で理解しやすい
2. **既存コンポーネントの活用**: ModernCardの`variant='elevated'`とホバー効果を継承している
3. **ローディング・エラー状態の配慮**: シマーUIとエラー表示が適切に実装されている
4. **セマンティックマークアップ**: testidによるアクセシビリティ意識がある
5. **一貫性**: 既存のデザインシステム（theme/colors.ts）に沿った設計

---

## ⚠️ 改善が必要な点（Issues）

### 🔴 Critical（致命的 - 即座に修正が必要）

#### 1. プログレスバー色分けのコントラスト比違反（WCAG 2.1 AA）

**現状**: blue-300（#AECBFA）/ blue-500（#1A73E8）/ blue-700（#0F4C81）を白背景で使用

**問題**:
- `text-blue-300`（0-30%）: コントラスト比 約**1.8:1**（基準4.5:1を大幅に下回る）
- `text-blue-500`（31-60%）: コントラスト比 約**3.2:1**（基準4.5:1を下回る）
- `text-blue-700`（61-100%）: コントラスト比 約**7.5:1**（合格）

**影響**: 視覚障害者・色覚異常者が強度情報を認識できない

**改善案**:
```typescript
// 提案1: より濃い色に変更（WCAG AA準拠）
0-30%:  text-blue-600 (#1557B0) または text-gray-600 (#4B5563) // コントラスト比 4.5:1以上
31-60%: text-blue-700 (#0F4C81) // コントラスト比 7.5:1
61-100%: text-blue-800 (#0A3A5C) // コントラスト比 10.2:1

// 提案2: 背景色を使用（推奨）
0-30%:  bg-blue-100 text-blue-800 // 背景と組み合わせで高コントラスト
31-60%: bg-blue-200 text-blue-900
61-100%: bg-blue-600 text-white
```

**根拠**: WCAG 2.1 Success Criterion 1.4.3（最小コントラスト）

#### 2. 色のみに依存した情報伝達（WCAG 2.1 AA）

**現状**: プログレスバーの強度レベルを色のみで区別

**問題**: 色覚異常者（男性の8%、女性の0.5%）が情報を取得できない

**影響**: 潮汐強度の重要な判断基準が伝わらない

**改善案**:
```tsx
// パターン/テクスチャの追加
0-30%:  "弱" + アイコン "○" + 破線パターン
31-60%: "中" + アイコン "◐" + 一重線
61-100%: "強" + アイコン "●" + 二重線

// または絵文字での視覚補助
0-30%:  "🔵 弱 (30%)"
31-60%: "🔷 中 (60%)"
61-100%: "🔶 強 (85%)"
```

**根拠**: WCAG 2.1 Success Criterion 1.4.1（色の使用）

#### 3. ARIAラベルの欠如（WCAG 2.1 AA）

**現状**: testidは設定されているが、スクリーンリーダー用のラベルがない

**問題**: 視覚障害者がコンポーネントの意味を理解できない

**影響**: アクセシビリティツリーで情報が伝わらない

**改善案**:
```tsx
// グリッドコンテナ
<div role="region" aria-label="潮汐情報サマリー" data-testid="summary-grid">

// 各セクション
<div role="article" aria-labelledby="tide-type-label" data-testid="tide-type-section">
  <h3 id="tide-type-label" className="sr-only">潮汐タイプ</h3>
  <div aria-label="大潮" role="status">🔴 大潮</div>
</div>

// プログレスバー
<div
  role="progressbar"
  aria-valuenow={85}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="潮汐強度85パーセント、強い潮流"
>
```

**根拠**: WCAG 2.1 Success Criterion 4.1.2（名前、役割、値）

---

### 🟠 High（重要 - 早期に修正推奨）

#### 4. タッチターゲットサイズ不足（WCAG 2.1 AAA / iOS HIG）

**現状**: 詳細ボタンがテキストリンクのみ

**問題**: タッチエリアが44x44px未満の可能性

**影響**: モバイルでタップしづらい

**改善案**:
```tsx
<button
  className="min-w-[44px] min-h-[44px] px-4 py-3 text-blue-600 hover:text-blue-700
             font-medium transition-colors duration-200 rounded-lg hover:bg-blue-50"
  aria-expanded={false}
>
  詳細を表示 →
</button>
```

**根拠**: WCAG 2.1 Success Criterion 2.5.5（ターゲットサイズ）、iOS HIG

#### 5. 精度インジケーターの配置欠如

**現状**: PRDでは精度インジケーター（high/medium/low）が仕様化されているが、レイアウト案に未反映

**問題**: ユーザーがデータの信頼性を判断できない

**影響**: 不正確なデータに基づく釣行判断のリスク

**改善案**:
```tsx
// カード右上に配置
<div className="absolute top-3 right-3">
  <span
    className={`text-xs font-medium px-2 py-1 rounded-full ${
      accuracy === 'high' ? 'bg-green-100 text-green-700' :
      accuracy === 'medium' ? 'bg-yellow-100 text-yellow-700' :
      'bg-orange-100 text-orange-700'
    }`}
    aria-label={`データ精度: ${accuracy === 'high' ? '高' : accuracy === 'medium' ? '中' : '低'}`}
  >
    {accuracy === 'high' ? '✓ 高精度' : accuracy === 'medium' ? '△ 中精度' : '⚠ 低精度'}
  </span>
</div>
```

**根拠**: Nielsen Heuristic #5（エラー防止）、Transparency Principle

#### 6. レスポンシブブレークポイントの不適切さ

**現状**: 375px以下/以上の2段階のみ

**問題**:
- iPhone SE（375px）とiPhone 14 Pro（393px）で同じレイアウト
- タブレット（768px以上）での最適化がない

**影響**: 中間デバイスでの空間活用効率が低い

**改善案**:
```tsx
// モバイルファーストアプローチ
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
  // 375px以下: 1列（縦積み）
  // 640px以上: 2列（2×2グリッド）
  // 1024px以上: 4列（横並び）
```

**根拠**: Material Design 3 Layout Guidelines、iOS HIG Size Classes

#### 7. 過去イベントの視認性不足

**現状**: `opacity-50`のみで過去/未来を区別

**問題**:
- 淡色化だけでは判別しづらい
- WCAG AAでは通過するが、UX的に不十分

**影響**: 過去イベントと未来イベントを混同

**改善案**:
```tsx
// 多重手がかり（色 + アイコン + テキスト）
<div className={`flex items-center gap-2 p-3 rounded-lg ${
  isPast
    ? 'opacity-60 bg-gray-50 border-l-2 border-gray-300'
    : 'bg-blue-50 border-l-2 border-blue-500'
}`}>
  {isPast && <span className="text-gray-400">✓</span>}
  {!isPast && <span className="text-blue-600">→</span>}
  {/* イベント情報 */}
</div>
```

**根拠**: Gestalt Principles（多重手がかり）、WCAG 2.1 Success Criterion 1.4.1

---

### 🟡 Medium（中程度 - 改善推奨）

#### 8. フォントサイズの最適化

**現状**: 具体的なフォントサイズが未定義

**問題**: モバイルでの可読性が保証されていない

**改善案**:
```tsx
// Material Design 3 Type Scale
グリッド項目ラベル: text-xs (12px) // "潮汐タイプ"
グリッド項目値:    text-base (16px) // "大潮"
イベントリスト時刻: text-sm (14px) // "06:15"
イベントリスト詳細: text-xs (12px) // "180cm"
```

**根拠**: Material Design 3 Typography、iOS HIG Text Styles

#### 9. スペーシングの一貫性

**現状**: グリッド間隔が未定義

**改善案**:
```tsx
// 8pxグリッドシステム
カード内パディング: p-4 (16px) モバイル / md:p-6 (24px) デスクトップ
グリッド間隔:      gap-3 (12px) モバイル / sm:gap-4 (16px) タブレット
イベント間隔:      space-y-2 (8px)
セクション間:      mb-4 (16px)
```

**根拠**: Material Design 3 Layout、8pt Grid System

#### 10. アニメーションのモーション仕様

**現状**: `transition-shadow duration-200`のみ

**問題**: 他のトランジション（展開、ホバー）が未定義

**改善案**:
```tsx
// Material Design 3 Motion
ホバー効果:       transition-all duration-200 ease-out
詳細展開:         transition-[max-height] duration-300 ease-in-out
プログレスバー:    transition-[width] duration-400 ease-out
```

**根拠**: Material Design 3 Motion System

#### 11. キーボードナビゲーション強化

**現状**: `tabIndex={0}`のみで、フォーカス順序が未定義

**改善案**:
```tsx
// グリッド内のフォーカス順序を明示
<div role="region" aria-label="潮汐情報サマリー">
  {/* 左上 → 右上 → 左下 → 右下 */}
  <div tabIndex={0} onKeyDown={handleKeyDown}>

// 矢印キーでのナビゲーション
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'ArrowRight') { /* 次の項目 */ }
  if (e.key === 'ArrowDown') { /* 下の行 */ }
};
```

**根拠**: WCAG 2.1 Success Criterion 2.1.1（キーボード操作）

---

### 🟢 Low（軽微 - 余裕があれば改善）

#### 12. アイコンの一貫性

**現状**: 絵文字（🔴🔵🌊🏖️）を使用

**問題**: OSによって表示が異なる、スクリーンリーダーで読み上げられない

**改善案**:
```tsx
// SVGアイコンライブラリ（Heroicons/Lucide）の使用
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

満潮: <ArrowUpCircleIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
干潮: <ArrowDownCircleIcon className="w-5 h-5 text-gray-600" aria-hidden="true" />
```

**根拠**: Material Design 3 Iconography、iOS HIG SF Symbols

#### 13. ホバー効果の視覚的フィードバック強化

**現状**: `shadow-md → shadow-lg`のみ

**改善案**:
```tsx
// 多層フィードバック
hover:shadow-lg hover:scale-[1.02] hover:border-blue-200
transition-all duration-200 ease-out
```

**根拠**: Material Design 3 State Layers

---

## 💡 デザイン提案（Design Recommendations）

### 1. プログレスバーの再設計（高優先度）

**目的**: WCAG 2.1 AA準拠と色覚異常対応

**内容**:
```tsx
// 背景色 + テキスト + アイコンの組み合わせ
<div className="space-y-1">
  <div className="flex items-center justify-between text-xs">
    <span className="text-gray-600">潮汐強度</span>
    <span className="font-semibold text-gray-900">85% 強</span>
  </div>
  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
    <div
      className={`h-full transition-all duration-400 ease-out ${
        strength <= 30 ? 'bg-blue-600' :
        strength <= 60 ? 'bg-blue-700' :
        'bg-blue-800'
      }`}
      style={{ width: `${strength}%` }}
      role="progressbar"
      aria-valuenow={strength}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`潮汐強度${strength}パーセント、${
        strength <= 30 ? '弱い' : strength <= 60 ? '中程度の' : '強い'
      }潮流`}
    />
  </div>
  {/* テクスチャパターン（色覚異常対応） */}
  {strength > 60 && (
    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-blue-900/20" />
  )}
</div>
```

**期待効果**:
- WCAG 2.1 AA準拠達成
- 色覚異常者への情報伝達改善
- スクリーンリーダーでの完全な情報取得

**実装難易度**: Medium

### 2. レスポンシブグリッドの最適化

**目的**: デバイスサイズごとの最適表示

**内容**:
```tsx
// Tailwind CSS responsive grid
<div className="grid grid-cols-1 gap-3
                sm:grid-cols-2 sm:gap-4
                lg:grid-cols-4 lg:gap-6
                xl:grid-cols-4 xl:gap-8">
  {/*
    - 320-639px: 1列（縦積み）
    - 640-1023px: 2列（2×2グリッド）
    - 1024px以上: 4列（横並び）
  */}
</div>
```

**期待効果**: すべてのデバイスで最適な情報密度

**実装難易度**: Easy

### 3. 精度インジケーターの統合

**目的**: データ信頼性の透明性向上

**内容**:
```tsx
// カード右上にバッジ配置
<div className="absolute top-3 right-3 z-10">
  <span
    className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
      accuracy === 'high' ? 'bg-green-100 text-green-700 ring-1 ring-green-600/20' :
      accuracy === 'medium' ? 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-600/20' :
      'bg-orange-100 text-orange-700 ring-1 ring-orange-600/20'
    }`}
    role="status"
    aria-label={`データ精度: ${
      accuracy === 'high' ? '高、信頼性の高いデータです' :
      accuracy === 'medium' ? '中、おおよその目安です' :
      '低、参考程度にご利用ください'
    }`}
  >
    {accuracy === 'high' && <CheckCircleIcon className="w-3 h-3" />}
    {accuracy === 'medium' && <ExclamationTriangleIcon className="w-3 h-3" />}
    {accuracy === 'low' && <ExclamationCircleIcon className="w-3 h-3" />}
    <span>{accuracy === 'high' ? '高精度' : accuracy === 'medium' ? '中精度' : '低精度'}</span>
  </span>
</div>
```

**期待効果**: ユーザーの意思決定支援、トラスト構築

**実装難易度**: Easy

---

## 📊 アクセシビリティチェック

### WCAG 2.1 Level AA 準拠状況

| 項目 | 現状 | 改善後目標 | 備考 |
|------|------|------------|------|
| **色のコントラスト比** | ❌ 不合格（blue-300: 1.8:1） | ✅ 合格（blue-600以上使用） | SC 1.4.3 |
| **色だけに依存しない** | ❌ 不合格（強度を色のみで表現） | ✅ 合格（テキスト+アイコン併用） | SC 1.4.1 |
| **キーボードナビゲーション** | △ 部分対応 | ✅ 完全対応（矢印キー追加） | SC 2.1.1 |
| **スクリーンリーダー対応** | ❌ 不合格（ARIAラベル欠如） | ✅ 合格（role/aria-label追加） | SC 4.1.2 |
| **タッチターゲットサイズ** | ⚠ 未確認 | ✅ 44x44px保証 | SC 2.5.5 |
| **フォーカスインジケーター** | △ ブラウザデフォルト | ✅ カスタムスタイル追加 | SC 2.4.7 |

### チェックリスト

- [ ] **色のコントラスト比**: プログレスバーをblue-600/700/800に変更
- [ ] **色だけに依存しない**: テキストラベル（弱/中/強）を追加
- [ ] **キーボードナビゲーション**: tabIndex順序を定義、矢印キー対応追加
- [ ] **スクリーンリーダー対応**: role="region", aria-label, aria-valueを追加
- [ ] **タッチターゲットサイズ**: 詳細ボタンを44x44px以上に拡大
- [ ] **フォーカスインジケーター**: ring-2 ring-blue-500 ring-offset-2を追加

---

## 実装ガイドライン

### Tailwind CSSクラスの推奨値

```typescript
// カードコンテナ
<div className="p-4 md:p-6 space-y-4">

// グリッドレイアウト
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">

// 各グリッドアイテム
<div className="space-y-1">
  <div className="text-xs text-gray-600">ラベル</div>
  <div className="text-base font-semibold text-gray-900">値</div>
</div>

// プログレスバー
<div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
  <div
    className="h-full bg-blue-700 transition-all duration-400 ease-out"
    style={{ width: '85%' }}
  />
</div>

// イベントリスト
<div className="space-y-2">
  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border-l-2 border-blue-500">
    {/* イベント情報 */}
  </div>
</div>

// 詳細ボタン
<button className="min-w-[44px] min-h-[44px] px-4 py-3 text-blue-600 hover:bg-blue-50
                   rounded-lg transition-colors duration-200 font-medium
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
  詳細を表示 →
</button>
```

### ブレークポイント定義

```typescript
// Tailwind Config
module.exports = {
  theme: {
    screens: {
      'sm': '640px',   // タブレット縦
      'md': '768px',   // タブレット横
      'lg': '1024px',  // デスクトップ
      'xl': '1280px',  // 大画面
    }
  }
}

// 使用例
<div className="
  p-4                  // モバイル: 16px
  sm:p-6               // タブレット: 24px
  grid grid-cols-1     // モバイル: 1列
  sm:grid-cols-2       // タブレット: 2列
  lg:grid-cols-4       // デスクトップ: 4列
">
```

### アニメーション仕様

```typescript
// トランジション設定（Material Design 3準拠）
const animations = {
  // ホバー効果
  hover: 'transition-all duration-200 ease-out',

  // 詳細展開
  expand: 'transition-[max-height] duration-300 ease-in-out',

  // プログレスバー
  progress: 'transition-[width] duration-400 ease-out',

  // カラー変更
  color: 'transition-colors duration-200',

  // シャドウ変更
  shadow: 'transition-shadow duration-200',
};

// 使用例
<div className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ease-out">
```

---

## 🚀 次のステップ

### 優先度1（即座に実施）
1. ✅ プログレスバーの色をblue-600/700/800に変更 + テキストラベル追加
2. ✅ ARIAラベルの追加（role, aria-label, aria-valueなど）
3. ✅ 精度インジケーターの配置（カード右上）

### 優先度2（早期実施）
4. ✅ レスポンシブブレークポイントの見直し（sm/lg/xlの3段階）
5. ✅ タッチターゲットサイズの保証（詳細ボタン44x44px）
6. ✅ 過去イベントの視覚的区別強化（アイコン + 背景色）

### 優先度3（実装後に調整）
7. ⏳ フォントサイズの最適化（Material Design 3 Type Scale準拠）
8. ⏳ スペーシングの統一（8pxグリッドシステム）
9. ⏳ キーボードナビゲーション強化（矢印キー対応）

---

## 📚 参考資料

### デザインシステム
- [Material Design 3 - Components](https://m3.material.io/components)
- [iOS Human Interface Guidelines - Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)

### カラーコントラストツール
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Accessible Colors](https://accessible-colors.com/)

### アクセシビリティベストプラクティス
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

### 既存実装参考
- `/Users/nakagawayuusuke/dev/personal/fish/bite-note/src/components/PWAInstallPrompt.tsx`
  - WCAG 2.1 AA準拠の優れた実装例
  - フォーカストラップ、ARIAラベル、44x44pxボタン、キーボードナビゲーションが完備

---

**重要な次のステップ**:
1. まず**Critical（🔴）の3項目**を必ず実装してください
2. PWAInstallPromptコンポーネントのアクセシビリティ実装を参考にしてください
3. 実装後、WebAIM Contrast Checkerでコントラスト比を検証してください
4. 可能であればスクリーンリーダー（VoiceOver/NVDA）でテストしてください

---

**Generated with Claude Code**
**Co-Authored-By: Claude (Designer Agent)**

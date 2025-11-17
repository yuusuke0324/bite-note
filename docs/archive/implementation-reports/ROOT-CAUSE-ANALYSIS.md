# 根本原因分析レポート: 潮汐グラフ表示問題

**日付**: 2025-10-11
**調査者**: Claude Code
**対象**: TASK-303「潮汐グラフ描画改善」プロジェクト

---

## エグゼクティブサマリー

TASK-303プロジェクトは「100%完了」と報告されていましたが、実際の動作検証において**要件定義との重大な不一致**が発見されました。

### 主要な発見事項

1. ❌ **REQ-503違反**: 要件は`recharts`ライブラリの使用を要求しているが、実装は`SVGベース`のTideGraphを使用
2. ⚠️ **レスポンシブ対応不足**: useMemoの依存配列が空で、画面サイズ変更に対応できていない
3. ⚠️ **コンポーネント統合ミス**: TideIntegrationはSVGベースのTideGraph、ModernAppはrechartsベースのTideChart
4. ❌ **要件定義の読み間違え**: TASK-303の要件はTideIntegration(釣果記録詳細画面)の改善を期待していたが、実装はModernApp(スタンドアロンタブ)に統合

---

## 問題の詳細分析

### 1. 要件定義 vs 実装のギャップ

#### 要件定義 (`tide-graph-improvement-requirements.md`)

```markdown
### REQ-503: recharts統合
システムはrechartsライブラリ（LineChart, Line, XAxis, YAxis）を使用してグラフを描画しなければならない

### コンテキスト
釣果記録詳細画面での潮汐グラフ表示を改善する
```

#### 実際の実装 (`TideIntegration.tsx:509-515`)

```typescript
<TideGraph
  key="tide-graph-stable"
  data={tideGraphData}
  width={isMobile ? 300 : 550}
  height={isMobile ? 180 : 280}
  animated={false}
/>
```

**問題点**: `recharts`を使用する`TideChart`ではなく、`SVGベース`の`TideGraph`を使用している

---

### 2. コンポーネント構成の混乱

プロジェクトには**2つの異なる潮汐グラフコンポーネント**が存在:

| コンポーネント | 技術スタック | 使用場所 | 要件適合性 |
|--------------|------------|---------|-----------|
| **TideGraph** | SVGベース (カスタム実装) | TideIntegration (釣果記録詳細) | ❌ REQ-503違反 |
| **TideChart** | rechartsベース | ModernApp (スタンドアロンタブ) | ✅ REQ-503準拠 |

**根本問題**: 要件定義が期待していた「釣果記録詳細画面での改善」が、**別のコンポーネント(ModernApp)に実装**されていた

---

### 3. レスポンシブ対応の不備

#### 問題コード (`TideIntegration.tsx:60-66`)

```typescript
const isMobile = useMemo(() => {
  return typeof window !== 'undefined' && window.innerWidth <= 768;
}, []); // ❌ 依存配列が空 - 初回レンダリング時のみ評価

const isTablet = useMemo(() => {
  return typeof window !== 'undefined' && window.innerWidth > 768 && window.innerWidth <= 1024;
}, []); // ❌ 依存配列が空 - 初回レンダリング時のみ評価
```

**影響**:
- コンポーネントマウント時の画面サイズで固定される
- ウィンドウリサイズやデバイス回転に対応できない
- 誤った画面サイズ判定により、グラフサイズが不適切になる

---

### 4. スクリーンショットの状態分析

ユーザーが提供したスクリーンショットには以下が表示されていた:

```
🌊 潮汐情報
📊潮汐グラフを非表示 [ボタン]
潮位グラフ(24時間表示)
50cm
```

**分析結果**:

1. **「潮汐グラフを非表示」ボタン**: `isExpanded=true`の状態 → グラフは展開されている
2. **「潮位グラフ(24時間表示)」**: TideIntegration.tsx:508のヘッダー
3. **「50cm」のみ表示**: TideGraphのSVGは描画されているが、以下の理由で見えない:
   - レスポンシブ判定の誤り → 不適切なサイズ設定
   - SVG containerのサイズが0または画面外
   - Y軸ラベルの「50cm」だけが可視領域内に表示されている

---

## なぜこの状態になったのか

### タイムライン分析

1. **TASK-001~002 (初期実装)**:
   - SVGベースのTideGraphコンポーネントを実装
   - TideIntegrationに統合

2. **TASK-303 (recharts統合タスク)**:
   - 要件: rechartsを使用した潮汐グラフ改善
   - 実装: rechartsベースの**新しいコンポーネント(TideChart)**を作成
   - **問題**: TideIntegrationを更新せず、**ModernAppに新規タブとして追加**

3. **TASK-401~402 (統合・QA)**:
   - ModernAppへの統合を「完了」と報告
   - TideIntegrationの更新が漏れていることに気づかなかった

4. **検証フェーズ**:
   - ユーザーが釣果記録詳細画面で要件定義と比較
   - 実際にはTideIntegration(SVGベース)が使われていることが判明

---

## 根本原因

### 1. 要件定義の誤解

**誤った理解**:
> 「潮汐グラフをrechartsで実装して、どこかに表示すれば良い」

**正しい理解**:
> 「**釣果記録詳細画面(TideIntegration)の既存の潮汐グラフ**をrechartsベースに置き換える」

### 2. テスト戦略の不備

- E2E テストはModernAppの新規タブ(TC-E001-*)のみをテスト
- TideIntegrationコンポーネントの統合テストが不足
- 実際のユーザーフロー(釣果記録詳細表示)の検証漏れ

### 3. レビュープロセスの欠如

- 実装完了前に要件定義と実装の突き合わせを行わなかった
- スクリーンショットや動作検証なしで「100%完了」と報告
- ステークホルダー(ユーザー)によるUAT(User Acceptance Test)の実施遅延

---

## 影響範囲

### ユーザー影響

- ✅ ModernAppの新規「潮汐グラフ」タブ: 正しく動作(rechartsベース)
- ❌ 釣果記録詳細画面の潮汐グラフ:
  - REQ-503違反(SVGベース)
  - レスポンシブ対応不足により一部環境で正しく表示されない

### 技術的影響

- コード重複: TideGraph(SVG) + TideChart(recharts)の2つの実装が存在
- メンテナンス負荷増加
- テストカバレッジの不整合

---

## 推奨される対策

### 即時対応 (Critical)

1. **TideIntegrationの修正**:
   ```typescript
   // Before (SVGベース)
   <TideGraph data={tideGraphData} ... />

   // After (rechartsベース)
   <TideChart data={convertToTideChartFormat(tideGraphData)} ... />
   ```

2. **レスポンシブ判定の修正**:
   ```typescript
   // useResizeObserver hookを使用
   const [containerRef, dimensions] = useResizeObserver<HTMLDivElement>();
   const isMobile = dimensions.width <= 768;
   ```

3. **E2Eテストの追加**:
   - TC-E004: TideIntegration(釣果記録詳細画面)での潮汐グラフ表示
   - TC-E005: レスポンシブ対応検証(モバイル/タブレット/デスクトップ)

### 中期対応 (High Priority)

4. **コード統合**:
   - TideGraph(SVG)の廃止を検討
   - TideChart(recharts)に一本化

5. **ドキュメント改善**:
   - 要件定義に「影響範囲」「対象コンポーネント」を明記
   - 実装前のレビューチェックリスト作成

6. **QAプロセス強化**:
   - 実装完了前の要件突き合わせを必須化
   - UAT(ユーザー受入テスト)を開発サイクルに組み込む

---

## 学んだ教訓

### For Development

1. **要件定義の明確化**:
   - 「どこに」「何を」「どのように」を具体的に記述
   - 対象コンポーネント・ファイルパスを明記

2. **実装前の設計レビュー**:
   - 実装に着手する前に、アプローチを確認
   - 既存コンポーネントへの影響を評価

3. **継続的な検証**:
   - 実装途中でも要件との整合性を確認
   - スクリーンショットや動画で進捗を可視化

### For Testing

4. **E2Eテストの範囲**:
   - 新機能だけでなく、既存機能への影響もテスト
   - ユーザーフロー全体をカバー

5. **レスポンシブテスト**:
   - モバイル/タブレット/デスクトップの全デバイスタイプで検証
   - 画面サイズ変更・デバイス回転のテストを含める

### For Process

6. **Definition of Done**:
   - 実装完了 ≠ コードが動く
   - 実装完了 = 要件を満たし、全テストが成功し、ユーザー検証を完了

---

## 次のステップ

1. ✅ 根本原因レポート作成 ← **現在地**
2. ⬜ ユーザーへの影響説明と修正方針の合意
3. ⬜ TideIntegrationのrecharts化実装
4. ⬜ レスポンシブ対応修正
5. ⬜ 追加E2Eテスト実装
6. ⬜ 修正後の全体テスト
7. ⬜ UAT(ユーザー受入テスト)実施

---

## 付録: ファイル参照

| ファイル | 関連行 | 内容 |
|---------|-------|------|
| `tide-graph-improvement-requirements.md` | 全体 | 要件定義 |
| `TideIntegration.tsx` | 509-515 | 問題のTideGraph使用箇所 |
| `TideIntegration.tsx` | 60-66 | レスポンシブ判定の不備 |
| `TideGraph.tsx` | 1-683 | SVGベース実装(REQ-503違反) |
| `ModernApp.tsx` | 148-152, 457-482 | TideChart統合(正しい実装) |
| `TASK-303-FINAL-REPORT.md` | 全体 | 誤った「100%完了」報告 |

---

**作成日時**: 2025-10-11
**ステータス**: DRAFT
**レビュー待ち**: ユーザー確認

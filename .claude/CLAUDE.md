# Bite Note - AI駆動開発ガイドライン

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

プロジェクト: 個人釣果記録PWA (React + TypeScript + IndexedDB)
開発方針: 品質とUX両立・AI駆動開発

---

## 🚨 重要規則 (MUST)

### Git作業フロー

- **mainブランチでの直接作業は絶対禁止**: いかなる変更もmainブランチに直接コミットしない
- **作業開始時の判断**:
  - **現在のブランチを確認**（`git branch --show-current`）
  - **main以外のブランチにいる場合** → git worktree使用必須（下記「Git Worktree」参照）
  - **mainブランチにいる場合** → 未クローズIssue確認（`gh issue list --assignee @me --state open`）
    - 未クローズIssue有り → git worktree使用推奨（下記参照）
    - 未クローズIssue無し → `git checkout -b feat-issue-番号-説明`
- **作業終了時**: コミット → push → PR作成の3ステップを必ず実施
- 📄 **詳細**: `ai-rules/COMMIT_AND_PR_GUIDELINES.md`

### Git Worktree（複数Issue管理）

**使用するケース:**
既存の作業中Issue（未マージブランチや未クローズIssue）が存在する状態で、新規Issueを開始する場合

複数のIssueを同時作業する場合、git worktreeを使用：

```bash
# worktree作成
git worktree add ../bite-note-worktrees/issue-XXX -b feat-issue-XXX-description

# worktreeに移動
cd ../bite-note-worktrees/issue-XXX
npm install
code .
```

**重要ポイント**:
- **1 worktree = 1 Claude Codeセッション**: 各worktreeで独立したセッション起動
- **ブランチ確認**: `git branch --show-current` で現在のブランチ確認
- **最大3 worktree推奨**: ディスク容量・メモリ考慮
- **削除必須**: PRマージ後は必ず`git worktree remove`でworktreeを削除（ディスク容量節約）
- 📄 **詳細**: `ai-rules/GIT_WORKTREE_GUIDELINES.md`

### Issue駆動開発フロー

- **Issue作成**: タスク粒度（2-6時間、1-5ファイル）を確認
- **作業開始時**: 上記「Git作業フロー」の判断に従いブランチ作成、WIPラベル付与、セルフアサイン
- **作業中**: Session Notes更新、Files to Edit実績更新
- **PR作成時**: `Closes #番号` でIssueとリンク
- **マージ後**: Issue自動クローズ、**worktree削除**（使用時は必須）
- 📄 **詳細**: `ai-rules/TASK_CYCLES.md` セクション8

### 専門エージェント活用

- **タスク開始時**: `task-coordinator` エージェントに相談し、適切なサイクルとgit worktree使用の要否を決定
- **UI/UX実装**: `designer` エージェントのレビュー必須
- **コード改修**: `tech-lead` エージェントのレビュー必須
- **テストコード**: `qa-engineer` エージェントのレビュー必須
- **要件定義**: `product-manager` エージェントに依頼
- 📄 **詳細**: `ai-rules/TASK_CYCLES.md`

### リトライポリシー

- **独力でのリトライは禁止**: 問題発生時は必ず専門エージェントに相談
- **最大5回まで**: 各失敗後はエージェントに相談してから再試行
- 📄 **詳細**: `ai-rules/RETRY_POLICY.md`

### 設計書管理

- **コード改修前**: 設計書の更新要否を必ず判断
- **更新後**: tech-lead エージェントにレビュー依頼
- 📄 **詳細**: `ai-rules/DESIGN_DOC_GUIDELINES.md`

### コード品質

- **完了確認必須**: 改修完了後、ユーザーに報告し承認を得る
- **テスト実行必須**: コード変更後は `npm run test:fast` で動作確認
- **型安全性維持**: TypeScript型定義を省略しない

---

## 🎯 プロジェクト固有パターン

### サービス層アーキテクチャ

```
src/lib/*-service.ts パターンを必ず使用:
- fishing-record-service.ts → 釣果CRUD
- photo-service.ts → 写真管理
- weather-service.ts → 天気API
- export-import-service.ts → データ入出力
```

### 状態管理

```
Zustand + Immer で実装:
- stores/app-store.ts → グローバル状態
- stores/form-store.ts → フォーム状態
- 非同期処理は必ずtry-catchでラップ
```

### UI/UXパターン

```
統一コンポーネント使用:
- ui/Skeleton*.tsx → ローディング表示
- ui/ModernCard.tsx → カード表示
- ui/FloatingActionButton.tsx → FAB
```

### テーマシステム

```
CSS変数ベースのライト/ダークテーマ:
- src/index.css → 全カラー変数を一元管理
- body.light-theme クラス → ライトモード適用
- localStorage → テーマ設定の永続化

色指定のルール:
- ❌ colors.XXX を直接使用しない
- ✅ var(--color-XXX) を使用する
  例: var(--color-text-primary), var(--color-surface-secondary)

主要CSS変数:
- --color-background-primary    # 背景色
- --color-surface-primary       # カード/パネル背景
- --color-text-primary          # 主テキスト
- --color-text-secondary        # 副テキスト
- --color-border-light          # ボーダー
- --color-chart-axis            # グラフ軸
```

### アーキテクチャ

- **IndexedDB操作**: Dexieサービス層経由で実行（直接操作禁止）
- **コンポーネント配置**: features/以下に機能ごとに整理

---

## 🔧 開発コマンド

### よく使うコマンド

```bash
# 開発サーバー起動
npm run dev

# テスト実行（高速）
npm run test:fast

# ビルド & 本番確認
npm run build && npm run preview

# 型チェック
npm run typecheck

# コンポーネントテスト
npm run test:components
```

### デバッグ・調査

```bash
# IndexedDBの中身を確認
# → Chrome DevTools > Application > Storage > IndexedDB

# パフォーマンス測定
npm run performance:test

# メモリプロファイル
npm run memory:profile
```

---

## 📂 ファイル配置ルール

```
新機能追加時:
├── src/components/features/[機能名]/
│   ├── [機能名].tsx           # メインコンポーネント
│   ├── [機能名].test.tsx      # テスト
│   └── components/            # サブコンポーネント
├── src/lib/[機能名]-service.ts  # サービス層
└── src/types/[機能名].ts        # 型定義
```

---

## 👥 専門エージェント活用ガイド

### 📋 利用可能なエージェント

| エージェント         | 役割                  | 呼び出しタイミング         |
| -------------------- | --------------------- | -------------------------- |
| **task-coordinator** | タスクサイクル提案    | タスク開始時（推奨）       |
| **designer**         | UI/UXデザインレビュー | UI/UX実装時（必須）        |
| **tech-lead**        | コード品質レビュー    | コード改修後、設計書更新後 |
| **qa-engineer**      | テストコードレビュー  | テストコード作成・修正時   |
| **product-manager**  | 要件定義・仕様策定    | 新機能企画、仕様策定時     |

### 🔄 基本的なレビューフロー

```
1. タスク開始時
   ↓
2. task-coordinator に相談（推奨）
   ↓ 適切なサイクルを提案
3. 提案されたサイクルに従って実施
   ↓
4. 各フェーズで該当エージェントにレビュー依頼
   ↓
5. すべてのレビュー完了後、ユーザーに報告
```

**詳細なサイクル**: `ai-rules/TASK_CYCLES.md` を参照

---

## ⛔ 完了報告禁止条件

以下のいずれかの状態では「完了」と報告してはいけない:

- ❌ テストが失敗している
- ❌ コンパイルエラーがある
- ❌ 専門エージェントレビューが未完了
- ❌ Git作業（コミット・push・PR作成）が未完了
- ❌ **PR作成後のCI結果確認が未完了**
- ❌ CI失敗を修正していない（PR範囲内の失敗の場合）
- ❌ ユーザーへの報告内容が準備できていない

**CI確認プロセス詳細**: `ai-rules/COMMIT_AND_PR_GUIDELINES.md` の「PR作成後のCI確認プロセス」を参照

---

## 💡 トラブルシューティング

### テスト失敗時

1. `npm run test:ui` でUI確認
2. メモリ不足なら `NODE_OPTIONS='--max-old-space-size=4096' npm test`

### IndexedDB問題

1. Chrome DevTools > Application > Clear Storage
2. `window.indexedDB.deleteDatabase('BiteNoteDB')`

### パフォーマンス問題

1. `npm run build:analyze` でバンドルサイズ確認
2. React DevTools Profilerで再レンダリング確認

---

## 📚 詳細ドキュメント

### AI駆動開発ルール（ai-rules/）

| ドキュメント                  | 内容                                  |
| ----------------------------- | ------------------------------------- |
| `COMMIT_AND_PR_GUIDELINES.md` | Conventional Commits、PR作成ガイド    |
| `ISSUE_GUIDELINES.md`         | Issue作成ガイド                       |
| `RETRY_POLICY.md`             | エージェント活用型リトライポリシー    |
| `TASK_CYCLES.md`              | タスク種別ごとの実施サイクル（7種類） |
| `DESIGN_DOC_GUIDELINES.md`    | 設計書管理ガイドライン                |

### 専門エージェント（.claude/agents/）

| エージェント          | 役割                                                          |
| --------------------- | ------------------------------------------------------------- |
| `task-coordinator.md` | タスクサイクル提案、進捗管理                                  |
| `designer.md`         | UI/UXデザインレビュー（WCAG 2.1、Material Design 3、iOS HIG） |
| `tech-lead.md`        | コード品質レビュー、アーキテクチャ                            |
| `qa-engineer.md`      | テストコードレビュー、テスト戦略                              |
| `product-manager.md`  | 要件定義、仕様策定                                            |

### プロジェクトドキュメント（docs/）

| ドキュメント                            | 内容               |
| --------------------------------------- | ------------------ |
| `docs/design/architecture.md`           | アーキテクチャ設計 |
| `docs/design/ui-ux-improvement-plan.md` | UI/UX改善計画      |
| `docs/current-status-and-roadmap.md`    | 現状とロードマップ |

---

**現在フェーズ**: v2.0.0 ライト/ダークテーマ切り替え実装完了
**次期目標**: PWA対応完全化、テストカバレッジ70%達成

---

**重要**: このファイルはプロジェクト固有のパターンとクイックリファレンスに集中しています。詳細なルールやプロセスは、上記の詳細ドキュメントを参照してください。

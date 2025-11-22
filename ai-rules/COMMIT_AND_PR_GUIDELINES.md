# コミット・PR作成ガイドライン

このドキュメントは、Bite Noteプロジェクトにおけるコミットメッセージとプルリクエスト作成のベストプラクティスをまとめたものです。

## 🚨 絶対ルール (MUST)

- **mainブランチでの直接作業は絶対禁止**: いかなる変更もmainブランチに直接コミットしない
- **作業開始時**: 必ず専用ブランチを作成する
- **作業終了時**: コミット → push → PR作成の3ステップを必ず実施

---

## 🌿 ブランチ戦略

### ブランチ命名規則

**Issue駆動開発対応**: 必ずIssue番号を含める

```
feat-issue-番号-短い説明      # 新機能追加
fix-issue-番号-短い説明       # バグ修正
refactor-issue-番号-短い説明  # リファクタリング
docs-issue-番号-短い説明      # ドキュメント更新
test-issue-番号-短い説明      # テスト追加・修正
chore-issue-番号-短い説明     # その他の作業
```

### 例

```bash
feat-issue-42-photo-exif           # Issue #42: 写真EXIF情報抽出
fix-issue-58-tide-scale            # Issue #58: 潮汐グラフスケール修正
refactor-issue-73-error-handling   # Issue #73: エラーハンドリング統一
docs-issue-19-api-guide            # Issue #19: APIガイド作成
test-issue-85-tide-calculation     # Issue #85: 潮汐計算テスト追加
chore-issue-12-deps-update         # Issue #12: 依存関係更新
```

**重要**: Issue番号を含めることで、GitHub上でブランチとIssueが自動リンクされます。

---

## 🌲 Git Worktree使用時の補足

### worktree使用時のブランチ作成

複数タスクを並行作業する場合、git worktreeを使用します。

```bash
# mainブランチで最新コード取得
git checkout main
git pull origin main

# worktree作成（新規ブランチと同時作成）
git worktree add ../bite-note-worktrees/issue-XXX -b feat-issue-XXX-description

# worktreeに移動
cd ../bite-note-worktrees/issue-XXX

# 依存関係インストール
npm install

# VSCode起動
code .
```

### worktree削除（タスク完了後）

```bash
# メインリポジトリに移動
cd ~/dev/personal/fish/bite-note

# worktree削除
git worktree remove ../bite-note-worktrees/issue-XXX

# ブランチ削除（オプション）
git branch -d feat-issue-XXX-description
```

### 並行作業時の注意点

- **各worktreeは独立**: コミット・pushは並行実行可能
- **ブランチ確認**: `git branch --show-current` で現在のブランチ確認
- **Claude Codeセッション**: 1 worktree = 1 Claude Codeセッション推奨

**詳細**: `ai-rules/GIT_WORKTREE_GUIDELINES.md` を参照

---

## 💬 コミットメッセージ規約

### Conventional Commits形式を採用

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type（必須）

```
feat:     新機能追加
fix:      バグ修正
refactor: リファクタリング（機能変更なし）
docs:     ドキュメント更新
style:    コードスタイル変更（フォーマット、セミコロン等）
test:     テスト追加・修正
chore:    ビルド、ツール設定等
perf:     パフォーマンス改善
```

### Scope（任意）

```
api, ui, db, auth, tide, photo, export, etc.
```

### Subject（必須）

- **命令形・現在形を使用**: "add" not "added" or "adds"
- **最大50文字**
- **小文字で開始**
- **末尾にピリオドを付けない**
- **明確で簡潔に**

### Body（推奨）

- **変更理由（Why）を記載**
- **72文字で改行**
- **subjectから1行空ける**

### Footer（該当する場合）

```
BREAKING CHANGE: 破壊的変更の説明
Closes #123, #456  # 関連issueのクローズ
Refs #789          # 関連issue参照
```

### 良いコミットメッセージの例

```bash
feat(photo): add EXIF metadata auto-extraction

GPS情報付き写真から位置・日時・天気を自動抽出する機能を追加。
並列API呼び出しとIndexedDBキャッシュにより高速化（3秒 → 1秒）。

Closes #42
```

```bash
fix(tide): correct scale calculation for responsive layout

レスポンシブ対応時にスケールが正しく計算されない問題を修正。
useResizeObserverフックを使用して動的にSVGサイズを調整。

Fixes #58
```

```bash
refactor(services): extract common error handling logic

各サービス層に散在していたエラーハンドリングを
ErrorHandlingServiceに集約し、DRY原則を適用。
```

### 悪いコミットメッセージの例

```bash
# ❌ 具体性がない
fix: bug fix

# ❌ 過去形
added new feature

# ❌ 長すぎる subject
feat: add a new photo metadata extraction feature with GPS, date, time, and weather information

# ❌ 変更内容の羅列（Whyがない）
update components and fix tests
```

---

## 🔄 プルリクエスト（PR）作成ガイドライン

### 作業終了時のフロー（必須3ステップ）

```bash
# Step 1: コミット
git add .
git commit -m "feat(ui): add skeleton loading animation"

# Step 2: リモートにpush
git push -u origin feat/skeleton-loading

# Step 3: PR作成（MCPツール使用）
# GitHub CLIまたはMCPツールでPR作成
gh pr create --title "feat(ui): スケルトンローディングアニメーション追加" \
  --body "$(cat <<'EOF'
## 📋 概要
体感速度を向上させるスケルトンローディングUIを実装

## 🔧 変更内容
- Skeletonコンポーネントの作成
- SkeletonRecordCard, SkeletonPhotoCardの実装
- 記録一覧とホーム画面に適用

## 🧪 テスト
- npm run test:fast: ✅ パス
- npm run typecheck: ✅ パス
- ブラウザ動作確認: ✅ 完了

## 📚 関連issue
Closes #45
EOF
)"
```

### PR タイトル

```
<type>(<scope>): <簡潔な説明>（日本語OK）
```

### PR 本文テンプレート

```markdown
## 📋 概要
[このPRの目的を1-2文で説明]

## 🔧 変更内容
- [変更点1]
- [変更点2]
- [変更点3]

## ✅ チェックリスト

### コード品質
- [ ] TypeScript型定義が適切
- [ ] コードの可読性が高い
- [ ] DRY原則に従っている
- [ ] エラーハンドリングが適切

### テスト
- [ ] `npm run test:fast` がパス
- [ ] `npm run typecheck` がパス
- [ ] 新規テストを追加（該当する場合）
- [ ] カバレッジが維持・向上している

### ドキュメント
- [ ] 設計書を更新（該当する場合）
- [ ] README.mdを更新（該当する場合）
- [ ] インラインコメントを追加（複雑な処理）

### セルフレビュー
- [ ] プロエンジニアセルフレビュー完了
- [ ] プロQAエンジニアレビュー完了（テストコード修正時）

## 🧪 テスト結果
```bash
npm run test:fast: ✅ パス
npm run typecheck: ✅ パス
```

## 📚 関連issue
Closes #XX
Refs #YY

## 📸 スクリーンショット（UI変更時）
[スクリーンショットを添付]

## 💡 補足・注意事項
[レビュアーに知っておいてほしい情報]
```

---

## 🔍 PR作成後のCI確認プロセス（必須）

### 基本フロー

PR作成後、**ユーザーへの完了報告前に必ずCI結果を確認する**:

```bash
# Step 1: PR作成
gh pr create --title "..." --body "..."

# Step 2: CI実行状況を確認（必須）
gh pr checks <PR番号>

# Step 3: CI結果に応じた判断
```

### CI結果に応じた判断フロー

#### ✅ 全CI成功の場合

```markdown
**アクション**: 即座にマージ可能判断、ユーザーに完了報告

**報告例**:
---
## ✅ タスク完了報告

### PR情報
- PR #XX: [PR タイトル]
- CI結果: ✅ 全チェックパス

### CI実行結果
✅ Lint Check
✅ Type Check
✅ Unit Tests
✅ Build

### マージ準備完了
すべてのCI検証が成功しました。いつでもマージ可能です。
---
```

#### ❌ CI失敗の場合

**Step 1**: 失敗原因を分析

```bash
# CI失敗詳細を確認
gh pr checks <PR番号> --watch

# 失敗したジョブのログを確認
gh run view <run-id> --log-failed
```

**Step 2**: 失敗原因の分類

##### ケース1: PRの変更範囲内の失敗

**アクション**: 修正してCI再実行

```bash
# 1. 問題を修正
# 2. 追加コミット
git add .
git commit -m "fix(ci): resolve CI failure in [component]"
git push

# 3. CI再実行を確認
gh pr checks <PR番号> --watch

# 4. CI成功後、ユーザーに完了報告
```

**報告例**:
```markdown
## ✅ タスク完了報告（CI修正済み）

### PR情報
- PR #XX: [PR タイトル]
- CI結果: ✅ 全チェックパス（修正後）

### CI修正履歴
❌ 初回CI: Type Check失敗（修正前）
✅ 修正コミット追加
✅ 2回目CI: 全チェックパス

### マージ準備完了
CI失敗を修正し、すべての検証が成功しました。
```

##### ケース2: PRの変更範囲外の失敗（既存の問題）

**アクション**: 別Issue作成、状況説明、現PRはマージ可能判断

```bash
# 1. 失敗原因を詳細に調査
# 例: TideChartコンポーネントの型エラー（PR範囲外）

# 2. 新規Issue作成
gh issue create \
  --title "fix(tide): resolve type error in TideChart component" \
  --body "$(cat <<'EOF'
## 🐛 問題
PR #74のCI実行時に、TideChartコンポーネントで型エラーが検出されました。
この問題はPR #74の変更範囲外の既存コードに起因します。

## 🔍 エラー内容
```
src/components/TideChart.tsx:42:15
Type 'number | undefined' is not assignable to type 'number'
```

## 📋 タスク
- TideChartコンポーネントの型定義を修正
- 関連するテストケースを追加
- CI実行で型チェックがパスすることを確認

## 🔗 関連PR
- 検出元: PR #74
EOF
)"

# 3. Issue番号を記録（例: #75）
```

**報告例**:
```markdown
## ✅ タスク完了報告（既存問題を分離）

### PR情報
- PR #74: feat(test): add comprehensive tests for photo-service
- PR自体の品質: ✅ 完璧（変更範囲内は問題なし）
- CI結果: ❌ Type Check失敗（既存コードの問題）

### CI失敗の分析
**失敗箇所**: TideChartコンポーネント（PR範囲外）
**原因**: 既存コードの型定義不足
**判断**: PR #74の変更は完璧なため、マージ可能

### 対応状況
✅ Issue #75を作成: "fix(tide): resolve type error in TideChart component"
✅ 既存問題を分離し、別タスクとして管理

### マージ判断
**PR #74はマージ可能です**。
既存の型エラーはIssue #75で別途対応します。

---

### 次のアクション
Issue #75のタスク実施をご希望の場合はお知らせください。
```

### ⚠️ 重要な注意事項

1. **CI確認は必須**
   - PR作成直後に `gh pr checks` で確認
   - ユーザーへの完了報告前に必ず実行

2. **失敗原因の正確な分類**
   - 自分のPR範囲内 → 修正してCI再実行
   - PR範囲外（既存問題） → Issue分離、マージ可能判断

3. **透明性のある報告**
   - CI結果を必ず報告に含める
   - 失敗した場合は原因と対応を明記

4. **既存問題の適切な管理**
   - Issue作成で追跡可能にする
   - 現PRと混同しない

### 📊 CI確認チェックリスト

PR作成後、以下を確認:

- [ ] `gh pr checks <PR番号>` を実行
- [ ] CI実行状況を確認（pending/success/failure）
- [ ] 失敗がある場合、原因を分析
- [ ] PR範囲内の失敗 → 修正
- [ ] PR範囲外の失敗 → Issue作成
- [ ] CI結果をユーザーに報告
- [ ] マージ可能判断を明示

---

## 📏 PRサイズのベストプラクティス

### 小さく保つ

- **推奨**: 変更ファイル数 1-10個、変更行数 200-500行
- **最大**: 変更ファイル数 20個、変更行数 1000行
- **大きすぎる場合**: 複数のPRに分割

### 単一責任

- **1 PR = 1つの目的**
- 機能追加とリファクタリングは別PR
- バグ修正と新機能追加は別PR

---

## 🔍 セルフレビュー（PR作成前に必須）

### コミット前

```bash
# 1. ステージングされた変更を確認
git diff --staged

# 2. 型チェック
npm run typecheck

# 3. テスト実行
npm run test:fast

# 4. リント
npm run lint
```

### PR作成前

1. **GitHubで自分のPRを確認**
   - Files changed タブで差分を確認
   - 不要なコメント、console.log、デバッグコードがないか確認

2. **チェックリストを確認**
   - 上記のPR本文テンプレートのチェックリスト項目を確認

3. **PRサイズを確認**
   - 大きすぎる場合は分割を検討

---

## 🚀 自動化ツール（推奨）

### コミットメッセージ検証

```bash
# commitlint + huskyで自動検証（将来実装予定）
npm install --save-dev @commitlint/cli @commitlint/config-conventional husky
```

### PR自動チェック

```bash
# GitHub Actions でCI/CD自動実行
- Linter（eslint）
- 型チェック（tsc）
- テスト（vitest）
- ビルド（vite build）
```

---

## 📚 参考資料

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitKraken: Git Commit Message Best Practices](https://www.gitkraken.com/learn/git/best-practices/git-commit-message)
- [GitHub: Pull Request Best Practices](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/getting-started/best-practices-for-pull-requests)
- [Graphite: Pull Request Best Practices 2024](https://graphite.dev/guides/pull-request-best-practices-2024)

---

**Last Updated**: 2025-11-06

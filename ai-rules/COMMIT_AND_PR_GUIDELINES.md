# コミット・PR作成ガイドライン

このドキュメントは、Bite Noteプロジェクトにおけるコミットメッセージとプルリクエスト作成のベストプラクティスをまとめたものです。

## 🚨 絶対ルール (MUST)

- **mainブランチでの直接作業は絶対禁止**: いかなる変更もmainブランチに直接コミットしない
- **作業開始時**: 必ず専用ブランチを作成する
- **作業終了時**: コミット → push → PR作成の3ステップを必ず実施

---

## 🌿 ブランチ戦略

### ブランチ命名規則

```
feat/<機能名>      # 新機能追加
fix/<修正内容>     # バグ修正
refactor/<対象>   # リファクタリング
docs/<対象>       # ドキュメント更新
test/<対象>       # テスト追加・修正
chore/<内容>      # その他の作業
```

### 例

```bash
feat/weight-field            # 重量フィールド追加
fix/skeleton-loading        # スケルトンローディングのバグ修正
refactor/tide-calculation   # 潮汐計算のリファクタリング
docs/readme-update          # README更新
test/photo-service          # 写真サービスのテスト追加
chore/dependencies-update   # 依存関係の更新
```

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

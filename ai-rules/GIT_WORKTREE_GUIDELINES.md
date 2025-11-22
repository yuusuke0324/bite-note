# Git Worktree ガイドライン

このドキュメントは、Bite Noteプロジェクトにおけるgit worktreeの使用方法とベストプラクティスをまとめたものです。

## 🎯 git worktreeとは

git worktreeは、1つのリポジトリで**複数のブランチを同時にチェックアウト**できる機能です。各worktreeは独立したディレクトリを持つため、ブランチ切り替えなしで並行作業が可能になります。

### メリット

- ✅ **並行作業の効率化**: 複数のIssueを同時進行可能
- ✅ **Claude Codeセッション独立**: 各worktreeで独立したセッション起動
- ✅ **ブランチ切り替えストレス解消**: `git checkout`なしで別ブランチ編集
- ✅ **1 Issue = 1 PRの原則維持**: Issue駆動開発フローと整合

### デメリット・注意点

- ⚠️ **ディスク使用量増加**: worktree数×2-3GB（node_modules含む）
- ⚠️ **メモリ使用量増加**: VSCode複数Window起動
- ⚠️ **学習コスト**: 新しいgitコマンド習得が必要

---

## 📂 ディレクトリ構造

```
bite-note/                    # メインworktree（mainブランチ）
  ├── src/
  ├── ai-rules/
  ├── .claude/
  ├── .git/                  # すべてのworktreeで共有
  └── node_modules/          # メイン用

bite-note-worktrees/          # worktree専用ディレクトリ
  ├── issue-208/             # Issue #208専用worktree
  │   ├── src/
  │   ├── node_modules/     # Issue 208用
  │   └── ...
  ├── issue-209/             # Issue #209専用worktree
  │   ├── src/
  │   ├── node_modules/     # Issue 209用
  │   └── ...
  └── ...（最大3つまで推奨）
```

### 重要なポイント

- **メインworktree**: `~/dev/personal/fish/bite-note` は常に`main`ブランチ
- **作業用worktree**: `~/dev/personal/fish/bite-note-worktrees/` 配下に作成
- **最大worktree数**: 3つまでを推奨（ディスク容量・メモリ考慮）

---

## 🚀 worktree作成フロー

### 1. worktree用ディレクトリ作成（初回のみ）

```bash
# メインリポジトリの親ディレクトリに作成
cd ~/dev/personal/fish/bite-note
mkdir -p ../bite-note-worktrees
```

### 2. Issue用worktree作成

```bash
# mainブランチにいることを確認
git checkout main
git pull origin main

# worktree作成（新規ブランチと同時作成）
git worktree add ../bite-note-worktrees/issue-XXX -b feat-issue-XXX-description

# または、既存ブランチをworktreeとして追加
# （ブランチが既に存在し、他のworktreeでチェックアウトされていない場合）
git worktree add ../bite-note-worktrees/issue-XXX feat-issue-XXX-description

# ⚠️ 注意: 既存ブランチが既にチェックアウトされている場合はエラーになります
# エラー例: fatal: 'feat-issue-XXX-description' is already checked out at '...'
```

#### コマンド解説

```bash
git worktree add <path> -b <branch-name>
```

- `<path>`: worktreeを作成するディレクトリパス
- `-b <branch-name>`: 新規ブランチ名（既存ブランチの場合は不要）

### 3. worktreeに移動

```bash
cd ../bite-note-worktrees/issue-XXX
```

### 4. 依存関係インストール

```bash
# node_modulesは各worktreeで独立
npm install
```

**重要**: 各worktreeで`npm install`を実行する必要があります。

### 5. 環境変数コピー（必要に応じて）

```bash
# メインworktreeから.envをコピー
cp ../../bite-note/.env .env
```

### 6. VSCode起動

```bash
# 新しいVSCode Windowで開く
code .
```

### 7. Claude Code起動し作業開始

VSCode内でClaude Codeを起動し、Issue作業を開始します。

---

## 🔄 worktree削除フロー

### 1. 作業完了・PRマージ後

```bash
# メインworktreeに移動
cd ~/dev/personal/fish/bite-note
```

### 2. worktree削除

```bash
# worktree一覧確認
git worktree list

# worktree削除
git worktree remove ../bite-note-worktrees/issue-XXX
```

**エラーが出る場合**:
```bash
# 強制削除（変更を破棄）
git worktree remove --force ../bite-note-worktrees/issue-XXX
```

### 3. ブランチ削除（オプション）

```bash
# ローカルブランチ削除
git branch -d feat-issue-XXX-description

# リモートブランチ削除（PRマージ済みの場合は自動削除されることが多い）
git push origin --delete feat-issue-XXX-description
```

---

## 💡 並行作業のベストプラクティス

### 複数Issue同時作業

```bash
# VSCode Window 1: Issue 208作業
cd ~/dev/personal/fish/bite-note-worktrees/issue-208
code .
# → Claude Code起動し、Phase 1実装

# VSCode Window 2: Issue 209作業（別プロンプトで）
cd ~/dev/personal/fish/bite-note-worktrees/issue-209
code .
# → 別のClaude Codeセッション起動、別タスク実装
```

### Claude Codeセッション管理

- **各worktreeで独立したセッション**: 混乱を避けるため、1 worktree = 1 Claude Codeセッション
- **working directoryの確認**: 常に正しいworktreeで作業しているか確認
- **ブランチ確認**: `git branch --show-current` で現在のブランチ確認

### worktree切り替え時の注意

1. **コミット済みか確認**: 作業中のworktreeで未コミットがないか確認
2. **VSCode Windowを明確に区別**: ウィンドウタイトルでworktreeを識別
3. **ターミナルプロンプト**: PSやbashプロンプトにブランチ名を表示（推奨）

---

## 🔧 node_modules/ビルド成果物の扱い

### node_modules

**方針**: 各worktreeで独立してインストール

```bash
# 各worktreeで個別にインストール
cd ~/dev/personal/fish/bite-note-worktrees/issue-XXX
npm install
```

**理由**:
- 依存関係のバージョンがブランチごとに異なる可能性
- シンボリックリンク共有は非推奨（トラブルの元）

### ビルド成果物（dist/）

`.gitignore`で除外されているため、各worktreeで独立して生成されます。

```bash
# 各worktreeでビルド
npm run build
```

### .envファイル

**方針**: 各worktreeで独立して管理

```bash
# メインworktreeからコピー（初回のみ）
cp ../../bite-note/.env .env

# 必要に応じてworktree固有の設定に変更
```

---

## 📋 worktree一覧確認

### 全worktreeリスト表示

```bash
git worktree list
```

**出力例**:
```
/Users/nakagawayuusuke/dev/personal/fish/bite-note                    f9bc532 [main]
/Users/nakagawayuusuke/dev/personal/fish/bite-note-worktrees/issue-208  a1b2c3d [feat-issue-208-icon-library-foundation]
/Users/nakagawayuusuke/dev/personal/fish/bite-note-worktrees/issue-209  e4f5g6h [feat-issue-209-another-feature]
```

### ディスク使用量確認

```bash
# worktree別ディスク使用量
du -sh ../bite-note-worktrees/*

# 合計サイズ
du -sh ../bite-note-worktrees
```

---

## 🐛 トラブルシューティング

### 1. worktree削除時にエラーが出る

**エラー例**:
```
fatal: '/Users/.../bite-note-worktrees/issue-XXX' contains modified or untracked files, use --force to delete it
```

**解決策**:
```bash
# 強制削除（変更を破棄）
git worktree remove --force ../bite-note-worktrees/issue-XXX
```

---

### 2. 間違ったworktreeでコミットしてしまった

**解決策**:
```bash
# 間違ったブランチでコミットした場合
cd ~/dev/personal/fish/bite-note-worktrees/wrong-issue

# 直前のコミットを取り消し
git log --oneline -3
git reset --soft HEAD~1

# 正しいworktreeに移動してコミット
cd ~/dev/personal/fish/bite-note-worktrees/correct-issue
git cherry-pick <commit-hash>
```

---

### 3. worktreeが多すぎてメモリ不足

**解決策**:
```bash
# 不要なworktreeを削除
git worktree list
git worktree remove ../bite-note-worktrees/old-issue

# 最大3つまでに制限（推奨）
```

---

### 4. node_modulesインストールエラー

**解決策**:
```bash
# node_modules削除
rm -rf node_modules

# キャッシュクリア
npm cache clean --force

# 再インストール
npm install
```

---

### 5. VSCode拡張機能が動作しない

**解決策**:
```bash
# VSCodeを再起動
# または、拡張機能を再インストール
```

---

### 6. ディスク容量不足

**解決策**:
```bash
# 不要なworktreeを削除
git worktree remove ../bite-note-worktrees/old-issue

# node_modulesクリーンアップ
cd ~/dev/personal/fish/bite-note-worktrees/issue-XXX
rm -rf node_modules

# ビルド成果物削除
rm -rf dist
```

---

### 7. worktreeが壊れた（.git/worktreesの不整合）

**エラー例**:
```
fatal: 'issue-XXX' is not a working tree
```

**解決策**:
```bash
# worktreeディレクトリを手動削除した場合などに発生
# .git/worktrees/の参照を削除
git worktree prune

# worktree一覧を確認
git worktree list
```

---

### 8. ブランチが既に別のworktreeでチェックアウトされている

**エラー例**:
```
fatal: 'feat-issue-XXX' is already checked out at '/path/to/another/worktree'
```

**解決策**:
```bash
# 1. 既存worktreeを確認
git worktree list

# 2. 既存worktreeを削除
git worktree remove /path/to/another/worktree

# 3. 新しいworktreeを作成
git worktree add ../bite-note-worktrees/issue-XXX feat-issue-XXX
```

---

### 9. worktreeディレクトリを手動削除してしまった

**問題**:
`git worktree remove` を使わずに、ディレクトリを直接削除してしまった

**解決策**:
```bash
# .git/worktreesの参照をクリーンアップ
git worktree prune

# worktree一覧を確認（削除されたworktreeが表示されないことを確認）
git worktree list
```

---

## 🔄 Git作業フロー（worktree使用時）

### コミット・push・PR作成

```bash
# 1. worktreeで作業
cd ~/dev/personal/fish/bite-note-worktrees/issue-XXX

# 2. 変更をステージング
git add .

# 3. コミット（Conventional Commits準拠）
git commit -m "feat: add icon library foundation

- Install Lucide React
- Implement Icon component
- Add icon mappings

Closes #XXX"

# 4. push
git push origin feat-issue-XXX-description

# 5. PR作成
gh pr create --title "..." --body "..."

# 6. CI結果確認
gh pr checks
```

### 複数worktreeでの並行コミット

**重要**: 各worktreeは独立したブランチなので、並行してコミット・pushしても競合しません。

```bash
# Window 1: Issue 208
cd ~/dev/personal/fish/bite-note-worktrees/issue-208
git add .
git commit -m "..."
git push origin feat-issue-208-...

# Window 2: Issue 209（同時実行可能）
cd ~/dev/personal/fish/bite-note-worktrees/issue-209
git add .
git commit -m "..."
git push origin feat-issue-209-...
```

---

## 📊 worktree使用時の推奨ワークフロー

### 新しいIssueを開始する時

1. **Issue作成**: GitHub Issueを作成
2. **WIPラベル付与**: `status:wip`ラベル追加
3. **worktree作成**: `git worktree add ../bite-note-worktrees/issue-XXX -b feat-issue-XXX-...`
4. **依存関係インストール**: `npm install`
5. **VSCode起動**: `code .`
6. **Claude Code起動**: 作業開始

### Issue完了時

1. **コミット**: `git commit -m "..."`
2. **push**: `git push origin feat-issue-XXX-...`
3. **PR作成**: `gh pr create ...`
4. **CI確認**: `gh pr checks`
5. **レビュー・マージ**: PRマージ
6. **worktree削除**: `git worktree remove ../bite-note-worktrees/issue-XXX`
7. **ブランチ削除**: `git branch -d feat-issue-XXX-...`

---

## 🎯 Claude Codeでの活用

### セッション開始時

```bash
# worktreeに移動
cd ~/dev/personal/fish/bite-note-worktrees/issue-XXX

# ブランチ確認
git branch --show-current

# VSCode起動
code .

# Claude Code起動
# → working directoryが正しいworktreeであることを確認
```

### セッション中

- **working directory確認**: 常に正しいworktreeで作業しているか確認
- **ブランチ確認**: `git branch --show-current`
- **1 worktree = 1 Claude Codeセッション**: 混乱を避けるため

### 複数セッション同時起動

- **Window 1**: Issue 208用worktree（Claude Codeセッション1）
- **Window 2**: Issue 209用worktree（Claude Codeセッション2）
- **完全独立**: 各セッションは独立して動作

---

## 📚 参考資料

- [Git - git-worktree Documentation](https://git-scm.com/docs/git-worktree)
- [Git worktree for efficient parallel development](https://morgan.cugerone.com/blog/workarounds-to-git-worktree-using-bare-repository-and-cannot-fetch-remote-branches/)
- [GitHub: Managing multiple working trees with Git worktrees](https://github.blog/2021-04-05-how-to-use-git-worktree/)

---

## 🔗 関連ドキュメント

- `ai-rules/COMMIT_AND_PR_GUIDELINES.md`: Git作業フロー詳細
- `ai-rules/TASK_CYCLES.md`: タスクサイクルとエージェント活用
- `ai-rules/ISSUE_GUIDELINES.md`: Issue作成ガイドライン
- `.claude/CLAUDE.md`: プロジェクト全体のガイドライン

---

**Last Updated**: 2025-11-22

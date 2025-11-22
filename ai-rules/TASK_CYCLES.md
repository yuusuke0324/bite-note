# タスク種別ごとの実施サイクル

タスクの種類に応じて、専門エージェントを適切な順序で活用します。

**重要な原則:**
- 各フェーズで指摘事項があれば、修正後に再度同じエージェントでレビュー
- UI/UX実装を含む場合は、必ずdesignerエージェントを最初に通す
- すべてのタスクで最終的にtech-leadレビューを実施
- テストコードが関係する場合は、必ずqa-engineerレビューを実施
- **PR作成後、必ずCI結果を確認してからユーザーに完了報告すること**
  - 詳細: `COMMIT_AND_PR_GUIDELINES.md` の「PR作成後のCI確認プロセス」を参照

---

## 1. 新機能開発（UI/UX含む）

```
要件定義 → 設計 → 実装 → レビュー

1. product-manager エージェント
   ↓ 要件定義・仕様策定
2. designer エージェント
   ↓ UI/UXデザイン設計・レビュー
3. 実装（コード記述）
   ↓
4. designer エージェント（再度）
   ↓ 実装後のUI/UXレビュー
5. tech-lead エージェント
   ↓ コード品質レビュー
6. qa-engineer エージェント
   ↓ テストコードレビュー
7. Git作業（commit → push → PR作成）
   ↓
8. **CI結果確認（必須）**
   ↓ gh pr checks でCI成功を確認
9. ユーザーに完了報告
```

**適用例:**
- 新しい画面・コンポーネントの追加
- 新機能の実装
- ユーザー向け機能の追加

---

## 2. UI/UX改善・画面修正

```
設計 → 実装 → レビュー

1. designer エージェント
   ↓ UI/UXデザイン改善案レビュー
2. 実装（コード記述）
   ↓
3. designer エージェント（再度）
   ↓ 実装後のUI/UXレビュー
4. tech-lead エージェント
   ↓ コード品質レビュー
5. qa-engineer エージェント
   ↓ テストコードレビュー
6. Git作業（commit → push → PR作成）
   ↓
7. **CI結果確認（必須）**
   ↓ gh pr checks でCI成功を確認
8. ユーザーに完了報告
```

**適用例:**
- デザインの改善
- レイアウトの修正
- アクセシビリティの向上
- レスポンシブ対応

---

## 3. バグ修正

```
調査 → 修正 → レビュー

1. 実装（バグ修正）
   ↓
2. tech-lead エージェント
   ↓ コード品質・根本原因分析
3. qa-engineer エージェント
   ↓ テストコードレビュー（リグレッション防止）
4. Git作業（commit → push → PR作成）
   ↓
5. **CI結果確認（必須）**
   ↓ gh pr checks でCI成功を確認
6. ユーザーに完了報告
```

**適用例:**
- ロジックのバグ修正
- データ処理のエラー修正
- APIエラーの修正

**注意:**
- UI/UX関連のバグの場合は、designerエージェントも追加
- 根本原因分析を必ず実施
- リグレッションテストを追加

---

## 4. リファクタリング

```
設計 → 実装 → レビュー

1. tech-lead エージェント
   ↓ リファクタリング方針レビュー
2. 実装（リファクタリング）
   ↓
3. tech-lead エージェント（再度）
   ↓ コード品質レビュー
4. qa-engineer エージェント
   ↓ テストコードレビュー（既存機能の保証）
5. Git作業（commit → push → PR作成）
   ↓
6. **CI結果確認（必須）**
   ↓ gh pr checks でCI成功を確認
7. ユーザーに完了報告
```

**適用例:**
- コードの整理
- アーキテクチャの改善
- パフォーマンス改善（軽微）
- 技術的負債の解消

**注意:**
- 既存機能の動作保証が必須
- テストカバレッジを維持・向上
- 段階的なリファクタリングを推奨

---

## 5. テストコード追加・改善

```
設計 → 実装 → レビュー

1. qa-engineer エージェント
   ↓ テスト戦略・カバレッジレビュー
2. 実装（テストコード記述）
   ↓
3. qa-engineer エージェント（再度）
   ↓ テストコード品質レビュー
4. tech-lead エージェント
   ↓ コード品質レビュー
5. Git作業（commit → push → PR作成）
   ↓
6. **CI結果確認（必須）**
   ↓ gh pr checks でCI成功を確認
7. ユーザーに完了報告
```

**適用例:**
- カバレッジ向上
- エッジケーステスト追加
- E2Eテスト追加
- パフォーマンステスト追加

**注意:**
- テスト戦略を明確にする
- 既存テストとの重複を避ける
- テストの保守性を考慮

---

## 6. パフォーマンス最適化

```
調査 → 設計 → 実装 → レビュー

1. tech-lead エージェント
   ↓ ボトルネック分析・最適化方針レビュー
2. 実装（最適化）
   ↓
3. tech-lead エージェント（再度）
   ↓ コード品質・パフォーマンス改善レビュー
4. qa-engineer エージェント
   ↓ パフォーマンステストレビュー
5. Git作業（commit → push → PR作成）
   ↓
6. **CI結果確認（必須）**
   ↓ gh pr checks でCI成功を確認
7. ユーザーに完了報告
```

**適用例:**
- レンダリング最適化
- バンドルサイズ削減
- データベースクエリ最適化
- メモリ使用量削減

**注意:**
- 計測結果を明示（Before/After）
- トレードオフを明確にする
- パフォーマンステストを追加

---

## 7. 設計・アーキテクチャ変更

```
要件定義 → 設計 → 実装 → レビュー

1. product-manager エージェント
   ↓ ビジネス要件・影響範囲の確認
2. tech-lead エージェント
   ↓ アーキテクチャ設計レビュー
3. 実装（段階的に）
   ↓
4. tech-lead エージェント（再度）
   ↓ 実装レビュー
5. qa-engineer エージェント
   ↓ テスト戦略レビュー
6. Git作業（commit → push → PR作成）
   ↓
7. **CI結果確認（必須）**
   ↓ gh pr checks でCI成功を確認
8. ユーザーに完了報告
```

**適用例:**
- 状態管理の変更
- データモデルの変更
- API構造の変更
- 新しいライブラリの導入

**注意:**
- 段階的な移行を計画
- 既存機能への影響を最小化
- ドキュメントを必ず更新

---

## エージェント選択のクイックリファレンス

| タスクの特徴 | 主要エージェント | 補助エージェント |
|------------|----------------|----------------|
| UI/UXが関係する | designer | tech-lead, qa-engineer |
| 新機能追加 | product-manager | designer, tech-lead, qa-engineer |
| バグ修正 | tech-lead | qa-engineer |
| リファクタリング | tech-lead | qa-engineer |
| テスト関連 | qa-engineer | tech-lead |
| パフォーマンス | tech-lead | qa-engineer |
| アーキテクチャ | tech-lead | product-manager, qa-engineer |

---

## タスク開始前のチェックリスト

- [ ] タスクの種類を明確にする
- [ ] 適切な実施サイクルを選択する
- [ ] 必要なエージェントを特定する
- [ ] 専用ブランチを作成する（feat-*, fix-*, refactor-*）
- [ ] 設計書の更新要否を確認する

---

## タスク完了時のチェックリスト

- [ ] すべてのエージェントレビューが完了している
- [ ] 指摘事項をすべて修正している
- [ ] テストがパスしている（npm run test:fast）
- [ ] 型チェックがパスしている（npm run typecheck）
- [ ] 設計書を更新している（該当する場合）
- [ ] コミット・push・PR作成が完了している
- [ ] ユーザーに完了報告している

---

## 8. Issue駆動開発タスク

**Issue起点の開発フロー**

```
Issue作成
  ↓
task-coordinator エージェント（タスク種別判定）
  ↓ タスク種別に応じたサイクル選択（1-7）
作業開始（ブランチ作成、WIPラベル）
  ↓
実装 + 該当サイクルのエージェントレビュー
  ↓
PR作成（"Closes #123"でリンク）
  ↓
最終レビュー（tech-lead必須）
  ↓
マージ後、Issue自動クローズ
```

### Issue作成時の確認

- [ ] Issue番号を取得
- [ ] タスク粒度（2-6時間、1-5ファイル）を確認
- [ ] Files to Edit（予定）を記載
- [ ] 依存関係（Blocked by, Blocks）を明示
- [ ] size:S/M/Lラベルを付与

### 作業開始時

```bash
# 1. ブランチ作成（Issue番号を含める）
git checkout -b feat-issue-42-photo-exif

# 2. Issue に WIPラベル付与（手動またはGitHub CLI）
gh issue edit 42 --add-label "Status: WIP"

# 3. セルフアサイン
gh issue edit 42 --add-assignee @me
```

### 作業中

- **Session Notes更新**: 各セッション後に進捗を記録
- **Files to Edit更新**: 実際に編集したファイルをチェック
- **依存関係確認**: 他のWIP Issueと重複していないか確認

### PR作成時

```bash
# PR作成時に"Closes #123"を含める
gh pr create --title "feat(photo): add EXIF metadata auto-extraction" \
  --body "$(cat <<'EOF'
## 概要
写真のEXIF情報から位置・日時を自動抽出

## 変更内容
- photo-service.tsにEXIF抽出ロジック追加
- GPS情報をgeolocation APIと統合

## テスト
- npm run test:fast: ✅ パス

Closes #42
EOF
)"
```

### マージ後

- Issue自動クローズ（"Closes #42"により）
- 必要に応じてロードマップに`(→ #42)`を追記
- Epic Issueの場合は進捗チェックリスト更新

---

## 9. 並行作業時（Git Worktree使用時）

複数のIssueを同時に作業する場合、git worktreeを使用します。

### 並行作業の基本フロー

```
Issue A（worktree-A）          Issue B（worktree-B）
    ↓                              ↓
task-coordinator相談          task-coordinator相談
    ↓                              ↓
worktree-A作成                worktree-B作成
    ↓                              ↓
実装 + レビュー                実装 + レビュー
    ↓                              ↓
PR作成（独立）                 PR作成（独立）
```

### worktree作成時のIssue管理

```bash
# Issue A用worktree作成
git worktree add ../bite-note-worktrees/issue-208 -b feat-issue-208-icon-library-foundation

# WIPラベル付与・セルフアサイン
gh issue edit 208 --add-label "status:wip"
gh issue edit 208 --add-assignee @me

# Issue B用worktree作成（並行作業）
git worktree add ../bite-note-worktrees/issue-209 -b feat-issue-209-another-feature

# WIPラベル付与・セルフアサイン
gh issue edit 209 --add-label "status:wip"
gh issue edit 209 --add-assignee @me
```

### 複数セッション管理

- **VSCode Window 1**: `~/dev/personal/fish/bite-note-worktrees/issue-208`
  - Claude Codeセッション1（Issue 208専用）
  - designer → tech-lead → qa-engineer レビュー

- **VSCode Window 2**: `~/dev/personal/fish/bite-note-worktrees/issue-209`
  - Claude Codeセッション2（Issue 209専用）
  - tech-lead → qa-engineer レビュー

### 並行作業時のエージェント活用

- **各セッションで独立したエージェント呼び出し**: 混乱を避けるため
- **エージェントレビュー結果の整理**: Issue番号を明示
- **複数タスクの進捗管理**: Session Notesを各Issueで管理

### Git作業（並行実行可能）

```bash
# worktree-A でコミット・push（Window 1）
cd ~/dev/personal/fish/bite-note-worktrees/issue-208
git add .
git commit -m "feat(ui): add icon library foundation"
git push origin feat-issue-208-icon-library-foundation

# worktree-B でコミット・push（Window 2、同時実行可能）
cd ~/dev/personal/fish/bite-note-worktrees/issue-209
git add .
git commit -m "feat(data): add data validation"
git push origin feat-issue-209-another-feature
```

### CI確認（並行作業時）

```bash
# worktree-A のPR作成後、CI確認（Window 1）
cd ~/dev/personal/fish/bite-note-worktrees/issue-208
gh pr checks

# worktree-B のPR作成後、CI確認（Window 2）
cd ~/dev/personal/fish/bite-note-worktrees/issue-209
gh pr checks

# 両方のCIが成功したことを確認してから、ユーザーに完了報告
```

**重要**: 並行作業時も、各PRごとに必ずCI確認を実施してから完了報告すること

### 注意点

- **ブランチ確認**: 各worktreeで `git branch --show-current` を実行し、正しいブランチで作業していることを確認
- **working directory確認**: Claude Codeセッション開始時に、正しいworktreeであることを確認
- **1 worktree = 1 Claude Codeセッション**: 混乱を避けるため、各worktreeで独立したセッション起動
- **最大3 worktree推奨**: ディスク容量・メモリ考慮

**詳細**: `ai-rules/GIT_WORKTREE_GUIDELINES.md` を参照

---

**ヒント**: タスクの種類が不明確な場合は、`task-coordinator` エージェントに相談して、適切なサイクルを提案してもらってください。

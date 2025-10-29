# リファクタリング実行計画書

**プロジェクト**: 釣果記録PWAアプリ
**バージョン**: v0.9.0 → v1.0.0
**作成日**: 2025年10月29日
**目的**: Git管理開始前に、動くものベースでクリーンな初版を作成

---

## 📋 目次

1. [全体戦略](#全体戦略)
2. [Stage 0: 安全網の構築](#stage-0-安全網の構築)
3. [Stage 1: Dead Code削除](#stage-1-dead-code削除)
4. [Stage 2: 設計書の再構築](#stage-2-設計書の再構築)
5. [Stage 3: コードリファクタリング](#stage-3-コードリファクタリング)
6. [Stage 4: 品質向上](#stage-4-品質向上)
7. [Stage 5: 初版タグ付け](#stage-5-初版タグ付け)
8. [チェックリスト](#チェックリスト)

---

## 全体戦略

### 基本方針

**「動くものを壊さずに、段階的にクリーンアップ」**

- ✅ 各ステップで必ずテスト実行
- ✅ 小さいコミットを頻繁に
- ✅ いつでも前の状態に戻れるようにする
- ✅ 実装ベースで設計書を作り直す

### タイムライン

| Stage | 内容 | 期間 | 優先度 |
|-------|------|------|--------|
| Stage 0 | 安全網の構築（Git初期化） | 30分 | 🔴 必須 |
| Stage 1 | Dead Code削除 | 1日 | 🔴 必須 |
| Stage 2 | 設計書の再構築 | 2-3日 | 🔴 必須 |
| Stage 3 | コードリファクタリング | 1-2週間 | 🟡 推奨 |
| Stage 4 | 品質向上 | 2-3週間 | 🟢 任意 |
| Stage 5 | 初版タグ付け | 10分 | 🔴 必須 |

---

## Stage 0: 安全網の構築

### 目的
現在の動く状態を完全に凍結し、いつでも戻れるようにする

### 作業内容

#### 1. Git初期化

```bash
# リポジトリ初期化
git init

# .gitignore確認（既に存在する場合）
cat .gitignore

# 全ファイルをステージング
git add .

# 初回コミット
git commit -m "Initial commit: Working MVP v3.1 before refactoring

- 釣果記録の基本機能完全実装
- 潮汐システム実装
- 写真アップロード・メタデータ自動抽出
- 地図機能
- エクスポート/インポート機能
- 魚種オートコンプリート（231種）
- テストスイート完備
"

# タグ付け（リファクタ前のバックアップ）
git tag -a v0.9.0-before-refactor -m "Working state before refactoring"
```

#### 2. ブランチ戦略

```bash
# リファクタ用ブランチ作成
git checkout -b refactor/cleanup

# 確認
git branch
# * refactor/cleanup
#   main
```

### チェックポイント

- [ ] `git log`で初回コミットを確認
- [ ] `git tag`でv0.9.0-before-refactorを確認
- [ ] 現在のブランチがrefactor/cleanupであることを確認
- [ ] `npm run dev`で動作確認
- [ ] `npm run test`で全テスト通過確認

### 所要時間
⏰ **30分**

---

## Stage 1: Dead Code削除

### 目的
使われていないファイルを削除し、プロジェクトをクリーンに保つ

### 削除対象リスト

#### 1. 未使用Appコンポーネント（4ファイル）

```bash
# 削除前に確認（どこからも参照されていないことを確認）
grep -r "App-simple" src/
grep -r "SimpleModernApp" src/
grep -r "MinimalModernApp" src/
grep -r "TestModernApp" src/

# 削除実行
rm src/App-simple.tsx
rm src/SimpleModernApp.tsx
rm src/MinimalModernApp.tsx
rm src/TestModernApp.tsx

# 動作確認
npm run dev
npm run test

# コミット
git add .
git commit -m "chore: remove unused App components

Removed:
- App-simple.tsx
- SimpleModernApp.tsx
- MinimalModernApp.tsx
- TestModernApp.tsx

These components are not imported or used anywhere in the codebase."
```

#### 2. テストファイル（3ファイル）

```bash
# 削除実行
rm test-app.html
rm test-marine.html
rm test-photo.jpg

# コミット
git add .
git commit -m "chore: remove development test files

Removed:
- test-app.html
- test-marine.html
- test-photo.jpg (empty file)

These were temporary development test files."
```

#### 3. 完了済み実装ドキュメント（496KB）

```bash
# 削除実行
rm -rf implementation/task-303/
rm -rf implementation/task-002/
rm -rf implementation/tide-graph-improvement/
rm -rf implementation/task-401/
rm -rf implementation/task-402/

# 確認
ls implementation/

# コミット
git add .
git commit -m "docs: remove completed implementation task folders

Removed implementation folders (496KB):
- task-303/ (潮汐グラフ実装記録)
- task-002/ (写真機能実装記録)
- tide-graph-improvement/ (潮汐グラフ改善記録)
- task-401/ (詳細画面実装記録)
- task-402/ (統計機能実装記録)

These tasks are completed and documented in the main design docs."
```

#### 4. 古い設計書アーカイブ

```bash
# 削除実行
rm -rf docs/archive/
rm -rf docs/design/archive/
rm -rf docs/tasks/TASK-001/
rm -rf docs/tasks/TASK-101/
rm -rf docs/tasks/TASK-102/
rm -rf docs/tasks/TASK-201/

# 確認
ls docs/

# コミット
git add .
git commit -m "docs: remove archived and completed task documents

Removed:
- docs/archive/ (古い設計書)
- docs/design/archive/ (古いアーカイブ)
- docs/tasks/ (完了済みタスク)

All relevant information is consolidated in current design docs."
```

### チェックポイント

- [ ] 各削除後に`npm run dev`で動作確認
- [ ] 各削除後に`npm run test`でテスト通過確認
- [ ] 各削除後にコミット実行
- [ ] `git log`でコミット履歴を確認
- [ ] ファイルサイズ削減を確認（約1.5MB削減予定）

### 所要時間
⏰ **1日**（確認作業含む）

---

## Stage 2: 設計書の再構築

### 目的
実装ベースで正確な設計書を作成し、不要な記述を削除

### 2-1. 保持する設計書（簡素化）

#### 保持対象（3ファイル）

1. **integrated-master-spec.md** - 釣果記録統合仕様
2. **tide-system-master-spec.md** - 潮汐システムマスター仕様
3. **technical-specifications.md** - 技術仕様書

#### 簡素化作業

各ファイルから以下を削除:
- [ ] 完了済みタスクの記述
- [ ] 将来実装予定で不確定な内容
- [ ] 重複している内容
- [ ] 実装と異なる古い情報

### 2-2. 新規作成する設計書

#### 1. ARCHITECTURE.md（アーキテクチャ概要）

```markdown
# アーキテクチャ設計書

## 技術スタック
- React 18.3.1 + TypeScript 5.7.3
- Vite 6.0.5（ビルドツール）
- Zustand 5.0.2（状態管理）
- Dexie.js 4.0.10（IndexedDB）
- Tailwind CSS 3.4.17

## レイヤー構成

### プレゼンテーション層
- src/components/ - UIコンポーネント（62個）
- src/pages/ - ページコンポーネント（今後分割）

### アプリケーション層
- src/stores/ - 状態管理（Zustand）
  - app-store.ts - グローバル状態
  - form-store.ts - フォーム状態

### ビジネスロジック層
- src/lib/ - サービス層（18個）
  - fishing-record-service.ts - 釣果記録管理
  - photo-service.ts - 写真管理
  - tide-calculation-service.ts - 潮汐計算
  - export-import-service.ts - データエクスポート/インポート

### データ層
- src/lib/database.ts - IndexedDB（Dexie.js）
  - fishing_records - 釣果記録
  - photos - 写真データ（Blob）
  - tide_cache - 潮汐キャッシュ
  - app_settings - アプリ設定

## データフロー

\`\`\`
User Action
   ↓
Component (React)
   ↓
Store (Zustand) ← 状態管理
   ↓
Service (ビジネスロジック)
   ↓
IndexedDB (Dexie.js) ← 永続化
\`\`\`

## ディレクトリ構造

\`\`\`
src/
├── components/      # UIコンポーネント
│   ├── ui/         # 基礎UIコンポーネント
│   ├── forms/      # フォーム関連
│   ├── charts/     # グラフ・統計
│   └── maps/       # 地図関連
├── lib/            # サービス層
│   ├── database.ts
│   ├── services/
│   └── utils/
├── stores/         # 状態管理
├── types/          # 型定義
├── data/           # マスターデータ
└── utils/          # ユーティリティ
\`\`\`
```

**作成コマンド**:
```bash
# ファイル作成後
git add docs/ARCHITECTURE.md
git commit -m "docs: add architecture design document"
```

#### 2. API.md（APIインターフェース仕様）

```markdown
# API仕様書

## サービス層API

### FishingRecordService

#### createRecord
釣果記録を新規作成

\`\`\`typescript
async function createRecord(
  data: CreateFishingRecordForm
): Promise<DatabaseResult<FishingRecord>>
\`\`\`

#### getRecordById
IDで釣果記録を取得

\`\`\`typescript
async function getRecordById(
  id: string
): Promise<DatabaseResult<FishingRecord>>
\`\`\`

#### getRecords
釣果記録一覧を取得（フィルタ・ソート対応）

\`\`\`typescript
async function getRecords(
  params: GetRecordsParams
): Promise<DatabaseResult<FishingRecord[]>>
\`\`\`

（以下、全サービスのAPI仕様を記載）
```

**作成コマンド**:
```bash
git add docs/API.md
git commit -m "docs: add API specification document"
```

#### 3. DATABASE.md（データベーススキーマ）

```markdown
# データベース設計書

## IndexedDB スキーマ

### データベース名
\`FishingRecordDB\`

### バージョン
3（現在）

### テーブル定義

#### 1. fishing_records（釣果記録）

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| id | string | ✅ | UUID v4 |
| date | Date | ✅ | 釣行日時 |
| location | string | ✅ | 釣り場所 |
| fishSpecies | string | ✅ | 魚種 |
| size | number | ❌ | サイズ（cm） |
| weight | number | ❌ | 重量（g） |
| photoId | string | ❌ | 写真ID（photosテーブルへの外部キー） |
| coordinates | Coordinates | ❌ | GPS座標 |
| tideInfo | TideInfo | ❌ | 潮汐情報 |
| createdAt | Date | ✅ | 作成日時 |
| updatedAt | Date | ✅ | 更新日時 |

**インデックス**:
- id（プライマリキー）
- date
- fishSpecies
- location
- [coordinates.latitude+coordinates.longitude]（複合インデックス）

#### 2. photos（写真データ）

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| id | string | ✅ | UUID v4 |
| blob | Blob | ✅ | 画像データ本体 |
| thumbnailBlob | Blob | ❌ | サムネイル画像 |
| filename | string | ✅ | ファイル名 |
| mimeType | string | ✅ | MIMEタイプ |
| fileSize | number | ✅ | ファイルサイズ（バイト） |
| uploadedAt | Date | ✅ | アップロード日時 |

**インデックス**:
- id（プライマリキー）
- uploadedAt
- mimeType
- fileSize

（以下、全テーブルの仕様を記載）
```

**作成コマンド**:
```bash
git add docs/DATABASE.md
git commit -m "docs: add database schema document"
```

### 2-3. 既存設計書の簡素化

#### integrated-master-spec.md

**削除する内容**:
- [ ] 「将来実装予定」セクション
- [ ] 「検討中」の機能
- [ ] 完了済みタスクの詳細記述

**残す内容**:
- ✅ 実装済み機能の仕様
- ✅ データモデル定義
- ✅ 魚種マスターデータ仕様

**作業コマンド**:
```bash
# 編集後
git add docs/design/fishing-record/integrated-master-spec.md
git commit -m "docs: simplify integrated-master-spec (remove future plans)"
```

### チェックポイント

- [ ] ARCHITECTURE.md作成完了
- [ ] API.md作成完了
- [ ] DATABASE.md作成完了
- [ ] integrated-master-spec.md簡素化完了
- [ ] tide-system-master-spec.md簡素化完了
- [ ] technical-specifications.md簡素化完了
- [ ] 各ファイルの内容が実装と一致していることを確認
- [ ] 各編集後にコミット実行

### 所要時間
⏰ **2-3日**

---

## Stage 3: コードリファクタリング

### 目的
大きなファイルを分割し、保守性・可読性を向上させる

### 3-1. ModernApp.tsx の分割（最優先）

#### 現状
- **ファイルサイズ**: 65,988行
- **問題**: 1ファイルが巨大すぎて保守困難

#### リファクタ後の構成

```
src/
├── App.tsx（ルーティングのみ、300行程度）
└── pages/
    ├── HomePage.tsx           # ホーム画面
    ├── RecordFormPage.tsx     # 記録フォーム
    ├── RecordListPage.tsx     # 一覧表示
    ├── RecordDetailPage.tsx   # 詳細表示
    └── AnalyticsPage.tsx      # 統計画面
```

#### 作業手順（1ページずつ）

##### Step 1: ページディレクトリ作成

```bash
mkdir -p src/pages
```

##### Step 2: HomePage.tsx 抽出

```typescript
// src/pages/HomePage.tsx
import React from 'react';
// （ModernApp.tsxからホーム画面のコードを抽出）

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* ホーム画面のコンテンツ */}
    </div>
  );
};
```

**確認**:
```bash
npm run dev    # 動作確認
npm run test   # テスト確認
git add src/pages/HomePage.tsx
git commit -m "refactor: extract HomePage from ModernApp"
```

##### Step 3: RecordFormPage.tsx 抽出

（同様の手順で1ページずつ抽出）

```bash
git add src/pages/RecordFormPage.tsx
git commit -m "refactor: extract RecordFormPage from ModernApp"
```

##### Step 4: 残りのページを順次抽出

- RecordListPage.tsx
- RecordDetailPage.tsx
- AnalyticsPage.tsx

##### Step 5: App.tsx をルーティング専用に書き換え

```typescript
// src/App.tsx（新）
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RecordFormPage } from './pages/RecordFormPage';
import { RecordListPage } from './pages/RecordListPage';
import { RecordDetailPage } from './pages/RecordDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/form" element={<RecordFormPage />} />
        <Route path="/list" element={<RecordListPage />} />
        <Route path="/detail/:id" element={<RecordDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Routes>
    </BrowserRouter>
  );
};
```

**確認**:
```bash
npm run dev
npm run test
npm run build

git add src/App.tsx
git commit -m "refactor: simplify App.tsx to routing only"
```

##### Step 6: ModernApp.tsx の削除

```bash
# 全ての機能がページコンポーネントに移行したことを確認
rm src/ModernApp.tsx

git add .
git commit -m "refactor: remove ModernApp.tsx (split into page components)"
```

### 3-2. Deprecated実装の更新

#### EnhancedTideLRUCache.ts の置き換え

```bash
# 現状確認
grep -r "@deprecated" src/

# 新実装への置き換え（詳細は別途検討）
# ...

git add .
git commit -m "refactor: replace deprecated EnhancedTideLRUCache"
```

### 3-3. TODO/FIXMEの解消

```bash
# TODO/FIXMEの確認
grep -r "TODO\|FIXME" src/

# 各TODOを解消または削除
# ...

git add .
git commit -m "chore: resolve TODO/FIXME comments"
```

### チェックポイント

- [ ] HomePage.tsx抽出完了 & テスト通過
- [ ] RecordFormPage.tsx抽出完了 & テスト通過
- [ ] RecordListPage.tsx抽出完了 & テスト通過
- [ ] RecordDetailPage.tsx抽出完了 & テスト通過
- [ ] AnalyticsPage.tsx抽出完了 & テスト通過
- [ ] App.tsx簡素化完了 & テスト通過
- [ ] ModernApp.tsx削除完了 & テスト通過
- [ ] Deprecated実装更新完了
- [ ] TODO/FIXME解消完了
- [ ] `npm run build`でビルド成功

### 所要時間
⏰ **1-2週間**

---

## Stage 4: 品質向上

### 目的
コード品質を向上させ、本番環境に備える

### 4-1. console.logのクリーンアップ

#### 現状
185箇所のconsole.log

#### 対応方針

##### 開発用console.logは環境変数で制御

```typescript
// Before
console.log('Debug info:', data);

// After
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}
```

##### 本番用ログは削除または専用ロガーに置き換え

```typescript
// エラーログは残す
console.error('Error:', error);

// デバッグログは削除
// console.log('Debug:', data);  // 削除
```

#### 作業コマンド

```bash
# console.logの確認
grep -r "console.log" src/ | wc -l

# 一括置換（慎重に）
# ...

git add .
git commit -m "chore: clean up console.log statements"
```

### 4-2. テストカバレッジ向上（任意）

#### 現状
- 56個のテストファイル
- 主要サービス層: 90%以上
- コンポーネント: 不足

#### 追加すべきテスト

```typescript
// src/components/__tests__/HomePage.test.tsx
import { render, screen } from '@testing-library/react';
import { HomePage } from '../pages/HomePage';

describe('HomePage', () => {
  it('should render home page', () => {
    render(<HomePage />);
    expect(screen.getByText(/ホーム/i)).toBeInTheDocument();
  });
});
```

**コミット**:
```bash
git add .
git commit -m "test: add HomePage component tests"
```

### 4-3. 型安全性の強化（任意）

#### any型の削減

```bash
# any型の確認
grep -r ": any" src/ | wc -l

# 適切な型に置き換え
# ...

git add .
git commit -m "refactor: replace any types with proper types"
```

### チェックポイント

- [ ] console.logクリーンアップ完了
- [ ] テストカバレッジ向上（任意）
- [ ] 型安全性強化（任意）
- [ ] `npm run test`で全テスト通過
- [ ] `npm run build`でビルド成功
- [ ] `npm run lint`でエラーなし

### 所要時間
⏰ **2-3週間**（任意項目含む）

---

## Stage 5: 初版タグ付け

### 目的
リファクタリング完了後の状態をv1.0.0として記録

### 作業内容

#### 1. 最終確認

```bash
# 全テスト実行
npm run test

# ビルド確認
npm run build

# 動作確認
npm run dev
```

#### 2. メインブランチにマージ

```bash
# refactor/cleanupブランチの作業を確認
git log --oneline

# mainブランチに切り替え
git checkout main

# マージ
git merge refactor/cleanup

# マージコンフリクトがあれば解決
```

#### 3. v1.0.0タグ付け

```bash
git tag -a v1.0.0 -m "Initial clean version

Major changes:
- Removed dead code (App-simple.tsx, etc.)
- Restructured design documents
- Split large files into page components
- Cleaned up console.log statements
- Improved code quality

Ready for production deployment."

# タグ確認
git tag
# v0.9.0-before-refactor
# v1.0.0
```

#### 4. README.md更新

```markdown
# 釣果記録PWAアプリ

## バージョン
v1.0.0 - 初版リリース（2025年10月）

## 概要
個人用の釣果記録アプリ（PWA対応）

## 主要機能
- ✅ 釣果記録の登録・編集・削除
- ✅ 写真アップロード・メタデータ自動抽出
- ✅ 潮汐情報の自動計算
- ✅ 地図表示（Leaflet）
- ✅ 魚種オートコンプリート（231種）
- ✅ データエクスポート/インポート
- ✅ オフライン対応（IndexedDB）

## 技術スタック
- React 18.3.1 + TypeScript 5.7.3
- Vite 6.0.5
- Zustand 5.0.2
- Dexie.js 4.0.10
- Tailwind CSS 3.4.17

## セットアップ
\`\`\`bash
npm install
npm run dev
\`\`\`

## ビルド
\`\`\`bash
npm run build
\`\`\`

## テスト
\`\`\`bash
npm run test
\`\`\`
```

**コミット**:
```bash
git add README.md
git commit -m "docs: update README for v1.0.0 release"
```

#### 5. リモートリポジトリへのプッシュ（GitHub作成後）

```bash
# GitHubでリポジトリ作成後
git remote add origin https://github.com/yourusername/my-fish-app.git

# プッシュ
git push -u origin main

# タグもプッシュ
git push origin --tags
```

### チェックポイント

- [ ] 全テスト通過確認
- [ ] ビルド成功確認
- [ ] 動作確認完了
- [ ] mainブランチへのマージ完了
- [ ] v1.0.0タグ付け完了
- [ ] README.md更新完了
- [ ] リモートリポジトリへのプッシュ完了（任意）

### 所要時間
⏰ **10分**

---

## チェックリスト

### Stage 0: 安全網の構築
- [ ] `git init`実行
- [ ] 初回コミット完了
- [ ] v0.9.0-before-refactorタグ作成
- [ ] refactor/cleanupブランチ作成
- [ ] 動作確認完了

### Stage 1: Dead Code削除
- [ ] App-simple.tsx削除 & コミット
- [ ] SimpleModernApp.tsx削除 & コミット
- [ ] MinimalModernApp.tsx削除 & コミット
- [ ] TestModernApp.tsx削除 & コミット
- [ ] test-app.html削除 & コミット
- [ ] test-marine.html削除 & コミット
- [ ] test-photo.jpg削除 & コミット
- [ ] implementation/配下削除 & コミット
- [ ] docs/archive/削除 & コミット
- [ ] docs/tasks/削除 & コミット
- [ ] 動作確認完了

### Stage 2: 設計書の再構築
- [ ] ARCHITECTURE.md作成 & コミット
- [ ] API.md作成 & コミット
- [ ] DATABASE.md作成 & コミット
- [ ] integrated-master-spec.md簡素化 & コミット
- [ ] tide-system-master-spec.md簡素化 & コミット
- [ ] technical-specifications.md簡素化 & コミット
- [ ] 内容の実装との一致確認

### Stage 3: コードリファクタリング
- [ ] src/pages/ディレクトリ作成
- [ ] HomePage.tsx抽出 & テスト & コミット
- [ ] RecordFormPage.tsx抽出 & テスト & コミット
- [ ] RecordListPage.tsx抽出 & テスト & コミット
- [ ] RecordDetailPage.tsx抽出 & テスト & コミット
- [ ] AnalyticsPage.tsx抽出 & テスト & コミット
- [ ] App.tsx簡素化 & テスト & コミット
- [ ] ModernApp.tsx削除 & テスト & コミット
- [ ] Deprecated実装更新 & コミット
- [ ] TODO/FIXME解消 & コミット
- [ ] ビルド成功確認

### Stage 4: 品質向上（任意）
- [ ] console.logクリーンアップ & コミット
- [ ] テストカバレッジ向上 & コミット
- [ ] 型安全性強化 & コミット
- [ ] Lint確認

### Stage 5: 初版タグ付け
- [ ] 全テスト通過確認
- [ ] ビルド成功確認
- [ ] 動作確認完了
- [ ] mainブランチへのマージ
- [ ] v1.0.0タグ付け
- [ ] README.md更新
- [ ] リモートリポジトリへのプッシュ（任意）

---

## 緊急時の対応

### 問題が発生した場合

#### リファクタ前の状態に戻す

```bash
# 現在の作業を破棄して、リファクタ前に戻る
git checkout v0.9.0-before-refactor

# 確認
npm run dev
npm run test
```

#### 特定のコミット前に戻す

```bash
# コミット履歴確認
git log --oneline

# 特定のコミットに戻る
git reset --hard <commit-hash>
```

#### ブランチを作り直す

```bash
# 現在のブランチを削除
git checkout main
git branch -D refactor/cleanup

# 新しいブランチを作成
git checkout -b refactor/cleanup-v2
```

---

## 補足事項

### 推奨作業時間帯

- **集中作業**: 午前中（9:00-12:00）
- **確認作業**: 午後（14:00-17:00）
- **リファクタリング**: 1日2-3時間程度に抑える

### コミットメッセージ規約

```
<type>: <subject>

<body>

<footer>
```

**type一覧**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルドプロセス・ツール変更

**例**:
```
refactor: extract HomePage from ModernApp

- Moved home page logic to src/pages/HomePage.tsx
- Reduced ModernApp.tsx complexity
- All tests passing
```

### バックアップ推奨

各Stageの開始前に:
```bash
# プロジェクト全体をバックアップ
cp -r /path/to/my-fish-app /path/to/backup/my-fish-app-YYYYMMDD
```

---

**計画書バージョン**: v1.0
**最終更新日**: 2025年10月29日

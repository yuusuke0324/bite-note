# 🚀 Getting Started - 開発者向けクイックスタート

**最終更新**: 2025-11-17

このガイドでは、Bite Noteの開発環境を**5分**でセットアップし、最初のコミットまで完了する方法を説明します。

---

## 📋 目次

1. [前提条件](#前提条件)
2. [5分クイックスタート](#5分クイックスタート)
3. [プロジェクト構造の理解](#プロジェクト構造の理解)
4. [開発コマンド一覧](#開発コマンド一覧)
5. [よくあるエラーと解決方法](#よくあるエラーと解決方法)
6. [次のステップ](#次のステップ)

---

## 前提条件

開発を始める前に、以下がインストールされていることを確認してください：

| ツール | 必要バージョン | 確認コマンド |
|--------|---------------|-------------|
| **Node.js** | 20以上 | `node --version` |
| **npm** | 9以上 | `npm --version` |
| **Git** | 2.x以上 | `git --version` |

### Node.js/npmのインストール

まだインストールしていない場合：

**macOS/Linux:**
```bash
# nvmを使用（推奨）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

**Windows:**
- [Node.js公式サイト](https://nodejs.org/)からLTS版をダウンロード

---

## 5分クイックスタート

### Step 1: クローン・インストール（1分）

```bash
# リポジトリをクローン
git clone https://github.com/yuusuke0324/bite-note.git
cd bite-note

# 依存関係をインストール
npm install
```

**確認:**
```bash
✔ added 1234 packages in 45s
```

---

### Step 2: 開発サーバー起動（30秒）

```bash
npm run dev
```

**確認:**
```
  VITE v4.5.3  ready in 456 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

ブラウザで http://localhost:5173 にアクセスして、アプリが表示されることを確認します。

**注意:** ポート5173が使用中の場合、Viteは自動的に5174、5175...と次のポートを使用します。

---

### Step 3: テスト実行（1分）

新しいターミナルを開いて：

```bash
npm run test:fast
```

**確認:**
```
 ✓ src/components/RecordForm.test.tsx (5)
 ✓ src/lib/fishing-record-service.test.ts (12)
 ✓ src/hooks/useFishingRecords.test.ts (8)

 Test Files  25 passed (25)
      Tests  123 passed (123)
   Start at  10:23:45
   Duration  5.67s
```

---

### Step 4: 最初の変更（2分）

#### 4-1: コードを編集

好きなエディタで `src/components/ui/Button.tsx`（存在しない場合は任意のファイル）を開き、小さな変更を加えます。

例：コメントを追加
```typescript
// TODO: ボタンスタイルを改善
```

#### 4-2: ブラウザで確認

保存すると、ブラウザが自動的にリロードされます（HMR: Hot Module Replacement）。

#### 4-3: テスト実行

```bash
npm run test:fast
```

全てのテストがパスすることを確認します。

---

### Step 5: 完了確認（30秒）

✅ チェックリスト:
- [ ] 開発サーバーが起動している（http://localhost:5173）
- [ ] ブラウザでアプリが表示されている
- [ ] テストが全てパスしている
- [ ] コードを変更してHMRが動作している

**🎉 おめでとうございます！開発環境のセットアップが完了しました。**

---

## プロジェクト構造の理解

Bite Noteのプロジェクト構造は以下の通りです：

```
bite-note/
├── src/                        # ソースコード
│   ├── components/             # UIコンポーネント
│   │   ├── ui/                 # 汎用UIコンポーネント
│   │   │   ├── Skeleton.tsx    # スケルトンローディング
│   │   │   ├── ModernCard.tsx  # カードコンポーネント
│   │   │   └── FloatingActionButton.tsx
│   │   ├── home/               # ホーム画面コンポーネント
│   │   ├── layout/             # レイアウトコンポーネント
│   │   └── features/           # 機能別コンポーネント
│   ├── lib/                    # サービス・ライブラリ層
│   │   ├── fishing-record-service.ts  # 釣果記録管理
│   │   ├── photo-service.ts           # 写真管理
│   │   ├── weather-service.ts         # 天気API
│   │   └── database.ts                # IndexedDB (Dexie)
│   ├── hooks/                  # カスタムフック
│   ├── stores/                 # 状態管理（Zustand）
│   ├── types/                  # TypeScript型定義
│   ├── utils/                  # ユーティリティ関数
│   └── test/                   # テスト設定
├── docs/                       # ドキュメント
│   ├── user-guide.md           # ユーザーガイド
│   ├── DEPLOYMENT.md           # デプロイガイド
│   ├── ARCHITECTURE.md         # アーキテクチャ設計
│   └── API.md                  # API仕様
├── ai-rules/                   # AI駆動開発ルール
│   ├── TASK_CYCLES.md          # タスクサイクル
│   └── COMMIT_AND_PR_GUIDELINES.md
└── .claude/                    # Claude Code設定
    └── CLAUDE.md               # プロジェクト固有ガイドライン
```

### 重要なファイル

| ファイル | 役割 |
|---------|------|
| `package.json` | 依存関係、スクリプト定義 |
| `vite.config.ts` | Viteビルド設定 |
| `tsconfig.json` | TypeScript設定 |
| `vitest.config.ts` | テスト設定 |
| `vercel.json` | Vercelデプロイ設定 |
| `netlify.toml` | Netlifyデプロイ設定 |

---

## 開発コマンド一覧

### よく使うコマンド

| コマンド | 説明 | 所要時間 |
|---------|------|---------|
| `npm run dev` | 開発サーバー起動 | - |
| `npm run test:fast` | テスト実行（高速） | 5-10秒 |
| `npm run build` | 本番ビルド | 10-15秒 |
| `npm run preview` | 本番ビルドをプレビュー | - |
| `npm run lint` | Linter実行 | 5秒 |
| `npm run typecheck` | 型チェック | 5秒 |

### テストコマンド

| コマンド | 説明 |
|---------|------|
| `npm test` | テスト実行（watch mode） |
| `npm run test:ui` | テストUIで実行 |
| `npm run test:coverage` | カバレッジ測定 |
| `npm run test:unit` | ユニットテストのみ |
| `npm run test:components` | コンポーネントテストのみ |
| `npm run test:integration` | 統合テストのみ |

### デバッグ・調査コマンド

| コマンド | 説明 |
|---------|------|
| `npm run build:analyze` | バンドルサイズ分析 |
| `npm run performance:test` | パフォーマンス測定 |
| `npm run memory:profile` | メモリプロファイル |

詳細な開発環境構築は [README.md](../README.md) を参照してください。

---

## よくあるエラーと解決方法

### エラー1: `Cannot find module 'vite'`

**原因:** 依存関係が未インストール

**解決方法:**
```bash
npm install
```

または、キャッシュをクリアして再インストール：
```bash
rm -rf node_modules package-lock.json
npm install
```

---

### エラー2: `Port 5173 already in use`

**原因:** ポート5173が既に使用中

**解決方法:**

**方法A: 別のポートを使用**
```bash
npm run dev -- --port 3000
```

**方法B: 既存のプロセスを終了**
```bash
# macOS/Linux
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

---

### エラー3: テスト失敗 `ReferenceError: indexedDB is not defined`

**原因:** テスト環境でIndexedDBのモックが不足

**解決方法:**

`vitest.config.ts`で`fake-indexeddb`が設定されていることを確認：
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup.ts'],
    environment: 'jsdom',
  },
})
```

`src/test/setup.ts`で`fake-indexeddb`をインポート：
```typescript
import 'fake-indexeddb/auto'
```

---

### エラー4: `npm install` が遅い

**原因:** ネットワーク速度、npm レジストリの問題

**解決方法:**

**方法A: npmキャッシュをクリア**
```bash
npm cache clean --force
npm install
```

**方法B: `npm ci`を使用（推奨）**
```bash
npm ci
```

`npm ci`は`npm install`よりも高速で、`package-lock.json`を厳密に尊重します。

---

### エラー5: TypeScript型エラー

**原因:** 型定義の不一致

**解決方法:**

**Step 1: 型チェック実行**
```bash
npm run typecheck
```

**Step 2: エディタの再起動**

VS Codeの場合：
```
Cmd+Shift+P → TypeScript: Restart TS Server
```

**Step 3: 型定義を確認**

`src/types/`以下の型定義ファイルを確認して、不一致を修正します。

---

### エラー6: `git push` が拒否される

**原因:** リモートリポジトリとの不一致

**解決方法:**

```bash
# リモートの最新を取得
git fetch origin

# マージまたはリベース
git pull origin main --rebase

# 再度プッシュ
git push origin feature-branch
```

---

### エラー7: IndexedDBデータが残っている

**原因:** 以前の開発データがブラウザに残っている

**解決方法:**

**方法A: Chrome DevToolsでクリア**
1. 開発者ツール（F12）を開く
2. Application → Storage → Clear storage
3. 「Clear site data」をクリック

**方法B: コンソールでクリア**
```javascript
// ブラウザコンソールで実行
window.indexedDB.deleteDatabase('BiteNoteDB')
```

---

## 次のステップ

開発環境のセットアップが完了したら、以下のドキュメントを参照して開発を進めてください：

### 📚 ドキュメント

1. **アーキテクチャ理解**
   - [アーキテクチャ設計](ARCHITECTURE.md) - システム全体の設計
   - [技術仕様](technical-specifications.md) - 技術的な詳細

2. **API仕様確認**
   - [API仕様](API.md) - サービス層API仕様
   - [型定義](../src/types/) - TypeScript型定義

3. **開発プロセス**
   - [Issue駆動開発](../ai-rules/TASK_CYCLES.md) - タスクサイクル
   - [コミット・PRガイドライン](../ai-rules/COMMIT_AND_PR_GUIDELINES.md)

4. **デプロイ**
   - [デプロイガイド](DEPLOYMENT.md) - Vercel/Netlifyへのデプロイ方法

### 🛠️ 開発Tips

#### エディタ設定

**VS Code推奨拡張機能:**
- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Vitest

**設定ファイル:**

`.vscode/settings.json`（推奨）:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

#### Git Hook設定（オプション）

Husky + lint-stagedで、コミット前に自動Lint/Formatを実行：

```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

`package.json`に追加：
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

---

## サポート

開発中に問題が発生した場合:

1. このドキュメントの[よくあるエラーと解決方法](#よくあるエラーと解決方法)を確認
2. [トラブルシューティングガイド](troubleshooting.md)を参照
3. GitHubでIssueを作成
4. `.claude/CLAUDE.md`のプロジェクト固有ガイドラインを確認

---

**🚀 Happy Coding!**

開発環境の準備が整いました。素晴らしいコードを書いてください！

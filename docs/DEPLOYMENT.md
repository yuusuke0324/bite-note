# 🚀 デプロイガイド

**最終更新**: 2025-11-17

このガイドでは、Bite Noteを本番環境にデプロイする方法を説明します。

---

## 📋 目次

1. [デプロイ先の選択](#デプロイ先の選択)
2. [Vercelへのデプロイ（推奨）](#vercelへのデプロイ推奨)
3. [Netlifyへのデプロイ（代替案）](#netlifyへのデプロイ代替案)
4. [環境変数の設定](#環境変数の設定)
5. [カスタムドメインの設定](#カスタムドメインの設定)
6. [デプロイ確認チェックリスト](#デプロイ確認チェックリスト)
7. [トラブルシューティング](#トラブルシューティング)

---

## デプロイ先の選択

### 推奨: Vercel

**理由:**
- ✅ Viteとの相性が最高（ゼロコンフィグ）
- ✅ GitHub連携が最もスムーズ
- ✅ 無料枠が充実（100GB/月、6000分ビルド時間/月）
- ✅ 既に`vercel.json`が完成している
- ✅ PWA対応が完璧

**適している場合:**
- 初めてのデプロイ
- 迅速なデプロイが必要
- GitHub連携を活用したい

### 代替案: Netlify

**理由:**
- ✅ セキュリティヘッダーがより詳細
- ✅ 分析ツールが無料
- ✅ Edge Functionsが無料枠で使える
- ✅ 既に`netlify.toml`が完成している

**適している場合:**
- セキュリティ重視
- 分析ツールを活用したい
- Edge Functionsを使いたい

---

## Vercelへのデプロイ（推奨）

### 前提条件

- GitHubアカウント
- Vercelアカウント（GitHubで連携可能）
- Node.js 20以上（ローカル開発の場合）

### 方法1: Vercel CLI でデプロイ（最速）

#### Step 1: Vercel CLIのインストール

```bash
npm i -g vercel
```

#### Step 2: ログイン

```bash
vercel login
```

ブラウザが開き、GitHubアカウントで認証します。

#### Step 3: プロジェクトをリンク

プロジェクトルートで以下を実行：

```bash
vercel link
```

質問に答えます：
- Set up and deploy "~/bite-note"? → **Y**
- Which scope? → 自分のアカウントを選択
- Link to existing project? → **N**（初回の場合）
- What's your project's name? → **bite-note**
- In which directory is your code located? → **./**

#### Step 4: プレビューデプロイ

```bash
vercel
```

デプロイが完了すると、プレビューURLが表示されます：
```
✅ Preview: https://bite-note-xxx.vercel.app
```

#### Step 5: 本番デプロイ

```bash
vercel --prod
```

本番URLが表示されます：
```
✅ Production: https://bite-note.vercel.app
```

**所要時間**: 約3分

---

### 方法2: Vercel Webダッシュボードでデプロイ（推奨）

#### Step 1: Vercelダッシュボードにアクセス

1. https://vercel.com にアクセス
2. GitHubアカウントでログイン

#### Step 2: プロジェクトをインポート

1. 「New Project」をクリック
2. GitHubリポジトリを選択（`yuusuke0324/bite-note`）
3. 「Import」をクリック

#### Step 3: ビルド設定の確認

Vercelが自動的に以下を検出します：

| 項目 | 値 |
|------|-----|
| Framework Preset | **Vite** |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm ci` |

`vercel.json`が自動的に読み込まれます。

#### Step 4: 環境変数の設定（オプション）

現在は環境変数不要ですが、将来的に必要な場合：

1. 「Environment Variables」を展開
2. 変数を追加（例：`VITE_OPENWEATHER_API_KEY`）

詳細は [環境変数の設定](#環境変数の設定) を参照

#### Step 5: デプロイを開始

1. 「Deploy」ボタンをクリック
2. ビルドログをリアルタイムで確認

**所要時間**: 約5分

#### Step 6: デプロイ完了を確認

デプロイが成功すると、以下が表示されます：

```
✅ Deployment successful!
🔗 Production: https://bite-note.vercel.app
```

---

### 継続的デプロイ（CI/CD）の自動設定

Vercelは、GitHubと連携すると以下が自動的に実行されます：

- **PRマージ時**: 本番環境に自動デプロイ
- **PR作成時**: プレビュー環境に自動デプロイ
- **テスト失敗時**: デプロイをスキップ

既存の`.github/workflows/ci.yml`と連携して動作します。

---

## Netlifyへのデプロイ（代替案）

### 前提条件

- GitHubアカウント
- Netlifyアカウント（GitHubで連携可能）
- Node.js 20以上（ローカル開発の場合）

### 方法1: Netlify CLI でデプロイ

#### Step 1: Netlify CLIのインストール

```bash
npm i -g netlify-cli
```

#### Step 2: ログイン

```bash
netlify login
```

ブラウザが開き、GitHubアカウントで認証します。

#### Step 3: プロジェクトの初期化

```bash
netlify init
```

質問に答えます：
- What would you like to do? → **Create & configure a new site**
- Team: → 自分のチームを選択
- Site name: → **bite-note**
- Your build command: → `npm run build`
- Directory to deploy: → `dist`

#### Step 4: デプロイ

```bash
netlify deploy --prod
```

本番URLが表示されます：
```
✅ Production: https://bite-note.netlify.app
```

**所要時間**: 約3分

---

### 方法2: Netlify Webダッシュボードでデプロイ

#### Step 1: Netlifyダッシュボードにアクセス

1. https://netlify.com にアクセス
2. GitHubアカウントでログイン

#### Step 2: サイトをインポート

1. 「Add new site」 → 「Import an existing project」
2. GitHubリポジトリを選択（`yuusuke0324/bite-note`）

#### Step 3: ビルド設定の確認

| 項目 | 値 |
|------|-----|
| Base directory | （空白） |
| Build command | `npm run build` |
| Publish directory | `dist` |

`netlify.toml`が自動的に読み込まれます。

#### Step 4: デプロイを開始

1. 「Deploy site」ボタンをクリック
2. ビルドログを確認

**所要時間**: 約5分

---

## 環境変数の設定

### 現在の環境変数

現在、Bite Noteは環境変数なしで動作します。

### 将来的な環境変数（参考）

OpenWeatherMap APIを使用する場合：

#### Vercel

1. ダッシュボード → Settings → Environment Variables
2. 変数を追加：
   - Key: `VITE_OPENWEATHER_API_KEY`
   - Value: `your_api_key_here`
   - Environment: Production, Preview, Development

#### Netlify

1. ダッシュボード → Site settings → Build & deploy → Environment
2. 変数を追加：
   - Key: `VITE_OPENWEATHER_API_KEY`
   - Value: `your_api_key_here`

#### ローカル開発

`.env.local`ファイルを作成（`.gitignore`で除外済み）：

```bash
VITE_OPENWEATHER_API_KEY=your_api_key_here
```

`.env.example`をコピーして使用：

```bash
cp .env.example .env.local
```

---

## カスタムドメインの設定

### Vercel

#### Step 1: ドメインを追加

1. ダッシュボード → Settings → Domains
2. 「Add」をクリック
3. ドメイン名を入力（例：`bite-note.com`）

#### Step 2: DNS設定

Vercelが推奨するDNS設定を表示します：

**Aレコード:**
```
A    @    76.76.21.21
```

**CNAMEレコード（www用）:**
```
CNAME    www    cname.vercel-dns.com
```

#### Step 3: DNS反映を待つ

通常24-48時間で反映されます。

---

### Netlify

#### Step 1: カスタムドメインを追加

1. ダッシュボード → Domain settings → Add custom domain
2. ドメイン名を入力

#### Step 2: DNS設定

**Netlify DNSを使用する場合（推奨）:**
1. ドメインレジストラでネームサーバーをNetlifyに変更

**外部DNSを使用する場合:**
- Aレコード: `75.2.60.5`
- CNAMEレコード: `your-site.netlify.app`

---

## デプロイ確認チェックリスト

### ✅ デプロイ成功確認

- [ ] **デプロイ完了**: ビルドエラーなし
- [ ] **サイトアクセス可能**: URLにアクセスできる
- [ ] **HTTPS通信**: 🔒マーク表示
- [ ] **manifest.json読み込み成功**: 開発者ツールで確認
- [ ] **Service Worker登録成功**: `chrome://serviceworker-internals`で確認

### ✅ PWA動作確認

- [ ] **インストールプロンプト表示**: Android Chromeで確認
- [ ] **ホーム画面に追加可能**: iOS Safariで確認
- [ ] **アプリアイコン表示**: ホーム画面で確認
- [ ] **スタンドアロン起動**: ブラウザUIなしで起動
- [ ] **オフライン動作**: 機内モードで動作確認

### ✅ 機能動作確認

- [ ] **釣果記録作成**: 記録を作成・保存できる
- [ ] **写真アップロード**: 写真を添付できる（5MB以下）
- [ ] **GPS位置情報取得**: 位置情報許可時に取得できる
- [ ] **IndexedDB保存**: 開発者ツール → Application → IndexedDB
- [ ] **潮汐グラフ表示**: 記録詳細画面で表示される

### ✅ パフォーマンス確認

Lighthouseで測定（開発者ツール → Lighthouse）:

- [ ] **Performance**: 90以上
- [ ] **Accessibility**: 95以上
- [ ] **Best Practices**: 90以上
- [ ] **SEO**: 90以上
- [ ] **PWA**: Installable（全項目✅）

測定コマンド:
```bash
npm run lighthouse
```

---

## トラブルシューティング

### 問題1: デプロイ後に404エラー

**原因**: SPAルーティング未設定

**解決方法**:
- Vercel: `vercel.json`の`rewrites`設定を確認
- Netlify: `netlify.toml`の`redirects`設定を確認

```json
// vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

```toml
# netlify.toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

### 問題2: Service Workerが更新されない

**原因**: ブラウザキャッシュ

**解決方法**:
1. ハードリロード（Ctrl+Shift+R / Cmd+Shift+R）
2. 開発者ツール → Application → Service Workers → Unregister
3. キャッシュクリア → ページリロード

---

### 問題3: PWAインストールプロンプトが表示されない

**原因**: PWA要件未達成

**確認項目**:
- [ ] HTTPS接続（http:// → https://）
- [ ] `manifest.json`が正しく読み込まれている
- [ ] Service Workerが登録されている
- [ ] アイコンが適切なサイズ（192x192、512x512）

**確認方法**:
```
開発者ツール → Application → Manifest
開発者ツール → Application → Service Workers
```

---

### 問題4: ビルドエラー

**エラー**: `Cannot find module 'vite'`

**原因**: 依存関係未インストール

**解決方法**:
```bash
npm ci
npm run build
```

---

### 問題5: 環境変数が反映されない

**原因**: ビルド時に環境変数が設定されていない

**解決方法**:
1. Vercel/Netlifyダッシュボードで環境変数を確認
2. 変数名が`VITE_`プレフィックスで始まることを確認
3. デプロイを再実行

---

### 問題6: カスタムドメインが反映されない

**原因**: DNS反映待ち

**解決方法**:
1. DNS設定を確認（Aレコード、CNAMEレコード）
2. DNS反映状況を確認:
   ```bash
   nslookup bite-note.com
   dig bite-note.com
   ```
3. 24-48時間待つ

---

## 参考資料

### 公式ドキュメント

- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com/)
- [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)

### プロジェクト固有ドキュメント

- [開発者向けガイド](GETTING-STARTED.md)
- [ユーザーガイド](user-guide.md)
- [アーキテクチャ設計](ARCHITECTURE.md)

---

## サポート

デプロイに関する問題が発生した場合:

1. このドキュメントの[トラブルシューティング](#トラブルシューティング)を確認
2. GitHubでIssueを作成
3. Vercel/Netlifyのサポートに問い合わせ

---

**🎉 デプロイおめでとうございます！**

デプロイが完了したら、[デプロイ確認チェックリスト](#デプロイ確認チェックリスト)で全ての項目を確認してください。

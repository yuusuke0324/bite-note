# Bite Note

[![Build Status](https://github.com/yuusuke0324/bite-note/workflows/CI/badge.svg)](https://github.com/yuusuke0324/bite-note/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

釣果記録PWAアプリケーション。釣った魚を簡単に記録・振り返ることができます。

**Demo**: [https://bite-note.vercel.app](https://bite-note.vercel.app)

## 特徴

- **PWA対応** - iOS/Android/Webで動作、オフラインでも利用可能
- **写真メタデータ自動入力** - GPS付き写真から位置・日時・天気を自動抽出
- **潮汐グラフ** - 釣果時刻と潮汐の関係を24時間グラフで可視化
- **ライト/ダークテーマ** - ワンクリックでテーマ切り替え
- **ローカルストレージ** - データは端末内に保存（IndexedDB）

## クイックスタート

### アプリを使う

1. [https://bite-note.vercel.app](https://bite-note.vercel.app) にアクセス
2. PWAとしてインストール（オプション）
   - **iOS**: Safari → 共有 → 「ホーム画面に追加」
   - **Android**: Chrome → メニュー → 「アプリをインストール」

### 開発環境

```bash
# クローン
git clone https://github.com/yuusuke0324/bite-note.git
cd bite-note

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# テスト実行
npm run test:fast

# ビルド
npm run build
```

## 技術スタック

| カテゴリ | 技術 |
|---------|-----|
| Frontend | React 18, TypeScript, Vite |
| State | Zustand |
| Database | IndexedDB (Dexie.js) |
| Forms | React Hook Form, Zod |
| Charts | Recharts |
| Maps | Leaflet |
| Testing | Vitest, Playwright |
| Styling | TailwindCSS |

## プロジェクト構造

```
src/
├── components/     # UIコンポーネント
│   ├── ui/        # 汎用UI（Button, Card, Skeleton等）
│   ├── home/      # ホーム画面
│   ├── chart/     # グラフ（TideChart, TrendChart）
│   ├── map/       # 地図
│   └── layout/    # レイアウト
├── lib/           # サービス層
├── stores/        # 状態管理（Zustand）
├── hooks/         # カスタムフック
├── types/         # 型定義
├── theme/         # テーマ設定
└── utils/         # ユーティリティ
```

## 主要機能

### 写真からの自動入力

GPS情報付き写真をアップロードすると、以下の情報を自動抽出：
- 撮影場所（緯度・経度 → 住所）
- 撮影日時
- 天気情報

### 潮汐グラフ

釣果記録にGPS座標が含まれる場合、その場所・日時の潮汐情報を表示：
- 24時間潮位グラフ
- 釣果時刻マーカー
- 満潮・干潮イベント表示
- 次回最適釣行時間の提案

### テーマ切り替え

- ヘッダーのトグルボタンでライト/ダーク切り替え
- 設定はlocalStorageに保存
- 全コンポーネントがCSS変数ベースで統一

## ドキュメント

| ドキュメント | 内容 |
|-------------|-----|
| [ユーザーガイド](docs/user-guide.md) | 使い方、PWAインストール |
| [アーキテクチャ](docs/ARCHITECTURE.md) | システム設計 |
| [API仕様](docs/API.md) | サービス層API |
| [テストガイド](docs/testing-best-practices.md) | テスト実行方法 |

## コントリビューション

1. Fork
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Create Pull Request

## ライセンス

[MIT](LICENSE)

## 謝辞

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Dexie.js](https://dexie.org/)
- [Zustand](https://github.com/pmndrs/zustand)
- [OpenStreetMap Nominatim](https://nominatim.org/)

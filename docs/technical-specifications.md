# 技術仕様書 - クイックリファレンス

> **最終更新**: 2025年10月30日
> **注**: 本ファイルは参照ページです。詳細は各専門ドキュメントを参照してください。

---

## 📚 詳細仕様へのリンク

Bite Noteアプリの技術仕様は以下のドキュメントに分散管理されています：

### 🏗️ システム設計
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - システム全体のアーキテクチャ、4層構造、技術スタック、全62コンポーネント
- **[DATABASE.md](./DATABASE.md)** - IndexedDB v3スキーマ、7テーブル定義、インデックス戦略
- **[API.md](./API.md)** - 全8サービスのAPI仕様、TypeScript型定義、使用例

### 🎯 機能別設計
- **[design/integrated-master-spec.md](./design/fishing-record/integrated-master-spec.md)** - 釣果記録システムの実装完了仕様
- **[design/tide-system-master-spec.md](./design/tide-system-master-spec.md)** - 潮汐システムの実装完了仕様

### 📋 プロジェクト管理
- **[current-status-and-roadmap.md](./current-status-and-roadmap.md)** - 現状認識、実装済み機能、今後のロードマップ
- **[REFACTORING-PLAN.md](./REFACTORING-PLAN.md)** - リファクタリング計画（Stage 0-5）

---

## 🚀 クイックスタート

```bash
# 開発環境起動
npm install
npm run dev

# テスト実行
npm test                  # ユニットテスト
npm run test:e2e          # E2Eテスト

# ビルド
npm run build
npm run preview
```

---

## 💡 技術スタック概要

```
Frontend: React 18.2.0 + TypeScript 5.8.3 + Vite 4.5.3
State: Zustand 4.4.7
Database: IndexedDB (Dexie.js 3.2.4)
Testing: Vitest + Playwright
```

**詳細**: [ARCHITECTURE.md](./ARCHITECTURE.md) 参照

---

## 📝 ドキュメント更新履歴

- **2025-10-30**: 参照ページ化（923行 → 50行）、詳細を各専門ドキュメントに分散
- **2025-10-27**: 写真アップロード制限緩和（5MB → 20MB）
- **2025-10-25**: パフォーマンス最適化・潮汐分類精度向上
- **2024-09-26**: 初版作成

---

**このファイルは参照ページです。各リンク先で最新の詳細情報を確認してください。**

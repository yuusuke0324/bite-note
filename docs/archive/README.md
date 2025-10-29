# アーカイブドキュメント

このディレクトリには、設計変更や統合により不要になった旧バージョンの設計ドキュメントが保存されています。

## 📚 アーカイブファイル

### 潮汐システム関連（2024年12月統合済み）

- **`tide-information-system.md`** (旧)
  - NOAA API前提の初期設計
  - 日本非対応判明により廃止
  - 統合先: `/docs/design/tide-system-master-spec.md`

- **`hybrid-tide-system-design.md`** (旧)
  - ハイブリッド計算方式の詳細設計
  - 統合先: `/docs/design/tide-system-master-spec.md`

- **`tide-graph-ui-design.md`** (旧)
  - タイドグラフUI/UX詳細設計
  - 統合先: `/docs/design/tide-system-master-spec.md`

## 🔗 現在のドキュメント構成

### アクティブ設計書
- **`/docs/design/tide-system-master-spec.md`** - 潮汐システム統合仕様書（Single Source of Truth）
- **`/docs/design/ui-ux-improvement-plan.md`** - UI/UX改善計画書
- **`/docs/design/fishing-record/architecture.md`** - アーキテクチャ設計書

### 実装済み改善記録
- **`/docs/design/architectural-improvements-2024.md`** - 2024年根本改善記録

## 📋 管理方針

### 保存理由
- 設計過程の記録として保持
- 将来の類似設計時の参考資料
- 技術的判断の経緯を記録

### 参照注意
- アーカイブファイルは参考のみ
- 実装時は現在のマスター仕様書を参照
- 古い仕様に基づく実装を避ける

---
*最終更新: 2024年12月22日*
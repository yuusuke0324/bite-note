# 地図機能アーキテクチャ設計書

## 概要

釣果記録の位置情報を地図上に可視化し、直感的なUIで記録の確認・選択ができる機能。

## 設計思想

### デザイン原則
- **Material Design 3**: Googleの最新デザインシステムを採用
- **Glass Morphism**: 半透明な背景とぼかし効果で洗練されたUI
- **Mobile First**: スマートフォンでの操作性を最優先
- **地図中心**: 地図を全画面で表示し、情報は浮遊パネルで提供

## コンポーネント構成

### FishingMap.tsx
メインの地図表示コンポーネント

#### 責務
- 釣果記録の地図上への可視化
- ピンのクリックによる詳細表示
- 地図の操作（ズーム、パン、リセット）
- スパイダー表示（同一座標の複数記録）

#### Props
```typescript
interface FishingMapProps {
  records: FishingRecord[];           // 表示する釣果記録
  onRecordClick?: (record: FishingRecord) => void;  // 記録クリック時のコールバック
  selectedRecordId?: string;          // 選択中の記録ID（外部から制御）
}
```

## レイアウト構造

### 全画面マップレイアウト
```
┌─────────────────────────────────────┐
│  [サマリパネル] (選択時のみ)         │ ← 上部中央
├─────────────────────────────────────┤
│                                     │
│          地図エリア                  │
│      (React Leaflet)                │
│                                     │
│  [🗺️]  ← 右上コントロール            │
│  [統計]                              │
│                                     │
├─────────────────────────────────────┤
│  釣果一覧 (スクロール可能)            │ ← 下部オーバーレイ
└─────────────────────────────────────┘
```

## UI/UXコンポーネント

### 1. サマリパネル（上部中央）
**表示条件**: ピンまたはリストアイテムをクリックした時

**デザイン**:
- 半透明の白背景 (`rgba(255, 255, 255, 0.98)`)
- ぼかし効果 (`backdrop-filter: blur(20px)`)
- 魚種カラーのボーダー
- ドロップシャドウ (`0 8px 32px rgba(0, 0, 0, 0.15)`)

**表示内容**:
- 魚種名（太字、大きめフォント）
- サイズ/重量（バッジ表示）
- 釣果日時
- 場所（アイコン付き）
- 「詳細を見る」ボタン

### 2. コントロールパネル（右上）
**機能**:
- 全体表示に戻すボタン（⤢アイコン）
- 統計情報カード

**統計情報**:
- 📊 記録数
- 📍 釣り場数
- 🐟 魚種数

### 3. 釣果一覧（下部オーバーレイ）
**デザイン**:
- 最大高さ180px、スクロール可能
- 半透明の白背景
- 上部ボーダーシャドウ

**リストアイテム**:
- 魚種カラードット
- 魚種名（太字）
- 場所（グレーテキスト）
- サイズ/重量バッジ
- 選択時は背景色とボーダー変化

## 地図機能

### React Leaflet設定
```typescript
// タイルレイヤー
url: "https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png"

// 地図範囲制限
minZoom: 5
maxZoom: 17
maxBounds: JAPAN_BOUNDS  // 日本全体
maxBoundsViscosity: 0.9
```

### カスタムマーカー
**仕様**:
- 魚種ごとの色分け
- グラデーション背景
- ドロップシャドウ
- ホバー時のアニメーション（拡大）

**アイコンサイズ**:
- サイズ/重量によって動的変更
- 基本サイズ: 30px
- ドットサイズ: 12px（中央の円）

**色分けロジック**:
```typescript
const getFishSpeciesColor = (species: string) => {
  const hash = species.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 55%)`;
}
```

### スパイダー表示
**目的**: 同一座標の複数記録を円形配置

**アルゴリズム**:
1. 座標を4桁精度（`toFixed(4)`）でグルーピング
2. 同一グループが2件以上の場合、円形配置
3. 半径: 0.002度（約220m）
4. 等間隔で配置

```typescript
const angleStep = (2 * Math.PI) / groupRecords.length;
const angle = angleStep * index;
adjustedLat = centerLat + radius * Math.cos(angle);
adjustedLng = centerLng + radius * Math.sin(angle);
```

## インタラクション

### ピンクリック
1. サマリパネルを上部中央に表示
2. 地図をピン位置にフライ（zoom: 14、duration: 1.5s）
3. リスト内の対応アイテムをハイライト

### リストアイテムクリック
1. 地図をピン位置にフライ
2. サマリパネルを表示
3. **詳細モーダルは開かない**（地図に集中）

### サマリパネル「詳細を見る」ボタン
- `onRecordClick` コールバックを呼び出し
- 詳細モーダルを開く

### 全体表示に戻すボタン
1. 選択をクリア
2. 全ての記録が見える範囲に地図を調整
3. フライアニメーション（duration: 1.5s）

## 自動調整機能

### AutoBounds
**目的**: 初期表示時に全ての記録が見える範囲に調整

**ロジック**:
- useRefで初回実行のみを保証
- 記録が1件: その位置にzoom 13
- 記録が複数: 全体を含むboundsに調整（padding: [50, 50]、maxZoom: 13）

### ResetView
**目的**: リセットボタンクリック時の全体表示

**トリガー**: `resetTrigger` state の変化

## 状態管理

### Local State
```typescript
const [selectedRecord, setSelectedRecord] = useState<FishingRecord | null>(null);
const [flyToCoords, setFlyToCoords] = useState<{ latitude: number; longitude: number } | null>(null);
const [resetTrigger, setResetTrigger] = useState(0);
```

### 算出値
```typescript
const recordsWithCoordinates = useMemo(
  () => records.filter(r => r.coordinates),
  [records]
);

const recordsWithAdjustedCoordinates = useMemo(
  () => {
    // スパイダー表示の座標計算
  },
  [recordsWithCoordinates]
);

const statistics = useMemo(() => ({
  totalRecords: recordsWithCoordinates.length,
  uniqueLocations: new Set(recordsWithCoordinates.map(r => r.location)).size,
  uniqueSpecies: new Set(recordsWithCoordinates.map(r => r.fishSpecies)).size,
}), [recordsWithCoordinates]);
```

## パフォーマンス最適化

### useMemo
- `recordsWithCoordinates`: 座標フィルタリング
- `recordsWithAdjustedCoordinates`: スパイダー表示計算
- `statistics`: 統計計算
- `initialView`: 初期表示位置計算

### useRef
- `AutoBounds`での初回実行制御
- 不要な再レンダリングの防止

## スタイリング

### カラーパレット
```typescript
colors.primary[50]   // 薄い青（選択背景）
colors.primary[300]  // 中間青（選択ボーダー）
colors.primary[500]  // 濃い青（ボタン選択）
colors.primary[600]  // さらに濃い青（統計数値）
colors.primary[700]  // 最も濃い青（バッジテキスト）

colors.text.primary    // #202124 (メインテキスト)
colors.text.secondary  // #5F6368 (サブテキスト)
colors.text.tertiary   // #80868B (補助テキスト)

colors.surface.primary // #FFFFFF (背景)
colors.surface.hover   // #F8F9FA (ホバー)

colors.border.light    // #E8EAED (ボーダー)
```

### トランジション
```css
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)
```

### シャドウ
- 浮遊パネル: `0 4px 24px rgba(0, 0, 0, 0.12)`
- ホバー時: `0 6px 32px rgba(0, 0, 0, 0.18)`
- サマリパネル: `0 8px 32px rgba(0, 0, 0, 0.15)`

## 削除された機能

### ヒートマップモード
**削除理由**:
- 視認性が低く、効果が不明瞭
- ピン表示で十分な情報が得られる
- UI複雑性の削減

**削除内容**:
- `viewMode` state
- `HeatmapLayer` コンポーネント
- ヒートマップ切替ボタン（🔥）
- ピン表示ボタン（📍）
- `leaflet.heat` の使用

## 外部連携

### ModernApp.tsx との連携
```typescript
// 詳細画面からの地図ナビゲーション
const [mapSelectedRecordId, setMapSelectedRecordId] = useState<string | null>(null);

// 詳細モーダルの「🗺️ 地図で表示」ボタン
onNavigateToMap={(record) => {
  setCurrentTab('map');
  setMapSelectedRecordId(record.id);
  onClose();
}}

// FishingMapに渡す
<FishingMap
  records={records}
  onRecordClick={handleRecordClick}
  selectedRecordId={mapSelectedRecordId}
/>
```

## 技術スタック

### ライブラリ
- `react-leaflet`: 4.2.1
- `leaflet`: 1.9.4

### 除外されたライブラリ
- ~~`leaflet.heat`~~ （削除済み）

## 今後の拡張可能性

### 検討中の機能
- フィルタリング（魚種、日付範囲）
- クラスタリング（ズームアウト時）
- ルート表示（釣行経路）
- 天気情報オーバーレイ

### 技術的課題
- 大量データ（1000件以上）の表示パフォーマンス
- オフライン時の地図表示
- カスタムタイルレイヤーの検討

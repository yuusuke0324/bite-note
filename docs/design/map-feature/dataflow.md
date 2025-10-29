# 地図機能データフロー設計書

## データフロー概要

```
┌──────────────┐
│ ModernApp.tsx│
└──────┬───────┘
       │ records[]
       │ onRecordClick
       │ selectedRecordId
       ↓
┌──────────────────┐
│  FishingMap.tsx  │
└──────┬───────────┘
       │
       ├→ recordsWithCoordinates (useMemo)
       │  └→ records.filter(r => r.coordinates)
       │
       ├→ recordsWithAdjustedCoordinates (useMemo)
       │  └→ スパイダー表示の座標計算
       │
       ├→ statistics (useMemo)
       │  └→ 統計情報の集計
       │
       └→ initialView (useMemo)
          └→ 初期表示位置の計算
```

## データ変換フロー

### 1. 座標フィルタリング
```typescript
Input: FishingRecord[]
  ↓
Filter: record.coordinates が存在
  ↓
Output: recordsWithCoordinates
```

### 2. スパイダー表示計算
```typescript
Input: recordsWithCoordinates
  ↓
Step 1: 座標をグルーピング
  - key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  - Map<key, FishingRecord[]>
  ↓
Step 2: 各グループを処理
  - グループサイズ = 1 → 元の座標
  - グループサイズ > 1 → 円形配置
    - radius = 0.002度
    - angleStep = 2π / グループサイズ
    - adjustedLat = centerLat + radius * cos(angle * index)
    - adjustedLng = centerLng + radius * sin(angle * index)
  ↓
Output: recordsWithAdjustedCoordinates
  - 各レコードに adjustedLat, adjustedLng を追加
```

### 3. 統計計算
```typescript
Input: recordsWithCoordinates
  ↓
Compute:
  - totalRecords = recordsWithCoordinates.length
  - uniqueLocations = new Set(records.map(r => r.location)).size
  - uniqueSpecies = new Set(records.map(r => r.fishSpecies)).size
  ↓
Output: statistics
  {
    totalRecords: number,
    uniqueLocations: number,
    uniqueSpecies: number
  }
```

## 状態変化フロー

### ピンクリック時
```
User: ピンをクリック
  ↓
1. setSelectedRecord(record)
  ↓
2. setFlyToCoords({
     latitude: record.adjustedLat,
     longitude: record.adjustedLng
   })
  ↓
3. FlyToLocation コンポーネントが反応
  ↓
4. map.flyTo([lat, lng], 14, { duration: 1.5 })
  ↓
5. サマリパネル表示（selectedRecord !== null）
```

### リストアイテムクリック時
```
User: リストアイテムをクリック
  ↓
1. setSelectedRecord(record)
  ↓
2. setFlyToCoords({
     latitude: record.adjustedLat,
     longitude: record.adjustedLng
   })
  ↓
3. 地図がピン位置にフライ
  ↓
4. サマリパネル表示
  ↓
Note: onRecordClick は呼ばない（詳細モーダルは開かない）
```

### 「詳細を見る」ボタンクリック時
```
User: サマリパネルの「詳細を見る」ボタンをクリック
  ↓
1. onRecordClick?.(selectedRecord)
  ↓
2. ModernApp.tsx で handleRecordClick が呼ばれる
  ↓
3. setDetailRecord(record)
  ↓
4. 詳細モーダル表示
```

### 全体表示に戻すボタンクリック時
```
User: ⤢ ボタンをクリック
  ↓
1. setSelectedRecord(null)
  ↓
2. setFlyToCoords(null)
  ↓
3. setResetTrigger(prev => prev + 1)
  ↓
4. ResetView コンポーネントが反応
  ↓
5. 記録数により分岐:
   - 1件: map.flyTo([lat, lng], 13, { duration: 1.5 })
   - 複数: map.flyToBounds(bounds, {
              padding: [50, 50],
              maxZoom: 13,
              duration: 1.5
            })
  ↓
6. サマリパネル非表示
```

### 詳細画面から地図に遷移時
```
User: 詳細モーダルの「🗺️ 地図で表示」ボタンをクリック
  ↓
1. ModernApp.tsx で onNavigateToMap 呼び出し
  ↓
2. setCurrentTab('map')
  ↓
3. setMapSelectedRecordId(record.id)
  ↓
4. 詳細モーダルを閉じる
  ↓
5. FishingMap が selectedRecordId を受け取る
  ↓
6. useEffect で selectedRecordId が検出される
  ↓
7. 該当レコードを検索
  ↓
8. setSelectedRecord(foundRecord)
  ↓
9. setFlyToCoords({ latitude, longitude })
  ↓
10. 地図がピン位置にフライ＋サマリパネル表示
```

## useEffect 依存関係

### AutoBounds (初期表示調整)
```typescript
useEffect(() => {
  if (hasAdjusted.current) return; // 初回のみ実行

  // 記録数に応じて地図を調整
  if (records.length === 1) {
    map.flyTo([lat, lng], 13, { duration: 1.5 });
  } else {
    map.flyToBounds(bounds, {
      padding: [50, 50],
      maxZoom: 13,
      duration: 1.5
    });
  }

  hasAdjusted.current = true;
}, [records, map]);
```

### ResetView (リセット時)
```typescript
useEffect(() => {
  if (trigger === 0) return; // 初期値はスキップ

  // AutoBounds と同じロジック
  // ...

}, [trigger, records, map]);
```

### FlyToLocation (ピンクリック時)
```typescript
useEffect(() => {
  map.flyTo([latitude, longitude], 14, {
    duration: 1.5,
    easeLinearity: 0.5
  });
}, [coordinates, map]);
```

### selectedRecordId 監視（外部からの制御）
```typescript
useEffect(() => {
  if (!selectedRecordId) return;

  const record = recordsWithAdjustedCoordinates.find(
    r => r.id === selectedRecordId
  );

  if (record) {
    setSelectedRecord(record);
    setFlyToCoords({
      latitude: record.adjustedLat,
      longitude: record.adjustedLng
    });
  }
}, [selectedRecordId, recordsWithAdjustedCoordinates]);
```

## イベント処理フロー

### マーカーイベント
```typescript
<Marker
  eventHandlers={{
    click: () => {
      setSelectedRecord(record);
      setFlyToCoords({
        latitude: record.adjustedLat,
        longitude: record.adjustedLng
      });
    }
  }}
/>
```

### リストアイテムイベント
```typescript
<div
  onClick={() => {
    setSelectedRecord(record);
    setFlyToCoords({
      latitude: record.adjustedLat,
      longitude: record.adjustedLng
    });
    // onRecordClick は呼ばない
  }}
/>
```

### ホバーイベント
```typescript
onMouseEnter={(e) => {
  e.currentTarget.style.backgroundColor = colors.surface.hover;
}}

onMouseLeave={(e) => {
  e.currentTarget.style.backgroundColor = 'transparent';
}}
```

## データ永続化

### 地図の状態は永続化しない
- 選択状態（selectedRecord）
- フライ先座標（flyToCoords）
- リセットトリガー（resetTrigger）

**理由**:
- 地図の状態は一時的な表示情報
- ページリロード時は初期状態から開始するのが自然
- selectedRecordId は外部（ModernApp）から制御可能

## パフォーマンス最適化

### useMemo による再計算の抑制
```typescript
// records が変わらない限り再計算しない
const recordsWithCoordinates = useMemo(
  () => records.filter(r => r.coordinates),
  [records]
);

// recordsWithCoordinates が変わらない限り再計算しない
const recordsWithAdjustedCoordinates = useMemo(
  () => {
    // スパイダー表示計算（重い処理）
  },
  [recordsWithCoordinates]
);

// recordsWithCoordinates が変わらない限り再計算しない
const statistics = useMemo(() => ({
  totalRecords: recordsWithCoordinates.length,
  uniqueLocations: new Set(recordsWithCoordinates.map(r => r.location)).size,
  uniqueSpecies: new Set(recordsWithCoordinates.map(r => r.fishSpecies)).size
}), [recordsWithCoordinates]);
```

### useRef による不要な副作用の抑制
```typescript
const hasAdjusted = React.useRef(false);

// 初回のみ実行
useEffect(() => {
  if (hasAdjusted.current) return;

  // 地図調整処理

  hasAdjusted.current = true;
}, [records, map]);
```

## エラーハンドリング

### 座標データなし
```typescript
if (recordsWithCoordinates.length === 0) {
  return (
    <div>
      📍 位置情報付きの記録がありません
      位置情報ONで撮影した写真をアップロードすると、
      ここに釣り場所が自動表示されます
    </div>
  );
}
```

### 不正な座標値
- `toFixed(4)` でグルーピング → 異常値は自動的に分離
- React Leaflet の内部エラーハンドリングに委任

### 地図読み込み失敗
- React Leaflet がエラー境界で処理
- タイルサーバーのフォールバックは未実装

## データ検証

### 座標の妥当性
```typescript
// 日本の境界内かチェック
const JAPAN_BOUNDS: L.LatLngBoundsExpression = [
  [20.0, 122.0],  // 南西
  [46.0, 154.0]   // 北東
];

maxBounds={JAPAN_BOUNDS}
maxBoundsViscosity={0.9}  // 境界外への移動を制限
```

### スパイダー表示の衝突検出
```typescript
// 同一座標判定の精度
const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
// 約11m × 8m の精度で同一座標と判定
```

## タイミングチャート

### 初期表示
```
Time: 0ms
  - FishingMap マウント
  ↓
Time: 0ms
  - useMemo で座標計算開始
  ↓
Time: ~10ms
  - recordsWithAdjustedCoordinates 完成
  ↓
Time: ~10ms
  - MapContainer レンダリング
  ↓
Time: ~100ms
  - Leaflet 初期化完了
  ↓
Time: ~100ms
  - AutoBounds useEffect 実行
  ↓
Time: ~100ms
  - map.flyTo/flyToBounds 開始
  ↓
Time: ~1600ms (100 + 1500)
  - フライアニメーション完了
```

### ピンクリック
```
Time: 0ms
  - ユーザーがピンをクリック
  ↓
Time: 0ms
  - setSelectedRecord 実行
  ↓
Time: 0ms
  - setFlyToCoords 実行
  ↓
Time: ~16ms (1フレーム後)
  - Re-render
  ↓
Time: ~16ms
  - サマリパネル表示
  - FlyToLocation マウント
  ↓
Time: ~16ms
  - map.flyTo 開始
  ↓
Time: ~1516ms (16 + 1500)
  - フライアニメーション完了
```

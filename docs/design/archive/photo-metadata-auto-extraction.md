# 写真メタデータ自動抽出機能 設計書

## 概要

写真のEXIFデータから位置情報・撮影日時・カメラ情報を自動抽出し、釣果記録フォームに自動入力する機能。

## 技術スタック

### ライブラリ
- **exifreader**: EXIFデータ抽出ライブラリ
- **Nominatim API**: OpenStreetMapベースの逆ジオコーディングAPI

### コンポーネント構成
```
PhotoUpload
├── PhotoMetadataService
│   ├── extractMetadata()
│   ├── getLocationFromCoordinates()
│   └── validateCoordinates()
└── AutoFillDialog（自動入力確認）
```

## 機能仕様

### 1. EXIFメタデータ抽出

#### 対応データ
- **GPS座標**: 緯度・経度・精度情報
- **撮影日時**: DateTimeOriginal, DateTime, CreateDate
- **カメラ情報**: メーカー・機種・レンズ・撮影設定

#### 座標形式対応
- 度分秒形式: `DD° MM' SS.SS"`
- 度分形式: `DD° MM.MMM'`
- 小数点形式: `DD.DDDDDD`

### 2. 住所自動取得

#### API仕様
```typescript
// 基本的なNominatim API呼び出し
const response = await fetch(
  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ja&addressdetails=1&zoom=18`
);
```

#### 住所構築ロジック
```typescript
// 県・市レベルのみに限定
const parts = [];
if (data.address.state) parts.push(data.address.state);      // 都道府県
if (data.address.city) parts.push(data.address.city);        // 市区町村
const address = parts.join('');
```

### 3. 自動入力フロー

#### 処理順序
1. 写真ファイル選択
2. EXIFデータ抽出
3. GPS座標から住所取得
4. 自動入力確認ダイアログ表示
5. ユーザー承認後フォーム自動入力

#### 確認ダイアログ仕様
```typescript
interface AutoFillData {
  location?: string;      // 取得した住所
  datetime?: Date;        // 撮影日時
  coordinates?: Coordinates; // GPS座標
  weather?: WeatherData;  // 天気情報（将来実装）
}
```

## UI/UX設計

### 写真アップロード画面
```
┌─────────────────────────────────────┐
│ 📷 写真をアップロード                    │
│                                     │
│ [ファイル選択エリア]                    │
│                                     │
│ ✅ GPS付き写真: 位置・日時・天気を自動抽出  │
│ 📱 位置情報ONで撮影した写真がおすすめ      │
└─────────────────────────────────────┘
```

### 自動入力確認ダイアログ
```
┌─────────────────────────────────────┐
│ 📷 写真から情報を自動入力しますか？        │
│                                     │
│ 📍 場所: 山口県長門市                  │
│ 📅 撮影日時: 2025/9/6 19:57:27       │
│ 🌍 GPS座標: 34.388358, 131.254989    │
│                                     │
│ [キャンセル] [自動入力する]              │
└─────────────────────────────────────┘
```

### ハイブリッド住所入力UI
```
┌─────────────────────────────────────┐
│ 🎣 釣り場 *                          │
│                                     │
│ 📍 写真から自動取得                    │
│ 基本住所: 山口県長門市                  │
│ 💡 この基本住所に詳細な場所名を追加できます │
│                                     │
│ [詳細場所入力フィールド]                │
│ 例: ○○港、△△磯、釣り堀名など           │
└─────────────────────────────────────┘
```

## エラーハンドリング

### 対応エラー
1. **無効ファイル形式**: `INVALID_FILE`
2. **EXIFデータなし**: `NO_EXIF_DATA`
3. **GPS座標なし**: GPS情報がない場合は撮影日時のみ抽出
4. **住所取得失敗**: `NOMINATIM_FAILED`

### フォールバック処理
```typescript
// GPS情報がない場合でも撮影日時があれば自動入力を提案
if (metadataResult.metadata?.datetime) {
  const fallbackData: AutoFillData = {
    datetime: metadataResult.metadata.datetime
  };
  onAutoFillRequested?.(fallbackData);
}
```

## プライバシー・セキュリティ

### データ処理方針
- **メモリ内処理のみ**: EXIFデータはメモリ内で処理、外部送信なし
- **座標の最小化**: 住所変換後はGPS座標の精度を制限
- **ユーザー同意**: 自動入力前に必ず確認ダイアログを表示

### API制限対応
- **レート制限**: Nominatim APIの利用制限を遵守
- **タイムアウト**: API呼び出しタイムアウト設定
- **エラー処理**: API失敗時の適切なフォールバック

## 自動保存機能

### 仕様
- **保存タイミング**: 入力から2秒後に自動保存
- **保存期間**: 24時間
- **復元確認**: ページ再読み込み時に確認ダイアログ表示

### 下書き復元ダイアログ
```
┌─────────────────────────────────────┐
│ 📋 前回の入力内容を復元しますか？        │
│                                     │
│ 🎣 釣り場: 山口県長門市○○港            │
│ 🐟 魚種: アジ                        │
│ 🌤️ 天気: 晴れ (22°C)                │
│                                     │
│ 保存日時: 2025/9/21 14:30:15         │
│                                     │
│ [破棄] [復元する]                     │
└─────────────────────────────────────┘
```

## パフォーマンス

### 最適化
- **メモリ効率**: 大容量画像でもメモリ使用量を最小化
- **処理速度**: EXIF抽出処理の非同期化
- **UI応答性**: 抽出中のローディング表示

### 制限事項
- **ファイルサイズ**: 最大5MB
- **対応形式**: JPEG, PNG, WebP
- **API制限**: Nominatim APIのレート制限を遵守

## 今後の拡張予定

### TASK-406A: 天気情報自動取得
- GPS座標 + 撮影日時から天気情報を自動取得
- OpenWeatherMap API統合
- 天気データの記録への自動反映

### TASK-407A: 自動入力フロー統合
- 写真→メタデータ→天気→フォーム自動入力の完全フロー
- 手動修正機能との統合
- より直感的なUX設計

## 実装ファイル

### 主要ファイル
- `/src/lib/photo-metadata-service.ts`: メタデータ抽出サービス
- `/src/components/PhotoUpload.tsx`: 写真アップロードコンポーネント
- `/src/components/FishingRecordForm.tsx`: フォーム統合
- `/src/types/index.ts`: 型定義

### 型定義
```typescript
interface PhotoMetadata {
  coordinates?: Coordinates;
  datetime?: Date;
  camera?: CameraInfo;
}

interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface AutoFillData {
  location?: string;
  datetime?: Date;
  coordinates?: Coordinates;
  weather?: WeatherData;
}
```

---

**最終更新**: 2025年9月21日
**実装状況**: 完了 ✅
**次期実装**: TASK-406A（天気情報自動取得）
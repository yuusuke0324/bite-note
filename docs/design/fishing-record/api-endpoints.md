# API エンドポイント仕様

## 概要

釣果記録アプリはローカル完結型（IndexedDB）のため、従来のHTTP APIは使用しません。
代わりに、フロントエンドからIndexedDBへのデータアクセスを抽象化したサービス層のインターフェースを定義します。

## データアクセス層のインターフェース

### ベースインターフェース

```typescript
interface DatabaseService {
  // 初期化・接続
  initialize(): Promise<void>;
  close(): Promise<void>;

  // ヘルスチェック
  isConnected(): boolean;
  getVersion(): string;
}
```

## 釣果記録 API

### 1. 記録の取得

#### `getRecords(params?: GetRecordsParams): Promise<DatabaseResult<FishingRecord[]>>`

**説明**: 釣果記録の一覧を取得

**パラメータ**:
```typescript
interface GetRecordsParams {
  limit?: number;        // 取得件数上限（デフォルト: 50）
  offset?: number;       // オフセット（デフォルト: 0）
  sortBy?: SortableField; // ソートフィールド（デフォルト: 'date'）
  sortOrder?: SortOrder; // ソート順（デフォルト: 'desc'）
  filter?: RecordFilter; // フィルター条件
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: [
    {
      id: "uuid-1",
      date: "2024-01-15T10:30:00Z",
      location: "相模湾",
      fishSpecies: "マダイ",
      size: 45.5,
      photoId: "photo-uuid-1",
      coordinates: {
        latitude: 35.2809,
        longitude: 139.3947,
        accuracy: 10
      },
      createdAt: "2024-01-15T10:35:00Z",
      updatedAt: "2024-01-15T10:35:00Z"
    }
  ]
}
```

#### `getRecordById(id: string): Promise<DatabaseResult<FishingRecord | null>>`

**説明**: 指定IDの釣果記録を取得

**パラメータ**:
- `id`: 記録のID

**レスポンス**:
```typescript
{
  success: true,
  data: {
    id: "uuid-1",
    date: "2024-01-15T10:30:00Z",
    location: "相模湾",
    fishSpecies: "マダイ",
    size: 45.5,
    photoId: "photo-uuid-1",
    coordinates: { /* ... */ },
    createdAt: "2024-01-15T10:35:00Z",
    updatedAt: "2024-01-15T10:35:00Z",
    notes: "良型のマダイが釣れました"
  }
}
```

#### `getRecordSummaries(params?: GetRecordsParams): Promise<DatabaseResult<RecordSummary[]>>`

**説明**: 一覧表示用の軽量な記録データを取得

**レスポンス**:
```typescript
{
  success: true,
  data: [
    {
      id: "uuid-1",
      date: "2024-01-15T10:30:00Z",
      location: "相模湾",
      fishSpecies: "マダイ",
      size: 45.5,
      hasPhoto: true,
      thumbnailUrl: "blob:....."
    }
  ]
}
```

### 2. 記録の作成

#### `createRecord(data: CreateFishingRecordForm): Promise<DatabaseResult<FishingRecord>>`

**説明**: 新しい釣果記録を作成

**リクエスト**:
```typescript
{
  date: "2024-01-15",
  location: "相模湾",
  fishSpecies: "マダイ",
  size: "45.5",
  photo: File | null,
  useGPS: true
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    id: "generated-uuid",
    date: "2024-01-15T10:30:00Z",
    location: "相模湾",
    fishSpecies: "マダイ",
    size: 45.5,
    photoId: "photo-uuid-generated",
    coordinates: { /* GPS取得結果 */ },
    createdAt: "2024-01-15T10:35:00Z",
    updatedAt: "2024-01-15T10:35:00Z"
  }
}
```

### 3. 記録の更新

#### `updateRecord(id: string, data: UpdateFishingRecordForm): Promise<DatabaseResult<FishingRecord>>`

**説明**: 既存の釣果記録を更新

**パラメータ**:
- `id`: 更新対象の記録ID
- `data`: 更新データ（部分更新対応）

**リクエスト**:
```typescript
{
  location: "相模湾・城ヶ島沖",
  notes: "風が強かったが良い釣果"
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: { /* 更新後の完全な記録データ */ }
}
```

### 4. 記録の削除

#### `deleteRecord(id: string): Promise<DatabaseResult<boolean>>`

**説明**: 指定IDの釣果記録を削除

**パラメータ**:
- `id`: 削除対象の記録ID

**レスポンス**:
```typescript
{
  success: true,
  data: true
}
```

#### `deleteMultipleRecords(ids: string[]): Promise<DatabaseResult<{deleted: number, failed: string[]}>>`

**説明**: 複数の記録を一括削除

**パラメータ**:
- `ids`: 削除対象の記録IDの配列

**レスポンス**:
```typescript
{
  success: true,
  data: {
    deleted: 3,
    failed: ["uuid-that-failed"]
  }
}
```

## 写真管理 API

### 1. 写真の保存

#### `savePhoto(file: File, options?: ImageProcessingOptions): Promise<DatabaseResult<PhotoData>>`

**説明**: 写真を処理して保存

**パラメータ**:
- `file`: アップロードする画像ファイル
- `options`: 画像処理オプション

**レスポンス**:
```typescript
{
  success: true,
  data: {
    id: "06870f20-8d63-4f21-adad-78587333f359", // UUID形式のphotoID
    filename: "IMG_4933.jpeg",
    mimeType: "image/jpeg",
    fileSize: 4874397,     // 元ファイルサイズ
    blobSize: 325505,      // 処理後サイズ
    uploadedAt: "2024-01-15T10:35:00Z"
  }
}
```

**注意**: 写真は選択時に自動的に処理・保存され、UUID形式のphotoIDが生成されます。このIDは記録作成時に自動的にフォームに設定されます。

### 2. 写真の取得

#### `getPhotoById(id: string): Promise<DatabaseResult<PhotoData | null>>`

**説明**: 指定IDの写真データを取得

**レスポンス**:
```typescript
{
  success: true,
  data: {
    id: "photo-uuid",
    filename: "IMG_4933.jpeg",
    mimeType: "image/jpeg",
    fileSize: 325505,
    blobSize: 325505,
    blob: Blob,
    uploadedAt: "2024-01-15T10:35:00Z"
  }
}
```

#### `getPhotoBlob(id: string): Promise<DatabaseResult<Blob | null>>`

**説明**: 指定IDの写真Blobのみを取得

#### `getThumbnail(id: string): Promise<DatabaseResult<Blob | null>>`

**説明**: 指定IDの写真のサムネイルを取得

### 3. 写真の削除

#### `deletePhoto(id: string): Promise<DatabaseResult<boolean>>`

**説明**: 指定IDの写真を削除

## 位置情報 API

### 1. GPS位置取得

#### `getCurrentLocation(options?: GeolocationOptions): Promise<GeolocationResult>`

**説明**: 現在の位置情報を取得

**パラメータ**:
```typescript
interface GeolocationOptions {
  enableHighAccuracy: boolean; // 高精度取得
  timeout: number;             // タイムアウト（ミリ秒）
  maximumAge: number;          // キャッシュ有効期間
}
```

**レスポンス**:
```typescript
{
  success: true,
  coordinates: {
    latitude: 35.2809,
    longitude: 139.3947,
    accuracy: 10
  }
}
```

### 2. 住所変換

#### `reverseGeocode(coordinates: Coordinates): Promise<DatabaseResult<string>>`

**説明**: 座標から住所を取得（オフライン対応）

## 設定管理 API

### 1. 設定の取得・更新

#### `getSettings(): Promise<DatabaseResult<AppSettings>>`

**説明**: アプリ設定を取得

#### `updateSettings(settings: Partial<AppSettings>): Promise<DatabaseResult<AppSettings>>`

**説明**: アプリ設定を更新

**リクエスト**:
```typescript
{
  theme: "dark",
  defaultSort: "createdAt",
  imageQuality: 0.9
}
```

## データ管理 API

### 1. 統計情報

#### `getStatistics(): Promise<DatabaseResult<FishingStatistics>>`

**説明**: 釣果統計を取得

**レスポンス**:
```typescript
{
  success: true,
  data: {
    totalRecords: 150,
    uniqueSpecies: 25,
    uniqueLocations: 10,
    averageSize: 32.5,
    maxSize: 85.0,
    recordsWithPhotos: 120,
    firstRecordDate: "2023-01-01T00:00:00Z",
    lastRecordDate: "2024-01-15T10:30:00Z"
  }
}
```

### 2. 検索・フィルタリング

#### `searchRecords(query: string): Promise<DatabaseResult<FishingRecord[]>>`

**説明**: 全文検索で記録を検索

#### `filterRecords(filter: RecordFilter): Promise<DatabaseResult<FishingRecord[]>>`

**説明**: 条件でフィルタリング

**フィルター例**:
```typescript
{
  dateRange: {
    start: new Date("2024-01-01"),
    end: new Date("2024-01-31")
  },
  fishSpecies: ["マダイ", "ヒラメ"],
  sizeRange: {
    min: 30,
    max: 100
  }
}
```

## データ同期・バックアップ API

### 1. エクスポート

#### `exportData(): Promise<DatabaseResult<ExportData>>`

**説明**: 全データをエクスポート形式で取得

#### `exportAsJSON(): Promise<DatabaseResult<string>>`

**説明**: JSON文字列として全データをエクスポート

### 2. インポート

#### `importData(data: ExportData): Promise<ImportResult>`

**説明**: エクスポートデータからインポート

#### `importFromJSON(jsonString: string): Promise<ImportResult>`

**説明**: JSON文字列からインポート

### 3. データクリーンアップ

#### `cleanupOldData(daysToKeep: number): Promise<DatabaseResult<number>>`

**説明**: 古いデータを削除

#### `optimizeDatabase(): Promise<DatabaseResult<boolean>>`

**説明**: データベースの最適化

## 潮汐システム API（新規追加）

### 1. 潮汐情報取得

#### `calculateTideInfo(options: TideCalculationOptions): Promise<TideCalculationResult>`

**説明**: 指定座標・日時の潮汐情報を計算・取得

**パラメータ**:
```typescript
interface TideCalculationOptions {
  location: Coordinates;        // GPS座標
  date: Date;                  // 対象日時
  cacheEnabled?: boolean;      // キャッシュ使用（デフォルト: true）
  accuracy?: 'high' | 'medium' | 'low'; // 計算精度
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    id: "tide_35.28_139.39_2024-09-22",
    calculatedAt: "2024-09-22T10:30:00Z",
    location: { latitude: 35.2809, longitude: 139.3947 },
    date: "2024-09-22",
    astronomical: {
      moonAge: 14.2,
      moonPhase: "満月",
      sunMoonAngle: 180.5
    },
    classification: {
      tideType: "大潮",
      strength: 85,
      perigeeApogee: "normal"
    },
    events: [
      { type: "high", time: "06:24", height: 1.8 },
      { type: "low", time: "12:45", height: 0.2 },
      { type: "high", time: "18:52", height: 1.7 },
      { type: "low", time: "00:15", height: 0.3 }
    ],
    regional: {
      nearestStation: "東京湾",
      distanceKm: 15.2,
      correctionApplied: true
    }
  },
  performance: {
    calculationTime: 150,
    cacheHit: false
  }
}
```

#### `getTideContext(record: FishingRecord): Promise<DatabaseResult<TideContext>>`

**説明**: 釣果記録の潮汐コンテキストを分析

**パラメータ**: 釣果記録オブジェクト

**レスポンス**:
```typescript
{
  success: true,
  data: {
    catchTime: "14:30",
    tidePhase: "rising",
    nextEvent: {
      type: "high",
      time: "18:52",
      timeUntil: "4時間22分",
      heightDifference: 1.2
    },
    currentState: {
      phase: "上げ潮中盤",
      velocity: 0.8,
      optimalFishing: true
    }
  }
}
```

### 2. 潮汐キャッシュ管理

#### `clearTideCache(): Promise<DatabaseResult<number>>`

**説明**: 潮汐計算キャッシュをクリア

**レスポンス**: 削除されたキャッシュエントリ数

#### `getTideCacheStats(): Promise<DatabaseResult<TideCacheStats>>`

**説明**: キャッシュ使用統計を取得

**レスポンス**:
```typescript
{
  success: true,
  data: {
    totalEntries: 95,
    hitRate: 0.73,
    averageCalculationTime: 180,
    cacheSize: "2.1MB",
    oldestEntry: "2024-08-15T10:00:00Z"
  }
}
```

### 3. 地域補正データ管理

#### `getNearestTideStation(coordinates: Coordinates): Promise<DatabaseResult<TideRegionalData>>`

**説明**: 最寄りの潮汐ステーション情報を取得

#### `updateRegionalData(data: TideRegionalData[]): Promise<DatabaseResult<number>>`

**説明**: 地域補正データを更新（将来のアップデート用）

## エラーハンドリング

### エラーレスポンス形式

```typescript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "入力データが無効です",
    details: {
      field: "fishSpecies",
      reason: "魚種名は必須です"
    }
  }
}
```

### エラーコード一覧

- `VALIDATION_ERROR`: バリデーションエラー
- `STORAGE_FULL`: ストレージ容量不足
- `PERMISSION_DENIED`: 権限エラー
- `GPS_UNAVAILABLE`: GPS取得不可
- `IMAGE_PROCESSING_FAILED`: 画像処理失敗
- `DATABASE_ERROR`: データベースエラー
- `NETWORK_ERROR`: ネットワークエラー（将来のクラウド同期用）

## パフォーマンス考慮事項

### 1. 遅延読み込み
- 写真データは必要時のみ読み込み
- 一覧表示時はサムネイルのみ

### 2. キャッシュ戦略
- 最新50件の記録をメモリキャッシュ
- 写真はService Workerでキャッシュ

### 3. バッチ処理
- 複数記録の一括操作をサポート
- バックグラウンド処理での最適化

## セキュリティ

### 1. データ検証
- 全入力データのバリデーション
- 画像ファイルの形式・サイズチェック

### 2. プライバシー
- データの外部送信なし
- 位置情報は明示的許可後のみ
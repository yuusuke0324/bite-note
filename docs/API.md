# API仕様書

**Bite Note** - サービス層APIインターフェース

**バージョン**: v1.0
**最終更新**: 2025年10月30日

---

## 📋 概要

このドキュメントは、Bite Noteアプリケーションのサービス層APIインターフェースを定義します。
全てのAPIは**TypeScript**で実装され、**型安全**な設計となっています。

---

## 🎣 FishingRecordService

釣果記録のCRUD操作を提供するサービス

**ファイル**: `src/lib/fishing-record-service.ts`

### createRecord

釣果記録を新規作成

```typescript
async createRecord(
  form: CreateFishingRecordForm
): Promise<DatabaseResult<FishingRecord>>
```

**パラメータ**:
```typescript
interface CreateFishingRecordForm {
  date: Date | string;           // 釣行日時（必須）
  location: string;              // 釣り場所（必須）
  fishSpecies: string;           // 魚種（必須）
  size?: number;                 // サイズ（cm）
  weight?: number;               // 重量（g）
  weather?: string;              // 天候
  temperature?: number;          // 気温（℃）
  photoId?: string;              // 写真ID
  coordinates?: Coordinates;     // GPS座標
  notes?: string;                // メモ
  weatherData?: WeatherData;     // 詳細天気情報
  tideInfo?: TideInfo;           // 潮汐情報
}
```

**戻り値**:
```typescript
{
  success: true,
  data: FishingRecord  // 作成された記録（IDとタイムスタンプ付き）
}
// または
{
  success: false,
  error: {
    code: 'CREATE_FAILED' | 'VALIDATION_ERROR',
    message: string,
    details?: any
  }
}
```

**使用例**:
```typescript
const service = new FishingRecordService();
const result = await service.createRecord({
  date: new Date(),
  location: '東京湾',
  fishSpecies: 'シーバス',
  size: 65,
  weight: 3200
});

if (result.success) {
  console.log('記録ID:', result.data.id);
}
```

---

### getRecordById

IDで釣果記録を取得

```typescript
async getRecordById(
  id: string
): Promise<DatabaseResult<FishingRecord>>
```

**パラメータ**:
- `id`: 記録ID（UUID v4）

**戻り値**:
```typescript
{
  success: true,
  data: FishingRecord
}
// または
{
  success: false,
  error: {
    code: 'NOT_FOUND' | 'GET_FAILED',
    message: string
  }
}
```

---

### getRecords

釣果記録一覧を取得（フィルタ・ソート対応）

```typescript
async getRecords(
  params?: GetRecordsParams
): Promise<DatabaseResult<FishingRecord[]>>
```

**パラメータ**:
```typescript
interface GetRecordsParams {
  sortBy?: 'date' | 'createdAt' | 'fishSpecies' | 'location';
  sortOrder?: 'asc' | 'desc';
  filter?: RecordFilter;
  limit?: number;
  offset?: number;
}

interface RecordFilter {
  fishSpecies?: string;      // 魚種フィルタ
  location?: string;         // 場所フィルタ
  startDate?: Date;          // 開始日
  endDate?: Date;            // 終了日
  minSize?: number;          // 最小サイズ
  maxSize?: number;          // 最大サイズ
}
```

**戻り値**:
```typescript
{
  success: true,
  data: FishingRecord[]  // フィルタ・ソート済み配列
}
```

**使用例**:
```typescript
// 最新10件を取得
const result = await service.getRecords({
  sortBy: 'date',
  sortOrder: 'desc',
  limit: 10
});

// シーバスのみフィルタ
const seabassRecords = await service.getRecords({
  filter: { fishSpecies: 'シーバス' }
});
```

---

### updateRecord

既存の釣果記録を更新

```typescript
async updateRecord(
  id: string,
  updates: UpdateFishingRecordForm
): Promise<DatabaseResult<FishingRecord>>
```

**パラメータ**:
```typescript
interface UpdateFishingRecordForm {
  date?: Date | string;
  location?: string;
  fishSpecies?: string;
  size?: number;
  weight?: number;
  weather?: string;
  temperature?: number;
  photoId?: string;
  coordinates?: Coordinates;
  notes?: string;
  // 全フィールドOptional
}
```

**戻り値**: `DatabaseResult<FishingRecord>`

---

### deleteRecord

釣果記録を削除

```typescript
async deleteRecord(
  id: string
): Promise<DatabaseResult<void>>
```

**戻り値**:
```typescript
{
  success: true,
  data: void
}
```

---

### getRecordSummaries

一覧表示用の軽量データを取得

```typescript
async getRecordSummaries(
  params?: GetRecordsParams
): Promise<DatabaseResult<RecordSummary[]>>
```

**戻り値**:
```typescript
interface RecordSummary {
  id: string;
  date: Date;
  location: string;
  fishSpecies: string;
  size?: number;
  thumbnailUrl?: string;  // サムネイルURL
  hasPhoto: boolean;      // 写真の有無
}
```

---

## 📸 PhotoService

写真データの管理を提供するサービス

**ファイル**: `src/lib/photo-service.ts`

### uploadPhoto

写真をアップロード（Blob保存）

```typescript
async uploadPhoto(
  file: File,
  options?: ImageProcessingOptions
): Promise<DatabaseResult<PhotoData>>
```

**パラメータ**:
```typescript
interface ImageProcessingOptions {
  maxWidth?: number;         // 最大幅（デフォルト: 1920px）
  maxHeight?: number;        // 最大高さ（デフォルト: 1080px）
  quality?: number;          // 品質（0-1、デフォルト: 0.8）
  generateThumbnail?: boolean; // サムネイル生成（デフォルト: true）
}
```

**戻り値**:
```typescript
interface PhotoData {
  id: string;
  blob: Blob;                // 画像データ本体
  thumbnailBlob?: Blob;      // サムネイル
  filename: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
  width?: number;
  height?: number;
}
```

---

### getPhotoById

写真データを取得

```typescript
async getPhotoById(
  id: string
): Promise<DatabaseResult<PhotoData>>
```

---

### deletePhoto

写真を削除

```typescript
async deletePhoto(
  id: string
): Promise<DatabaseResult<void>>
```

---

### getPhotoUrl

BlobからURLを生成

```typescript
getPhotoUrl(photo: PhotoData): string
```

**戻り値**: `blob:` URLスキーマのURL文字列

**使用例**:
```typescript
const photo = await photoService.getPhotoById(photoId);
if (photo.success) {
  const url = photoService.getPhotoUrl(photo.data);
  // <img src={url} /> で表示可能
}
```

---

## 📊 StatisticsService

統計情報の計算を提供するサービス

**ファイル**: `src/lib/statistics-service.ts`

### getOverallStatistics

全体統計を取得

```typescript
async getOverallStatistics(): Promise<OverallStatistics>
```

**戻り値**:
```typescript
interface OverallStatistics {
  totalRecords: number;           // 総記録数
  totalSpecies: number;           // 総魚種数
  favoriteSpecies: string;        // よく釣れる魚種
  favoriteLocation: string;       // よく行く場所
  averageSize: number;            // 平均サイズ
  largestCatch: FishingRecord;    // 最大記録
  recentActivity: number;         // 最近の活動（日数）
}
```

---

### getSpeciesStatistics

魚種別統計を取得

```typescript
async getSpeciesStatistics(): Promise<SpeciesStatistics[]>
```

**戻り値**:
```typescript
interface SpeciesStatistics {
  species: string;         // 魚種名
  count: number;           // 釣果数
  averageSize: number;     // 平均サイズ
  maxSize: number;         // 最大サイズ
  percentage: number;      // 全体に占める割合（%）
}
```

---

### getLocationStatistics

場所別統計を取得

```typescript
async getLocationStatistics(): Promise<LocationStatistics[]>
```

---

### getTrendData

時系列トレンドデータを取得

```typescript
async getTrendData(
  period: 'week' | 'month' | 'year'
): Promise<TrendDataPoint[]>
```

**戻り値**:
```typescript
interface TrendDataPoint {
  date: Date;
  count: number;           // その日の釣果数
  species: string[];       // 釣れた魚種
}
```

---

## 🌊 TideCalculationService

潮汐情報の計算を提供するサービス

**ファイル**: `src/services/tide/TideCalculationService.ts`

### calculateTide

指定日時・位置の潮汐情報を計算

```typescript
async calculateTide(
  coordinates: Coordinates,
  date: Date
): Promise<TideInfo>
```

**パラメータ**:
```typescript
interface Coordinates {
  latitude: number;   // 緯度
  longitude: number;  // 経度
}
```

**戻り値**:
```typescript
interface TideInfo {
  tideType: TideType;        // 潮汐タイプ（大潮・中潮・小潮・長潮・若潮）
  currentHeight: number;     // 現在潮位（cm）
  nextHighTide: TideEvent;   // 次の満潮
  nextLowTide: TideEvent;    // 次の干潮
  tideRange: number;         // 潮位差（cm）
  moonPhase: string;         // 月齢
  calculatedAt: Date;        // 計算日時
}

interface TideEvent {
  time: Date;
  height: number;    // 潮位（cm）
  type: 'high' | 'low';
}

type TideType = '大潮' | '中潮' | '小潮' | '長潮' | '若潮';
```

**使用例**:
```typescript
const service = new TideCalculationService();
const tideInfo = await service.calculateTide(
  { latitude: 35.6895, longitude: 139.6917 },  // 東京
  new Date()
);

console.log('潮汐タイプ:', tideInfo.tideType);
console.log('次の満潮:', tideInfo.nextHighTide.time);
```

---

### getTideGraphData

グラフ表示用の潮汐データを取得

```typescript
async getTideGraphData(
  coordinates: Coordinates,
  date: Date,
  hours: number = 24
): Promise<TideGraphData>
```

**パラメータ**:
- `hours`: 取得する時間範囲（デフォルト: 24時間）

**戻り値**:
```typescript
interface TideGraphData {
  dataPoints: TideDataPoint[];  // グラフ用データポイント
  tideEvents: TideEvent[];      // 満潮・干潮イベント
  tideType: TideType;
  moonPhase: string;
}

interface TideDataPoint {
  time: Date;
  height: number;    // 潮位（cm）
}
```

---

## 🐟 FishSpeciesSearchEngine

魚種検索エンジン

**ファイル**: `src/services/fish-species/FishSpeciesSearchEngine.ts`

### search

魚種名を高速検索（オートコンプリート用）

```typescript
search(
  query: string,
  options?: FishSearchOptions
): FishSearchResult[]
```

**パラメータ**:
```typescript
interface FishSearchOptions {
  limit?: number;           // 最大結果数（デフォルト: 10）
  includeAliases?: boolean; // 別名を含むか（デフォルト: true）
  categoryFilter?: FishCategory[];  // カテゴリフィルタ
}
```

**戻り値**:
```typescript
interface FishSearchResult {
  species: FishSpecies;     // 魚種データ
  matchedText: string;      // マッチしたテキスト
  score: number;            // スコア（0-1）
}

interface FishSpecies {
  id: string;
  standardName: string;       // 標準和名
  scientificName: string;     // 学名
  aliases: string[];          // 別名
  regionalNames: string[];    // 地方名
  category: FishCategory;     // カテゴリ
  season: Season[];           // 旬の季節
  habitat: Habitat[];         // 生息地
  popularity: number;         // 人気度（0-100）
}
```

**使用例**:
```typescript
const engine = new FishSpeciesSearchEngine();
await engine.initialize();

// 「あじ」で検索
const results = engine.search('あじ', { limit: 5 });
// => [{ species: { standardName: 'マアジ', ... }, ... }]
```

---

## 📤 ExportImportService

データのエクスポート/インポートを提供するサービス

**ファイル**: `src/lib/export-import-service.ts`

### exportAllData

全データをJSONでエクスポート

```typescript
async exportAllData(): Promise<ExportData>
```

**戻り値**:
```typescript
interface ExportData {
  version: string;              // エクスポート形式バージョン
  exportedAt: Date;             // エクスポート日時
  records: FishingRecord[];     // 釣果記録
  photos: ExportPhotoData[];    // 写真データ（Base64）
  settings: AppSettings;        // アプリ設定
}

interface ExportPhotoData {
  id: string;
  data: string;            // Base64エンコード
  filename: string;
  mimeType: string;
}
```

---

### downloadAsJson

JSONファイルとしてダウンロード

```typescript
async downloadAsJson(): Promise<void>
```

**動作**: ブラウザのダウンロード機能を使ってJSONファイルを保存

**ファイル名**: `bite-note-backup-YYYYMMDD-HHMMSS.json`

---

### importFromJson

JSONファイルからインポート

```typescript
async importFromJson(
  file: File
): Promise<ImportResult>
```

**戻り値**:
```typescript
interface ImportResult {
  success: boolean;
  recordsImported: number;     // インポートされた記録数
  photosImported: number;      // インポートされた写真数
  errors: string[];            // エラーメッセージ
}
```

---

## 📍 GeolocationService

GPS位置情報の取得を提供するサービス

**ファイル**: `src/lib/geolocation-service.ts`

### getCurrentPosition

現在位置を取得

```typescript
async getCurrentPosition(
  options?: GeolocationOptions
): Promise<GeolocationResult>
```

**パラメータ**:
```typescript
interface GeolocationOptions {
  enableHighAccuracy?: boolean;  // 高精度モード
  timeout?: number;              // タイムアウト（ms）
  maximumAge?: number;           // キャッシュ有効期間（ms）
}
```

**戻り値**:
```typescript
interface GeolocationResult {
  success: boolean;
  coordinates?: Coordinates;
  error?: GeolocationError;
}

interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;    // 精度（メートル）
}
```

---

### reverseGeocode

座標から住所を取得

```typescript
async reverseGeocode(
  coordinates: Coordinates
): Promise<GeocodeResult>
```

**戻り値**:
```typescript
interface GeocodeResult {
  success: boolean;
  address?: string;      // 住所
  error?: string;
}
```

---

## ⚙️ SettingsService

アプリ設定の管理を提供するサービス

**ファイル**: `src/lib/settings-service.ts`

### getSettings

現在の設定を取得

```typescript
async getSettings(): Promise<AppSettings>
```

**戻り値**:
```typescript
interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  defaultUseGPS: boolean;
  imageQuality: number;      // 0.1 - 1.0
  maxImageSize: number;      // MB
  defaultSort: SortableField;
  notifications: boolean;
  // ... その他設定項目
}
```

---

### updateSettings

設定を更新

```typescript
async updateSettings(
  settings: Partial<AppSettings>
): Promise<void>
```

---

## 🔄 共通型定義

### DatabaseResult

全てのDB操作の戻り値型

```typescript
type DatabaseResult<T> =
  | { success: true; data: T }
  | { success: false; error: DatabaseError };

interface DatabaseError {
  code: string;
  message: string;
  details?: any;
}
```

**エラーコード一覧**:
- `CREATE_FAILED` - 作成失敗
- `UPDATE_FAILED` - 更新失敗
- `DELETE_FAILED` - 削除失敗
- `GET_FAILED` - 取得失敗
- `NOT_FOUND` - レコードが見つからない
- `VALIDATION_ERROR` - バリデーションエラー
- `PERMISSION_DENIED` - 権限エラー

---

## 📝 使用例（統合）

### 釣果記録の完全なフロー

```typescript
// 1. GPS位置取得
const geoService = new GeolocationService();
const position = await geoService.getCurrentPosition();

// 2. 住所取得
let location = '不明';
if (position.success && position.coordinates) {
  const geocode = await geoService.reverseGeocode(position.coordinates);
  if (geocode.success) {
    location = geocode.address;
  }
}

// 3. 潮汐情報取得
let tideInfo;
if (position.success && position.coordinates) {
  const tideService = new TideCalculationService();
  tideInfo = await tideService.calculateTide(
    position.coordinates,
    new Date()
  );
}

// 4. 写真アップロード
const photoService = new PhotoService();
const photoResult = await photoService.uploadPhoto(photoFile);

// 5. 釣果記録作成
const recordService = new FishingRecordService();
const result = await recordService.createRecord({
  date: new Date(),
  location,
  fishSpecies: 'シーバス',
  size: 65,
  weight: 3200,
  photoId: photoResult.success ? photoResult.data.id : undefined,
  coordinates: position.coordinates,
  tideInfo
});

if (result.success) {
  console.log('✅ 記録完了:', result.data.id);
}
```

---

## 🧪 テスト

各サービスには対応するテストファイルが存在します。

```
src/
├── lib/
│   ├── fishing-record-service.ts
│   └── __tests__/
│       └── fishing-record-service.test.ts
```

テストは**Vitest**で実行:
```bash
npm run test
```

---

**最終更新**: 2025年10月30日
**作成者**: Bite Note Development Team

// 釣果記録アプリ TypeScript型定義

// ====================
// 基本エンティティ
// ====================

/** 釣果記録のメインエンティティ */
export interface FishingRecord {
  /** 一意のID（UUID v4） */
  id: string;
  /** 釣行日時 */
  date: Date;
  /** 釣り場所（自由入力） */
  location: string;
  /** 魚の種類 */
  fishSpecies: string;
  /** 魚のサイズ（cm、任意） */
  size?: number;
  /** 写真のBlob ID（任意） */
  photoId?: string;
  /** 位置情報（GPS取得時） */
  coordinates?: Coordinates;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
  /** メモ・コメント（将来拡張用） */
  notes?: string;
  /** 潮汐情報（新規追加） */
  tideInfo?: HybridTideInfo;
  /** 釣果時刻の潮汐コンテキスト（新規追加） */
  tideContext?: TideContext;
}

/** 位置情報 */
export interface Coordinates {
  /** 緯度 */
  latitude: number;
  /** 経度 */
  longitude: number;
  /** 精度（メートル） */
  accuracy?: number;
}

/** 写真データ */
export interface PhotoData {
  /** 写真のID */
  id: string;
  /** 画像データ（Blob） */
  blob: Blob;
  /** ファイル名 */
  filename: string;
  /** MIMEタイプ */
  mimeType: string;
  /** ファイルサイズ（バイト） */
  size: number;
  /** アップロード日時 */
  uploadedAt: Date;
}

// ====================
// フォーム関連の型
// ====================

/** 釣果記録作成フォームの入力データ */
export interface CreateFishingRecordForm {
  /** 釣行日時（文字列形式） */
  date: string;
  /** 釣り場所 */
  location: string;
  /** 魚の種類 */
  fishSpecies: string;
  /** 魚のサイズ（文字列形式、任意） */
  size?: string;
  /** 写真ファイル（任意） */
  photo?: File;
  /** GPS使用フラグ */
  useGPS: boolean;
}

/** 釣果記録更新フォームの入力データ */
export interface UpdateFishingRecordForm extends Partial<CreateFishingRecordForm> {
  /** 更新対象のID */
  id: string;
}

/** フォームバリデーション結果 */
export interface FormValidationResult {
  /** バリデーション成功フラグ */
  isValid: boolean;
  /** エラーメッセージのマップ */
  errors: Record<string, string>;
}

// ====================
// API・データアクセス層
// ====================

/** データベース操作の結果 */
export interface DatabaseResult<T = unknown> {
  /** 操作成功フラグ */
  success: boolean;
  /** 結果データ */
  data?: T;
  /** エラー情報 */
  error?: DatabaseError;
}

/** データベースエラー */
export interface DatabaseError {
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
  /** 詳細情報 */
  details?: unknown;
}

/** 記録一覧の取得パラメータ */
export interface GetRecordsParams {
  /** ページサイズ */
  limit?: number;
  /** オフセット */
  offset?: number;
  /** ソート順 */
  sortBy?: 'date' | 'createdAt' | 'fishSpecies';
  /** ソート方向 */
  sortOrder?: 'asc' | 'desc';
  /** 検索フィルター */
  filter?: RecordFilter;
}

/** 記録の検索フィルター */
export interface RecordFilter {
  /** 期間フィルター */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** 魚種フィルター */
  fishSpecies?: string[];
  /** 場所フィルター */
  location?: string;
  /** サイズ範囲フィルター */
  sizeRange?: {
    min: number;
    max: number;
  };
}

// ====================
// UI状態管理
// ====================

/** アプリケーション全体の状態 */
export interface AppState {
  /** 記録リスト */
  records: FishingRecord[];
  /** 現在選択中の記録 */
  selectedRecord?: FishingRecord;
  /** ローディング状態 */
  loading: boolean;
  /** エラー状態 */
  error?: string;
  /** UIの設定 */
  settings: AppSettings;
}

/** アプリケーション設定 */
export interface AppSettings {
  /** テーマ設定 */
  theme: 'light' | 'dark' | 'auto';
  /** デフォルトソート順 */
  defaultSort: 'date' | 'createdAt';
  /** GPS使用の初期値 */
  defaultUseGPS: boolean;
  /** 画像圧縮品質（0-1） */
  imageQuality: number;
  /** 最大画像サイズ（MB） */
  maxImageSize: number;
}

/** フォーム状態 */
export interface FormState {
  /** フォームデータ */
  data: CreateFishingRecordForm;
  /** バリデーション結果 */
  validation: FormValidationResult;
  /** 送信中フラグ */
  isSubmitting: boolean;
  /** ダーティフラグ */
  isDirty: boolean;
}

// ====================
// GPS・位置情報
// ====================

/** GPS取得の設定 */
export interface GeolocationOptions {
  /** 高精度取得フラグ */
  enableHighAccuracy: boolean;
  /** タイムアウト（ミリ秒） */
  timeout: number;
  /** 最大キャッシュ時間（ミリ秒） */
  maximumAge: number;
}

/** GPS取得結果 */
export interface GeolocationResult {
  /** 取得成功フラグ */
  success: boolean;
  /** 位置情報 */
  coordinates?: Coordinates;
  /** エラー情報 */
  error?: GeolocationError;
}

/** GPS取得エラー */
export interface GeolocationError {
  /** エラーコード */
  code: number;
  /** エラーメッセージ */
  message: string;
}

// ====================
// 画像処理
// ====================

/** 画像処理の設定 */
export interface ImageProcessingOptions {
  /** 最大幅（ピクセル） */
  maxWidth: number;
  /** 最大高さ（ピクセル） */
  maxHeight: number;
  /** 圧縮品質（0-1） */
  quality: number;
  /** 出力形式 */
  format: 'image/jpeg' | 'image/webp' | 'image/png';
}

/** 画像処理結果 */
export interface ImageProcessingResult {
  /** 処理成功フラグ */
  success: boolean;
  /** 処理済み画像データ */
  blob?: Blob;
  /** エラー情報 */
  error?: string;
}

// ====================
// エクスポート・インポート
// ====================

/** エクスポートデータの形式 */
export interface ExportData {
  /** データ形式のバージョン */
  version: string;
  /** エクスポート日時 */
  exportedAt: Date;
  /** 釣果記録リスト */
  records: FishingRecord[];
  /** 写真データ（Base64エンコード） */
  photos: ExportPhotoData[];
  /** アプリ設定 */
  settings: AppSettings;
}

/** エクスポート用写真データ */
export interface ExportPhotoData {
  /** 写真ID */
  id: string;
  /** Base64エンコードされた画像データ */
  data: string;
  /** MIMEタイプ */
  mimeType: string;
  /** 元のファイル名 */
  filename: string;
}

/** インポート結果 */
export interface ImportResult {
  /** インポート成功フラグ */
  success: boolean;
  /** インポートされた記録数 */
  importedRecords: number;
  /** インポートされた写真数 */
  importedPhotos: number;
  /** スキップされたアイテム数 */
  skippedItems: number;
  /** エラー情報 */
  errors: string[];
}

// ====================
// ユーティリティ型
// ====================

/** 一覧表示用の軽量な記録データ */
export type RecordSummary = Pick<FishingRecord, 'id' | 'date' | 'location' | 'fishSpecies' | 'size'> & {
  /** サムネイル画像URL（任意） */
  thumbnailUrl?: string;
  /** 写真の有無 */
  hasPhoto: boolean;
};

/** ソート可能なフィールド */
export type SortableField = keyof Pick<FishingRecord, 'date' | 'createdAt' | 'fishSpecies' | 'size'>;

/** バリデーション可能なフィールド */
export type ValidatableField = keyof CreateFishingRecordForm;

// ====================
// 定数型
// ====================

/** 対応する画像形式 */
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type SupportedImageType = typeof SUPPORTED_IMAGE_TYPES[number];

/** アプリケーションのテーマ */
export const THEMES = ['light', 'dark', 'auto'] as const;
export type Theme = typeof THEMES[number];

/** ソート順 */
export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = typeof SORT_ORDERS[number];

// ====================
// 潮汐システム型定義（新規追加）
// ====================

/** 潮汐タイプ */
export const TIDE_TYPES = ['大潮', '中潮', '小潮', '長潮', '若潮'] as const;
export type TideType = typeof TIDE_TYPES[number];

/** 月相 */
export const MOON_PHASES = ['新月', '上弦', '満月', '下弦'] as const;
export type MoonPhase = typeof MOON_PHASES[number];

/** 統合潮汐情報 */
export interface HybridTideInfo {
  /** 基本情報 */
  id: string;
  calculatedAt: string;
  location: Coordinates;
  date: string;

  /** 天体情報 */
  astronomical: {
    moonAge: number;              // 月齢
    moonPhase: MoonPhase;         // 月相
    sunMoonAngle: number;         // 太陽-月角度
  };

  /** 潮汐分類 */
  classification: {
    tideType: TideType;           // 大潮・小潮等
    strength: number;             // 潮汐強度（0-100）
    perigeeApogee: 'perigee' | 'apogee' | 'normal';
  };

  /** 潮汐イベント */
  events: TideEvent[];

  /** 地域情報 */
  regional: {
    nearestStation: string;
    distanceKm: number;
    correctionApplied: boolean;
  };

  /** 計算メタデータ */
  metadata: {
    algorithm: 'hybrid-astronomical-v1';
    constituents: string[];
    accuracy: 'high' | 'medium' | 'low';
    confidence: number;
  };
}

/** 潮汐イベント */
export interface TideEvent {
  type: 'high' | 'low';
  time: string;
  height: number;
  description?: string;
}

/** 釣果コンテキスト */
export interface TideContext {
  /** 釣果との関係 */
  catchTime: string;
  tidePhase: 'rising' | 'falling' | 'high' | 'low' | 'slack';

  /** 次のイベント */
  nextEvent: {
    type: 'high' | 'low';
    time: string;
    timeUntil: string;
    heightDifference: number;
  };

  /** 潮汐状態 */
  currentState: {
    phase: string;                // '上げ潮中盤'等
    velocity: number;             // 潮流速度推定
    optimalFishing: boolean;      // 釣りに適した時間帯か
  };
}

/** 潮汐計算オプション */
export interface TideCalculationOptions {
  location: Coordinates;
  date: Date;
  cacheEnabled?: boolean;
  accuracy?: 'high' | 'medium' | 'low';
}

/** 潮汐計算結果 */
export interface TideCalculationResult {
  success: boolean;
  data?: HybridTideInfo;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  performance: {
    calculationTime: number;
    cacheHit: boolean;
  };
}
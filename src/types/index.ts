// 型定義のメインエクスポート

// エンティティ関連
export type {
  FishingRecord,
  Coordinates,
  PhotoData,
  RecordSummary,
} from './entities';

// フォーム関連
export type {
  CreateFishingRecordForm,
  UpdateFishingRecordForm,
  FormValidationResult,
} from './forms';

// データベース関連
export type {
  DatabaseResult,
  DatabaseError,
  GetRecordsParams,
  RecordFilter,
  SortableField,
  SortOrder,
} from './database';

// 状態管理関連
export type {
  AppState,
  AppSettings,
  FormState,
  Theme,
} from './state';

// 位置情報関連
export type {
  GeolocationOptions,
  GeolocationResult,
  GeolocationError,
} from './location';

// メディア関連
export type {
  ImageProcessingOptions,
  ImageProcessingResult,
  SupportedImageType,
} from './media';

// エクスポート関連
export type {
  ExportData,
  ExportPhotoData,
  ImportResult,
} from './export';

// メタデータ関連
export type {
  WeatherData,
  MarineData,
  MarineResult,
  CameraInfo,
  PhotoMetadata,
  AutoFillData,
  PrivacySettings,
  GeocodeResult,
  WeatherResult,
  ExifExtractionResult,
  ApiUsage,
  WeatherApiConfig,
} from './metadata';

// 魚種関連（2025年10月追加）
export type {
  FishSpecies,
  FishSpeciesJson,
  FishCategory,
  Season,
  Habitat,
  FishDataSource,
  FishSearchResult,
  FishSearchOptions,
  PrefixIndexEntry,
  FishDatabaseStats,
  SearchEngineInitOptions,
  UserSpeciesValidationRules,
  UserSpeciesValidationError,
  UserSpeciesValidationResult,
  DataAcquisitionCompliance,
  LowSpecDeviceConfig,
} from './fish-species';

// アイコン関連（2025年11月追加）
export type { IconSize, IconColor, IconCategory } from './icon';
export { ICON_SIZES, ICON_COLORS } from './icon';

// 定数のエクスポート
export { SUPPORTED_IMAGE_TYPES } from './media';
export { THEMES } from './state';
export { SORT_ORDERS } from './database';
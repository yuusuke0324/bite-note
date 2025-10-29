/**
 * 潮汐グラフ改善 TypeScript型定義
 * 座標・日時による個別計算とグラフ描画の型定義
 */

// ==========================================
// Core Entity Types
// ==========================================

/**
 * 地理的座標
 */
export interface Coordinates {
  latitude: number;   // 緯度 (-90 〜 90)
  longitude: number;  // 経度 (-180 〜 180)
}

/**
 * 潮汐計算の入力パラメータ
 */
export interface TideCalculationInput {
  coordinates: Coordinates;
  date: Date;
  options?: TideCalculationOptions;
}

/**
 * 潮汐計算オプション
 */
export interface TideCalculationOptions {
  forceRecalculation?: boolean;    // キャッシュを無視して再計算
  includeHighOrderTides?: boolean; // 高次分潮（M4,MS4）を含む
  coordinateAccuracy?: number;     // 座標精度（小数点桁数）
  seasonalVariation?: boolean;     // 季節変動を考慮
}

// ==========================================
// Tide Calculation Types
// ==========================================

/**
 * 調和定数
 */
export interface HarmonicConstant {
  name: string;      // 分潮名（M2, S2, K1, O1など）
  amplitude: number; // 振幅 (cm)
  phase: number;     // 位相 (度)
}

/**
 * 地域データ
 */
export interface RegionalData {
  regionId: string;
  name: string;
  coordinates: Coordinates;
  harmonicConstants: HarmonicConstant[];
  metadata: {
    accuracy: 'high' | 'medium' | 'low';
    dataSource: string;
    lastUpdated: Date;
  };
}

/**
 * 座標変動係数
 */
export interface CoordinateVariation {
  latitudeFactor: number;   // 緯度変動係数
  longitudeFactor: number;  // 経度変動係数
  distanceFromReference: number; // 基準点からの距離 (km)
}

/**
 * 季節変動係数
 */
export interface SeasonalVariation {
  springEquinoxAngle: number; // 春分からの角度 (ラジアン)
  latitudeAdjustment: number; // 緯度による調整係数
  monthlyVariation: {
    [key: string]: number;    // 月別変動係数 ("M2": 1.05, "S2": 0.95)
  };
}

/**
 * 潮汐計算結果
 */
export interface TideCalculationResult {
  coordinates: Coordinates;
  date: Date;
  currentLevel: number;     // 指定時刻の潮位 (cm)
  events: TideEvent[];      // 満潮・干潮イベント
  region: RegionalData;     // 使用した地域データ
  metadata: {
    calculationTime: number;     // 計算時間 (ms)
    cacheUsed: boolean;         // キャッシュ使用有無
    accuracy: number;           // 精度スコア (0-1)
    coordinateVariation: CoordinateVariation;
    seasonalVariation: SeasonalVariation;
  };
}

/**
 * 潮汐イベント（満潮・干潮）
 */
export interface TideEvent {
  time: Date;
  type: 'high' | 'low';
  level: number;            // 潮位 (cm)
  confidence: number;       // 信頼度 (0-1)
}

// ==========================================
// Graph Data Types
// ==========================================

/**
 * 潮汐グラフの1データポイント
 */
export interface TideGraphPoint {
  time: Date;
  level: number;            // 潮位 (cm)
  state: 'rising' | 'falling' | 'high' | 'low';
  isEvent: boolean;         // 満潮・干潮イベントかどうか
}

/**
 * 潮汐グラフデータ（24時間分）
 */
export interface TideGraphData {
  points: TideGraphPoint[];
  dateRange: {
    start: Date;
    end: Date;
  };
  minLevel: number;         // 最低潮位
  maxLevel: number;         // 最高潮位
  events: TideEvent[];      // 満潮・干潮イベント
  fishingMarkers?: Date[];  // 釣果記録時刻のマーカー
}

/**
 * recharts用の描画データ（簡素化）
 */
export interface TideChartData {
  time: string;             // "HH:mm" 形式
  tide: number;             // 潮位 (cm)
  isEvent?: boolean;        // イベントマーカー用
}

// ==========================================
// Scale and Rendering Types
// ==========================================

/**
 * 動的スケール情報
 */
export interface DynamicScale {
  min: number;              // Y軸最小値
  max: number;              // Y軸最大値
  interval: number;         // ティック間隔
  ticks: number[];          // ティック位置の配列
  unit: string;             // 単位（"cm"）
}

/**
 * スケール計算オプション
 */
export interface ScaleCalculationOptions {
  marginRatio?: number;           // マージン比率 (0.15 = 15%)
  preferredIntervals?: number[];  // 推奨間隔 [10, 25, 50, 100, 200]
  maxTicks?: number;             // 最大ティック数
  minTicks?: number;             // 最小ティック数
  forceZero?: boolean;           // ゼロを含むスケール強制
}

/**
 * スケール計算結果（詳細版）
 */
export interface ScaleCalculationResult extends DynamicScale {
  dataRange: {
    min: number;
    max: number;
    span: number;
  };
  margin: {
    lower: number;
    upper: number;
  };
  quality: {
    score: number;                // 品質スコア (0-1)
    tickCount: number;
    intervalType: 'fine' | 'standard' | 'coarse';
  };
}

// ==========================================
// Responsive Design Types
// ==========================================

/**
 * SVG寸法情報
 */
export interface DynamicSVGDimensions {
  containerWidth: number;
  containerHeight: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  scaleFactor: number;
}

/**
 * レスポンシブグラフ設定
 */
export interface ResponsiveGraphConfig {
  responsive: boolean;
  maxWidth: string;             // "100%"
  aspectRatio: number;          // 2.0
  breakpoints: {
    mobile: number;             // 480px
    tablet: number;             // 768px
    desktop: number;            // 1024px
  };
  preventHorizontalScroll: boolean;
}

/**
 * SVG計算オプション
 */
export interface SVGCalculationOptions {
  containerWidth: number;
  aspectRatio: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  maxWidth?: number;
}

// ==========================================
// Component Props Types
// ==========================================

/**
 * TideGraphコンポーネントのProps
 */
export interface TideGraphProps {
  data: TideGraphData;
  width?: number;
  height?: number;
  responsive?: boolean;
  config?: Partial<ResponsiveGraphConfig>;
  onDataPointHover?: (point: TideGraphPoint) => void;
  onError?: (error: TideGraphError) => void;
}

/**
 * TideIntegrationコンポーネントのProps
 */
export interface TideIntegrationProps {
  fishingRecord: FishingRecord;
  relatedRecords?: FishingRecord[];
  onCalculateTide: (coordinates: Coordinates, date: Date) => Promise<TideCalculationResult>;
  initialExpanded?: boolean;
  highContrast?: boolean;
  className?: string;
}

// ==========================================
// Error Handling Types
// ==========================================

/**
 * 潮汐グラフエラー
 */
export interface TideGraphError {
  code: 'INVALID_DATA' | 'CALCULATION_ERROR' | 'RENDERING_ERROR' | 'NETWORK_ERROR';
  message: string;
  details?: {
    coordinates?: Coordinates;
    date?: Date;
    originalError?: Error;
  };
}

/**
 * データ検証結果
 */
export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validPointCount: number;
  totalPointCount: number;
}

// ==========================================
// Cache Management Types
// ==========================================

/**
 * キャッシュエントリ
 */
export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * キャッシュ設定
 */
export interface CacheConfig {
  maxSize: number;              // 最大エントリ数
  ttl: number;                  // 生存時間 (ms)
  strategy: 'LRU' | 'FIFO';    // 削除戦略
}

// ==========================================
// Testing Types
// ==========================================

/**
 * テスト用のモックデータ生成オプション
 */
export interface MockDataOptions {
  pointCount?: number;          // データポイント数
  dateRange?: {
    start: Date;
    end: Date;
  };
  levelRange?: {
    min: number;
    max: number;
  };
  includeEvents?: boolean;      // イベントを含むか
  includeNaNValues?: boolean;   // NaN値を含むか（エラーテスト用）
}

// ==========================================
// Integration Types
// ==========================================

/**
 * 釣果記録（簡素化版）
 */
export interface FishingRecord {
  id: string;
  date: Date;
  coordinates?: Coordinates;
  species: string;
  location: string;
}

/**
 * 潮汐情報（TideCalculationResultの別名）
 */
export type TideInfo = TideCalculationResult;

// ==========================================
// Utility Types
// ==========================================

/**
 * 座標の文字列表現
 */
export type CoordinateString = `${number},${number}`;

/**
 * 時刻の文字列表現（HH:mm形式）
 */
export type TimeString = `${string}:${string}`;

/**
 * 日付の文字列表現（YYYY-MM-DD形式）
 */
export type DateString = `${number}-${number}-${number}`;

/**
 * 部分的な更新用型
 */
export type PartialUpdate<T> = Partial<T> & Pick<T, 'id'>;

/**
 * 非同期操作の状態
 */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ==========================================
// API Response Types (将来の拡張用)
// ==========================================

/**
 * API共通レスポンス
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * 潮汐計算API リクエスト
 */
export interface TideCalculationRequest {
  coordinates: Coordinates;
  date: string;                 // ISO format
  options?: TideCalculationOptions;
}

/**
 * 潮汐計算API レスポンス
 */
export type TideCalculationResponse = ApiResponse<TideCalculationResult>;

/**
 * バッチ潮汐計算リクエスト
 */
export interface BatchTideCalculationRequest {
  calculations: TideCalculationRequest[];
  priority?: 'low' | 'normal' | 'high';
}

/**
 * バッチ潮汐計算レスポンス
 */
export interface BatchTideCalculationResponse {
  results: TideCalculationResponse[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
  };
}

// ==========================================
// Constants and Enums
// ==========================================

/**
 * 分潮名の定数
 */
export const TIDAL_CONSTITUENTS = {
  M2: 'M2',    // 主太陰半日周潮
  S2: 'S2',    // 主太陽半日周潮
  K1: 'K1',    // 太陰太陽日周潮
  O1: 'O1',    // 主太陰日周潮
  M4: 'M4',    // 主太陰4分日潮
  MS4: 'MS4'   // 太陰太陽4分日潮
} as const;

/**
 * デバイス種別
 */
export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop'
} as const;

/**
 * エラーコード
 */
export const ERROR_CODES = {
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  INVALID_DATE: 'INVALID_DATE',
  NO_REGIONAL_DATA: 'NO_REGIONAL_DATA',
  CALCULATION_TIMEOUT: 'CALCULATION_TIMEOUT',
  INSUFFICIENT_SVG_SIZE: 'INSUFFICIENT_SVG_SIZE',
  INVALID_DATA_FORMAT: 'INVALID_DATA_FORMAT'
} as const;

export default {};
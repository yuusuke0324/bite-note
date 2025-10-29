/**
 * 潮汐システム 型定義
 *
 * Zero API Dependency・天体計算ベース・完全オフライン対応
 * 潮汐情報システムの包括的型定義
 */

// ==============================================
// 基本型定義
// ==============================================

// TASK-201: 拡張キャッシュシステム用の型定義

/** 精度レベル */
export type PrecisionLevel = 'high' | 'medium' | 'low';

/** 季節コンテキスト */
export type SeasonalContext = 'spring' | 'summer' | 'autumn' | 'winter';

/** 分析タイプ */
export type AnalysisType = 'coordinate' | 'seasonal' | 'both';

/** マッチング戦略 */
export type MatchingStrategy = 'exact' | 'proximity' | 'temporal' | 'variation' | 'combined';

/** マッチングタイプ */
export type MatchType = 'exact' | 'proximity' | 'temporal' | 'variation' | 'interpolated';

/** キャッシュ階層 */
export type CacheTier = 'hot' | 'warm' | 'cold';

/** 圧縮アルゴリズム */
export type CompressionAlgorithm = 'gzip' | 'lz4' | 'custom' | 'adaptive';

/** 拡張キャッシュキー */
export interface EnhancedCacheKey {
  // 基本地理情報
  location: {
    latitude: number;
    longitude: number;
    precision: PrecisionLevel;
  };

  // 日時情報
  temporal: {
    date: string; // YYYY-MM-DD
    timeRange?: {
      start: string; // HH:MM
      end: string;   // HH:MM
    };
    seasonalContext: SeasonalContext;
  };

  // 変動係数
  variation: {
    coordinateCoeff: number;    // 座標変動係数 (0.0-1.0)
    seasonalCoeff: number;      // 季節変動係数 (0.0-1.0)
    combinedEffect: number;     // 複合効果 (0.0-1.0)
  };

  // メタ情報
  metadata: {
    analysisType: AnalysisType;
    precision: number;          // キー生成精度
    version: string;            // キー形式バージョン
  };
}

/** スマートキャッシュマッチング設定 */
export interface SmartCacheStrategy {
  // 近似マッチング
  proximityMatching: {
    geoTolerance: number;       // 地理的許容範囲 (km)
    timeTolerance: number;      // 時間的許容範囲 (hours)
    variationTolerance: number; // 変動係数許容範囲
  };

  // 階層化キャッシュ
  layeredCache: {
    level1: 'exact-match';      // 完全一致 (最高速)
    level2: 'approximate';      // 近似一致 (高速)
    level3: 'interpolated';     // 補間計算 (中速)
  };

  // 予測キャッシング
  predictiveCache: {
    enabled: boolean;
    patterns: string[];         // 使用パターン学習
    preloadThreshold: number;   // 事前読み込み閾値
  };
}

/** マッチング結果 */
export interface CacheMatch {
  key: string;
  data: TideInfo;
  confidence: number;         // 信頼度 (0.0-1.0)
  matchType: MatchType;
  distance?: {
    geographic?: number;      // 地理的距離 (km)
    temporal?: number;        // 時間的距離 (hours)
    variation?: number;       // 変動係数距離
  };
}

/** マッチング検索結果 */
export interface MatchingResult {
  matches: CacheMatch[];
  strategy: MatchingStrategy;
  searchTime: number;         // 検索時間 (ms)
}

/** メモリ最適化設定 */
export interface MemoryOptimization {
  // データ圧縮
  compression: {
    algorithm: CompressionAlgorithm;
    level: number;              // 圧縮レベル (1-9)
    threshold: number;          // 圧縮開始サイズ (bytes)
  };

  // 階層メモリ管理
  tieredMemory: {
    hotCache: {
      size: number;             // 最頻繁アクセス用
      ttl: number;              // 短期TTL
    };
    warmCache: {
      size: number;             // 中頻度アクセス用
      ttl: number;              // 中期TTL
    };
    coldStorage: {
      enabled: boolean;         // IndexedDB長期保存
      ttl: number;              // 長期TTL
    };
  };

  // 重複除去
  deduplication: {
    enabled: boolean;
    similarityThreshold: number; // 類似度閾値
    referenceCompression: boolean; // 参照圧縮
  };
}

/** キャッシュデバッガー情報 */
export interface CacheDebugInfo {
  // リアルタイム統計
  realTimeStats: {
    currentHitRate: number;
    memoryPressure: number;     // メモリ圧迫度
    hotspotAnalysis: string[];  // ホットスポット分析
  };

  // 履歴分析
  historicalAnalysis: {
    hourlyStats: CacheStats[];
    trendAnalysis: string;
    recommendations: string[];
  };

  // キー分析
  keyAnalysis: {
    collisionRate: number;      // キー衝突率
    distributionMap: Record<string, number>;
    optimizationSuggestions: string[];
  };
}

/** 階層分散情報 */
export interface TierDistribution {
  hot: number;
  warm: number;
  cold: number;
  total: number;
}

/** 階層情報 */
export interface TierInfo {
  currentTier: CacheTier;
  accessCount: number;
  lastAccessed: Date;
  promotionCount: number;
  demotionCount: number;
}

/** 圧縮結果 */
export interface CompressionResult {
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
  algorithm: CompressionAlgorithm;
  compressionRatio: number;
}

/** 重複除去統計 */
export interface DeduplicationStats {
  uniqueDataBlocks: number;
  referenceCount: number;
  memoryReduction: number;
  duplicateCount: number;
  storageEfficiency: number;
}

/** 座標 */
export interface Coordinates {
  latitude: number;  // 緯度 (-90 to 90)
  longitude: number; // 経度 (-180 to 180)
}

/** 潮汐タイプ */
export type TideType =
  | 'spring'    // 大潮
  | 'neap'      // 小潮
  | 'medium'    // 中潮
  | 'young'     // 若潮
  | 'long';     // 長潮

/** 潮汐状態 */
export type TideState =
  | 'rising'    // 上げ潮
  | 'falling'   // 下げ潮
  | 'high'      // 満潮
  | 'low';      // 干潮

/** 潮汐イベント */
export interface TideEvent {
  time: Date;      // イベント時刻
  type: 'high' | 'low';  // 満潮 or 干潮
  level: number;   // 潮位 (cm)
}

// ==============================================
// 調和解析関連
// ==============================================

/** 調和定数（各分潮の振幅・位相） */
export interface HarmonicConstant {
  constituent: string;       // 分潮名 ('M2', 'S2', etc.)
  amplitude: number;         // 振幅 (cm)
  phase: number;            // 位相 (度)
}

/** 分潮係数（天体位置による補正） */
export interface ConstituentFactor {
  constituent: string;       // 分潮名
  f: number;                // 振幅補正係数
  u: number;                // 位相補正 (度)
}

/** 潮汐極値（満潮・干潮） */
export interface TidalExtreme {
  dateTime: Date;           // 発生時刻
  level: number;            // 潮位 (cm)
  type: 'high' | 'low';     // 満潮・干潮
}

/** 潮汐強度 */
export interface TideStrength {
  value: number;            // 強度スケール (0-10)
  rate: number;             // 潮位変化率 (cm/hour)
  direction: 'rising' | 'falling'; // 上げ潮・下げ潮
}

/** 分潮データ */
export interface TidalConstituent {
  name: string;             // 分潮名
  frequency: number;        // 角周波数 (degrees/hour)
  period: number;           // 周期 (hours)
  type: 'semidiurnal' | 'diurnal' | 'long_period' | 'quarter_diurnal'; // 分潮種別
}

// ==============================================
// 天体計算関連
// ==============================================

/** 月齢データ */
export interface MoonPhase {
  age: number;           // 月齢 (0-29.53)
  phase: 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous' |
         'full' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent';
  illumination: number;  // 月の照度 (0-1)
}

/** 天体位置データ */
export interface CelestialPosition {
  sun: {
    longitude: number;   // 太陽地心経度 (度)
    latitude: number;    // 太陽地心緯度 (度)
  };
  moon: {
    longitude: number;   // 月地心経度 (度)
    latitude: number;    // 月地心緯度 (度)
    distance: number;    // 地心距離 (km)
  };
}

// ==============================================
// 調和解析関連
// ==============================================

/** 分潮成分 */
export interface TidalConstituent {
  name: string;          // 分潮名 (M2, S2, K1, O1, Mf, Mm)
  amplitude: number;     // 振幅 (cm)
  phase: number;         // 位相 (度)
  frequency: number;     // 角周波数 (rad/h)
}

/** 調和解析パラメータ */
export interface HarmonicParameters {
  constituents: TidalConstituent[];  // 主要6分潮
  nodeFactor: number;               // 交点因子
  equilibriumArgument: number;      // 平衡引数
}

// ==============================================
// 地域補正関連
// ==============================================

/** 地域特性データ */
export interface RegionalData {
  id: string;            // 地域ID
  name: string;          // 地域名
  location: Coordinates; // 基準座標
  characteristics: {
    amplificationFactor: number;  // 振幅倍率
    phaseShift: number;          // 位相遅れ (分)
    shallowWaterEffect: number;   // 浅海効果
    resonanceEffect: number;      // 共鳴効果
  };
  coverageRadius: number; // 適用範囲 (km)
}

// ==============================================
// 潮汐情報・コンテキスト
// ==============================================

/** 潮汐情報 */
export interface TideInfo {
  location: Coordinates;    // 計算地点
  date: Date;              // 計算日時
  currentState: TideState; // 現在の潮汐状態
  currentLevel: number;    // 現在の潮位 (cm)
  tideType: TideType;      // 潮汐タイプ
  tideStrength: number;    // 潮汐強度 (0-100%)

  // 今日の潮汐イベント
  events: TideEvent[];     // 満潮・干潮時刻リスト

  // 次のイベント
  nextEvent: TideEvent | null;  // 次の満潮・干潮

  // 計算メタ情報
  calculatedAt: Date;      // 計算実行時刻
  regionId?: string;       // 使用した地域データID
  accuracy: 'high' | 'medium' | 'low';  // 精度レベル
}

/** 潮汐コンテキスト */
export interface TideContext {
  fishingTime: Date;       // 釣りの時刻
  tideInfo: TideInfo;      // その時の潮汐情報

  // 釣果との関係性
  relationship: {
    timeToNextTide: number;      // 次の潮汐変化まで (分)
    tidePhase: 'before_high' | 'after_high' | 'before_low' | 'after_low';
    optimalTiming: boolean;      // 釣りに適したタイミングか
    analysis: string;            // 分析コメント
  };
}

// ==============================================
// グラフ・可視化関連
// ==============================================

/** 潮汐グラフデータポイント */
export interface TideGraphPoint {
  time: Date;              // 時刻
  level: number;           // 潮位 (cm)
  state: TideState;        // 潮汐状態
  isEvent: boolean;        // 満潮・干潮イベントか
}

/** 潮汐グラフデータ */
export interface TideGraphData {
  points: TideGraphPoint[];    // データポイント配列
  dateRange: {
    start: Date;
    end: Date;
  };
  minLevel: number;           // 最低潮位
  maxLevel: number;           // 最高潮位
  events: TideEvent[];        // 満潮・干潮イベント
  fishingMarkers?: Date[];    // 釣果時刻マーカー
}

// ==============================================
// キャッシュ関連
// ==============================================

/** キャッシュキー */
export interface CacheKey {
  latitude: number;    // 小数点2桁丸め
  longitude: number;   // 小数点2桁丸め
  date: string;        // YYYY-MM-DD形式
}

/** キャッシュエントリ */
export interface CacheEntry {
  key: CacheKey;
  data: TideInfo;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

/** キャッシュ統計 */
export interface CacheStats {
  totalEntries: number;    // 総エントリ数
  hitCount: number;        // ヒット数
  missCount: number;       // ミス数
  hitRate: number;         // ヒット率 (0-1)
  memoryUsage: number;     // メモリ使用量 (bytes)
}

// ==============================================
// データベース関連
// ==============================================

/** 潮汐キャッシュテーブル */
export interface TideCacheRecord {
  id?: number;             // 自動採番ID
  cacheKey: string;        // キャッシュキー (JSON文字列)
  tideData: string;        // 潮汐データ (JSON文字列)
  createdAt: Date;         // 作成日時
  expiresAt: Date;         // 有効期限
  accessCount: number;     // アクセス回数
  lastAccessed: Date;      // 最終アクセス
}

/** 地域データテーブル */
export interface RegionalDataRecord {
  id?: number;             // 自動採番ID
  regionId: string;        // 地域ID
  name: string;            // 地域名
  regionName: string;      // 地域名（別名）
  latitude: number;        // 緯度
  longitude: number;       // 経度
  characteristics: string; // 地域特性 (JSON文字列)
  coverageRadius: number;  // 適用範囲
  isActive: boolean;       // 有効フラグ
  createdAt: Date;         // 作成日時
  updatedAt: Date;         // 更新日時

  // 地域補正システム用の追加属性
  dataQuality: 'high' | 'medium' | 'low'; // データ品質

  // 分潮別補正係数
  m2Amplitude: number;     // M2振幅
  m2Phase: number;         // M2位相
  s2Amplitude: number;     // S2振幅
  s2Phase: number;         // S2位相
  k1Amplitude: number;     // K1振幅
  k1Phase: number;         // K1位相
  o1Amplitude: number;     // O1振幅
  o1Phase: number;         // O1位相

  // 地形情報
  depth?: number;          // 水深 (m)
  bayLength?: number;      // 湾の長さ (km)
  regionType?: string;     // 地域タイプ ('bay', 'strait', 'open_sea')
  distanceFromOcean?: number; // 外洋からの距離 (km)
}

// ==============================================
// API・サービス関連
// ==============================================

/** 潮汐計算オプション */
export interface TideCalculationOptions {
  includeGraphData?: boolean;      // グラフデータ生成
  timeRange?: number;              // 計算時間範囲 (時間)
  useCache?: boolean;              // キャッシュ使用
  forceRecalculation?: boolean;    // 強制再計算
  accuracy?: 'high' | 'medium' | 'low';  // 精度レベル
}

/** 潮汐計算結果 */
export interface TideCalculationResult {
  tideInfo: TideInfo;              // 潮汐情報
  graphData?: TideGraphData;       // グラフデータ (オプション)
  performance: {
    calculationTime: number;       // 計算時間 (ms)
    cacheHit: boolean;            // キャッシュヒット
    memoryUsage: number;          // メモリ使用量 (bytes)
  };
  warnings?: string[];            // 警告メッセージ
}

/** エラー情報 */
export interface TideError {
  code: 'INVALID_COORDINATES' | 'CALCULATION_FAILED' | 'CACHE_ERROR' | 'REGIONAL_DATA_NOT_FOUND';
  message: string;
  details?: any;
  timestamp: Date;
}

// ==============================================
// FishingRecord拡張
// ==============================================

/** 釣果記録への潮汐情報追加 */
export interface FishingRecordTideExtension {
  tideInfo?: TideInfo;             // 潮汐情報
  tideContext?: TideContext;       // 潮汐コンテキスト
}

// ==============================================
// UI関連
// ==============================================

/** 潮汐グラフ設定 */
export interface TideGraphConfig {
  width: number;                   // グラフ幅
  height: number;                  // グラフ高さ
  showGrid: boolean;               // グリッド表示
  showEvents: boolean;             // イベント表示
  showFishingMarkers: boolean;     // 釣果マーカー表示
  timeRange: 24 | 48;             // 時間範囲 (時間)
  animationDuration: number;       // アニメーション時間 (ms)
  colorScheme: 'light' | 'dark';   // カラーテーマ
}

/** 潮汐サマリーカード設定 */
export interface TideSummaryConfig {
  showTideType: boolean;           // 潮汐タイプ表示
  showTideState: boolean;          // 潮汐状態表示
  showNextEvent: boolean;          // 次のイベント表示
  showTideStrength: boolean;       // 潮汐強度表示
  compactMode: boolean;           // コンパクト表示
}

// ==============================================
// ユーティリティ型
// ==============================================

/** 日付範囲 */
export interface DateRange {
  start: Date;
  end: Date;
}

/** 数値範囲 */
export interface NumberRange {
  min: number;
  max: number;
}

/** 分単位の時刻 */
export type MinutesOfDay = number; // 0-1439 (0:00-23:59)

/** ローディング状態 */
export interface LoadingState {
  isLoading: boolean;
  progress?: number;    // 0-100
  message?: string;
  error?: TideError;
}
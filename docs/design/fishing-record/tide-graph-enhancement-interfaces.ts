/**
 * 潮汐グラフ改善のための型定義拡張
 *
 * 既存の tide.ts インターフェースに追加する型定義
 */

// ===== 座標・季節変動係数関連 =====

/** 座標変動係数 */
export interface CoordinateVariation {
  latitudeFactor: number;   // 緯度による変動係数 (基準値: 35度)
  longitudeFactor: number;  // 経度による変動係数 (基準値: 135度)
  distanceFromReference: number; // 基準点からの距離 (km)
}

/** 季節変動係数 */
export interface SeasonalVariation {
  m2Factor: number;      // M2分潮の季節変動係数
  s2Factor: number;      // S2分潮の季節変動係数
  k1Factor: number;      // K1分潮の季節変動係数
  o1Factor: number;      // O1分潮の季節変動係数
  seasonalAngle: number; // 季節角度 (度, 春分を0度として)
  dayOfYear: number;     // 年内通算日
  latitudeEffect: number; // 緯度による季節変動の強度
}

/** 拡張された調和定数（変動係数適用済み） */
export interface EnhancedHarmonicConstant extends HarmonicConstant {
  coordinateAdjustment: number; // 座標による調整値
  seasonalAdjustment: number;   // 季節による調整値
  originalAmplitude: number;    // 調整前の振幅
  originalPhase: number;        // 調整前の位相
}

// ===== レスポンシブグラフ関連 =====

/** レスポンシブグラフ設定 */
export interface ResponsiveGraphConfig {
  responsive: boolean;      // レスポンシブ対応ON/OFF
  maxWidth: string;         // 最大幅 (CSS値)
  aspectRatio: number;      // アスペクト比
  breakpoints: {           // ブレークポイント
    mobile: number;        // モバイル境界 (px)
    tablet: number;        // タブレット境界 (px)
    desktop: number;       // デスクトップ境界 (px)
  };
  preventHorizontalScroll: boolean; // 横スクロール防止
}

/** 動的SVG設定 */
export interface DynamicSVGConfig {
  viewBox: {
    width: number;
    height: number;
    minWidth: number;
    maxWidth: number;
  };
  scaling: {
    xScale: number;        // X軸スケール係数
    yScale: number;        // Y軸スケール係数
    fontScale: number;     // フォントスケール係数
  };
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

/** 画面情報 */
export interface ScreenInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
  isPortrait: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

// ===== 拡張された潮汐情報 =====

/** 拡張潮汐情報（変動係数含む） */
export interface EnhancedTideInfo extends TideInfo {
  coordinateVariation: CoordinateVariation;
  seasonalVariation: SeasonalVariation;
  enhancedHarmonics: EnhancedHarmonicConstant[];
  calculationMetadata: {
    baseRegionId: string;           // 基準地域ID
    coordinateAdjustmentApplied: boolean; // 座標調整適用済み
    seasonalAdjustmentApplied: boolean;   // 季節調整適用済み
    k1O1Generated: boolean;         // K1・O1分潮生成済み
    uniqueHash: string;             // 計算パラメータのハッシュ値
  };
}

/** 拡張グラフデータ（レスポンシブ対応） */
export interface EnhancedTideGraphData extends TideGraphData {
  responsiveConfig: ResponsiveGraphConfig;
  svgConfig: DynamicSVGConfig;
  screenInfo: ScreenInfo;
  renderMetadata: {
    calculatedAt: Date;
    renderTime: number;        // レンダリング時間 (ms)
    cacheUsed: boolean;        // キャッシュ使用フラグ
    uniquePattern: boolean;    // 固有パターンフラグ
  };
}

// ===== キャッシュ拡張 =====

/** 拡張キャッシュキー */
export interface EnhancedCacheKey extends CacheKey {
  coordinateHash: string;    // 座標のハッシュ値
  seasonalHash: string;      // 季節パラメータのハッシュ値
  variationVersion: string;  // 変動係数のバージョン
}

/** 拡張キャッシュエントリ */
export interface EnhancedCacheEntry extends CacheEntry {
  key: EnhancedCacheKey;
  data: EnhancedTideInfo;
  coordinateVariation: CoordinateVariation;
  seasonalVariation: SeasonalVariation;
  uniquePatternHash: string; // 固有パターンのハッシュ値
}

// ===== 計算エンジン拡張 =====

/** 変動係数計算オプション */
export interface VariationCalculationOptions {
  coordinateVariation: {
    enabled: boolean;
    latitudeReference: number;  // 緯度基準値 (デフォルト: 35)
    longitudeReference: number; // 経度基準値 (デフォルト: 135)
    latitudeCoefficient: number; // 緯度係数 (デフォルト: 0.02)
    longitudeCoefficient: number; // 経度係数 (デフォルト: 0.01)
  };
  seasonalVariation: {
    enabled: boolean;
    springEquinoxDay: number;   // 春分の日 (デフォルト: 80 = 3/21頃)
    m2Amplitude: number;        // M2変動幅 (デフォルト: 0.15)
    s2Amplitude: number;        // S2変動幅 (デフォルト: 0.20)
    k1Amplitude: number;        // K1変動幅 (デフォルト: 0.25)
    o1Amplitude: number;        // O1変動幅 (デフォルト: 0.18)
  };
}

/** 潮汐計算結果（拡張版） */
export interface EnhancedTideCalculationResult extends TideCalculationResult {
  tideInfo: EnhancedTideInfo;
  graphData?: EnhancedTideGraphData;
  variationMetrics: {
    coordinateUniqueness: number;  // 座標固有性スコア (0-1)
    seasonalUniqueness: number;    // 季節固有性スコア (0-1)
    overallUniqueness: number;     // 全体固有性スコア (0-1)
    patternDiversity: number;      // パターン多様性スコア (0-1)
  };
  performance: {
    calculationTime: number;
    cacheHit: boolean;
    memoryUsage: number;
    variationCalculationTime: number; // 変動係数計算時間
    graphRenderTime: number;          // グラフレンダリング時間
  };
}

// ===== UI コンポーネント props 拡張 =====

/** 拡張TideGraphコンポーネントProps */
export interface EnhancedTideGraphProps {
  // 既存props
  tideInfo: EnhancedTideInfo;
  fishingRecord: FishingRecord;

  // 新規props
  responsiveConfig?: Partial<ResponsiveGraphConfig>;
  showVariationIndicator?: boolean;  // 変動係数表示
  showUniquenessScore?: boolean;     // 固有性スコア表示
  enableAnimation?: boolean;         // アニメーション有効化
  debugMode?: boolean;               // デバッグ情報表示

  // イベントハンドラー
  onVariationCalculated?: (variation: CoordinateVariation & SeasonalVariation) => void;
  onGraphResize?: (screenInfo: ScreenInfo) => void;
  onPatternGenerated?: (uniqueness: number) => void;
}

/** レスポンシブ制御用Props */
export interface ResponsiveControlProps {
  screenInfo: ScreenInfo;
  onScreenChange: (info: ScreenInfo) => void;
  preventHorizontalScroll: boolean;
  adaptToContainer: boolean;
}

// ===== 型ガード関数 =====

/** EnhancedTideInfoの型ガード */
export function isEnhancedTideInfo(tideInfo: any): tideInfo is EnhancedTideInfo {
  return (
    tideInfo &&
    typeof tideInfo === 'object' &&
    'coordinateVariation' in tideInfo &&
    'seasonalVariation' in tideInfo &&
    'enhancedHarmonics' in tideInfo &&
    'calculationMetadata' in tideInfo
  );
}

/** ResponsiveGraphConfigの型ガード */
export function isResponsiveGraphConfig(config: any): config is ResponsiveGraphConfig {
  return (
    config &&
    typeof config === 'object' &&
    typeof config.responsive === 'boolean' &&
    'breakpoints' in config &&
    typeof config.preventHorizontalScroll === 'boolean'
  );
}

// ===== ユーティリティ型 =====

/** 座標の精度レベル */
export type CoordinatePrecision = 'high' | 'medium' | 'low';

/** グラフの複雑度レベル */
export type GraphComplexity = 'simple' | 'detailed' | 'comprehensive';

/** レンダリング品質 */
export type RenderQuality = 'fast' | 'balanced' | 'high';

/** 変動係数の適用レベル */
export type VariationLevel = 'none' | 'coordinate' | 'seasonal' | 'full';

// ===== 定数 =====

/** デフォルトレスポンシブ設定 */
export const DEFAULT_RESPONSIVE_CONFIG: ResponsiveGraphConfig = {
  responsive: true,
  maxWidth: '100%',
  aspectRatio: 16 / 9,
  breakpoints: {
    mobile: 480,
    tablet: 768,
    desktop: 1024
  },
  preventHorizontalScroll: true
};

/** デフォルト変動計算オプション */
export const DEFAULT_VARIATION_OPTIONS: VariationCalculationOptions = {
  coordinateVariation: {
    enabled: true,
    latitudeReference: 35,
    longitudeReference: 135,
    latitudeCoefficient: 0.02,
    longitudeCoefficient: 0.01
  },
  seasonalVariation: {
    enabled: true,
    springEquinoxDay: 80,
    m2Amplitude: 0.15,
    s2Amplitude: 0.20,
    k1Amplitude: 0.25,
    o1Amplitude: 0.18
  }
};

// ===== エラー型 =====

/** 潮汐グラフ改善関連のエラー */
export interface TideGraphEnhancementError extends TideError {
  code: 'VARIATION_CALCULATION_FAILED' | 'RESPONSIVE_RENDER_FAILED' | 'PATTERN_GENERATION_FAILED' | 'CACHE_ENHANCEMENT_FAILED';
  context: {
    coordinates?: { latitude: number; longitude: number };
    date?: Date;
    variationOptions?: Partial<VariationCalculationOptions>;
    responsiveConfig?: Partial<ResponsiveGraphConfig>;
  };
}
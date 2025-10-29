/**
 * レスポンシブユーティリティ型定義
 * TASK-001: レスポンシブユーティリティ実装
 */

// ==========================================
// Core Types
// ==========================================

/**
 * デバイス種別
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * 画面向き
 */
export type Orientation = 'portrait' | 'landscape';

/**
 * ビューポート情報
 */
export interface ViewportInfo {
  width: number;
  height: number;
  deviceType: DeviceType;
  orientation: Orientation;
  pixelRatio: number;
}

/**
 * チャートマージン
 */
export interface ChartMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * SVGサイズ計算結果
 */
export interface SVGSizeCalculation {
  containerWidth: number;
  containerHeight: number;
  chartWidth: number;
  chartHeight: number;
  margins: ChartMargins;
  scaleFactor: number;
  isMinimumSize: boolean;
}

// ==========================================
// Configuration Types
// ==========================================

/**
 * レスポンシブ設定
 */
export interface ResponsiveSettings {
  breakpoints: {
    mobile: number;
    tablet: number;
  };
  minSizes: {
    width: number;
    height: number;
  };
  aspectRatio: number;
  marginRatios: {
    mobile: ChartMargins;
    tablet: ChartMargins;
    desktop: ChartMargins;
  };
}

/**
 * マージン計算オプション
 */
export interface MarginCalculationOptions {
  minBottomMargin?: number;
  minLeftMargin?: number;
  fontSize?: number;
  fontFamily?: string;
  showAxisLabels?: boolean;
  showAxisTitles?: boolean;
}

// ==========================================
// Interface Definitions
// ==========================================

/**
 * ビューポート検出インターフェース
 */
export interface IViewportDetector {
  getCurrentViewport(): ViewportInfo;
  onViewportChange(callback: (viewport: ViewportInfo) => void): () => void;
}

/**
 * SVGサイズ計算インターフェース
 */
export interface ISVGSizeCalculator {
  calculateSize(
    viewport: ViewportInfo,
    containerElement?: HTMLElement
  ): SVGSizeCalculation;
}

/**
 * マージン計算インターフェース
 */
export interface IMarginCalculator {
  calculateMargins(
    svgSize: { width: number; height: number },
    deviceType: DeviceType,
    options?: MarginCalculationOptions
  ): ChartMargins;
}

// ==========================================
// Default Settings
// ==========================================

/**
 * デフォルトレスポンシブ設定
 */
export const DEFAULT_RESPONSIVE_SETTINGS: ResponsiveSettings = {
  breakpoints: {
    mobile: 768,
    tablet: 1024
  },
  minSizes: {
    width: 600,
    height: 300
  },
  aspectRatio: 2.0,
  marginRatios: {
    mobile: { top: 15, right: 15, bottom: 35, left: 50 },
    tablet: { top: 20, right: 20, bottom: 40, left: 60 },
    desktop: { top: 25, right: 25, bottom: 45, left: 70 }
  }
};

/**
 * デフォルトマージン計算オプション
 */
export const DEFAULT_MARGIN_OPTIONS: MarginCalculationOptions = {
  minBottomMargin: 40,
  minLeftMargin: 60,
  fontSize: 12,
  fontFamily: 'system-ui, sans-serif',
  showAxisLabels: true,
  showAxisTitles: false
};

// ==========================================
// Constants
// ==========================================

/**
 * ビューポート境界値
 */
export const VIEWPORT_BREAKPOINTS = {
  MOBILE_MAX: 767,
  TABLET_MIN: 768,
  TABLET_MAX: 1023,
  DESKTOP_MIN: 1024
} as const;

/**
 * サイズ制約
 */
export const SIZE_CONSTRAINTS = {
  MIN_WIDTH: 600,
  MIN_HEIGHT: 300,
  MAX_VIEWPORT_RATIO: 0.9,
  MIN_CHART_WIDTH: 200,
  MIN_CHART_HEIGHT: 150
} as const;

/**
 * マージン制約
 */
export const MARGIN_CONSTRAINTS = {
  MIN_BOTTOM: 40,  // X軸ラベル用
  MIN_LEFT: 60,    // Y軸ラベル用
  MIN_TOP: 10,
  MIN_RIGHT: 10,
  MAX_RATIO: 0.4   // SVGサイズの40%まで
} as const;
/**
 * TideChart 型定義
 * TASK-202: TideChart メインコンポーネント実装
 */

import type React from 'react';
import type {
  LineChart,
  XAxis,
  YAxis,
  Line,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import type { FishingMarkerData, MarkerGroupingConfig } from './markers/types';

/**
 * 潮汐データポイント
 */
export interface TideChartData {
  time: string; // "HH:mm" 形式
  tide: number; // 潮位 (cm)
  type?: 'high' | 'low' | 'normal'; // 潮汐タイプ（満潮・干潮・通常） ※現在は天気APIから提供されないためundefined
}

/**
 * Recharts コンポーネント型定義（依存性注入用）
 * Note: Rechartsの型はPropsを直接エクスポートしていないため、コンポーネント型を使用
 */
export interface ChartComponents {
  LineChart: typeof LineChart;
  XAxis: typeof XAxis;
  YAxis: typeof YAxis;
  Line: typeof Line;
  Tooltip: typeof Tooltip;
  ReferenceLine: typeof ReferenceLine;
  ReferenceDot: typeof ReferenceDot;
}

/**
 * Recharts Tooltip のカスタムprops型
 */
export interface TideTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    payload: TideChartData;
  }>;
  label?: string;
}

/**
 * DataPoint コンポーネントのprops型
 */
export interface DataPointProps {
  cx?: number;
  cy?: number;
  payload?: TideChartData;
  index?: number;
  onClick?: (data: TideChartData, index: number) => void;
  focused?: boolean;
  selected?: boolean;
  theme?: HighContrastTheme;
}

/**
 * ハイコントラストテーマ型
 */
export interface HighContrastTheme {
  background: string;
  foreground: string;
  accent: string;
  focus: string;
  error: string;
  contrastRatios?: {
    foregroundBg: number;
    accentBg: number;
    focusBg: number;
    errorBg: number;
  };
}

/**
 * Recharts Line dot props型（dot renderに渡されるprops）
 */
export interface LineDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: TideChartData;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
}

/**
 * TideChart コンポーネントProps
 */
export interface TideChartProps {
  data: TideChartData[];
  width?: number;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  onDataPointClick?: (data: TideChartData, index: number) => void;
  className?: string;
  style?: React.CSSProperties;

  /**
   * Fishing marker data (new format with Glassmorphism stacked markers)
   * Issue #273: TideChart fishing marker enhancement
   */
  fishingData?: FishingMarkerData[];

  /**
   * @deprecated Use fishingData instead. Kept for backward compatibility.
   * Legacy fishing times array ("HH:mm" format)
   */
  fishingTimes?: string[];

  /**
   * Configuration for marker grouping
   * Issue #273: TideChart fishing marker enhancement
   */
  markerGroupingConfig?: Partial<MarkerGroupingConfig>;

  /**
   * Callback when a fishing record marker is clicked
   * Issue #273: TideChart fishing marker enhancement
   */
  onFishingRecordClick?: (record: FishingMarkerData) => void;

  /**
   * Whether to use Glassmorphism stacked markers (default: true when fishingData is provided)
   * Set to false to use legacy emoji markers
   * Issue #273: TideChart fishing marker enhancement
   */
  useStackedMarkers?: boolean;

  // Accessibility Props (TASK-302)
  theme?:
    | 'light'
    | 'dark'
    | 'light-high-contrast'
    | 'dark-high-contrast'
    | 'accessibility-high-contrast';
  ariaEnabled?: boolean;
  screenReaderAvailable?: boolean;
  keyboardNavigationEnabled?: boolean;
  focusManagementEnabled?: boolean;
  enableFallback?: boolean;
  showKeyboardShortcuts?: boolean;
  autoDetectionFailed?: boolean;
  colorMode?: 'normal' | 'monochrome';
  responsive?: boolean;
  enablePerformanceMonitoring?: boolean;

  /**
   * チャートコンポーネント（テスト時のモック注入用）
   * @internal
   */
  chartComponents?: ChartComponents;
}

/**
 * チャートエラー種別
 */
export const TideChartError = {
  CHART_RENDERING_FAILED: 'CHART_RENDERING_FAILED',
  SVG_CREATION_FAILED: 'SVG_CREATION_FAILED',
  AXIS_RENDER_FAILED: 'AXIS_RENDER_FAILED',
  DATA_PROCESSING_FAILED: 'DATA_PROCESSING_FAILED',
} as const;

export type TideChartError = typeof TideChartError[keyof typeof TideChartError];

/**
 * チャート設定オプション
 */
export interface TideChartConfig {
  lineColor: string;
  lineWidth: number;
  gridColor: string;
  backgroundColor: string;
  axisColor: string;
  fontSize: number;
}

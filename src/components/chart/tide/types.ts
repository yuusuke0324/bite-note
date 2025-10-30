/**
 * TideChart 型定義
 * TASK-202: TideChart メインコンポーネント実装
 */

/**
 * 潮汐データポイント
 */
export interface TideChartData {
  time: string; // "HH:mm" 形式
  tide: number; // 潮位 (cm)
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
  fishingTimes?: string[]; // "HH:mm" 形式の釣果時刻配列

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

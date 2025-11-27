/**
 * TideChart モジュール エクスポート
 * TASK-202: TideChart メインコンポーネント実装
 * Issue #273: Glassmorphism Stacked Markers
 */

export { TideChart } from './TideChart';
export type { TideChartProps, TideChartData, TideChartConfig } from './types';
export { TideChartError } from './types';

// Marker components and types (Issue #273)
export {
  StackedMarkerCard,
  StackedMarkerOverlay,
  MarkerList,
  useMarkerGrouping,
  DEFAULT_MARKER_GROUPING_CONFIG,
} from './markers';
export type {
  FishingMarkerData,
  MarkerGroup,
  MarkerGroupingConfig,
  StackedMarkerCardProps,
  StackedMarkerOverlayProps,
  MarkerListProps,
} from './markers';

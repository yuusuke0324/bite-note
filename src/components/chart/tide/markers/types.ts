/**
 * markers/types.ts - Glassmorphism Stacked Marker Types
 * Issue #273: TideChart fishing marker enhancement
 */

/**
 * Fishing record data for marker display
 */
export interface FishingMarkerData {
  /** Unique identifier for the fishing record */
  id: string;
  /** Time of catch in "HH:mm" format */
  time: string;
  /** Fish species name */
  species?: string;
  /** Fish size in cm */
  size?: number;
  /** Additional notes */
  notes?: string;
}

/**
 * Grouped markers by time proximity
 */
export interface MarkerGroup {
  /** Representative time for the group (earliest in group) */
  time: string;
  /** X coordinate position on chart (calculated later) */
  x?: number;
  /** Y coordinate position on chart (calculated later) */
  y?: number;
  /** Individual fishing records in this group */
  records: FishingMarkerData[];
  /** Whether this group is currently expanded */
  isExpanded?: boolean;
}

/**
 * Configuration for marker grouping algorithm
 */
export interface MarkerGroupingConfig {
  /** Time proximity threshold in minutes (default: 5) */
  proximityThresholdMinutes: number;
  /** Maximum records per group before showing "+N more" */
  maxVisibleRecords: number;
}

/**
 * State for marker interactions
 */
export interface MarkerState {
  /** Currently focused group index (-1 if none) */
  focusedGroupIndex: number;
  /** Currently expanded group index (-1 if none) */
  expandedGroupIndex: number;
  /** Whether keyboard navigation is active */
  isKeyboardNavActive: boolean;
}

/**
 * Props for useMarkerGrouping hook
 */
export interface UseMarkerGroupingProps {
  /** Raw fishing marker data */
  fishingData: FishingMarkerData[];
  /** Grouping configuration */
  config?: Partial<MarkerGroupingConfig>;
}

/**
 * Return value from useMarkerGrouping hook
 */
export interface UseMarkerGroupingReturn {
  /** Grouped marker data */
  groups: MarkerGroup[];
  /** Total number of records */
  totalRecords: number;
  /** Number of groups */
  groupCount: number;
  /** Update grouping config */
  updateConfig: (newConfig: Partial<MarkerGroupingConfig>) => void;
}

/**
 * Default configuration values
 */
export const DEFAULT_MARKER_GROUPING_CONFIG: MarkerGroupingConfig = {
  proximityThresholdMinutes: 5,
  maxVisibleRecords: 3,
};

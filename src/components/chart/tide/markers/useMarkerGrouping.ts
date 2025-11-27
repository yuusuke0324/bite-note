/**
 * useMarkerGrouping.ts - Hook for grouping fishing markers by time proximity
 * Issue #273: TideChart fishing marker enhancement
 *
 * Algorithm: O(n log n) - Sort by time, then linear scan for grouping
 */

import { useMemo, useState, useCallback } from 'react';
import type {
  FishingMarkerData,
  MarkerGroup,
  MarkerGroupingConfig,
  UseMarkerGroupingProps,
  UseMarkerGroupingReturn,
} from './types';
import { DEFAULT_MARKER_GROUPING_CONFIG } from './types';

/**
 * Parse time string "HH:mm" to minutes from midnight
 * @param time - Time string in "HH:mm" format
 * @returns Minutes from midnight (0-1439)
 */
export function parseTimeToMinutes(time: string): number {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return -1; // Invalid format
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return -1; // Invalid values
  }

  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight back to "HH:mm" format
 * @param minutes - Minutes from midnight
 * @returns Time string in "HH:mm" format
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Group fishing markers by time proximity
 *
 * Algorithm complexity: O(n log n) for sorting + O(n) for grouping = O(n log n)
 *
 * @param records - Array of fishing marker data
 * @param thresholdMinutes - Time proximity threshold for grouping
 * @returns Array of marker groups
 */
export function groupMarkersByTime(
  records: FishingMarkerData[],
  thresholdMinutes: number
): MarkerGroup[] {
  if (records.length === 0) {
    return [];
  }

  // Filter out records with invalid time format
  const validRecords = records.filter((r) => parseTimeToMinutes(r.time) >= 0);

  if (validRecords.length === 0) {
    return [];
  }

  // Sort by time (O(n log n))
  const sortedRecords = [...validRecords].sort((a, b) => {
    const timeA = parseTimeToMinutes(a.time);
    const timeB = parseTimeToMinutes(b.time);
    return timeA - timeB;
  });

  // Group by proximity (O(n))
  const groups: MarkerGroup[] = [];
  let currentGroup: MarkerGroup | null = null;

  for (const record of sortedRecords) {
    const recordMinutes = parseTimeToMinutes(record.time);

    if (currentGroup === null) {
      // Start first group
      currentGroup = {
        time: record.time,
        records: [record],
        isExpanded: false,
      };
    } else {
      const groupMinutes = parseTimeToMinutes(currentGroup.time);
      const diff = recordMinutes - groupMinutes;

      if (diff <= thresholdMinutes) {
        // Add to current group
        currentGroup.records.push(record);
      } else {
        // Save current group and start new one
        groups.push(currentGroup);
        currentGroup = {
          time: record.time,
          records: [record],
          isExpanded: false,
        };
      }
    }
  }

  // Don't forget the last group
  if (currentGroup !== null) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Hook for managing marker grouping state and logic
 *
 * @param props - Hook configuration
 * @returns Grouped markers and management functions
 */
export function useMarkerGrouping({
  fishingData,
  config: initialConfig,
}: UseMarkerGroupingProps): UseMarkerGroupingReturn {
  // Merge with default config
  const [config, setConfig] = useState<MarkerGroupingConfig>({
    ...DEFAULT_MARKER_GROUPING_CONFIG,
    ...initialConfig,
  });

  // Memoize grouped data (recalculate only when data or threshold changes)
  const groups = useMemo(() => {
    return groupMarkersByTime(fishingData, config.proximityThresholdMinutes);
  }, [fishingData, config.proximityThresholdMinutes]);

  // Calculate totals
  const totalRecords = useMemo(() => {
    return groups.reduce((sum, group) => sum + group.records.length, 0);
  }, [groups]);

  const groupCount = groups.length;

  // Config update function
  const updateConfig = useCallback(
    (newConfig: Partial<MarkerGroupingConfig>) => {
      setConfig((prev) => ({ ...prev, ...newConfig }));
    },
    []
  );

  return {
    groups,
    totalRecords,
    groupCount,
    updateConfig,
  };
}

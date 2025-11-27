/**
 * StackedMarkerOverlay.tsx - Container for rendering stacked markers on chart
 * Issue #273: TideChart fishing marker enhancement
 *
 * This component manages the rendering of multiple StackedMarkerCard components
 * as an overlay on top of the TideChart SVG.
 *
 * Performance Optimizations:
 * - Intersection Observer for markers outside viewport (50+ markers)
 * - useMemo for position calculations
 * - useCallback for event handlers
 * - will-change hint for GPU acceleration
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { StackedMarkerCard } from './StackedMarkerCard';
import { useMarkerGrouping } from './useMarkerGrouping';
import type {
  FishingMarkerData,
  MarkerGroup,
  MarkerGroupingConfig,
} from './types';

// Threshold for enabling Intersection Observer virtualization
const VIRTUALIZATION_THRESHOLD = 50;

/**
 * Props for StackedMarkerOverlay component
 */
export interface StackedMarkerOverlayProps {
  /** Raw fishing data */
  fishingData: FishingMarkerData[];
  /** Chart data for coordinate mapping */
  chartData: Array<{ time: string; tide: number }>;
  /** Chart dimensions */
  chartWidth: number;
  chartHeight: number;
  /** Chart margins */
  chartMargin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** Theme mode */
  theme?: 'light' | 'dark' | 'high-contrast';
  /** Grouping configuration */
  groupingConfig?: Partial<MarkerGroupingConfig>;
  /** Callback when a record is clicked */
  onRecordClick?: (record: FishingMarkerData) => void;
  /** Callback when a marker group is clicked */
  onMarkerClick?: (group: MarkerGroup, index: number) => void;
  /** Whether overlay is visible */
  visible?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Test ID */
  testId?: string;
}

/**
 * Calculate X coordinate for a time value on the chart
 */
function calculateXPosition(
  time: string,
  chartData: Array<{ time: string }>,
  chartWidth: number,
  margin: { left: number; right: number }
): number {
  const plotWidth = chartWidth - margin.left - margin.right;
  const timeIndex = chartData.findIndex((d) => d.time === time);

  if (timeIndex === -1) {
    // Time not found in chart data, try to interpolate
    const [hours, minutes] = time.split(':').map(Number);
    const targetMinutes = hours * 60 + minutes;

    // Find nearest data points
    let closestIndex = 0;
    let closestDiff = Infinity;

    for (let i = 0; i < chartData.length; i++) {
      const [h, m] = chartData[i].time.split(':').map(Number);
      const dataMinutes = h * 60 + m;
      const diff = Math.abs(dataMinutes - targetMinutes);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    return (
      margin.left + (closestIndex / Math.max(chartData.length - 1, 1)) * plotWidth
    );
  }

  return (
    margin.left + (timeIndex / Math.max(chartData.length - 1, 1)) * plotWidth
  );
}

/**
 * Calculate Y coordinate for a time value on the chart
 * Uses the tide value at that time
 */
function calculateYPosition(
  time: string,
  chartData: Array<{ time: string; tide: number }>,
  chartHeight: number,
  margin: { top: number; bottom: number }
): number {
  const plotHeight = chartHeight - margin.top - margin.bottom;
  const dataPoint = chartData.find((d) => d.time === time);

  if (!dataPoint) {
    // Default to top area if time not found
    return margin.top + plotHeight * 0.1;
  }

  // Calculate Y based on tide value
  const tideValues = chartData.map((d) => d.tide);
  const minTide = Math.min(...tideValues);
  const maxTide = Math.max(...tideValues);
  const tideRange = maxTide - minTide || 1;

  // Invert Y (SVG Y increases downward)
  const normalizedTide = (dataPoint.tide - minTide) / tideRange;
  return margin.top + plotHeight * (1 - normalizedTide);
}

/**
 * Hook for Intersection Observer based virtualization
 * Only renders markers that are visible in viewport
 */
function useMarkerVirtualization(
  groupCount: number,
  overlayRef: React.RefObject<HTMLDivElement>
) {
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(
    new Set(Array.from({ length: Math.min(groupCount, VIRTUALIZATION_THRESHOLD) }, (_, i) => i))
  );
  const observerRef = useRef<IntersectionObserver | null>(null);
  const markerRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Only enable virtualization for large marker sets
  const shouldVirtualize = groupCount > VIRTUALIZATION_THRESHOLD;

  useEffect(() => {
    if (!shouldVirtualize || typeof IntersectionObserver === 'undefined') {
      // Show all markers if not virtualizing or IO not supported
      setVisibleIndices(new Set(Array.from({ length: groupCount }, (_, i) => i)));
      return;
    }

    // Create Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisibleIndices((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            const index = parseInt(entry.target.getAttribute('data-marker-index') || '-1', 10);
            if (index >= 0) {
              if (entry.isIntersecting) {
                next.add(index);
              } else {
                // Keep recently visible markers for smoother scrolling
                // Only remove if not intersecting and not adjacent to visible
                const hasAdjacentVisible = next.has(index - 1) || next.has(index + 1);
                if (!hasAdjacentVisible) {
                  next.delete(index);
                }
              }
            }
          });
          return next;
        });
      },
      {
        root: overlayRef.current?.parentElement,
        rootMargin: '50px', // Pre-load markers 50px outside viewport
        threshold: 0,
      }
    );

    // Observe all marker placeholders
    markerRefs.current.forEach((element) => {
      observerRef.current?.observe(element);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [shouldVirtualize, groupCount, overlayRef]);

  const registerMarkerRef = useCallback((index: number, element: HTMLDivElement | null) => {
    if (element) {
      markerRefs.current.set(index, element);
      observerRef.current?.observe(element);
    } else {
      const existing = markerRefs.current.get(index);
      if (existing) {
        observerRef.current?.unobserve(existing);
        markerRefs.current.delete(index);
      }
    }
  }, []);

  return {
    visibleIndices,
    shouldVirtualize,
    registerMarkerRef,
  };
}

/**
 * StackedMarkerOverlay - Container for rendering stacked markers
 */
export const StackedMarkerOverlay = React.memo<StackedMarkerOverlayProps>(
  ({
    fishingData,
    chartData,
    chartWidth,
    chartHeight,
    chartMargin,
    theme = 'light',
    groupingConfig,
    onRecordClick,
    onMarkerClick,
    visible = true,
    className,
    testId,
  }) => {
    const [expandedIndex, setExpandedIndex] = useState(-1);
    const overlayRef = useRef<HTMLDivElement>(null);

    // Use marker grouping hook
    const { groups, groupCount } = useMarkerGrouping({
      fishingData,
      config: groupingConfig,
    });

    // Use virtualization for large marker sets
    const { visibleIndices, shouldVirtualize, registerMarkerRef } = useMarkerVirtualization(
      groupCount,
      overlayRef
    );

    // Memoize min/max tide values for Y calculation
    const tideRange = useMemo(() => {
      if (chartData.length === 0) return { min: 0, max: 100, range: 100 };
      const tideValues = chartData.map((d) => d.tide);
      const min = Math.min(...tideValues);
      const max = Math.max(...tideValues);
      return { min, max, range: max - min || 1 };
    }, [chartData]);

    // Calculate positions for each group with optimized Y calculation
    const positionedGroups = useMemo((): MarkerGroup[] => {
      const plotHeight = chartHeight - chartMargin.top - chartMargin.bottom;

      return groups.map((group) => {
        const x = calculateXPosition(group.time, chartData, chartWidth, chartMargin);

        // Optimized Y calculation using pre-computed tide range
        const dataPoint = chartData.find((d) => d.time === group.time);
        let y: number;
        if (dataPoint) {
          const normalizedTide = (dataPoint.tide - tideRange.min) / tideRange.range;
          y = chartMargin.top + plotHeight * (1 - normalizedTide);
        } else {
          y = chartMargin.top + plotHeight * 0.1;
        }

        return { ...group, x, y };
      });
    }, [groups, chartData, chartWidth, chartHeight, chartMargin, tideRange]);

    // Handle marker click
    const handleMarkerClick = useCallback(
      (index: number) => {
        const group = positionedGroups[index];

        if (group.records.length === 1) {
          // Single record - directly call onRecordClick
          onRecordClick?.(group.records[0]);
        } else {
          // Multiple records - toggle expand
          setExpandedIndex((prev) => (prev === index ? -1 : index));
        }

        onMarkerClick?.(group, index);
      },
      [positionedGroups, onRecordClick, onMarkerClick]
    );

    // Handle marker close
    const handleMarkerClose = useCallback((index: number) => {
      setExpandedIndex((prev) => (prev === index ? -1 : prev));
    }, []);

    // Handle record click within expanded marker
    const handleRecordClick = useCallback(
      (record: FishingMarkerData) => {
        onRecordClick?.(record);
        setExpandedIndex(-1);
      },
      [onRecordClick]
    );

    // Close expanded marker on Escape key
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && expandedIndex >= 0) {
          setExpandedIndex(-1);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [expandedIndex]);

    // Don't render if not visible or no data
    if (!visible || groupCount === 0) {
      return null;
    }

    return (
      <div
        ref={overlayRef}
        className={className}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: chartWidth,
          height: chartHeight,
          pointerEvents: 'none', // Allow clicks to pass through to chart
          zIndex: 10,
          // GPU acceleration hint for smoother animations
          willChange: shouldVirtualize ? 'transform' : 'auto',
        }}
        data-testid={testId || 'stacked-marker-overlay'}
        data-virtualized={shouldVirtualize}
        data-visible-count={visibleIndices.size}
        aria-label={`${groupCount} fishing marker groups`}
        role="group"
      >
        {positionedGroups.map((group, index) => {
          const isVisible = visibleIndices.has(index) || expandedIndex === index;

          return (
            <div
              key={`marker-${group.time}-${index}`}
              ref={(el) => shouldVirtualize && registerMarkerRef(index, el)}
              data-marker-index={index}
              style={{
                position: 'absolute',
                left: group.x,
                top: group.y,
                pointerEvents: 'auto',
                // Use visibility instead of display to maintain layout
                visibility: isVisible ? 'visible' : 'hidden',
              }}
            >
              {isVisible && (
                <StackedMarkerCard
                  group={{ ...group, x: 0, y: 0 }} // Reset position since parent handles it
                  index={index}
                  theme={theme}
                  isExpanded={expandedIndex === index}
                  onClick={handleMarkerClick}
                  onClose={handleMarkerClose}
                  onRecordClick={handleRecordClick}
                />
              )}
            </div>
          );
        })}

        {/* Screen reader summary */}
        <div
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
          }}
          aria-live="polite"
        >
          {expandedIndex >= 0 &&
            `Expanded marker at ${positionedGroups[expandedIndex]?.time} showing ${positionedGroups[expandedIndex]?.records.length} records`}
        </div>
      </div>
    );
  }
);

StackedMarkerOverlay.displayName = 'StackedMarkerOverlay';

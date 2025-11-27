/**
 * useMarkerGrouping.test.ts - Unit tests for marker grouping hook
 * Issue #273: TideChart fishing marker enhancement
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  parseTimeToMinutes,
  minutesToTimeString,
  groupMarkersByTime,
  useMarkerGrouping,
} from '../useMarkerGrouping';
import type { FishingMarkerData } from '../types';

describe('parseTimeToMinutes', () => {
  it('should parse valid time strings', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('00:30')).toBe(30);
    expect(parseTimeToMinutes('01:00')).toBe(60);
    expect(parseTimeToMinutes('12:00')).toBe(720);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
  });

  it('should return -1 for invalid format', () => {
    expect(parseTimeToMinutes('')).toBe(-1);
    expect(parseTimeToMinutes('invalid')).toBe(-1);
    expect(parseTimeToMinutes('1:00')).toBe(-1); // Missing leading zero
    expect(parseTimeToMinutes('12:0')).toBe(-1); // Missing trailing zero
    expect(parseTimeToMinutes('12')).toBe(-1);
  });

  it('should return -1 for invalid values', () => {
    expect(parseTimeToMinutes('24:00')).toBe(-1);
    expect(parseTimeToMinutes('12:60')).toBe(-1);
    expect(parseTimeToMinutes('-01:00')).toBe(-1);
  });
});

describe('minutesToTimeString', () => {
  it('should convert minutes to time string', () => {
    expect(minutesToTimeString(0)).toBe('00:00');
    expect(minutesToTimeString(30)).toBe('00:30');
    expect(minutesToTimeString(60)).toBe('01:00');
    expect(minutesToTimeString(720)).toBe('12:00');
    expect(minutesToTimeString(1439)).toBe('23:59');
  });
});

describe('groupMarkersByTime', () => {
  const createRecord = (id: string, time: string): FishingMarkerData => ({
    id,
    time,
    species: 'Test Fish',
  });

  it('should return empty array for empty input', () => {
    expect(groupMarkersByTime([], 5)).toEqual([]);
  });

  it('should return single group for single record', () => {
    const records = [createRecord('1', '12:00')];
    const result = groupMarkersByTime(records, 5);

    expect(result).toHaveLength(1);
    expect(result[0].time).toBe('12:00');
    expect(result[0].records).toHaveLength(1);
  });

  it('should group records within threshold', () => {
    const records = [
      createRecord('1', '12:00'),
      createRecord('2', '12:03'),
      createRecord('3', '12:05'),
    ];
    const result = groupMarkersByTime(records, 5);

    expect(result).toHaveLength(1);
    expect(result[0].records).toHaveLength(3);
    expect(result[0].time).toBe('12:00'); // First record's time
  });

  it('should create separate groups for records outside threshold', () => {
    const records = [
      createRecord('1', '12:00'),
      createRecord('2', '12:10'), // 10 minutes apart
      createRecord('3', '12:20'), // 10 minutes apart
    ];
    const result = groupMarkersByTime(records, 5);

    expect(result).toHaveLength(3);
    expect(result[0].time).toBe('12:00');
    expect(result[1].time).toBe('12:10');
    expect(result[2].time).toBe('12:20');
  });

  it('should handle mixed grouping correctly', () => {
    const records = [
      createRecord('1', '12:00'),
      createRecord('2', '12:02'),
      createRecord('3', '12:30'), // New group
      createRecord('4', '12:33'),
      createRecord('5', '15:00'), // New group
    ];
    const result = groupMarkersByTime(records, 5);

    expect(result).toHaveLength(3);
    expect(result[0].records).toHaveLength(2);
    expect(result[1].records).toHaveLength(2);
    expect(result[2].records).toHaveLength(1);
  });

  it('should sort records by time before grouping', () => {
    const records = [
      createRecord('3', '12:30'),
      createRecord('1', '12:00'),
      createRecord('2', '12:02'),
    ];
    const result = groupMarkersByTime(records, 5);

    expect(result).toHaveLength(2);
    expect(result[0].records[0].id).toBe('1');
    expect(result[0].records[1].id).toBe('2');
    expect(result[1].records[0].id).toBe('3');
  });

  it('should filter out records with invalid time format', () => {
    const records = [
      createRecord('1', '12:00'),
      createRecord('2', 'invalid'),
      createRecord('3', '12:05'),
    ];
    const result = groupMarkersByTime(records, 5);

    expect(result).toHaveLength(1);
    expect(result[0].records).toHaveLength(2);
  });

  it('should handle exact threshold boundary', () => {
    const records = [
      createRecord('1', '12:00'),
      createRecord('2', '12:05'), // Exactly 5 minutes
    ];
    const result = groupMarkersByTime(records, 5);

    expect(result).toHaveLength(1);
    expect(result[0].records).toHaveLength(2);
  });

  it('should create new group at threshold + 1', () => {
    const records = [
      createRecord('1', '12:00'),
      createRecord('2', '12:06'), // 6 minutes > threshold
    ];
    const result = groupMarkersByTime(records, 5);

    expect(result).toHaveLength(2);
  });

  it('should initialize isExpanded to false', () => {
    const records = [createRecord('1', '12:00')];
    const result = groupMarkersByTime(records, 5);

    expect(result[0].isExpanded).toBe(false);
  });

  describe('performance', () => {
    it('should handle 50+ markers efficiently', () => {
      const records: FishingMarkerData[] = [];
      for (let i = 0; i < 100; i++) {
        const hour = Math.floor(i / 10) + 6;
        const minute = (i % 10) * 6;
        records.push(createRecord(`${i}`, `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`));
      }

      const startTime = performance.now();
      const result = groupMarkersByTime(records, 5);
      const endTime = performance.now();

      expect(result.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });
  });
});

describe('useMarkerGrouping', () => {
  const createRecord = (id: string, time: string): FishingMarkerData => ({
    id,
    time,
  });

  it('should return grouped data', () => {
    const fishingData = [
      createRecord('1', '12:00'),
      createRecord('2', '12:03'),
      createRecord('3', '14:00'),
    ];

    const { result } = renderHook(() =>
      useMarkerGrouping({ fishingData })
    );

    expect(result.current.groups).toHaveLength(2);
    expect(result.current.totalRecords).toBe(3);
    expect(result.current.groupCount).toBe(2);
  });

  it('should use default config', () => {
    const fishingData = [
      createRecord('1', '12:00'),
      createRecord('2', '12:05'), // Exactly 5 minutes (default threshold)
    ];

    const { result } = renderHook(() =>
      useMarkerGrouping({ fishingData })
    );

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].records).toHaveLength(2);
  });

  it('should use custom config', () => {
    const fishingData = [
      createRecord('1', '12:00'),
      createRecord('2', '12:03'),
    ];

    const { result } = renderHook(() =>
      useMarkerGrouping({
        fishingData,
        config: { proximityThresholdMinutes: 2 },
      })
    );

    expect(result.current.groups).toHaveLength(2); // Separate groups with 2min threshold
  });

  it('should update config dynamically', () => {
    const fishingData = [
      createRecord('1', '12:00'),
      createRecord('2', '12:03'),
    ];

    const { result } = renderHook(() =>
      useMarkerGrouping({ fishingData })
    );

    expect(result.current.groups).toHaveLength(1);

    act(() => {
      result.current.updateConfig({ proximityThresholdMinutes: 2 });
    });

    expect(result.current.groups).toHaveLength(2);
  });

  it('should handle empty data', () => {
    const { result } = renderHook(() =>
      useMarkerGrouping({ fishingData: [] })
    );

    expect(result.current.groups).toHaveLength(0);
    expect(result.current.totalRecords).toBe(0);
    expect(result.current.groupCount).toBe(0);
  });

  it('should memoize groups', () => {
    const fishingData = [createRecord('1', '12:00')];

    const { result, rerender } = renderHook(() =>
      useMarkerGrouping({ fishingData })
    );

    const firstGroups = result.current.groups;
    rerender();
    const secondGroups = result.current.groups;

    expect(firstGroups).toBe(secondGroups); // Same reference
  });
});

/**
 * TASK-202: 潮汐ヘルパー関数のテスト
 *
 * Step 1: ヘルパー関数の単体テスト
 * - getTideTypeColor: 潮汐タイプ別カラーマッピング
 * - getTideStrengthColor: 強度別カラー分け
 * - filterTodayEvents: 今日のイベントフィルタリング
 * - findNextEvent: 次イベント検索
 */

import { describe, it, expect } from 'vitest';
import {
  getTideTypeColor,
  getTideStrengthColor,
  filterTodayEvents,
  findNextEvent
} from '../tide-helpers';
import type { TideEvent } from '../../types/tide';

describe('getTideTypeColor', () => {
  it('大潮（spring）の場合、bg-blue-700を返す', () => {
    const result = getTideTypeColor('spring');
    expect(result.bg).toBe('bg-blue-700');
    expect(result.text).toBe('text-white');
    expect(result.label).toBe('大潮');
  });

  it('中潮（medium）の場合、bg-blue-500を返す', () => {
    const result = getTideTypeColor('medium');
    expect(result.bg).toBe('bg-blue-500');
    expect(result.text).toBe('text-white');
    expect(result.label).toBe('中潮');
  });

  it('小潮（neap）の場合、bg-blue-300を返す', () => {
    const result = getTideTypeColor('neap');
    expect(result.bg).toBe('bg-blue-300');
    expect(result.text).toBe('text-gray-800');
    expect(result.label).toBe('小潮');
  });

  it('長潮（long）の場合、bg-gray-400を返す', () => {
    const result = getTideTypeColor('long');
    expect(result.bg).toBe('bg-gray-400');
    expect(result.text).toBe('text-gray-800');
    expect(result.label).toBe('長潮');
  });

  it('若潮（young）の場合、bg-gray-400を返す', () => {
    const result = getTideTypeColor('young');
    expect(result.bg).toBe('bg-gray-400');
    expect(result.text).toBe('text-gray-800');
    expect(result.label).toBe('若潮');
  });
});

describe('getTideStrengthColor', () => {
  it('強度85%の場合、赤色（bg-red-500）を返す', () => {
    const result = getTideStrengthColor(85);
    expect(result).toBe('bg-red-500');
  });

  it('強度80%（境界値）の場合、赤色を返す', () => {
    const result = getTideStrengthColor(80);
    expect(result).toBe('bg-red-500');
  });

  it('強度79%（境界値）の場合、黄色（bg-yellow-500）を返す', () => {
    const result = getTideStrengthColor(79);
    expect(result).toBe('bg-yellow-500');
  });

  it('強度55%の場合、黄色を返す', () => {
    const result = getTideStrengthColor(55);
    expect(result).toBe('bg-yellow-500');
  });

  it('強度50%（境界値）の場合、黄色を返す', () => {
    const result = getTideStrengthColor(50);
    expect(result).toBe('bg-yellow-500');
  });

  it('強度49%（境界値）の場合、青色（bg-blue-400）を返す', () => {
    const result = getTideStrengthColor(49);
    expect(result).toBe('bg-blue-400');
  });

  it('強度30%の場合、青色を返す', () => {
    const result = getTideStrengthColor(30);
    expect(result).toBe('bg-blue-400');
  });

  it('強度0%の場合、青色を返す', () => {
    const result = getTideStrengthColor(0);
    expect(result).toBe('bg-blue-400');
  });

  it('強度100%の場合、赤色を返す', () => {
    const result = getTideStrengthColor(100);
    expect(result).toBe('bg-red-500');
  });
});

describe('filterTodayEvents', () => {
  const targetDate = new Date('2024-01-15T12:00:00');

  it('今日のイベントのみを返す', () => {
    const events: TideEvent[] = [
      { time: new Date('2024-01-15T06:15:00'), type: 'high', level: 180 },
      { time: new Date('2024-01-15T12:30:00'), type: 'low', level: 45 },
      { time: new Date('2024-01-15T18:45:00'), type: 'high', level: 175 },
      { time: new Date('2024-01-16T00:30:00'), type: 'low', level: 50 } // 翌日
    ];

    const result = filterTodayEvents(events, targetDate);
    expect(result).toHaveLength(3);
    expect(result[0].time.getDate()).toBe(15);
    expect(result[1].time.getDate()).toBe(15);
    expect(result[2].time.getDate()).toBe(15);
  });

  it('空配列の場合、空配列を返す', () => {
    const result = filterTodayEvents([], targetDate);
    expect(result).toEqual([]);
  });

  it('該当イベントがない場合、空配列を返す', () => {
    const events: TideEvent[] = [
      { time: new Date('2024-01-14T06:15:00'), type: 'high', level: 180 }, // 前日
      { time: new Date('2024-01-16T12:30:00'), type: 'low', level: 45 }   // 翌日
    ];

    const result = filterTodayEvents(events, targetDate);
    expect(result).toEqual([]);
  });

  it('時刻順にソートされて返される', () => {
    const events: TideEvent[] = [
      { time: new Date('2024-01-15T18:45:00'), type: 'high', level: 175 },
      { time: new Date('2024-01-15T06:15:00'), type: 'high', level: 180 },
      { time: new Date('2024-01-15T12:30:00'), type: 'low', level: 45 }
    ];

    const result = filterTodayEvents(events, targetDate);
    expect(result).toHaveLength(3);
    expect(result[0].time.getHours()).toBe(6);
    expect(result[1].time.getHours()).toBe(12);
    expect(result[2].time.getHours()).toBe(18);
  });
});

describe('findNextEvent', () => {
  const currentTime = new Date('2024-01-15T12:00:00');

  it('現在時刻より後の最初のイベントを返す', () => {
    const events: TideEvent[] = [
      { time: new Date('2024-01-15T06:15:00'), type: 'high', level: 180 },
      { time: new Date('2024-01-15T12:30:00'), type: 'low', level: 45 },
      { time: new Date('2024-01-15T18:45:00'), type: 'high', level: 175 }
    ];

    const result = findNextEvent(events, currentTime);
    expect(result).not.toBeNull();
    expect(result?.time.getHours()).toBe(12);
    expect(result?.time.getMinutes()).toBe(30);
    expect(result?.type).toBe('low');
  });

  it('次のイベントがない場合、nullを返す', () => {
    const events: TideEvent[] = [
      { time: new Date('2024-01-15T06:15:00'), type: 'high', level: 180 },
      { time: new Date('2024-01-15T09:30:00'), type: 'low', level: 45 }
    ];

    const result = findNextEvent(events, currentTime);
    expect(result).toBeNull();
  });

  it('空配列の場合、nullを返す', () => {
    const result = findNextEvent([], currentTime);
    expect(result).toBeNull();
  });

  it('すべてのイベントが過去の場合、nullを返す', () => {
    const events: TideEvent[] = [
      { time: new Date('2024-01-15T06:15:00'), type: 'high', level: 180 },
      { time: new Date('2024-01-15T10:30:00'), type: 'low', level: 45 }
    ];

    const result = findNextEvent(events, currentTime);
    expect(result).toBeNull();
  });

  it('現在時刻と同じイベントは次イベントとして扱う', () => {
    const events: TideEvent[] = [
      { time: new Date('2024-01-15T12:00:00'), type: 'high', level: 180 },
      { time: new Date('2024-01-15T18:00:00'), type: 'low', level: 45 }
    ];

    const result = findNextEvent(events, currentTime);
    expect(result).not.toBeNull();
    expect(result?.time.getHours()).toBe(12);
  });
});

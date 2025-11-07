/**
 * TASK-202: TideEventsList Component
 *
 * 今日の潮汐イベント一覧表示コンポーネント:
 * - 時系列順のイベント表示
 * - 満潮・干潮のアイコン表示
 * - 過去イベントは薄く表示
 * - 空状態の表示
 *
 * デザイナー仕様:
 * - Material Design 3 principles
 * - タイムライン形式
 * - アクセシビリティ対応
 */

import React from 'react';
import type { TideEvent } from '../types/tide';
import { filterTodayEvents } from '../lib/tide-helpers';

interface TideEventsListProps {
  events: TideEvent[];
  targetDate: Date;
  currentTime?: Date;
}

export const TideEventsList: React.FC<TideEventsListProps> = ({
  events,
  targetDate,
  currentTime = new Date()
}) => {
  const todayEvents = filterTodayEvents(events, targetDate);

  // イベントが空の場合
  if (todayEvents.length === 0) {
    return (
      <div
        data-testid="empty-events-state"
        className="text-center py-8 text-gray-500"
      >
        <div className="text-4xl mb-2">📅</div>
        <div className="text-sm">今日の潮汐イベントがありません</div>
      </div>
    );
  }

  // イベントが過去かどうかを判定
  const isPastEvent = (eventTime: Date): boolean => {
    return eventTime.getTime() < currentTime.getTime();
  };

  return (
    <div data-testid="tide-events-list" className="space-y-3">
      {todayEvents.map((event, index) => {
        const isPast = isPastEvent(event.time);
        const isHighTide = event.type === 'high';

        return (
          <div
            key={`${event.time.toISOString()}-${index}`}
            data-testid={`tide-event-${index}`}
            className={`flex items-center space-x-3 p-3 rounded-lg border ${
              isPast
                ? 'opacity-50 bg-gray-50 border-gray-200'
                : 'bg-white border-blue-200 shadow-sm'
            } transition-all duration-200`}
          >
            {/* アイコン */}
            <div
              data-testid={isHighTide ? 'high-tide-icon' : 'low-tide-icon'}
              className="flex-shrink-0 text-2xl"
            >
              {isHighTide ? '🌊' : '🏖️'}
            </div>

            {/* イベント詳細 */}
            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-800">
                    {isHighTide ? '満潮' : '干潮'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {event.time.toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {event.level}cm
                  </div>
                  {isPast && (
                    <div className="text-xs text-gray-500">済</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * TASK-202: TideSummaryGrid Component
 *
 * 4項目グリッド表示コンポーネント:
 * - 潮汐タイプ（Tide Type）
 * - 現在の状態（Current State）
 * - 次イベント（Next Event）
 * - 潮汐強度（Tide Strength）
 *
 * デザイナー仕様:
 * - Material Design 3 principles
 * - WCAG 2.1 AA contrast compliance
 * - Responsive: モバイル（1列）→ タブレット（2×2）→ デスクトップ（4列）
 */

import React from 'react';
import type { TideInfo } from '../types/tide';
import { getTideTypeColor, getTideStrengthColor } from '../lib/tide-helpers';

interface TideSummaryGridProps {
  tideInfo: TideInfo;
}

export const TideSummaryGrid: React.FC<TideSummaryGridProps> = ({ tideInfo }) => {
  const tideTypeColor = getTideTypeColor(tideInfo.tideType);
  const strengthColor = getTideStrengthColor(tideInfo.tideStrength);

  // 現在の潮汐状態の日本語表示
  const getCurrentStateLabel = (state: string): string => {
    const stateMap: Record<string, string> = {
      rising: '上げ潮',
      falling: '下げ潮',
      high: '満潮',
      low: '干潮'
    };
    return stateMap[state] || state;
  };

  return (
    <div
      data-testid="summary-grid"
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      {/* 1. 潮汐タイプ */}
      <div
        data-testid="tide-type-section"
        className={`${tideTypeColor.bg} ${tideTypeColor.text} p-4 rounded-lg`}
      >
        <div className="flex items-center space-x-2">
          <span data-testid="tide-type-icon" className="text-2xl">
            {tideTypeColor.icon}
          </span>
          <div>
            <div className="text-xs opacity-80">潮汐タイプ</div>
            <div className="text-xl font-bold">{tideTypeColor.label}</div>
          </div>
        </div>
      </div>

      {/* 2. 現在の潮汐状態 */}
      <div
        data-testid="current-state-section"
        className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg"
      >
        <div className="flex items-center space-x-2">
          <span data-testid="current-state-icon" className="text-2xl">
            {tideInfo.currentState === 'rising' || tideInfo.currentState === 'high' ? '⬆️' : '⬇️'}
          </span>
          <div>
            <div className="text-xs text-gray-600">現在の状態</div>
            <div className="text-xl font-bold text-gray-800">
              {getCurrentStateLabel(tideInfo.currentState)}
            </div>
            <div
              data-testid="current-level"
              aria-label={`現在の潮位${tideInfo.currentLevel}センチメートル`}
              className="text-sm text-gray-600"
            >
              {tideInfo.currentLevel}cm
            </div>
          </div>
        </div>
      </div>

      {/* 3. 次イベント情報 */}
      <div
        data-testid="next-event-section"
        className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg"
      >
        {tideInfo.nextEvent ? (
          <div className="flex items-center space-x-2">
            <span className="text-2xl">
              {tideInfo.nextEvent.type === 'high' ? '🌊' : '🏖️'}
            </span>
            <div>
              <div className="text-xs text-gray-600">次のイベント</div>
              <div className="text-xl font-bold text-gray-800">
                {tideInfo.nextEvent.type === 'high' ? '満潮' : '干潮'}
              </div>
              <div className="text-sm text-gray-600">
                {tideInfo.nextEvent.time.toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                {' '}
                {tideInfo.nextEvent.level}cm
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-xs text-gray-600">次のイベント</div>
            <div className="text-sm text-gray-500 mt-1">データなし</div>
          </div>
        )}
      </div>

      {/* 4. 潮汐強度 */}
      <div
        data-testid="tide-strength-section"
        className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg"
      >
        <div>
          <div className="text-xs text-gray-600">潮汐強度</div>
          <div
            data-testid="strength-value"
            aria-label={`潮汐強度${tideInfo.tideStrength}パーセント`}
            className="text-xl font-bold text-gray-800"
          >
            {tideInfo.tideStrength}%
          </div>
          <div data-testid="strength-progress" className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`${strengthColor} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${tideInfo.tideStrength}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

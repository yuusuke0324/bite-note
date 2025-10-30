/**
 * TASK-202: TideSummaryCardコンポーネント
 *
 * 要件:
 * - 4項目グリッド表示（潮汐タイプ・状態・次イベント・強度）
 * - 今日の潮汐イベント一覧
 * - アイコン・カラーシステム統合
 */

import React from 'react';
import { ModernCard } from './ui/ModernCard';
import type { TideInfo } from '../types/tide';

interface TideSummaryCardProps {
  tideInfo: TideInfo | null;
  loading?: boolean;
  error?: string;
  onToggleDetails?: () => void;
  className?: string;
}

export const TideSummaryCard: React.FC<TideSummaryCardProps> = ({
  tideInfo,
  loading = false,
  error,
  onToggleDetails,
  className = ''
}) => {


  // ローディング状態
  if (loading) {
    return (
      <ModernCard className={className}>
        <div data-testid="summary-card-shimmer" className="animate-pulse p-6 text-center">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </div>
      </ModernCard>
    );
  }

  // エラー状態
  if (error || !tideInfo) {
    return (
      <ModernCard className={className}>
        <div data-testid="summary-card-error" className="p-6 text-center">
          <div className="text-red-500 text-lg mb-2">⚠️</div>
          <div className="text-red-600 font-medium">潮汐データエラー</div>
          <div className="text-red-500 text-sm mt-1">
            {error || '潮汐情報を取得できませんでした'}
          </div>
        </div>
      </ModernCard>
    );
  }

  return (
    <div className={`${className} hover:shadow-lg transition-shadow duration-200`}>
      <ModernCard interactive>
      <div
        data-testid="summary-card-container"
        tabIndex={0}
        className="p-4 md:p-6"
      >

        {/* 次の潮汐イベントのみ表示 */}
        <div className="text-center">
          {tideInfo.nextEvent ? (
            <div className="flex items-center justify-center space-x-3">
              <div className="text-3xl">
                {tideInfo.nextEvent.type === 'high' ? '🌊' : '🏖️'}
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-800">
                  次の{tideInfo.nextEvent.type === 'high' ? '満潮' : '干潮'}
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {tideInfo.nextEvent.time.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="text-sm text-gray-500">
                  潮位 {tideInfo.nextEvent.level}cm
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">
              次の潮汐イベント情報がありません
            </div>
          )}
        </div>

        {/* 詳細切り替えボタン */}
        {onToggleDetails && (
          <div className="mt-4 text-center">
            <button
              data-testid="details-toggle-button"
              onClick={onToggleDetails}
              className="text-blue-500 hover:text-blue-600 text-sm font-medium transition-colors duration-200"
            >
              詳細を表示 →
            </button>
          </div>
        )}
      </div>
      </ModernCard>
    </div>
  );
};
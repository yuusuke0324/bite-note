// オフラインインジケーター
// オフライン状態と未同期カウンターを表示

import { useEffect, useState } from 'react';
import { offlineQueueService } from '../../lib/offline-queue-service';

interface OfflineIndicatorProps {
  isOnline: boolean;
}

export const OfflineIndicator = ({ isOnline }: OfflineIndicatorProps) => {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // 初回表示時とオンライン状態変化時にキューステータスを取得
    const updateQueueStatus = async () => {
      const status = await offlineQueueService.getQueueStatus();
      setPendingCount(status.pendingCount);
    };

    updateQueueStatus();

    // 定期的に更新（5秒ごと）
    const interval = setInterval(updateQueueStatus, 5000);

    return () => clearInterval(interval);
  }, [isOnline]);

  // オンライン時かつキューが空の場合は表示しない
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <>
      {/* オフラインバナー（最上部） */}
      {!isOnline && (
        <div
          role="alert"
          aria-live="polite"
          aria-label="インターネット接続が切断されました。オフラインモードです。"
          className="bg-red-600 text-white px-4 py-3 text-center shadow-md flex items-center justify-center gap-2"
        >
          <span className="inline text-lg" aria-hidden="true">
            ⚡
          </span>
          <span className="font-semibold text-base">オフライン</span>
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs">
              未同期: {pendingCount}件
            </span>
          )}
        </div>
      )}

      {/* オンラインだが未同期データがある場合 */}
      {isOnline && pendingCount > 0 && (
        <div
          role="status"
          aria-live="polite"
          aria-label={`未同期データ ${pendingCount}件`}
          className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-center text-sm text-blue-900"
        >
          <span className="inline text-base mr-1" aria-hidden="true">
            ☁️
          </span>
          同期中... {pendingCount}件のデータを処理しています
        </div>
      )}
    </>
  );
};

interface OfflineSyncButtonProps {
  pendingCount: number;
  onClick: () => void;
}

/**
 * 未同期カウンターボタン（ヘッダー右側用）
 */
export const OfflineSyncButton = ({
  pendingCount,
  onClick,
}: OfflineSyncButtonProps) => {
  if (pendingCount === 0) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="
        min-h-[44px] min-w-[44px] px-3 py-2
        flex items-center gap-2
        bg-blue-50 hover:bg-blue-100 active:bg-blue-200
        border border-blue-200 rounded-full
        transition-colors duration-150
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      "
      aria-label={`未同期データ ${pendingCount}件を確認`}
    >
      <span className="text-lg" aria-hidden="true">
        ☁️
      </span>
      <span className="text-sm font-medium text-blue-900">{pendingCount}</span>
    </button>
  );
};

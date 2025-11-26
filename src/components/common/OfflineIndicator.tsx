// オフラインインジケーター
// オフライン状態と未同期カウンターを表示

import { useEffect, useState, useRef } from 'react';
import { offlineQueueService } from '../../lib/offline-queue-service';
import { useToastStore } from '../../stores/toast-store';
import { TestIds } from '../../constants/testIds';
import { logger } from '../../lib/errors/logger';

interface OfflineIndicatorProps {
  isOnline: boolean;
}

export const OfflineIndicator = ({ isOnline }: OfflineIndicatorProps) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // unmount時の状態更新を防ぐためのref（メモリリーク・unhandled rejection防止）
  const isMountedRef = useRef(true);

  // トースト通知
  const showInfo = useToastStore(state => state.showInfo);
  const showSuccess = useToastStore(state => state.showSuccess);
  const showError = useToastStore(state => state.showError);

  useEffect(() => {
    isMountedRef.current = true;

    // 初回表示時とオンライン状態変化時にキューステータスを取得
    const updateQueueStatus = async () => {
      const status = await offlineQueueService.getQueueStatus();
      // unmount後の状態更新を防ぐ
      if (!isMountedRef.current) return;
      setPendingCount(status.pendingCount);
      setIsSyncing(status.isSyncing);
    };

    updateQueueStatus();

    // tech-lead指摘: オンライン時のみ定期更新（パフォーマンス最適化）
    let interval: NodeJS.Timeout | null = null;
    if (isOnline) {
      interval = setInterval(updateQueueStatus, 5000);
    }

    return () => {
      isMountedRef.current = false;
      if (interval) clearInterval(interval);
    };
  }, [isOnline]);

  // 手動同期実行
  const handleManualSync = async () => {
    if (isSyncing) {
      showInfo('同期が既に進行中です');
      return;
    }

    try {
      // unmount後の状態更新を防ぐ
      if (!isMountedRef.current) return;
      setIsSyncing(true);
      showInfo('同期を開始しました');

      const result = await offlineQueueService.syncQueue();

      // unmount後の処理を中断
      if (!isMountedRef.current) return;

      if (result.success) {
        if (result.syncedCount === 0) {
          showInfo('同期するデータがありません');
        } else {
          showSuccess(`${result.syncedCount}件のデータを同期しました`);
        }

        // 同期後にカウンターを更新
        const status = await offlineQueueService.getQueueStatus();
        // unmount後の状態更新を防ぐ
        if (!isMountedRef.current) return;
        setPendingCount(status.pendingCount);
      } else {
        showError('同期に失敗しました');
      }
    } catch (error) {
      logger.error('OfflineIndicator: Manual sync error', { error });
      // unmount後はトースト表示をスキップ
      if (!isMountedRef.current) return;
      showError('同期中にエラーが発生しました');
    } finally {
      // unmount後の状態更新を防ぐ
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    }
  };

  // オンライン時かつキューが空の場合は表示しない
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <>
      {/* オフラインバナー（最上部） */}
      {!isOnline && (
        <div
          data-testid={TestIds.OFFLINE_INDICATOR}
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
            <span data-testid={TestIds.OFFLINE_BADGE} className="ml-2 px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs">
              未同期: {pendingCount}件
            </span>
          )}
        </div>
      )}

      {/* オンラインだが未同期データがある場合 */}
      {isOnline && pendingCount > 0 && (
        <div
          data-testid={TestIds.SYNC_STATUS}
          role="status"
          aria-live="polite"
          aria-label={`未同期データ ${pendingCount}件`}
          className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-center text-sm text-blue-900 flex items-center justify-center gap-2"
        >
          <span className="inline text-base" aria-hidden="true">
            ☁️
          </span>
          <span>
            {isSyncing
              ? `同期中... ${pendingCount}件のデータを処理しています`
              : `未同期データ ${pendingCount}件`}
          </span>
          {!isSyncing && (
            <button
              data-testid={TestIds.SYNC_BUTTON}
              onClick={handleManualSync}
              aria-label="手動で同期する"
              className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded text-xs font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[32px]"
            >
              今すぐ同期
            </button>
          )}
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
 * Phase 3-2: 手動同期機能を統合
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
      data-testid={TestIds.SYNC_BUTTON}
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

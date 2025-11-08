// オンライン/オフラインステータスフック

import { useState, useEffect } from 'react';

/**
 * オンライン/オフラインステータスを監視するフック
 * @returns isOnline - オンライン状態（true: オンライン、false: オフライン）
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    // オンラインになった時のハンドラー
    const handleOnline = () => {
      console.log('[useOnlineStatus] Online');
      setIsOnline(true);
    };

    // オフラインになった時のハンドラー
    const handleOffline = () => {
      console.log('[useOnlineStatus] Offline');
      setIsOnline(false);
    };

    // イベントリスナーを登録
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // クリーンアップ
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
};

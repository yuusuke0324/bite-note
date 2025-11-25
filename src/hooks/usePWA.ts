// PWA機能管理フック

import { useState, useEffect, useCallback } from 'react';
import { offlineQueueService } from '../lib/offline-queue-service';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
}

interface PWAUpdateState {
  updateAvailable: boolean;
  installing: boolean;
  registration: ServiceWorkerRegistration | null;
}

export const usePWA = () => {
  const [installState, setInstallState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
    isStandalone: false,
    platform: 'unknown'
  });

  const [updateState, setUpdateState] = useState<PWAUpdateState>({
    updateAvailable: false,
    installing: false,
    registration: null
  });

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // プラットフォーム検出
  const detectPlatform = useCallback((): PWAInstallState['platform'] => {
    const userAgent = window.navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    }

    if (/android/.test(userAgent)) {
      return 'android';
    }

    if (window.navigator.platform) {
      const platform = window.navigator.platform.toLowerCase();
      if (/win|mac|linux/.test(platform)) {
        return 'desktop';
      }
    }

    return 'unknown';
  }, []);

  // PWA状態の初期化
  useEffect(() => {
    const platform = detectPlatform();
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    const isInstalled =
      isStandalone ||
      localStorage.getItem('pwa-installed') === 'true';

    setInstallState(prev => ({
      ...prev,
      platform,
      isStandalone,
      isInstalled
    }));
  }, [detectPlatform]);

  // Service Worker の登録と管理
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      setUpdateState(prev => ({ ...prev, registration }));

      // アップデート検出
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (newWorker) {
          setUpdateState(prev => ({ ...prev, installing: true }));

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateState(prev => ({
                ...prev,
                updateAvailable: true,
                installing: false
              }));
            }
          });
        }
      });

      // アクティブなService Workerからのメッセージ
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATE_READY') {
          setUpdateState(prev => ({ ...prev, updateAvailable: true }));
        }
      });

      if (import.meta.env.DEV) {
        console.log('[Dev] [PWA] Service Worker registered successfully');
      }
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  };

  // インストールプロンプトの処理
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallState(prev => ({ ...prev, isInstallable: true }));
    };

    const handleAppInstalled = () => {
      if (import.meta.env.DEV) {
        console.log('[Dev] [PWA] App was installed');
      }
      setDeferredPrompt(null);
      setInstallState(prev => ({
        ...prev,
        isInstallable: false,
        isInstalled: true
      }));
      localStorage.setItem('pwa-installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // アプリのインストール
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('[PWA] No install prompt available');
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (import.meta.env.DEV) {
        console.log(`[Dev] [PWA] User response to install prompt: ${outcome}`);
      }

      setDeferredPrompt(null);
      setInstallState(prev => ({ ...prev, isInstallable: false }));

      return outcome === 'accepted';
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Service Worker の更新
  const updateApp = useCallback(async (): Promise<void> => {
    if (!updateState.registration) {
      console.warn('[PWA] No service worker registration found');
      return;
    }

    const waitingWorker = updateState.registration.waiting;

    if (waitingWorker) {
      // 新しいService Workerに切り替えを指示
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });

      // ページリロード
      window.location.reload();
    }
  }, [updateState.registration]);

  // オフライン状態の監視とオンライン復帰時の同期
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);

      // オンライン復帰時にオフラインキューを自動同期
      try {
        setIsSyncing(true);
        const result = await offlineQueueService.syncQueue();

        if (!result.success) {
          console.error('[PWA] Sync failed:', result.error);
        } else if (result.failedCount && result.failedCount > 0) {
          console.warn(`[PWA] Sync partial failure: ${result.failedCount} items failed`);
        }
      } catch (error) {
        console.error('[PWA] Sync error:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // iOS専用のインストール手順表示
  const getIOSInstallInstructions = useCallback(() => {
    if (installState.platform !== 'ios') return null;

    return {
      title: 'ホーム画面に追加',
      steps: [
        'Safari下部の共有ボタン 📤 をタップ',
        '「ホーム画面に追加」を選択',
        '「追加」をタップして完了'
      ]
    };
  }, [installState.platform]);

  // PWA機能の可用性チェック
  const capabilities = {
    serviceWorker: 'serviceWorker' in navigator,
    notification: 'Notification' in window,
    geolocation: 'geolocation' in navigator,
    camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    share: 'share' in navigator,
    clipboard: 'clipboard' in navigator,
    storage: 'storage' in navigator && 'estimate' in navigator.storage
  };

  return {
    // インストール関連
    installState,
    installApp,
    getIOSInstallInstructions,

    // アップデート関連
    updateState,
    updateApp,

    // ネットワーク状態
    isOnline,
    isSyncing,

    // PWA機能
    capabilities,

    // Service Worker関連
    registration: updateState.registration
  };
};
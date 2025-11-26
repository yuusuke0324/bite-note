import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../lib/errors/logger';

// BeforeInstallPromptEvent 型定義
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallBannerProps {
  className?: string;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ className = '' }) => {
  const [dismissed, setDismissed] = useState(() => {
    // ローカルストレージから復元
    try {
      return localStorage.getItem('pwa-banner-dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // スタンドアローンモード検出
  useEffect(() => {
    const checkStandalone = () => {
      return (
        window.matchMedia &&
        window.matchMedia('(display-mode: standalone)').matches
      ) || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    };

    setIsStandalone(checkStandalone());
  }, []);

  // PWAインストールプロンプトのリスニング
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Body要素のクラス管理
  useEffect(() => {
    const body = document.body;
    const shouldShow = !dismissed && !isStandalone && isInstallable;

    if (shouldShow) {
      body.classList.add('pwa-banner-visible');
      // CSS変数を更新
      document.documentElement.style.setProperty('--banner-height', '80px');
    } else {
      body.classList.remove('pwa-banner-visible');
      document.documentElement.style.setProperty('--banner-height', '0px');
    }

    return () => {
      body.classList.remove('pwa-banner-visible');
      document.documentElement.style.setProperty('--banner-height', '0px');
    };
  }, [dismissed, isStandalone, isInstallable]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;

      if (import.meta.env.DEV) {
        logger.debug('PWA install prompt result', { result });
      }

      if (result.outcome === 'accepted') {
        setDismissed(true);
        try {
          localStorage.setItem('pwa-banner-dismissed', 'true');
        } catch (error) {
          logger.warn('Could not save banner state', { error });
        }
      }
    } catch (error) {
      logger.error('Error during PWA installation', { error });
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem('pwa-banner-dismissed', 'true');
    } catch (error) {
      logger.warn('Could not save banner state', { error });
    }
  }, []);

  // 表示条件
  const shouldShow = !dismissed && !isStandalone && isInstallable;

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      className={`pwa-install-banner ${className}`}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1976d2',
        color: 'white',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1000,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.15)',
        animation: 'slideUp 0.3s ease-out',
        minHeight: '60px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <span style={{ fontSize: '24px' }} role="img" aria-label="アプリアイコン">🎣</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600,
            fontSize: '14px',
            marginBottom: '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            アプリをインストール
          </div>
          <div style={{
            fontSize: '12px',
            opacity: 0.9,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            ホーム画面から素早くアクセス
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleInstall}
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'background-color 0.2s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
          }}
        >
          インストール
        </button>
        <button
          onClick={handleDismiss}
          style={{
            backgroundColor: 'transparent',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>

      <style>
        {`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }

          @media (max-width: 480px) {
            .pwa-install-banner {
              padding: 8px 12px !important;
              min-height: 56px !important;
            }
          }
        `}
      </style>
    </div>
  );
};
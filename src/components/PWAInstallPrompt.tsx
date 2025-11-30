// PWAインストールプロンプトコンポーネント

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Smartphone, X } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { logger } from '../lib/errors/logger';

interface PWAInstallPromptProps {
  onDismiss?: () => void;
}

// デフォルト値（usePWAがundefinedを返す場合のフォールバック - テスト環境対応）
const defaultInstallState = {
  isInstallable: false,
  isInstalled: false,
  isStandalone: false,
  platform: 'unknown' as const,
};

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onDismiss }) => {
  const pwaResult = usePWA();
  // 防御的なdestructuring: usePWAがundefinedを返す場合（テスト環境等）のフォールバック
  const {
    installState = defaultInstallState,
    installApp = async () => false,
    getIOSInstallInstructions = () => null,
  } = pwaResult ?? {};
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const mainPromptRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isInstallingRef = useRef(false); // 重複クリック防止用フラグ

  // インストール可能になったら表示
  useEffect(() => {
    if (installState.isInstallable && !installState.isInstalled) {
      // 少し遅らせて表示（UX改善）
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [installState.isInstallable, installState.isInstalled]);

  // 既に非表示にした場合は表示しない
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed) {
        setIsVisible(false);
      }
    } catch (error) {
      logger.warn('Failed to read localStorage', { error });
    }
  }, []);

  // Tab/Shift+Tabキーでフォーカスを循環（メモ化）
  const handleTab = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !modalRef.current) return;

    // モーダル内のフォーカス可能要素を取得（拡張セレクタ）
    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), ' +
      '[href]:not([disabled]), ' +
      'input:not([disabled]), ' +
      'select:not([disabled]), ' +
      'textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"]):not([disabled]), ' +
      'audio[controls], ' +
      'video[controls], ' +
      '[contenteditable]:not([contenteditable="false"])'
    );

    // エッジケース: フォーカス可能要素がない場合
    if (focusableElements.length === 0) return;

    // エッジケース: 要素が1個しかない場合はTab移動を抑止
    if (focusableElements.length === 1) {
      e.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: 逆方向
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab: 順方向
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, []);

  // Escapeキーでモーダルを閉じる（メモ化）
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowIOSInstructions(false);
    }
  }, []);

  // プロンプトを閉じる処理（メモ化）
  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    try {
      localStorage.setItem('pwa-install-dismissed', 'true');
    } catch (error) {
      logger.warn('Failed to save dismiss state', { error });
    }
    onDismiss?.();
  }, [onDismiss]);

  // Escapeキーでメインプロンプトを閉じる（メモ化）
  const handleEscapeMain = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleDismiss();
    }
  }, [handleDismiss]);

  // フォーカストラップ: メインプロンプト内でキーボードナビゲーションを制御
  useEffect(() => {
    if (!isVisible || !mainPromptRef.current) return;

    // 現在のフォーカス要素を保存
    previousFocusRef.current = document.activeElement as HTMLElement;

    // プロンプト内のフォーカス可能要素を取得
    const focusableElements = mainPromptRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), ' +
      '[href]:not([disabled]), ' +
      'input:not([disabled]), ' +
      'select:not([disabled]), ' +
      'textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"]):not([disabled]), ' +
      'audio[controls], ' +
      'video[controls], ' +
      '[contenteditable]:not([contenteditable="false"])'
    );

    // エッジケース: フォーカス可能要素がない場合は警告ログ
    if (focusableElements.length === 0) {
      logger.warn('No focusable elements in main prompt');
      return;
    }

    // 最初の要素にフォーカス
    focusableElements[0]?.focus();

    // イベントリスナー登録
    document.addEventListener('keydown', handleTab);
    document.addEventListener('keydown', handleEscapeMain);

    // クリーンアップ: フォーカスを元の要素に戻す
    return () => {
      document.removeEventListener('keydown', handleTab);
      document.removeEventListener('keydown', handleEscapeMain);
      previousFocusRef.current?.focus();
    };
  }, [isVisible, handleTab, handleEscapeMain]);

  // フォーカストラップ: iOSモーダル内でキーボードナビゲーションを制御
  useEffect(() => {
    if (!showIOSInstructions || !modalRef.current) return;

    // 現在のフォーカス要素を保存
    previousFocusRef.current = document.activeElement as HTMLElement;

    // モーダル内のフォーカス可能要素を取得
    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), ' +
      '[href]:not([disabled]), ' +
      'input:not([disabled]), ' +
      'select:not([disabled]), ' +
      'textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"]):not([disabled]), ' +
      'audio[controls], ' +
      'video[controls], ' +
      '[contenteditable]:not([contenteditable="false"])'
    );

    // エッジケース: フォーカス可能要素がない場合は警告ログ
    if (focusableElements.length === 0) {
      logger.warn('No focusable elements in iOS modal');
      return;
    }

    // 最初の要素にフォーカス
    focusableElements[0]?.focus();

    // イベントリスナー登録
    document.addEventListener('keydown', handleTab);
    document.addEventListener('keydown', handleEscape);

    // クリーンアップ: フォーカスを元の要素に戻す
    return () => {
      document.removeEventListener('keydown', handleTab);
      document.removeEventListener('keydown', handleEscape);
      previousFocusRef.current?.focus();
    };
  }, [showIOSInstructions, handleTab, handleEscape]);

  const handleInstall = async () => {
    // 重複クリック防止（useRefで即座に反映）
    if (isInstallingRef.current) return;
    isInstallingRef.current = true;

    if (installState.platform === 'ios') {
      setShowIOSInstructions(true);
      isInstallingRef.current = false;
      return;
    }

    setIsInstalling(true);

    try {
      const installed = await installApp();

      if (installed) {
        setIsVisible(false);
        onDismiss?.();
      }
    } catch (error) {
      logger.error('Install failed', { error });
    } finally {
      setIsInstalling(false);
      isInstallingRef.current = false;
    }
  };

  const iosInstructions = getIOSInstallInstructions();

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* メインのインストールプロンプト */}
      <div
        ref={mainPromptRef}
        role="dialog"
        aria-labelledby="install-prompt-title"
        aria-describedby="install-prompt-description"
        style={{
          position: 'fixed',
          bottom: '1rem',
          left: '1rem',
          right: '1rem',
          backgroundColor: 'var(--color-surface-primary)',
          borderRadius: '12px',
          padding: '1rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          border: `1px solid ${'var(--color-border-light)'}`,
          zIndex: 1000,
          animation: 'slideUp 0.3s ease-out',
          maxWidth: '400px',
          margin: '0 auto'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem'
        }}>
          {/* アプリアイコン */}
          <img
            src="/icons/icon-96x96.png"
            alt="Bite Note"
            style={{
              flexShrink: 0,
              width: '48px',
              height: '48px',
              borderRadius: '12px'
            }}
          />

          {/* コンテンツ */}
          <div style={{ flex: 1 }}>
            <h3
              id="install-prompt-title"
              style={{
                margin: '0 0 0.5rem 0',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                color: 'var(--color-text-primary)'
              }}
            >
              アプリをインストールしませんか？
            </h3>

            <p
              id="install-prompt-description"
              style={{
                margin: '0 0 1rem 0',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.4
              }}
            >
              {installState.platform === 'ios'
                ? 'ホーム画面に追加して、いつでも簡単にアクセス'
                : 'デバイスにインストールして、より快適にご利用いただけます'
              }
            </p>

            {/* ボタン */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                style={{
                  backgroundColor: 'var(--color-primary-500)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  cursor: isInstalling ? 'not-allowed' : 'pointer',
                  opacity: isInstalling ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease'
                }}
              >
                {isInstalling ? (
                  <>
                    <div
                      role="status"
                      aria-live="polite"
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}
                    />
                    <span className="sr-only">インストール中です。しばらくお待ちください。</span>
                    インストール中...
                  </>
                ) : (
                  <>
                    <Smartphone size={16} aria-hidden="true" />
                    {installState.platform === 'ios' ? '追加方法を見る' : 'インストール'}
                  </>
                )}
              </button>

              <button
                onClick={handleDismiss}
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-secondary)',
                  border: `1px solid ${'var(--color-border-light)'}`,
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                後で
              </button>
            </div>
          </div>

          {/* 閉じるボタン */}
          <button
            onClick={handleDismiss}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              padding: '0',
              borderRadius: '4px',
              flexShrink: 0,
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="インストールプロンプトを閉じる"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* iOS用の手順モーダル */}
      {showIOSInstructions && iosInstructions && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: '1rem'
          }}
          onClick={() => setShowIOSInstructions(false)}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-modal-title"
            style={{
              backgroundColor: 'var(--color-surface-primary)',
              borderRadius: '12px',
              padding: '2rem',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
              border: `1px solid ${'var(--color-border-light)'}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <Smartphone size={48} color="#60a5fa" aria-hidden="true" />
              </div>
              <h2
                id="ios-modal-title"
                style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: 'var(--color-text-primary)'
                }}
              >
                {iosInstructions.title}
              </h2>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              {iosInstructions.steps.map((step, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--color-surface-secondary)',
                    borderRadius: '8px',
                    border: `1px solid ${'var(--color-border-light)'}`
                  }}
                >
                  <div style={{
                    backgroundColor: 'var(--color-primary-500)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>
                    {index + 1}
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.4
                  }}>
                    {step}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setShowIOSInstructions(false);
                handleDismiss();
              }}
              style={{
                width: '100%',
                backgroundColor: 'var(--color-primary-500)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              わかりました
            </button>
          </div>
        </div>
      )}

      {/* CSS アニメーション */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* ホバーエフェクト */
        button:not(:disabled):hover {
          filter: brightness(1.05);
        }

        button:focus {
          outline: 2px solid ${'var(--color-primary-500)'};
          outline-offset: 2px;
        }

        /* スクリーンリーダー専用テキスト */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        /* モバイル対応 */
        @media (max-width: 768px) {
          .pwa-install-prompt {
            left: 0.5rem;
            right: 0.5rem;
            bottom: 0.5rem;
          }

          .pwa-install-prompt .buttons {
            flex-direction: column;
          }

          .pwa-install-prompt button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
};
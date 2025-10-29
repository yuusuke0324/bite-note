// PWAインストールプロンプトコンポーネント

import React, { useState, useEffect } from 'react';
import { usePWA } from '../hooks/usePWA';

interface PWAInstallPromptProps {
  onDismiss?: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onDismiss }) => {
  const { installState, installApp, getIOSInstallInstructions } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

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
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setIsVisible(false);
    }
  }, []);

  const handleInstall = async () => {
    if (installState.platform === 'ios') {
      setShowIOSInstructions(true);
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
      console.error('Install failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    onDismiss?.();
  };

  const iosInstructions = getIOSInstallInstructions();

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* メインのインストールプロンプト */}
      <div
        style={{
          position: 'fixed',
          bottom: '1rem',
          left: '1rem',
          right: '1rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          border: '1px solid #e1e5e9',
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
          {/* アイコン */}
          <div style={{
            fontSize: '2rem',
            flexShrink: 0
          }}>
            🎣
          </div>

          {/* コンテンツ */}
          <div style={{ flex: 1 }}>
            <h3 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: '#333'
            }}>
              アプリをインストールしませんか？
            </h3>

            <p style={{
              margin: '0 0 1rem 0',
              fontSize: '0.875rem',
              color: '#666',
              lineHeight: 1.4
            }}>
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
                  backgroundColor: '#007bff',
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
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    インストール中...
                  </>
                ) : (
                  <>
                    📱 {installState.platform === 'ios' ? '追加方法を見る' : 'インストール'}
                  </>
                )}
              </button>

              <button
                onClick={handleDismiss}
                style={{
                  backgroundColor: 'transparent',
                  color: '#6c757d',
                  border: '1px solid #dee2e6',
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
              color: '#6c757d',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '4px',
              flexShrink: 0
            }}
            aria-label="閉じる"
          >
            ✕
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
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
              <h2 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#333'
              }}>
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
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{
                    backgroundColor: '#007bff',
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
                    color: '#333',
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
                backgroundColor: '#007bff',
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
          outline: 2px solid #007bff;
          outline-offset: 2px;
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
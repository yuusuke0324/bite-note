// セッション期限切れ再認証プロンプト
// Phase 3-4: セッション管理機能実装

import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { TestIds } from '../../../constants/testIds';
import { colors } from '../../../theme/colors';

interface ReAuthPromptProps {
  unsavedCount: number;
  onReconnect: () => void;
  onExport: () => void;
  onClose?: () => void;
  isReconnecting?: boolean;
}

export const ReAuthPrompt: React.FC<ReAuthPromptProps> = ({
  unsavedCount,
  onReconnect,
  onExport,
  onClose,
  isReconnecting = false,
}) => {
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  // モーダル表示時に自動フォーカス
  useEffect(() => {
    primaryButtonRef.current?.focus();
  }, []);

  // Escapeキーのハンドリング
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isReconnecting) {
        // 確認ダイアログ
        if (
          window.confirm(
            '閉じると未保存のデータが失われる可能性があります。本当に閉じますか?'
          )
        ) {
          onClose?.();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isReconnecting]);

  // 背景クリックのハンドリング
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isReconnecting && onClose) {
      // 確認ダイアログ
      if (
        window.confirm(
          '閉じると未保存のデータが失われる可能性があります。本当に閉じますか?'
        )
      ) {
        onClose();
      }
    }
  };

  // ×ボタンのハンドリング
  const handleCloseClick = () => {
    if (!isReconnecting && onClose) {
      // 確認ダイアログ
      if (
        window.confirm(
          '閉じると未保存のデータが失われる可能性があります。本当に閉じますか?'
        )
      ) {
        onClose();
      }
    }
  };

  return (
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
        padding: '1rem',
      }}
      onClick={handleBackgroundClick}
      role="presentation"
      data-testid={TestIds.SESSION_TIMEOUT_MODAL}
    >
      <div
        role="alertdialog"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        aria-modal="true"
        style={{
          backgroundColor: 'var(--color-surface-primary)',
          borderRadius: '12px',
          padding: '2rem',
          width: '100%',
          maxWidth: '400px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
          border: `1px solid ${'var(--color-border-light)'}`,
          animation: 'modalFadeInScale 0.25s ease-out',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid={TestIds.REAUTH_PROMPT}
      >
        {/* ヘッダー */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'center',
            }}
            aria-hidden="true"
          >
            <AlertTriangle size={48} color="#FBBC04" />
          </div>
          <h2
            id="modal-title"
            style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'var(--color-text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            セッションが期限切れになりました
          </h2>
        </div>

        {/* 本文 */}
        <div
          id="modal-description"
          style={{
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            color: 'var(--color-text-secondary)',
            lineHeight: '1.6',
          }}
        >
          <p style={{ margin: '0 0 1rem 0' }}>
            しばらく操作がなかったため、接続が切れました。
            {unsavedCount > 0 && (
              <strong
                style={{
                  display: 'block',
                  marginTop: '0.5rem',
                  color: '#EA4335',
                }}
              >
                保存されていない記録が{unsavedCount}件あります。
              </strong>
            )}
          </p>
          <p style={{ margin: 0 }}>
            再接続してデータを保存することをおすすめします。
          </p>
        </div>

        {/* ボタンエリア */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
          className="reauth-buttons"
        >
          <button
            ref={primaryButtonRef}
            type="button"
            onClick={onReconnect}
            disabled={isReconnecting}
            aria-label="データベースに再接続してデータを保存する"
            data-testid={TestIds.RECONNECT_AND_SAVE_BUTTON}
            style={{
              width: '100%',
              minHeight: '48px',
              padding: '0.75rem 1.5rem',
              backgroundColor: isReconnecting ? '#3b82f6' : '#60a5fa',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isReconnecting ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              opacity: isReconnecting ? 0.7 : 1,
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {isReconnecting ? (
              <>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                再接続中...
              </>
            ) : (
              '再接続して保存'
            )}
          </button>

          <button
            type="button"
            onClick={onExport}
            disabled={isReconnecting}
            aria-label="データをJSON形式でエクスポートする"
            data-testid={TestIds.EXPORT_NOW_BUTTON}
            style={{
              width: '100%',
              minHeight: '48px',
              padding: '0.75rem 1.5rem',
              backgroundColor: isReconnecting ? 'var(--color-surface-secondary)' : 'var(--color-surface-primary)',
              color: isReconnecting ? 'var(--color-text-secondary)' : '#60a5fa',
              border: `2px solid ${isReconnecting ? 'var(--color-border-medium)' : '#60a5fa'}`,
              borderRadius: '6px',
              cursor: isReconnecting ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              opacity: isReconnecting ? 0.7 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            今すぐエクスポート
          </button>
        </div>

        {/* 閉じるボタン */}
        {onClose && (
          <button
            type="button"
            aria-label="閉じる"
            onClick={handleCloseClick}
            disabled={isReconnecting}
            data-testid={TestIds.SESSION_MODAL_CLOSE_BUTTON}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '50%',
              cursor: isReconnecting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              color: 'var(--color-text-secondary)',
              opacity: isReconnecting ? 0.5 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* CSS アニメーション */}
      <style>{`
        @keyframes modalFadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
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

        button:not(:disabled):active {
          filter: brightness(0.95);
        }

        button:focus {
          outline: 2px solid #60a5fa;
          outline-offset: 2px;
        }

        /* 閉じるボタンのホバーエフェクト */
        button[aria-label="閉じる"]:not(:disabled):hover {
          background-color: ${'var(--color-surface-secondary)'};
        }

        /* デスクトップでボタンを横並びに */
        @media (min-width: 481px) {
          .reauth-buttons {
            flex-direction: row !important;
            gap: 16px !important;
          }

          .reauth-buttons button {
            width: auto !important;
            flex: 1;
          }
        }

        /* モバイル最適化（縦並びボタン） */
        @media (max-width: 480px) {
          .reauth-buttons {
            flex-direction: column !important;
          }

          .reauth-buttons button {
            width: 100% !important;
            min-height: 44px !important;
          }
        }
      `}</style>
    </div>
  );
};

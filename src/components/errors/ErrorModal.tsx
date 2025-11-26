/**
 * ErrorModal.tsx - モーダルエラー表示
 * 重要なエラーをモーダルで表示
 */

import React from 'react';
import { AppError, ErrorSeverity } from '../../lib/errors/ErrorTypes';
import { Icon } from '../ui/Icon';
import { Info, AlertTriangle, XCircle, AlertOctagon, X } from 'lucide-react';

export interface ErrorModalProps {
  error: AppError | Error;
  onClose: () => void;
  showStackTrace?: boolean;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  error,
  onClose,
  showStackTrace = false
}) => {
  const isAppError = error instanceof AppError;
  const severity = isAppError ? error.severity : ErrorSeverity.ERROR;
  const message = isAppError ? error.userMessage : error.message;
  const code = isAppError ? error.code : 'UNKNOWN_ERROR';

  // アイコンの選択
  const getIcon = () => {
    switch (severity) {
      case ErrorSeverity.INFO:
        return Info;
      case ErrorSeverity.WARNING:
        return AlertTriangle;
      case ErrorSeverity.ERROR:
        return XCircle;
      case ErrorSeverity.CRITICAL:
        return AlertOctagon;
      default:
        return XCircle;
    }
  };

  // アイコンカラーの選択
  const getIconColor = () => {
    switch (severity) {
      case ErrorSeverity.INFO:
        return 'info';
      case ErrorSeverity.WARNING:
        return 'warning';
      case ErrorSeverity.ERROR:
        return 'error';
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'error';
    }
  };

  // タイトル色の選択
  const getTitleColor = () => {
    switch (severity) {
      case ErrorSeverity.INFO:
        return '#0c5460';
      case ErrorSeverity.WARNING:
        return '#856404';
      case ErrorSeverity.ERROR:
        return '#721c24';
      case ErrorSeverity.CRITICAL:
        return '#58151c';
      default:
        return '#721c24';
    }
  };

  return (
    <>
      {/* オーバーレイ */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
      >
        {/* モーダルコンテンツ */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* ヘッダー */}
          <div
            style={{
              padding: '1.5rem',
              borderBottom: '1px solid #dee2e6',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <Icon icon={getIcon()} size={32} color={getIconColor() as 'info' | 'warning' | 'error'} decorative />
            <div style={{ flex: 1 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  color: getTitleColor(),
                  fontWeight: 'bold'
                }}
              >
                {severity === ErrorSeverity.INFO && '情報'}
                {severity === ErrorSeverity.WARNING && '警告'}
                {severity === ErrorSeverity.ERROR && 'エラー'}
                {severity === ErrorSeverity.CRITICAL && '重大なエラー'}
              </h2>
              {isAppError && (
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: '#6c757d',
                    marginTop: '0.25rem'
                  }}
                >
                  エラーコード: {code}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.5rem',
                color: '#6c757d',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="閉じる"
            >
              <Icon icon={X} size={24} decorative />
            </button>
          </div>

          {/* コンテンツ */}
          <div style={{ padding: '1.5rem' }}>
            {/* エラーメッセージ */}
            <div
              style={{
                fontSize: '1rem',
                color: '#333',
                lineHeight: '1.6',
                marginBottom: '1.5rem'
              }}
            >
              {message}
            </div>

            {/* コンテキスト情報 */}
            {isAppError && error.context && Object.keys(error.context).length > 0 && (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  marginBottom: '1.5rem'
                }}
              >
                <div
                  style={{
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    color: '#495057',
                    marginBottom: '0.5rem'
                  }}
                >
                  詳細情報:
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                  {Object.entries(error.context).map(([key, value]) => (
                    <div key={key} style={{ marginBottom: '0.25rem' }}>
                      <strong>{key}:</strong> {String(value)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* スタックトレース（開発環境のみ） */}
            {showStackTrace && error.stack && (
              <details style={{ marginBottom: '1.5rem' }}>
                <summary
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: '#6c757d',
                    marginBottom: '0.5rem'
                  }}
                >
                  スタックトレース（開発用）
                </summary>
                <pre
                  style={{
                    marginTop: '0.5rem',
                    padding: '1rem',
                    backgroundColor: '#f1f3f4',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: '200px',
                    color: '#333'
                  }}
                >
                  {error.stack}
                </pre>
              </details>
            )}

            {/* リカバリーアクション */}
            {isAppError && error.recovery?.actions && error.recovery.actions.length > 0 && (
              <div>
                <div
                  style={{
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    color: '#495057',
                    marginBottom: '0.75rem'
                  }}
                >
                  次の操作を選択してください:
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {error.recovery.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        action.handler();
                        onClose();
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor:
                          action.variant === 'danger'
                            ? '#dc3545'
                            : action.primary
                            ? '#007bff'
                            : '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* デフォルトの閉じるボタン（アクションがない場合） */}
            {(!isAppError || !error.recovery?.actions || error.recovery.actions.length === 0) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 'bold'
                  }}
                >
                  閉じる
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

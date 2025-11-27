/**
 * ErrorModal.tsx - モーダルエラー表示
 * 重要なエラーをモーダルで表示
 */

import React from 'react';
import { Info, AlertTriangle, XCircle, AlertOctagon, X } from 'lucide-react';
import { AppError, ErrorSeverity } from '../../lib/errors/ErrorTypes';
import { colors } from '../../theme/colors';

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

  // アイコンマップの定義
  const iconConfig = {
    [ErrorSeverity.INFO]: { Icon: Info, color: '#3B82F6' },
    [ErrorSeverity.WARNING]: { Icon: AlertTriangle, color: '#F59E0B' },
    [ErrorSeverity.ERROR]: { Icon: XCircle, color: '#EF4444' },
    [ErrorSeverity.CRITICAL]: { Icon: AlertOctagon, color: '#DC2626' },
  };

  const { Icon: StatusIcon, color: iconColor } = iconConfig[severity] || iconConfig[ErrorSeverity.ERROR];

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
            backgroundColor: colors.surface.primary,
            borderRadius: '12px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
            border: `1px solid ${colors.border.light}`
          }}
        >
          {/* ヘッダー */}
          <div
            style={{
              padding: '1.5rem',
              borderBottom: `1px solid ${colors.border.light}`,
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <StatusIcon size={24} color={iconColor} aria-hidden="true" />
            </div>
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
                    color: colors.text.secondary,
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
                color: colors.text.secondary,
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="閉じる"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {/* コンテンツ */}
          <div style={{ padding: '1.5rem' }}>
            {/* エラーメッセージ */}
            <div
              style={{
                fontSize: '1rem',
                color: colors.text.primary,
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
                  backgroundColor: colors.surface.secondary,
                  borderRadius: '6px',
                  marginBottom: '1.5rem'
                }}
              >
                <div
                  style={{
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    color: colors.text.primary,
                    marginBottom: '0.5rem'
                  }}
                >
                  詳細情報:
                </div>
                <div style={{ fontSize: '0.85rem', color: colors.text.secondary }}>
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
                    color: colors.text.secondary,
                    marginBottom: '0.5rem'
                  }}
                >
                  スタックトレース（開発用）
                </summary>
                <pre
                  style={{
                    marginTop: '0.5rem',
                    padding: '1rem',
                    backgroundColor: colors.surface.secondary,
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: '200px',
                    color: colors.text.primary
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
                    color: colors.text.primary,
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
                            ? '#ef4444'
                            : action.primary
                            ? '#60a5fa'
                            : colors.surface.secondary,
                        color: action.variant === 'danger' || action.primary ? 'white' : colors.text.primary,
                        border: action.variant === 'danger' || action.primary ? 'none' : `1px solid ${colors.border.medium}`,
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
                    backgroundColor: colors.surface.secondary,
                    color: colors.text.primary,
                    border: `1px solid ${colors.border.medium}`,
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

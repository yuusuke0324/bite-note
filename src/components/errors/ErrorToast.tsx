/**
 * ErrorToast.tsx - トースト通知UI
 * エラーメッセージを画面下部に表示
 */

import React, { useEffect, useState, useCallback } from 'react';
import { AppError, ErrorSeverity } from '../../lib/errors/ErrorTypes';

export interface ErrorToastProps {
  error: AppError | Error;
  onClose: () => void;
  autoHideDuration?: number | null;
  showIcon?: boolean;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  error,
  onClose,
  autoHideDuration = 5000,
  showIcon = true
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const isAppError = error instanceof AppError;
  const severity = isAppError ? error.severity : ErrorSeverity.ERROR;
  const message = isAppError ? error.userMessage : error.message;

  // アイコンの選択
  const getIcon = () => {
    switch (severity) {
      case ErrorSeverity.INFO:
        return 'ℹ️';
      case ErrorSeverity.WARNING:
        return '⚠️';
      case ErrorSeverity.ERROR:
        return '❌';
      case ErrorSeverity.CRITICAL:
        return '🚨';
      default:
        return '❌';
    }
  };

  // 背景色の選択
  const getBackgroundColor = () => {
    switch (severity) {
      case ErrorSeverity.INFO:
        return '#d1ecf1';
      case ErrorSeverity.WARNING:
        return '#fff3cd';
      case ErrorSeverity.ERROR:
        return '#f8d7da';
      case ErrorSeverity.CRITICAL:
        return '#f5c2c7';
      default:
        return '#f8d7da';
    }
  };

  // 文字色の選択
  const getTextColor = () => {
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

  // ボーダー色の選択
  const getBorderColor = () => {
    switch (severity) {
      case ErrorSeverity.INFO:
        return '#bee5eb';
      case ErrorSeverity.WARNING:
        return '#ffeaa7';
      case ErrorSeverity.ERROR:
        return '#f5c6cb';
      case ErrorSeverity.CRITICAL:
        return '#f1aeb5';
      default:
        return '#f5c6cb';
    }
  };

  // handleCloseをuseCallbackでメモ化（useEffectより前に定義）
  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300); // アニメーション時間
  }, [onClose]);

  // 自動非表示
  useEffect(() => {
    if (autoHideDuration && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [autoHideDuration, handleClose]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isExiting ? '-100px' : '20px',
        right: '20px',
        maxWidth: '400px',
        width: '90%',
        backgroundColor: getBackgroundColor(),
        border: `1px solid ${getBorderColor()}`,
        borderRadius: '8px',
        padding: '1rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 9999,
        transition: 'all 0.3s ease-in-out',
        opacity: isExiting ? 0 : 1,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}
    >
      {/* アイコン */}
      {showIcon && (
        <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>
          {getIcon()}
        </div>
      )}

      {/* メッセージ */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 'bold',
            color: getTextColor(),
            marginBottom: '0.25rem',
            fontSize: '0.95rem'
          }}
        >
          {severity === ErrorSeverity.INFO && '情報'}
          {severity === ErrorSeverity.WARNING && '警告'}
          {severity === ErrorSeverity.ERROR && 'エラー'}
          {severity === ErrorSeverity.CRITICAL && '重大なエラー'}
        </div>
        <div
          style={{
            color: getTextColor(),
            fontSize: '0.9rem',
            wordBreak: 'break-word'
          }}
        >
          {message}
        </div>

        {/* リカバリーアクション */}
        {isAppError && error.recovery?.actions && error.recovery.actions.length > 0 && (
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {error.recovery.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.handler();
                  handleClose();
                }}
                style={{
                  padding: '0.4rem 0.8rem',
                  backgroundColor: action.primary ? '#007bff' : 'transparent',
                  color: action.primary ? 'white' : getTextColor(),
                  border: action.primary ? 'none' : `1px solid ${getBorderColor()}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: action.primary ? 'bold' : 'normal'
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 閉じるボタン */}
      <button
        onClick={handleClose}
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.2rem',
          color: getTextColor(),
          padding: '0',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          opacity: 0.7
        }}
        aria-label="閉じる"
      >
        ✕
      </button>
    </div>
  );
};

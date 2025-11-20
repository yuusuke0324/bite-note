// フィードバックトーストコンポーネント

import React, { useEffect, useState, useCallback } from 'react';
import { TestIds } from '../constants/testIds';

export interface FeedbackToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  actions?: Array<{
    label: string;
    action: () => void;
    style?: 'primary' | 'secondary';
  }>;
}

export const FeedbackToast: React.FC<FeedbackToastProps> = ({
  type,
  message,
  isVisible,
  onClose,
  duration = 5000,
  position = 'top-right',
  actions
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  // tech-lead指摘: handleCloseをuseCallbackでメモ化
  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300); // アニメーション完了を待つ
  }, [onClose]);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);

      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, duration, handleClose]); // tech-lead指摘: handleCloseを依存配列に追加

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <span data-testid="success-icon">✓</span>;
      case 'error':
        return <span data-testid="error-icon">✗</span>;
      case 'warning':
        return <span data-testid="warning-icon">⚠</span>;
      case 'info':
        return <span data-testid="info-icon">ℹ</span>;
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#d4edda';
      case 'error':
        return '#f8d7da';
      case 'warning':
        return '#fff3cd';
      case 'info':
        return '#cce7ff';
      default:
        return '#f8f9fa';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return '#c3e6cb';
      case 'error':
        return '#f5c6cb';
      case 'warning':
        return '#ffeaa7';
      case 'info':
        return '#b3d9ff';
      default:
        return '#dee2e6';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return '#155724';
      case 'error':
        return '#721c24';
      case 'warning':
        return '#856404';
      case 'info':
        return '#004085';
      default:
        return '#333';
    }
  };

  const getPositionStyle = () => {
    const baseStyle = {
      position: 'fixed' as const,
      zIndex: 9999,
      transform: isAnimating ? 'translateY(0)' : 'translateY(-100%)',
      opacity: isAnimating ? 1 : 0,
      transition: 'all 0.3s ease-in-out'
    };

    switch (position) {
      case 'top-right':
        return { ...baseStyle, top: '1rem', right: '1rem' };
      case 'top-left':
        return { ...baseStyle, top: '1rem', left: '1rem' };
      case 'top-center':
        return { ...baseStyle, top: '1rem', left: '50%', transform: `translateX(-50%) ${isAnimating ? 'translateY(0)' : 'translateY(-100%)'}` };
      case 'bottom-right':
        return { ...baseStyle, bottom: '1rem', right: '1rem', transform: isAnimating ? 'translateY(0)' : 'translateY(100%)' };
      case 'bottom-left':
        return { ...baseStyle, bottom: '1rem', left: '1rem', transform: isAnimating ? 'translateY(0)' : 'translateY(100%)' };
      case 'bottom-center':
        return { ...baseStyle, bottom: '1rem', left: '50%', transform: `translateX(-50%) ${isAnimating ? 'translateY(0)' : 'translateY(100%)'}` };
      default:
        return { ...baseStyle, top: '1rem', right: '1rem' };
    }
  };

  if (!isVisible && !isAnimating) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      style={{
        ...getPositionStyle(),
        maxWidth: '400px',
        minWidth: '300px',
        padding: '1rem',
        backgroundColor: getBackgroundColor(),
        border: `1px solid ${getBorderColor()}`,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        color: getTextColor()
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        {/* アイコン */}
        <div
          style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            marginTop: '0.125rem'
          }}
        >
          {getIcon()}
        </div>

        {/* メッセージ */}
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.4 }}>
            {message}
          </p>

          {/* アクションボタン */}
          {actions && actions.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  data-testid={TestIds.TOAST_ACTION_BUTTON}
                  style={{
                    padding: '0.625rem 1rem',
                    fontSize: '0.875rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    minHeight: '44px',
                    backgroundColor: action.style === 'primary' ? getTextColor() : 'transparent',
                    color: action.style === 'primary' ? '#fff' : getTextColor(),
                    border: action.style === 'primary' ? 'none' : `1px solid ${getBorderColor()}`
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
          data-testid={TestIds.TOAST_CLOSE_BUTTON}
          aria-label="通知を閉じる"
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.25rem',
            cursor: 'pointer',
            color: getTextColor(),
            opacity: 0.7,
            padding: '0',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};
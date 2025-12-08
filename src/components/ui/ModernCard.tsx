import React, { type ReactNode } from 'react';
import { useRipple } from '../../hooks/useRipple';

interface ModernCardProps {
  children: ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  variant = 'elevated',
  size = 'md',
  interactive = false,
  loading = false,
  onClick,
  className = '',
  style = {},
  'data-testid': dataTestId
}) => {
  const isClickable = interactive || !!onClick;

  // リップル効果（インタラクティブな場合のみ）
  const { createRipple } = useRipple<HTMLDivElement>({
    color: 'rgba(100, 100, 100, 0.2)',
    duration: 500,
    size: 120,
  });

  const getBaseStyles = (): React.CSSProperties => ({
    borderRadius: '16px',
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    position: 'relative',
    overflow: 'hidden',
    cursor: isClickable ? 'pointer' : 'default',
    userSelect: 'none',
    ...style,
  });

  const getSizeStyles = (): React.CSSProperties => {
    const sizes = {
      sm: {
        padding: '4px 8px',
        minHeight: 'auto',
        height: 'auto'
      },
      md: {
        padding: '16px',
        minHeight: 'auto' // コンテンツに合わせた高さ
      },
      lg: {
        padding: '24px',
        minHeight: 'auto' // コンテンツに合わせた高さ
      },
    };
    return sizes[size];
  };

  const getVariantStyles = (): React.CSSProperties => {
    const variants = {
      elevated: {
        backgroundColor: 'var(--color-surface-primary)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        border: '1px solid var(--color-border-light)',
      },
      outlined: {
        backgroundColor: 'var(--color-surface-primary)',
        border: '1px solid var(--color-border-light)',
        boxShadow: 'none',
      },
      filled: {
        backgroundColor: 'var(--color-surface-secondary)',
        boxShadow: 'none',
      },
    };
    return variants[variant];
  };

  // Hover CSS class (iOS Safari対応)
  const getHoverClassName = (): string => {
    if (!isClickable) return '';
    return 'modern-card-hover';
  };

  const loadingOverlayStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--color-loading-overlay)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  };

  const combinedStyles = {
    ...getBaseStyles(),
    ...getSizeStyles(),
    ...getVariantStyles(),
  };

  const LoadingSpinner = () => (
    <div
      style={{
        width: '24px',
        height: '24px',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        borderTop: '2px solid #60a5fa',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  );

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div
        style={combinedStyles}
        className={[className, getHoverClassName()].filter(Boolean).join(' ')}
        onClick={onClick}
        onPointerDown={(e) => {
          if (isClickable) {
            createRipple(e as unknown as React.MouseEvent<HTMLDivElement>);
          }
        }}
        data-testid={dataTestId}
      >
        {children}

        {/* ローディングオーバーレイ */}
        {loading && (
          <div style={loadingOverlayStyles}>
            <LoadingSpinner />
          </div>
        )}
      </div>
    </>
  );
};

// プリセットカード
export const PhotoCard: React.FC<Omit<ModernCardProps, 'variant' | 'size'>> = (props) => (
  <ModernCard {...props} variant="elevated" size="md" interactive />
);

export const InfoCard: React.FC<Omit<ModernCardProps, 'variant'>> = (props) => (
  <ModernCard {...props} variant="outlined" />
);

export const ActionCard: React.FC<Omit<ModernCardProps, 'variant'>> = (props) => (
  <ModernCard {...props} variant="filled" interactive />
);

export default ModernCard;
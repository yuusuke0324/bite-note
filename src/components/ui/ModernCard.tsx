import React, { type ReactNode, useState } from 'react';

interface ModernCardProps {
  children: ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  loading?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
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
  onMouseEnter,
  onMouseLeave,
  className = '',
  style = {},
  'data-testid': dataTestId
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getBaseStyles = (): React.CSSProperties => ({
    borderRadius: '16px',
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    position: 'relative',
    overflow: 'hidden',
    cursor: interactive || onClick ? 'pointer' : 'default',
    userSelect: 'none',
    ...style,
  });

  const getSizeStyles = (): React.CSSProperties => {
    const sizes = {
      sm: {
        padding: '4px 8px',
        minHeight: 'auto',
        height: 'auto' // コンテンツに合わせた高さ
      },
      md: {
        padding: '16px',
        minHeight: '160px' // カードサイズの統一
      },
      lg: {
        padding: '24px',
        minHeight: '200px' // 大きなカード用
      },
    };
    return sizes[size];
  };

  const getVariantStyles = (): React.CSSProperties => {
    const variants = {
      elevated: {
        backgroundColor: '#1e293b',
        boxShadow: isHovered
          ? '0 14px 28px rgba(0,0,0,0.4), 0 10px 10px rgba(0,0,0,0.3)'
          : '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        transform: isHovered && (interactive || onClick) ? 'translateY(-2px)' : 'translateY(0)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      },
      outlined: {
        backgroundColor: '#1e293b',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: 'none',
      },
      filled: {
        backgroundColor: '#334155',
        boxShadow: 'none',
      },
    };
    return variants[variant];
  };

  const loadingOverlayStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
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
        className={className}
        onClick={onClick}
        onMouseEnter={() => {
          setIsHovered(true);
          onMouseEnter?.();
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          onMouseLeave?.();
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
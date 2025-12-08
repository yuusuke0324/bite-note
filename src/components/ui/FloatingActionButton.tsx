import React, { forwardRef, type ReactNode } from 'react';
import { colors } from '../../theme/colors';

export interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'accent';
  icon: ReactNode;
  extended?: boolean;
  loading?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}

const FloatingActionButton = forwardRef<HTMLButtonElement, FloatingActionButtonProps>(({
  size = 'lg',
  variant = 'primary',
  icon,
  extended = false,
  loading = false,
  disabled = false,
  children,
  className = '',
  style = {},
  ...props
}, ref) => {
  // Base styles
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: extended ? '8px' : '0',
    border: 'none',
    borderRadius: extended ? '24px' : '50%',
    fontFamily: 'inherit',
    fontWeight: 500,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    userSelect: 'none',
    zIndex: 1000,
    ...style,
  };

  // Size styles
  const sizeStyles: Record<string, React.CSSProperties> = {
    md: {
      width: extended ? 'auto' : '48px',
      height: '48px',
      padding: extended ? '0 16px' : '0',
      fontSize: '14px',
      minWidth: extended ? '80px' : '48px',
    },
    lg: {
      width: extended ? 'auto' : '56px',
      height: '56px',
      padding: extended ? '0 20px' : '0',
      fontSize: '16px',
      minWidth: extended ? '96px' : '56px',
    },
  };

  // Variant styles
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: disabled ? 'var(--color-surface-disabled)' : colors.primary[500],
      color: 'var(--color-text-inverse)',
      boxShadow: disabled ?
        'none' :
        '0 6px 10px 4px rgba(60,64,67,.15), 0 2px 3px rgba(60,64,67,.3)',
    },
    secondary: {
      backgroundColor: disabled ? 'var(--color-surface-disabled)' : colors.secondary[500],
      color: 'var(--color-text-inverse)',
      boxShadow: disabled ?
        'none' :
        '0 6px 10px 4px rgba(60,64,67,.15), 0 2px 3px rgba(60,64,67,.3)',
    },
    accent: {
      backgroundColor: disabled ? 'var(--color-surface-disabled)' : colors.accent[500],
      color: 'var(--color-text-inverse)',
      boxShadow: disabled ?
        'none' :
        '0 6px 10px 4px rgba(255,107,53,.15), 0 2px 3px rgba(255,107,53,.3)',
    },
  };

  // Hover CSS class (iOS Safari対応: CSSで@media (hover: hover)を使用)
  const getHoverClassName = (): string => {
    if (disabled || loading) return '';
    return 'fab-hover';
  };

  // Loading spinner
  const LoadingSpinner = () => (
    <div
      style={{
        width: '20px',
        height: '20px',
        border: '2px solid transparent',
        borderTop: '2px solid currentColor',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  );

  // Combine all styles
  // Note: Press feedback is handled via CSS :active pseudo-class (fab-active)
  // to avoid iOS Safari tap detection issues with JavaScript state management
  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
  };

  // Combine class names
  const combinedClassName = [className, getHoverClassName()].filter(Boolean).join(' ');

  return (
    <>
      {/* CSS keyframes for loading animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <button
        ref={ref}
        className={`${combinedClassName} fab-active`}
        style={combinedStyles}
        disabled={disabled || loading}
        data-testid={(props as any)["data-testid"] || "floating-action-button"}
        {...props}
      >
        {loading ? <LoadingSpinner /> : icon}

        {extended && children && (
          <span style={{
            opacity: loading ? 0.7 : 1,
            marginLeft: '4px',
          }}>
            {children}
          </span>
        )}
      </button>
    </>
  );
});

FloatingActionButton.displayName = 'FloatingActionButton';

export default FloatingActionButton;
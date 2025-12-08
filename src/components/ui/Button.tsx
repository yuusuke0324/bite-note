import React, { forwardRef, type ReactNode } from 'react';
import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outlined' | 'text' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
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
    gap: '0.5rem',
    border: 'none',
    borderRadius: '8px',
    fontFamily: 'inherit',
    fontWeight: textStyles.label.medium.fontWeight,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    textDecoration: 'none',
    userSelect: 'none',
    width: fullWidth ? '100%' : 'auto',
    ...style,
  };

  // Size styles
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      height: '32px',
      padding: '0 12px',
      fontSize: textStyles.label.small.fontSize,
      minWidth: '64px',
    },
    md: {
      height: '40px',
      padding: '0 16px',
      fontSize: textStyles.label.medium.fontSize,
      minWidth: '80px',
    },
    lg: {
      height: '48px',
      padding: '0 24px',
      fontSize: textStyles.label.large.fontSize,
      minWidth: '96px',
    },
  };

  // Variant styles
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: disabled ? 'var(--color-surface-disabled)' : colors.primary[500],
      color: 'var(--color-text-inverse)',
      boxShadow: disabled ? 'none' : '0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
    },
    secondary: {
      backgroundColor: disabled ? 'var(--color-surface-disabled)' : colors.secondary[500],
      color: 'var(--color-text-inverse)',
      boxShadow: disabled ? 'none' : '0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
    },
    outlined: {
      backgroundColor: 'transparent',
      color: disabled ? 'var(--color-text-disabled)' : colors.primary[500],
      border: `1px solid ${disabled ? 'var(--color-border-light)' : colors.primary[500]}`,
    },
    text: {
      backgroundColor: 'transparent',
      color: disabled ? 'var(--color-text-disabled)' : colors.primary[500],
    },
    danger: {
      backgroundColor: disabled ? 'var(--color-surface-disabled)' : colors.status.error,
      color: 'var(--color-text-inverse)',
      boxShadow: disabled ? 'none' : '0 1px 2px 0 rgba(234,67,53,.3), 0 1px 3px 1px rgba(234,67,53,.15)',
    },
  };

  // Hover CSS classes (iOS Safari対応: CSSで@media (hover: hover)を使用)
  const getHoverClassName = (variant: string): string => {
    if (disabled || loading) return '';
    const hoverClasses: Record<string, string> = {
      primary: 'btn-hover-primary',
      secondary: 'btn-hover-secondary',
      outlined: 'btn-hover-outlined',
      text: 'btn-hover-text',
      danger: 'btn-hover-danger',
    };
    return hoverClasses[variant] || '';
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <div
      style={{
        width: '16px',
        height: '16px',
        border: '2px solid transparent',
        borderTop: `2px solid ${variant === 'outlined' || variant === 'text' ? colors.primary[500] : 'currentColor'}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  );

  // Combine all styles
  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
  };

  // Combine class names
  const combinedClassName = [className, getHoverClassName(variant)].filter(Boolean).join(' ');

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
        className={combinedClassName}
        style={combinedStyles}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <LoadingSpinner />}
        {!loading && icon && iconPosition === 'left' && icon}

        <span style={{
          opacity: loading ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
        }}>
          {children}
        </span>

        {!loading && icon && iconPosition === 'right' && icon}
      </button>
    </>
  );
});

Button.displayName = 'Button';

export default Button;
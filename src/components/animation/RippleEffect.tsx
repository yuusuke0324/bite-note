import React, { useState, useCallback, useRef, forwardRef } from 'react';

// ユニークなIDを生成するためのカウンター
let rippleIdCounter = 0;

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export interface RippleEffectProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 子要素 */
  children: React.ReactNode;
  /** リップルの色 */
  color?: string;
  /** アニメーション時間 (ms) */
  duration?: number;
  /** リップル効果を無効化 */
  disabled?: boolean;
}

/**
 * RippleEffectコンポーネント
 * Material Design風のリップル効果を提供するラッパーコンポーネント
 *
 * @example
 * ```tsx
 * <RippleEffect>
 *   <button>Click me</button>
 * </RippleEffect>
 * ```
 */
export const RippleEffect = forwardRef<HTMLDivElement, RippleEffectProps>(
  (
    {
      children,
      color = 'rgba(255, 255, 255, 0.5)',
      duration = 600,
      disabled = false,
      className = '',
      onClick,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const internalRef = useRef<HTMLDivElement>(null);
    const containerRef = (ref as React.RefObject<HTMLDivElement>) || internalRef;

    // prefers-reduced-motionをチェック
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (disabled) {
          onClick?.(e);
          return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = ++rippleIdCounter;

        setRipples((prev) => [...prev, { id, x, y }]);

        const cleanupDuration = prefersReducedMotion ? 300 : duration;
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, cleanupDuration);

        onClick?.(e);
      },
      [disabled, duration, onClick, prefersReducedMotion]
    );

    return (
      <div
        ref={containerRef}
        className={`ripple-container ${className}`}
        onClick={handleClick}
        {...props}
      >
        {children}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className={prefersReducedMotion ? 'ripple ripple-reduced' : 'ripple'}
            style={{
              left: ripple.x,
              top: ripple.y,
              backgroundColor: color,
            }}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }
);

RippleEffect.displayName = 'RippleEffect';

export default RippleEffect;

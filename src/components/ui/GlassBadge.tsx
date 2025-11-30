import { forwardRef, type ReactNode, type KeyboardEvent } from 'react';
import type React from 'react';

export interface GlassBadgeProps {
  /** The variant determines the visual style of the badge */
  variant?: 'default' | 'size' | 'species';
  /** Content to display inside the badge */
  children: ReactNode;
  /** Optional icon to display (used with variant="species") */
  icon?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Whether the badge is interactive (clickable) */
  interactive?: boolean;
  /** Click handler for interactive badges */
  onClick?: () => void;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * GlassBadge - A Glass Morphism style badge component
 *
 * Uses a 2-layer structure (Shadow Layer + Glass Layer) to ensure
 * WCAG 2.1 AA compliance with contrast ratio >= 4.5:1.
 *
 * @example
 * ```tsx
 * // Default badge
 * <GlassBadge>Label</GlassBadge>
 *
 * // Size variant (blue background)
 * <GlassBadge variant="size">30cm</GlassBadge>
 *
 * // Species variant with icon
 * <GlassBadge variant="species" icon={<Fish size={16} />}>
 *   Seabass
 * </GlassBadge>
 *
 * // Interactive badge
 * <GlassBadge interactive onClick={() => console.log('clicked')}>
 *   Click me
 * </GlassBadge>
 * ```
 */
export const GlassBadge = forwardRef<HTMLDivElement, GlassBadgeProps>(
  (
    {
      variant = 'default',
      children,
      icon,
      className = '',
      style,
      interactive = false,
      onClick,
      'data-testid': testId,
    },
    ref
  ) => {
    // Determine if the badge should be interactive
    const isInteractive = interactive || !!onClick;

    // Get text content for title attribute (accessibility for truncated text)
    const textContent =
      typeof children === 'string'
        ? children
        : typeof children === 'number'
          ? String(children)
          : undefined;

    // Handle keyboard events for interactive badges
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (isInteractive && onClick && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onClick();
      }
    };

    // Wrapper classes
    const wrapperClasses = [
      'glass-badge-wrapper',
      isInteractive && 'glass-badge-wrapper--interactive',
      variant !== 'default' && `glass-badge--${variant}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={ref}
        className={wrapperClasses}
        style={style}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={isInteractive ? onClick : undefined}
        onKeyDown={isInteractive ? handleKeyDown : undefined}
        data-testid={testId}
      >
        {/* Layer 1: Shadow Layer (for contrast) */}
        <div className="glass-badge-shadow" aria-hidden="true">
          {icon && <span className="glass-badge-icon">{icon}</span>}
          <span className="glass-badge-text">{children}</span>
        </div>

        {/* Layer 2: Glass Layer (visual effect) */}
        <div className="glass-badge-glass" title={textContent}>
          {icon && <span className="glass-badge-icon">{icon}</span>}
          <span className="glass-badge-text">{children}</span>
        </div>
      </div>
    );
  }
);

GlassBadge.displayName = 'GlassBadge';

export default GlassBadge;

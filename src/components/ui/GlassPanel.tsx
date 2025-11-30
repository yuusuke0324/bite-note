import React, { forwardRef, ReactNode, CSSProperties } from 'react';

export type GlassPanelPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface GlassPanelProps {
  /** Content to display inside the panel */
  children: ReactNode;
  /** Position of the panel relative to parent (requires parent to have position: relative) */
  position?: GlassPanelPosition;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles (will be merged with position styles) */
  style?: CSSProperties;
  /** Test ID for testing */
  'data-testid'?: string;
}

/** Position offset value in pixels */
const POSITION_OFFSET = 12;

/** CSS position styles for each position option */
const POSITION_STYLES: Record<GlassPanelPosition, CSSProperties> = {
  'top-left': { top: POSITION_OFFSET, left: POSITION_OFFSET },
  'top-right': { top: POSITION_OFFSET, right: POSITION_OFFSET },
  'bottom-left': { bottom: POSITION_OFFSET, left: POSITION_OFFSET },
  'bottom-right': { bottom: POSITION_OFFSET, right: POSITION_OFFSET },
};

/**
 * GlassPanel - A Glass Morphism style panel component
 *
 * Positioned absolutely within a parent container (parent must have position: relative).
 * Uses a 2-layer structure (Shadow Layer + Glass Layer) to ensure
 * WCAG 2.1 AA compliance with contrast ratio >= 4.5:1.
 *
 * @example
 * ```tsx
 * // Basic usage (default position: bottom-left)
 * <div style={{ position: 'relative' }}>
 *   <img src="photo.jpg" />
 *   <GlassPanel>
 *     <p>Location: Tokyo Bay</p>
 *     <p>Date: 2024-01-15</p>
 *   </GlassPanel>
 * </div>
 *
 * // Top-right position
 * <GlassPanel position="top-right">
 *   <span>Info</span>
 * </GlassPanel>
 * ```
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      children,
      position = 'bottom-left',
      className = '',
      style,
      'data-testid': testId,
    },
    ref
  ) => {
    // Get position styles based on the position prop
    const positionStyle = POSITION_STYLES[position];

    // Merge position styles with custom styles
    const mergedStyle: CSSProperties = {
      ...positionStyle,
      ...style,
    };

    // Wrapper classes
    const wrapperClasses = ['glass-panel-wrapper', className].filter(Boolean).join(' ');

    return (
      <div
        ref={ref}
        className={wrapperClasses}
        style={mergedStyle}
        data-testid={testId}
      >
        {/* Layer 1: Shadow Layer (for contrast) */}
        <div className="glass-panel-shadow" aria-hidden="true">
          {children}
        </div>

        {/* Layer 2: Glass Layer (visual effect) */}
        <div className="glass-panel-glass">{children}</div>
      </div>
    );
  }
);

GlassPanel.displayName = 'GlassPanel';

export default GlassPanel;

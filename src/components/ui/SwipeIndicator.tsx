/**
 * SwipeIndicator - スワイプナビゲーションのページインジケーター
 *
 * @description
 * 7個以下の場合はドット形式、8個以上の場合はテキスト形式で表示
 * WCAG 2.1 AA準拠、ダーク/ライトテーマ対応
 *
 * @version 1.0.0
 * @since 2025-12-03 Issue #365
 */

import React, { memo, useCallback } from 'react';
import { prefersReducedMotion } from '../../lib/swipe-utils';

/**
 * SwipeIndicatorのプロパティ
 */
export interface SwipeIndicatorProps {
  /** 現在のインデックス（0始まり） */
  currentIndex: number;
  /** 総アイテム数 */
  totalCount: number;
  /** ドットクリック時のコールバック */
  onDotClick?: (index: number) => void;
  /** 追加のclassName */
  className?: string;
  /** 追加のstyle */
  style?: React.CSSProperties;
}

/** ドット表示の最大数 */
const MAX_DOT_COUNT = 7;

/**
 * ドットインジケーターコンポーネント
 */
const DotIndicator: React.FC<{
  currentIndex: number;
  totalCount: number;
  onDotClick?: (index: number) => void;
}> = memo(({ currentIndex, totalCount, onDotClick }) => {
  const reducedMotion = prefersReducedMotion();

  const handleDotClick = useCallback(
    (index: number) => {
      onDotClick?.(index);
    },
    [onDotClick]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onDotClick?.(index);
      }
    },
    [onDotClick]
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
      role="tablist"
      aria-label="ページインジケーター"
    >
      {Array.from({ length: totalCount }, (_, index) => {
        const isActive = index === currentIndex;

        return (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`${totalCount}件中${index + 1}件目に移動`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => handleDotClick(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            style={{
              // タッチターゲット44x44px（padding拡張）
              width: '44px',
              height: '44px',
              padding: '16px',
              margin: '-16px',
              background: 'transparent',
              border: 'none',
              cursor: onDotClick ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
            }}
          >
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: isActive
                  ? 'var(--color-accent-text)'
                  : 'var(--swipe-indicator-inactive, rgba(255, 255, 255, 0.3))',
                transform: isActive ? 'scale(1.3)' : 'scale(1)',
                opacity: isActive ? 1 : 0.5,
                transition: reducedMotion
                  ? 'none'
                  : 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </button>
        );
      })}
    </div>
  );
});

DotIndicator.displayName = 'DotIndicator';

/**
 * テキストインジケーターコンポーネント
 */
const TextIndicator: React.FC<{
  currentIndex: number;
  totalCount: number;
}> = memo(({ currentIndex, totalCount }) => {
  return (
    <span
      style={{
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'var(--color-text-secondary)',
        padding: '4px 12px',
        borderRadius: '12px',
        backgroundColor: 'var(--color-surface-secondary)',
        minWidth: '48px',
        textAlign: 'center',
      }}
    >
      {currentIndex + 1}/{totalCount}
    </span>
  );
});

TextIndicator.displayName = 'TextIndicator';

/**
 * SwipeIndicator - スワイプナビゲーションのページインジケーター
 *
 * @example
 * ```tsx
 * <SwipeIndicator
 *   currentIndex={2}
 *   totalCount={5}
 *   onDotClick={(index) => goToIndex(index)}
 * />
 * ```
 */
export const SwipeIndicator: React.FC<SwipeIndicatorProps> = memo(
  ({ currentIndex, totalCount, onDotClick, className = '', style = {} }) => {
    // 0または1件の場合は表示しない
    if (totalCount <= 1) {
      return null;
    }

    const useTextFormat = totalCount > MAX_DOT_COUNT;

    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
        role="status"
        aria-label={`${totalCount}件中${currentIndex + 1}件目`}
        aria-live="polite"
      >
        {useTextFormat ? (
          <TextIndicator currentIndex={currentIndex} totalCount={totalCount} />
        ) : (
          <DotIndicator
            currentIndex={currentIndex}
            totalCount={totalCount}
            onDotClick={onDotClick}
          />
        )}
      </div>
    );
  }
);

SwipeIndicator.displayName = 'SwipeIndicator';

export default SwipeIndicator;

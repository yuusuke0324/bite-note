/**
 * SwipeHint - 初回スワイプヒント表示コンポーネント
 *
 * @description
 * 初回のみ表示され、3秒で自動非表示
 * Glass Morphism、ダーク/ライトテーマ対応
 * localStorage で表示済みフラグを管理
 *
 * @version 1.0.0
 * @since 2025-12-03 Issue #365
 */

import React, { memo, useEffect, useState, useCallback } from 'react';
import { prefersReducedMotion } from '../../lib/swipe-utils';

/**
 * SwipeHintのプロパティ
 */
export interface SwipeHintProps {
  /** 画面名（localStorage のキーに使用） */
  screenName: string;
  /** ヒントテキスト */
  text?: string;
  /** 表示時間（ミリ秒） */
  displayDuration?: number;
  /** 追加のclassName */
  className?: string;
  /** 追加のstyle */
  style?: React.CSSProperties;
  /** ヒント非表示時のコールバック */
  onHide?: () => void;
}

/** デフォルトのヒントテキスト */
const DEFAULT_HINT_TEXT = '← スワイプして他の記録を見る →';

/** デフォルトの表示時間 */
const DEFAULT_DISPLAY_DURATION = 3000;

/** フェードアウト時間 */
const FADE_OUT_DURATION = 300;

/**
 * localStorageのキーを生成
 */
function getStorageKey(screenName: string): string {
  return `swipeHintShown_${screenName}`;
}

/**
 * ヒントが表示済みかどうかをチェック
 */
function isHintShown(screenName: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(getStorageKey(screenName)) === 'true';
  } catch {
    return false;
  }
}

/**
 * ヒントを表示済みとしてマーク
 */
function markHintAsShown(screenName: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(screenName), 'true');
  } catch {
    // localStorage エラーは無視
  }
}

/**
 * SwipeHint - 初回スワイプヒント表示コンポーネント
 *
 * @example
 * ```tsx
 * <SwipeHint
 *   screenName="FishingRecordDetail"
 *   text="← スワイプして他の記録を見る →"
 * />
 * ```
 */
export const SwipeHint: React.FC<SwipeHintProps> = memo(
  ({
    screenName,
    text = DEFAULT_HINT_TEXT,
    displayDuration = DEFAULT_DISPLAY_DURATION,
    className = '',
    style = {},
    onHide,
  }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const reducedMotion = prefersReducedMotion();

    // 初回表示チェック
    useEffect(() => {
      if (!isHintShown(screenName)) {
        setIsVisible(true);
        markHintAsShown(screenName);
      }
    }, [screenName]);

    // 自動非表示タイマー
    useEffect(() => {
      if (!isVisible) return;

      const fadeOutTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, displayDuration - FADE_OUT_DURATION);

      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        setIsFadingOut(false);
        onHide?.();
      }, displayDuration);

      return () => {
        clearTimeout(fadeOutTimer);
        clearTimeout(hideTimer);
      };
    }, [isVisible, displayDuration, onHide]);

    // 手動で非表示にする
    const handleDismiss = useCallback(() => {
      if (reducedMotion) {
        setIsVisible(false);
        onHide?.();
      } else {
        setIsFadingOut(true);
        setTimeout(() => {
          setIsVisible(false);
          setIsFadingOut(false);
          onHide?.();
        }, FADE_OUT_DURATION);
      }
    }, [reducedMotion, onHide]);

    if (!isVisible) {
      return null;
    }

    return (
      <div
        className={className}
        style={{
          position: 'absolute',
          bottom: '72px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,

          // Typography
          fontSize: '0.875rem',
          fontWeight: 500,
          lineHeight: 1.5,

          // Colors - CSS変数でテーマ対応
          color: 'var(--color-text-secondary)',
          backgroundColor: 'var(--swipe-hint-bg, rgba(0, 0, 0, 0.7))',

          // Glass Morphism
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',

          // Spacing
          padding: '8px 16px',
          borderRadius: '20px',

          // Shadow
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',

          // Accessibility
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',

          // Animation
          opacity: isFadingOut ? 0 : 1,
          transition: reducedMotion
            ? 'none'
            : `opacity ${FADE_OUT_DURATION}ms ease-out`,

          // Pointer
          cursor: 'pointer',

          ...style,
        }}
        role="tooltip"
        aria-label="左右にスワイプして他の記録を見る"
        onClick={handleDismiss}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            handleDismiss();
          }
        }}
        tabIndex={0}
      >
        {text}
      </div>
    );
  }
);

SwipeHint.displayName = 'SwipeHint';

/**
 * ヒント表示状態をリセット（テスト用）
 */
// eslint-disable-next-line react-refresh/only-export-components
export function resetSwipeHint(screenName: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getStorageKey(screenName));
  } catch {
    // localStorage エラーは無視
  }
}

export default SwipeHint;

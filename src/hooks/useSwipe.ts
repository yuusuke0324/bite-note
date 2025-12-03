/**
 * スワイプナビゲーション用カスタムフック
 * @module useSwipe
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  calculateSwipeProgress,
  calculateSwipeVelocity,
  DEFAULT_SWIPE_CONFIG,
  getSwipeDirection,
  isInEdgeZone,
  isVerticalDeviationAllowed,
  MATERIAL_EASING,
  prefersReducedMotion,
  SPRING_EASING,
  triggerHaptic,
} from '../lib/swipe-utils';
import type { SwipeDirection } from '../lib/swipe-utils';

/**
 * スワイプ設定
 */
export interface SwipeConfig {
  /** スワイプ判定の最小距離（デフォルト: 80px） */
  threshold?: number;
  /** 速度閾値（デフォルト: 0.3 px/ms） */
  velocityThreshold?: number;
  /** 垂直方向の最大許容誤差（デフォルト: 50px） */
  maxVerticalDeviation?: number;
  /** iOS戻るジェスチャー回避のエッジゾーン（デフォルト: 16px） */
  edgeZone?: number;
  /** アニメーション時間（デフォルト: 300ms） */
  animationDuration?: number;
  /** 端での減衰係数（デフォルト: 0.3） */
  dampingFactor?: number;
  /** 左スワイプを無効化 */
  disableLeft?: boolean;
  /** 右スワイプを無効化 */
  disableRight?: boolean;
  /** Leafletマップ参照（MapPopup用） */
  leafletMap?: L.Map | null;
}

/**
 * スワイプコールバック
 */
export interface SwipeCallbacks {
  /** 左スワイプ時のコールバック */
  onSwipeLeft?: () => void;
  /** 右スワイプ時のコールバック */
  onSwipeRight?: () => void;
  /** スワイプ進捗コールバック */
  onSwipeProgress?: (progress: number, direction: SwipeDirection) => void;
  /** スワイプ開始時のコールバック */
  onSwipeStart?: () => void;
  /** スワイプ終了時のコールバック */
  onSwipeEnd?: () => void;
  /** 端到達時のコールバック（バウンスアニメーション） */
  onEdgeReached?: (direction: SwipeDirection) => void;
}

/**
 * スワイプ状態
 */
export interface SwipeState {
  /** スワイプ中かどうか */
  isSwiping: boolean;
  /** 現在の進捗（0〜1） */
  progress: number;
  /** 現在の方向 */
  direction: SwipeDirection;
  /** 現在のX方向オフセット */
  offsetX: number;
  /** 閾値に到達したか */
  thresholdReached: boolean;
}

/**
 * useSwipeの戻り値
 */
export interface UseSwipeReturn<T extends HTMLElement> {
  /** スワイプ対象要素へのref */
  ref: React.RefObject<T>;
  /** スワイプ状態 */
  state: SwipeState;
  /** スワイプをリセット */
  reset: () => void;
  /** イベントハンドラ（手動バインド用） */
  handlers: {
    onPointerDown: (e: React.PointerEvent<T>) => void;
    onPointerMove: (e: React.PointerEvent<T>) => void;
    onPointerUp: (e: React.PointerEvent<T>) => void;
    onPointerCancel: (e: React.PointerEvent<T>) => void;
  };
}

// Leaflet型定義（実行時に存在しない場合に備えて）
declare namespace L {
  interface Map {
    dragging: {
      disable: () => void;
      enable: () => void;
    };
  }
}

/**
 * スワイプナビゲーションを提供するカスタムフック
 *
 * @param config - スワイプ設定
 * @param callbacks - スワイプコールバック
 * @returns スワイプ制御オブジェクト
 *
 * @example
 * ```tsx
 * const { ref, state, handlers } = useSwipe<HTMLDivElement>(
 *   { threshold: 80, velocityThreshold: 0.3 },
 *   {
 *     onSwipeLeft: () => goToNext(),
 *     onSwipeRight: () => goToPrev(),
 *   }
 * );
 *
 * return (
 *   <div ref={ref} {...handlers}>
 *     {content}
 *   </div>
 * );
 * ```
 */
export function useSwipe<T extends HTMLElement = HTMLElement>(
  config: SwipeConfig = {},
  callbacks: SwipeCallbacks = {}
): UseSwipeReturn<T> {
  const {
    threshold = DEFAULT_SWIPE_CONFIG.DETAIL_THRESHOLD,
    velocityThreshold = DEFAULT_SWIPE_CONFIG.DETAIL_VELOCITY_THRESHOLD,
    maxVerticalDeviation = DEFAULT_SWIPE_CONFIG.DETAIL_MAX_VERTICAL_DEVIATION,
    edgeZone = DEFAULT_SWIPE_CONFIG.EDGE_ZONE,
    animationDuration = DEFAULT_SWIPE_CONFIG.DETAIL_ANIMATION_DURATION,
    dampingFactor = DEFAULT_SWIPE_CONFIG.DETAIL_DAMPING_FACTOR,
    disableLeft = false,
    disableRight = false,
    leafletMap = null,
  } = config;

  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeProgress,
    onSwipeStart,
    onSwipeEnd,
    onEdgeReached,
  } = callbacks;

  const ref = useRef<T>(null);
  const animationRef = useRef<number | null>(null);
  const isAnimating = useRef(false);

  // タッチ開始位置
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);

  // 閾値到達フラグ（ハプティック1回のみ）
  const hasTriggeredHaptic = useRef(false);

  const [state, setState] = useState<SwipeState>({
    isSwiping: false,
    progress: 0,
    direction: 'none',
    offsetX: 0,
    thresholdReached: false,
  });

  /**
   * 現在のアニメーションをキャンセル
   */
  const cancelCurrentAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    isAnimating.current = false;
  }, []);

  /**
   * スワイプ状態をリセット
   */
  const reset = useCallback(() => {
    cancelCurrentAnimation();
    setState({
      isSwiping: false,
      progress: 0,
      direction: 'none',
      offsetX: 0,
      thresholdReached: false,
    });
    hasTriggeredHaptic.current = false;
  }, [cancelCurrentAnimation]);

  /**
   * スプリングアニメーションで元の位置に戻す
   */
  const animateBack = useCallback(() => {
    if (prefersReducedMotion()) {
      reset();
      onSwipeEnd?.();
      return;
    }

    const element = ref.current;
    if (!element) {
      reset();
      onSwipeEnd?.();
      return;
    }

    isAnimating.current = true;
    element.style.transition = `transform 200ms ${SPRING_EASING}`;
    element.style.transform = 'translateX(0)';

    setTimeout(() => {
      if (element) {
        element.style.transition = '';
        element.style.transform = '';
      }
      reset();
      onSwipeEnd?.();
    }, 200);
  }, [reset, onSwipeEnd]);

  /**
   * バウンスアニメーション（端到達時）
   */
  const animateBounce = useCallback(
    (direction: SwipeDirection) => {
      if (prefersReducedMotion()) {
        triggerHaptic('light');
        onEdgeReached?.(direction);
        reset();
        return;
      }

      const element = ref.current;
      if (!element) {
        reset();
        return;
      }

      triggerHaptic('light');
      onEdgeReached?.(direction);

      isAnimating.current = true;
      const bounceDistance = direction === 'left' ? -20 : 20;

      element.style.transition = `transform 150ms ${SPRING_EASING}`;
      element.style.transform = `translateX(${bounceDistance}px)`;

      setTimeout(() => {
        if (element) {
          element.style.transition = `transform 250ms ${SPRING_EASING}`;
          element.style.transform = 'translateX(0)';
        }

        setTimeout(() => {
          if (element) {
            element.style.transition = '';
            element.style.transform = '';
          }
          reset();
        }, 250);
      }, 150);
    },
    [reset, onEdgeReached]
  );

  /**
   * スムーズな遷移アニメーション
   */
  const animateTransition = useCallback(
    (direction: SwipeDirection, callback: () => void) => {
      if (prefersReducedMotion()) {
        callback();
        reset();
        onSwipeEnd?.();
        return;
      }

      const element = ref.current;
      if (!element) {
        callback();
        reset();
        onSwipeEnd?.();
        return;
      }

      isAnimating.current = true;
      const targetX = direction === 'left' ? -window.innerWidth : window.innerWidth;

      element.style.transition = `transform ${animationDuration}ms ${MATERIAL_EASING}`;
      element.style.transform = `translateX(${targetX}px)`;

      setTimeout(() => {
        callback();
        if (element) {
          element.style.transition = '';
          element.style.transform = '';
        }
        reset();
        onSwipeEnd?.();
      }, animationDuration);
    },
    [animationDuration, reset, onSwipeEnd]
  );

  /**
   * ポインターダウンハンドラ
   */
  const onPointerDown = useCallback(
    (e: React.PointerEvent<T>) => {
      // 高速連続スワイプ対応: 前のアニメーションをキャンセル
      cancelCurrentAnimation();

      // エッジゾーンチェック（iOS Safari対策）
      if (isInEdgeZone(e.clientX, edgeZone)) {
        return;
      }

      // Leafletマップのドラッグを無効化
      if (leafletMap) {
        leafletMap.dragging.disable();
      }

      startX.current = e.clientX;
      startY.current = e.clientY;
      startTime.current = Date.now();
      hasTriggeredHaptic.current = false;

      setState((prev) => ({
        ...prev,
        isSwiping: true,
      }));

      onSwipeStart?.();

      // ポインターキャプチャ（存在する場合のみ）
      const target = e.target as HTMLElement;
      if (target.setPointerCapture) {
        target.setPointerCapture(e.pointerId);
      }
    },
    [edgeZone, leafletMap, cancelCurrentAnimation, onSwipeStart]
  );

  /**
   * ポインタームーブハンドラ
   */
  const onPointerMove = useCallback(
    (e: React.PointerEvent<T>) => {
      if (!state.isSwiping || isAnimating.current) return;

      const deltaX = e.clientX - startX.current;
      const deltaY = e.clientY - startY.current;

      // 垂直方向のずれチェック
      if (!isVerticalDeviationAllowed(deltaY, maxVerticalDeviation)) {
        // 垂直スクロールと判定、スワイプをキャンセル
        reset();
        if (leafletMap) {
          leafletMap.dragging.enable();
        }
        return;
      }

      // 方向判定
      const direction = getSwipeDirection(deltaX, 0);

      // 無効化チェック
      if (
        (direction === 'left' && disableLeft) ||
        (direction === 'right' && disableRight)
      ) {
        // 減衰を適用
        const dampedOffset = deltaX * dampingFactor;
        setState((prev) => ({
          ...prev,
          offsetX: dampedOffset,
          direction,
          progress: 0,
          thresholdReached: false,
        }));

        const element = ref.current;
        if (element) {
          element.style.transform = `translateX(${dampedOffset}px)`;
        }
        return;
      }

      // 進捗計算
      const progress = calculateSwipeProgress(deltaX, threshold);
      const thresholdReached = Math.abs(deltaX) >= threshold;

      // 閾値到達時のハプティック（1回のみ）
      if (thresholdReached && !hasTriggeredHaptic.current) {
        triggerHaptic('light');
        hasTriggeredHaptic.current = true;
      }

      setState((prev) => ({
        ...prev,
        offsetX: deltaX,
        direction,
        progress,
        thresholdReached,
      }));

      // トランスフォーム適用
      const element = ref.current;
      if (element) {
        element.style.transform = `translateX(${deltaX}px)`;
      }

      onSwipeProgress?.(progress, direction);
    },
    [
      state.isSwiping,
      maxVerticalDeviation,
      disableLeft,
      disableRight,
      dampingFactor,
      threshold,
      leafletMap,
      reset,
      onSwipeProgress,
    ]
  );

  /**
   * ポインターアップハンドラ
   */
  const onPointerUp = useCallback(
    (e: React.PointerEvent<T>) => {
      if (!state.isSwiping) return;

      // ポインターキャプチャ解放（存在する場合のみ）
      const target = e.target as HTMLElement;
      if (target.releasePointerCapture) {
        target.releasePointerCapture(e.pointerId);
      }

      // Leafletマップのドラッグを再有効化
      if (leafletMap) {
        leafletMap.dragging.enable();
      }

      const deltaX = e.clientX - startX.current;
      const duration = Date.now() - startTime.current;
      const velocity = calculateSwipeVelocity(deltaX, duration);
      const direction = getSwipeDirection(deltaX, 0);

      // スワイプ判定: 閾値超え または 速度超え
      const isSwipe =
        Math.abs(deltaX) >= threshold || velocity >= velocityThreshold;

      if (!isSwipe) {
        // スワイプ未成立: 元に戻す
        animateBack();
        return;
      }

      // 無効化チェック
      if (
        (direction === 'left' && disableLeft) ||
        (direction === 'right' && disableRight)
      ) {
        // 端到達バウンス
        animateBounce(direction);
        return;
      }

      // スワイプ成立: 遷移アニメーション
      if (direction === 'left' && onSwipeLeft) {
        animateTransition('left', onSwipeLeft);
      } else if (direction === 'right' && onSwipeRight) {
        animateTransition('right', onSwipeRight);
      } else {
        animateBack();
      }
    },
    [
      state.isSwiping,
      leafletMap,
      threshold,
      velocityThreshold,
      disableLeft,
      disableRight,
      animateBack,
      animateBounce,
      animateTransition,
      onSwipeLeft,
      onSwipeRight,
    ]
  );

  /**
   * ポインターキャンセルハンドラ
   */
  const onPointerCancel = useCallback(
    (e: React.PointerEvent<T>) => {
      if (!state.isSwiping) return;

      // ポインターキャプチャ解放（存在する場合のみ）
      const target = e.target as HTMLElement;
      if (target.releasePointerCapture) {
        target.releasePointerCapture(e.pointerId);
      }

      // Leafletマップのドラッグを再有効化
      if (leafletMap) {
        leafletMap.dragging.enable();
      }

      animateBack();
    },
    [state.isSwiping, leafletMap, animateBack]
  );

  /**
   * 画面回転時のリセット
   */
  useEffect(() => {
    const handleOrientationChange = () => {
      cancelCurrentAnimation();
      reset();
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [cancelCurrentAnimation, reset]);

  /**
   * クリーンアップ
   */
  useEffect(() => {
    return () => {
      cancelCurrentAnimation();
    };
  }, [cancelCurrentAnimation]);

  return {
    ref,
    state,
    reset,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}

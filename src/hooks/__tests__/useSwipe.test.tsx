/**
 * useSwipeカスタムフックとswipe-utilsの単体テスト
 *
 * @description
 * スワイプナビゲーション機能のテストスイート
 *
 * 【テスト戦略】
 * - swipe-utils: 純粋関数のユニットテスト
 * - useSwipe初期化: renderHookで基本的な戻り値を検証
 * - useSwipeコールバック: 実際のDOM要素でネイティブイベントをディスパッチ
 *
 * 【iOS Safari対応】
 * useSwipeは passive: false のネイティブイベントリスナーを使用するため、
 * テストでも実際のDOM要素とネイティブPointerEventを使用する
 *
 * @version 1.1.0
 * @since 2025-12-03 Issue #365
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor, render, cleanup } from '@testing-library/react';
import { useSwipe, SwipeConfig, SwipeCallbacks, SwipeState } from '../useSwipe';
import {
  haversineDistance,
  getSwipeDirection,
  calculateSwipeVelocity,
  isInEdgeZone,
  isVerticalDeviationAllowed,
  calculateSwipeProgress,
  prefersReducedMotion,
  DEFAULT_SWIPE_CONFIG,
} from '../../lib/swipe-utils';

// JSDOM does not support PointerEvent natively, so we need a polyfill
if (typeof PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    public pointerId: number;
    public width: number;
    public height: number;
    public pressure: number;
    public tangentialPressure: number;
    public tiltX: number;
    public tiltY: number;
    public twist: number;
    public pointerType: string;
    public isPrimary: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.width = params.width ?? 1;
      this.height = params.height ?? 1;
      this.pressure = params.pressure ?? 0;
      this.tangentialPressure = params.tangentialPressure ?? 0;
      this.tiltX = params.tiltX ?? 0;
      this.tiltY = params.tiltY ?? 0;
      this.twist = params.twist ?? 0;
      this.pointerType = params.pointerType ?? 'mouse';
      this.isPrimary = params.isPrimary ?? false;
    }

    getCoalescedEvents(): PointerEvent[] {
      return [];
    }

    getPredictedEvents(): PointerEvent[] {
      return [];
    }
  }
  (globalThis as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent = PointerEventPolyfill;
}

// matchMedia mock
const mockMatchMedia = (matches: boolean) => {
  return vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

// navigator.vibrate mock
const mockVibrate = vi.fn();

/**
 * ネイティブPointerEventを作成（iOS Safari対応テスト用）
 */
function createNativePointerEvent(
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  clientX: number,
  clientY: number
): PointerEvent {
  return new PointerEvent(type, {
    clientX,
    clientY,
    pointerId: 1,
    bubbles: true,
    cancelable: true,
  });
}

/**
 * テスト用スワイプコンポーネント
 * useSwipeを実際のDOM要素で使用するため、useEffectが正しく動作する
 */
interface TestSwipeComponentProps {
  config?: SwipeConfig;
  callbacks?: SwipeCallbacks;
  onStateChange?: (state: SwipeState) => void;
  onResetRef?: React.MutableRefObject<(() => void) | null>;
}

function TestSwipeComponent({
  config = {},
  callbacks = {},
  onStateChange,
  onResetRef,
}: TestSwipeComponentProps) {
  const { ref, state, reset } = useSwipe<HTMLDivElement>(config, callbacks);

  // 状態変更時にコールバック
  React.useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // resetファンクションを公開
  React.useEffect(() => {
    if (onResetRef) {
      onResetRef.current = reset;
    }
  }, [reset, onResetRef]);

  return (
    <div
      ref={ref}
      data-testid="swipe-target"
      style={{ width: '300px', height: '300px' }}
    >
      Swipe Target
    </div>
  );
}

describe('swipe-utils', () => {
  describe('haversineDistance', () => {
    it('calculates distance between two points correctly', () => {
      // 東京駅 → 渋谷駅（約3.3km）
      const tokyo = { latitude: 35.6812, longitude: 139.7671 };
      const shibuya = { latitude: 35.6586, longitude: 139.7454 };

      const distance = haversineDistance(tokyo, shibuya);

      // 約3300メートル（誤差10%許容）
      expect(distance).toBeGreaterThan(2900);
      expect(distance).toBeLessThan(3700);
    });

    it('returns 0 for same coordinates', () => {
      const point = { latitude: 35.6812, longitude: 139.7671 };
      const distance = haversineDistance(point, point);
      expect(distance).toBe(0);
    });

    it('calculates short distance correctly', () => {
      // 約100メートルの距離
      const point1 = { latitude: 35.6812, longitude: 139.7671 };
      const point2 = { latitude: 35.6812, longitude: 139.7683 }; // 経度のみ微増

      const distance = haversineDistance(point1, point2);
      expect(distance).toBeGreaterThan(50);
      expect(distance).toBeLessThan(200);
    });

    it('calculates long distance correctly', () => {
      // 東京 → ニューヨーク（約10,800km）
      const tokyo = { latitude: 35.6812, longitude: 139.7671 };
      const newYork = { latitude: 40.7128, longitude: -74.006 };

      const distance = haversineDistance(tokyo, newYork);

      // 約10,800km（誤差5%許容）
      expect(distance).toBeGreaterThan(10_000_000);
      expect(distance).toBeLessThan(12_000_000);
    });
  });

  describe('getSwipeDirection', () => {
    it('returns "right" for positive deltaX above threshold', () => {
      expect(getSwipeDirection(100, 80)).toBe('right');
    });

    it('returns "left" for negative deltaX above threshold', () => {
      expect(getSwipeDirection(-100, 80)).toBe('left');
    });

    it('returns "none" for deltaX below threshold', () => {
      expect(getSwipeDirection(50, 80)).toBe('none');
      expect(getSwipeDirection(-50, 80)).toBe('none');
    });

    it('returns "none" for deltaX equal to threshold', () => {
      // 閾値未満のため none
      expect(getSwipeDirection(79, 80)).toBe('none');
    });
  });

  describe('calculateSwipeVelocity', () => {
    it('calculates velocity correctly', () => {
      expect(calculateSwipeVelocity(100, 200)).toBe(0.5); // 100px / 200ms = 0.5 px/ms
    });

    it('returns 0 for zero duration', () => {
      expect(calculateSwipeVelocity(100, 0)).toBe(0);
    });

    it('handles negative deltaX', () => {
      expect(calculateSwipeVelocity(-100, 200)).toBe(0.5);
    });
  });

  describe('isInEdgeZone', () => {
    it('returns true for clientX within edge zone', () => {
      expect(isInEdgeZone(10, 16)).toBe(true);
      expect(isInEdgeZone(16, 16)).toBe(true);
    });

    it('returns false for clientX outside edge zone', () => {
      expect(isInEdgeZone(17, 16)).toBe(false);
      expect(isInEdgeZone(100, 16)).toBe(false);
    });
  });

  describe('isVerticalDeviationAllowed', () => {
    it('returns true for deviation within limit', () => {
      expect(isVerticalDeviationAllowed(30, 50)).toBe(true);
      expect(isVerticalDeviationAllowed(-30, 50)).toBe(true);
      expect(isVerticalDeviationAllowed(50, 50)).toBe(true);
    });

    it('returns false for deviation exceeding limit', () => {
      expect(isVerticalDeviationAllowed(51, 50)).toBe(false);
      expect(isVerticalDeviationAllowed(-51, 50)).toBe(false);
    });
  });

  describe('calculateSwipeProgress', () => {
    it('returns progress between 0 and 1', () => {
      expect(calculateSwipeProgress(0, 80)).toBe(0);
      expect(calculateSwipeProgress(40, 80)).toBe(0.5);
      expect(calculateSwipeProgress(80, 80)).toBe(1);
    });

    it('clamps progress at 1 for values exceeding threshold', () => {
      expect(calculateSwipeProgress(160, 80)).toBe(1);
    });

    it('handles negative deltaX', () => {
      expect(calculateSwipeProgress(-40, 80)).toBe(0.5);
    });
  });

  describe('prefersReducedMotion', () => {
    beforeEach(() => {
      window.matchMedia = mockMatchMedia(false);
    });

    it('returns false when user prefers motion', () => {
      expect(prefersReducedMotion()).toBe(false);
    });

    it('returns true when user prefers reduced motion', () => {
      window.matchMedia = mockMatchMedia(true);
      expect(prefersReducedMotion()).toBe(true);
    });
  });

  describe('DEFAULT_SWIPE_CONFIG', () => {
    it('has correct default values', () => {
      expect(DEFAULT_SWIPE_CONFIG.DETAIL_THRESHOLD).toBe(80);
      expect(DEFAULT_SWIPE_CONFIG.POPUP_THRESHOLD).toBe(60);
      expect(DEFAULT_SWIPE_CONFIG.DETAIL_VELOCITY_THRESHOLD).toBe(0.3);
      expect(DEFAULT_SWIPE_CONFIG.POPUP_VELOCITY_THRESHOLD).toBe(0.25);
      expect(DEFAULT_SWIPE_CONFIG.EDGE_ZONE).toBe(16);
      expect(DEFAULT_SWIPE_CONFIG.NEARBY_DISTANCE_THRESHOLD).toBe(5000);
    });
  });
});

describe('useSwipe', () => {
  beforeEach(async () => {
    window.matchMedia = mockMatchMedia(false);
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
    });

    // CI環境でのJSDOM初期化待機
    if (process.env.CI) {
      await waitFor(
        () => {
          if (!document.body || document.body.children.length === 0) {
            throw new Error('JSDOM not ready');
          }
        },
        { timeout: 5000, interval: 100 }
      );
    } else {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    mockVibrate.mockClear();
    if (!process.env.CI) {
      document.body.innerHTML = '';
    }
  });

  describe('Hook initialization', () => {
    it('returns ref, state, reset, and handlers (deprecated empty object)', () => {
      const { result } = renderHook(() => useSwipe());

      expect(result.current.ref).toBeDefined();
      expect(result.current.state).toBeDefined();
      expect(result.current.reset).toBeDefined();
      // handlers is now an empty object (deprecated)
      // iOS Safari対応のため、ネイティブイベントリスナーを使用するようになった
      expect(result.current.handlers).toBeDefined();
      expect(typeof result.current.handlers).toBe('object');
      expect(Object.keys(result.current.handlers)).toHaveLength(0);
    });

    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useSwipe());

      expect(result.current.state.isSwiping).toBe(false);
      expect(result.current.state.progress).toBe(0);
      expect(result.current.state.direction).toBe('none');
      expect(result.current.state.offsetX).toBe(0);
      expect(result.current.state.thresholdReached).toBe(false);
    });
  });

  describe('Swipe callbacks with real DOM', () => {
    it('calls onSwipeStart when swipe begins', async () => {
      const onSwipeStart = vi.fn();

      const { container } = render(
        <TestSwipeComponent callbacks={{ onSwipeStart }} />
      );

      const element = container.querySelector('[data-testid="swipe-target"]');
      expect(element).toBeInTheDocument();

      // Dispatch native pointer event
      act(() => {
        element!.dispatchEvent(createNativePointerEvent('pointerdown', 100, 100));
      });

      await waitFor(() => {
        expect(onSwipeStart).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onSwipeProgress during swipe', async () => {
      const onSwipeProgress = vi.fn();

      const { container } = render(
        <TestSwipeComponent
          config={{ threshold: 80 }}
          callbacks={{ onSwipeProgress }}
        />
      );

      const element = container.querySelector('[data-testid="swipe-target"]');
      expect(element).toBeInTheDocument();

      act(() => {
        element!.dispatchEvent(createNativePointerEvent('pointerdown', 100, 100));
      });

      act(() => {
        element!.dispatchEvent(createNativePointerEvent('pointermove', 140, 100)); // 40px right
      });

      await waitFor(() => {
        expect(onSwipeProgress).toHaveBeenCalled();
      });

      const [progress, direction] = onSwipeProgress.mock.calls[0];
      expect(progress).toBe(0.5); // 40 / 80 = 0.5
      expect(direction).toBe('right');
    });

    it('calls onSwipeLeft when swiping left past threshold', async () => {
      vi.useFakeTimers();
      const onSwipeLeft = vi.fn();

      const { container } = render(
        <TestSwipeComponent
          config={{ threshold: 80, animationDuration: 300 }}
          callbacks={{ onSwipeLeft }}
        />
      );

      const element = container.querySelector('[data-testid="swipe-target"]');
      expect(element).toBeInTheDocument();

      act(() => {
        element!.dispatchEvent(createNativePointerEvent('pointerdown', 200, 100));
      });

      act(() => {
        element!.dispatchEvent(createNativePointerEvent('pointerup', 100, 100)); // 100px left
      });

      // アニメーション完了を待つ
      await act(async () => {
        vi.advanceTimersByTime(400);
      });

      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it('calls onSwipeRight when swiping right past threshold', async () => {
      vi.useFakeTimers();
      const onSwipeRight = vi.fn();

      const { container } = render(
        <TestSwipeComponent
          config={{ threshold: 80, animationDuration: 300 }}
          callbacks={{ onSwipeRight }}
        />
      );

      const element = container.querySelector('[data-testid="swipe-target"]');
      expect(element).toBeInTheDocument();

      act(() => {
        element!.dispatchEvent(createNativePointerEvent('pointerdown', 100, 100));
      });

      act(() => {
        element!.dispatchEvent(createNativePointerEvent('pointerup', 200, 100)); // 100px right
      });

      await act(async () => {
        vi.advanceTimersByTime(400);
      });

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge zone handling', () => {
    it('ignores swipe starting in edge zone', async () => {
      const onSwipeStart = vi.fn();

      const { container } = render(
        <TestSwipeComponent
          config={{ edgeZone: 16 }}
          callbacks={{ onSwipeStart }}
        />
      );

      const element = container.querySelector('[data-testid="swipe-target"]');
      expect(element).toBeInTheDocument();

      // Start in edge zone (x=10, edge=16)
      act(() => {
        element!.dispatchEvent(createNativePointerEvent('pointerdown', 10, 100));
      });

      // 少し待ってもコールバックが呼ばれないことを確認
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(onSwipeStart).not.toHaveBeenCalled();
    });

    it('accepts swipe starting outside edge zone', async () => {
      const onSwipeStart = vi.fn();

      const { container } = render(
        <TestSwipeComponent
          config={{ edgeZone: 16 }}
          callbacks={{ onSwipeStart }}
        />
      );

      const element = container.querySelector('[data-testid="swipe-target"]');
      expect(element).toBeInTheDocument();

      // Start outside edge zone (x=20, edge=16)
      act(() => {
        element!.dispatchEvent(createNativePointerEvent('pointerdown', 20, 100));
      });

      await waitFor(() => {
        expect(onSwipeStart).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('State updates', () => {
    it('updates state during swipe', async () => {
      let latestState: SwipeState | null = null;
      const onStateChange = vi.fn((state: SwipeState) => {
        latestState = state;
      });

      const { container } = render(
        <TestSwipeComponent
          config={{ threshold: 80 }}
          onStateChange={onStateChange}
        />
      );

      const element = container.querySelector('[data-testid="swipe-target"]');
      expect(element).toBeInTheDocument();

      // 初期状態
      expect(latestState?.isSwiping).toBe(false);

      act(() => {
        element!.dispatchEvent(createNativePointerEvent('pointerdown', 100, 100));
      });

      await waitFor(() => {
        expect(latestState?.isSwiping).toBe(true);
      });

      act(() => {
        element!.dispatchEvent(createNativePointerEvent('pointermove', 150, 100));
      });

      await waitFor(() => {
        expect(latestState?.offsetX).toBe(50);
        expect(latestState?.direction).toBe('right');
      });
    });
  });

  describe('Reset functionality', () => {
    it('resets state to initial values', async () => {
      let latestState: SwipeState | null = null;
      const onStateChange = vi.fn((state: SwipeState) => {
        latestState = state;
      });
      const resetRef = React.createRef<(() => void) | null>() as React.MutableRefObject<(() => void) | null>;
      resetRef.current = null;

      const { container } = render(
        <TestSwipeComponent
          onStateChange={onStateChange}
          onResetRef={resetRef}
        />
      );

      const element = container.querySelector('[data-testid="swipe-target"]');
      expect(element).toBeInTheDocument();

      act(() => {
        element!.dispatchEvent(createNativePointerEvent('pointerdown', 100, 100));
      });

      await waitFor(() => {
        expect(latestState?.isSwiping).toBe(true);
      });

      // Reset
      act(() => {
        resetRef.current?.();
      });

      await waitFor(() => {
        expect(latestState?.isSwiping).toBe(false);
        expect(latestState?.progress).toBe(0);
        expect(latestState?.direction).toBe('none');
        expect(latestState?.offsetX).toBe(0);
      });
    });
  });
});

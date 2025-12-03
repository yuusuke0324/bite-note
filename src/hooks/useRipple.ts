import { useCallback, useRef } from 'react';

export interface UseRippleOptions {
  /** リップルの色 (CSS color value) */
  color?: string;
  /** アニメーション時間 (ms) */
  duration?: number;
  /** リップルのサイズ (px) */
  size?: number;
}

export interface UseRippleReturn<T extends HTMLElement> {
  /** リップルを表示する要素へのref */
  containerRef: React.RefObject<T>;
  /** クリック時にリップルを生成するハンドラ */
  createRipple: (event: React.MouseEvent<T> | React.TouchEvent<T> | React.PointerEvent<T>) => void;
}

/**
 * リップル効果を提供するカスタムフック
 * Material Design風のタップフィードバックを実装
 *
 * @example
 * ```tsx
 * const { containerRef, createRipple } = useRipple<HTMLButtonElement>();
 *
 * return (
 *   <button
 *     ref={containerRef}
 *     onClick={createRipple}
 *     className="ripple-container"
 *   >
 *     Click me
 *   </button>
 * );
 * ```
 */
export function useRipple<T extends HTMLElement = HTMLElement>(
  options: UseRippleOptions = {}
): UseRippleReturn<T> {
  const {
    color = 'rgba(255, 255, 255, 0.5)',
    duration = 600,
    size = 100,
  } = options;

  const containerRef = useRef<T>(null);

  const createRipple = useCallback(
    (event: React.MouseEvent<T> | React.TouchEvent<T> | React.PointerEvent<T>) => {
      // prefers-reduced-motionをチェック（JSDOM互換）
      const getPrefersReducedMotion = (): boolean => {
        if (typeof window === 'undefined') return false;
        if (typeof window.matchMedia !== 'function') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      };
      const prefersReducedMotion = getPrefersReducedMotion();

      // イベントから即座に必要な値を取得（イベントオブジェクトは後でnullになる可能性がある）
      const element = event.currentTarget as T;
      const rect = element.getBoundingClientRect();

      // クリック位置を取得（タッチイベントとマウスイベントの両方に対応）
      let clientX: number;
      let clientY: number;

      if ('touches' in event && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else if ('clientX' in event) {
        clientX = event.clientX;
        clientY = event.clientY;
      } else {
        // フォールバック: 要素の中心
        clientX = rect.left + rect.width / 2;
        clientY = rect.top + rect.height / 2;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // DOM操作をイベントループの次サイクルに延期
      // 重要: requestAnimationFrameではなくsetTimeout(fn, 0)を使用
      // これにより、ポインタダウン→クリックのイベント判定が完了した後にDOM変更が行われ、
      // クリックイベントの発火を阻害しない
      setTimeout(() => {
        // 要素がまだDOMに存在するか確認
        if (!element.isConnected) return;

        const ripple = document.createElement('span');
        ripple.className = prefersReducedMotion ? 'ripple ripple-reduced' : 'ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        ripple.style.backgroundColor = color;
        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.marginLeft = `${-size / 2}px`;
        ripple.style.marginTop = `${-size / 2}px`;
        ripple.style.pointerEvents = 'none'; // 明示的に設定

        element.appendChild(ripple);

        // アニメーション完了後に要素を削除
        const cleanupDuration = prefersReducedMotion ? 300 : duration;
        setTimeout(() => {
          if (ripple.parentNode) {
            ripple.remove();
          }
        }, cleanupDuration);
      }, 0);
    },
    [color, duration, size]
  );

  return { containerRef, createRipple };
}

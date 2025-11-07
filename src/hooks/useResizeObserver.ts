/**
 * TASK-001: useResizeObserver Hook - Responsive Design Support
 *
 * ResizeObserverを使用してコンテナサイズの変更を監視し、
 * SVGの動的リサイズを実現するカスタムフック
 */

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';

export interface ResizeObserverEntry {
  width: number;
  height: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export const useResizeObserver = <T extends HTMLElement>(): [
  React.RefObject<T>,
  ResizeObserverEntry | null
] => {
  const ref = useRef<T>(null);
  const [entry, setEntry] = useState<ResizeObserverEntry | null>(null);

  const detectDeviceType = useCallback((width: number): 'mobile' | 'tablet' | 'desktop' => {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, []);

  const updateEntry = useCallback((element: Element) => {
    const rect = element.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);

    setEntry({
      width,
      height,
      deviceType: detectDeviceType(width)
    });
  }, [detectDeviceType]);

  // CI環境対応: useLayoutEffectで同期的に初期化
  // これにより、ResizeObserverPolyfillのコールバックが確実に最初のレンダリング前に実行される
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    // 初回実行を同期的に行う（テスト環境で重要）
    updateEntry(element);
  }, [updateEntry]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // ResizeObserver対応確認
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        if (entries.length > 0) {
          updateEntry(entries[0].target);
        }
      });

      observer.observe(element);

      return () => {
        observer.unobserve(element);
        observer.disconnect();
      };
    } else {
      // ResizeObserver未対応の場合はwindow.resizeイベントを使用
      const handleResize = () => {
        updateEntry(element);
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [updateEntry]);

  return [ref, entry];
};
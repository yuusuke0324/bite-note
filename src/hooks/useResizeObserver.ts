/**
 * TASK-001: useResizeObserver Hook - Responsive Design Support
 *
 * ResizeObserverを使用してコンテナサイズの変更を監視し、
 * SVGの動的リサイズを実現するカスタムフック
 */

import { useState, useEffect, useRef, useCallback } from 'react';

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
      // 初回実行
      updateEntry(element);

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
      // 初回実行
      updateEntry(element);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [updateEntry]);

  return [ref, entry];
};
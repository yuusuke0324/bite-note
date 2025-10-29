/**
 * TASK-001: useResizeObserver Hook Tests
 *
 * レスポンシブ対応フックのテストケース
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useResizeObserver } from '../../hooks/useResizeObserver';

// ResizeObserver のモック
class MockResizeObserver {
  private callback: ResizeObserverCallback;
  private elements: Set<Element> = new Set();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(element: Element): void {
    this.elements.add(element);
  }

  unobserve(element: Element): void {
    this.elements.delete(element);
  }

  disconnect(): void {
    this.elements.clear();
  }

  // テスト用のヘルパーメソッド
  mockResize(dimensions: { width: number; height: number }): void {
    const entries: ResizeObserverEntry[] = Array.from(this.elements).map(element => {
      // getBoundingClientRectをモック
      Object.defineProperty(element, 'getBoundingClientRect', {
        value: () => ({
          width: dimensions.width,
          height: dimensions.height,
          top: 0,
          left: 0,
          bottom: dimensions.height,
          right: dimensions.width,
          x: 0,
          y: 0,
          toJSON: () => ({})
        })
      });

      return {
        target: element,
        contentRect: {
          width: dimensions.width,
          height: dimensions.height,
          top: 0,
          left: 0,
          bottom: dimensions.height,
          right: dimensions.width,
          x: 0,
          y: 0,
          toJSON: () => ({})
        },
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: []
      } as ResizeObserverEntry;
    });

    act(() => {
      this.callback(entries, this);
    });
  }
}

describe('useResizeObserver', () => {
  let mockResizeObserver: MockResizeObserver;
  let originalResizeObserver: typeof ResizeObserver;

  beforeAll(() => {
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = MockResizeObserver as any;
  });

  afterAll(() => {
    global.ResizeObserver = originalResizeObserver;
  });

  beforeEach(() => {
    mockResizeObserver = new MockResizeObserver(() => {});
    global.ResizeObserver = vi.fn().mockImplementation((callback) => {
      mockResizeObserver = new MockResizeObserver(callback);
      return mockResizeObserver;
    });
  });

  describe('basic functionality', () => {
    it('should return ref and null entry initially', () => {
      const { result } = renderHook(() => useResizeObserver<HTMLDivElement>());

      expect(result.current).toHaveLength(2);
      expect(result.current[0]).toHaveProperty('current', null);
      expect(result.current[1]).toBeNull();
    });

    it('should detect initial container width when element is present', () => {
      const mockElement = document.createElement('div');
      Object.defineProperty(mockElement, 'getBoundingClientRect', {
        value: () => ({
          width: 1200,
          height: 675,
          top: 0,
          left: 0,
          bottom: 675,
          right: 1200,
          x: 0,
          y: 0,
          toJSON: () => ({})
        })
      });

      const { result } = renderHook(() => useResizeObserver<HTMLDivElement>());

      // 要素をrefに設定
      act(() => {
        if (result.current[0]) {
          (result.current[0] as any).current = mockElement;
        }
      });

      // ResizeObserverコンストラクタが呼ばれることを確認
      expect(global.ResizeObserver).toHaveBeenCalled();
    });
  });

  describe('device type detection', () => {
    it('should return mobile for width < 768', () => {
      const mockElement = document.createElement('div');

      const { result } = renderHook(() => useResizeObserver<HTMLDivElement>());

      act(() => {
        if (result.current[0]) {
          (result.current[0] as any).current = mockElement;
        }
      });

      act(() => {
        mockResizeObserver.mockResize({ width: 375, height: 667 });
      });

      expect(result.current[1]?.deviceType).toBe('mobile');
      expect(result.current[1]?.width).toBe(375);
    });

    it('should return tablet for width 768-1023', () => {
      const mockElement = document.createElement('div');

      const { result } = renderHook(() => useResizeObserver<HTMLDivElement>());

      act(() => {
        if (result.current[0]) {
          (result.current[0] as any).current = mockElement;
        }
      });

      act(() => {
        mockResizeObserver.mockResize({ width: 768, height: 1024 });
      });

      expect(result.current[1]?.deviceType).toBe('tablet');
      expect(result.current[1]?.width).toBe(768);
    });

    it('should return desktop for width >= 1024', () => {
      const mockElement = document.createElement('div');

      const { result } = renderHook(() => useResizeObserver<HTMLDivElement>());

      act(() => {
        if (result.current[0]) {
          (result.current[0] as any).current = mockElement;
        }
      });

      act(() => {
        mockResizeObserver.mockResize({ width: 1200, height: 800 });
      });

      expect(result.current[1]?.deviceType).toBe('desktop');
      expect(result.current[1]?.width).toBe(1200);
    });
  });

  describe('resize updates', () => {
    it('should update dimensions on resize', async () => {
      const mockElement = document.createElement('div');

      const { result } = renderHook(() => useResizeObserver<HTMLDivElement>());

      act(() => {
        if (result.current[0]) {
          (result.current[0] as any).current = mockElement;
        }
      });

      // 初期サイズ
      act(() => {
        mockResizeObserver.mockResize({ width: 1200, height: 675 });
      });

      expect(result.current[1]?.width).toBe(1200);
      expect(result.current[1]?.deviceType).toBe('desktop');

      // サイズ変更
      act(() => {
        mockResizeObserver.mockResize({ width: 768, height: 1024 });
      });

      await waitFor(() => {
        expect(result.current[1]?.width).toBe(768);
        expect(result.current[1]?.deviceType).toBe('tablet');
      });
    });
  });

  describe('fallback behavior', () => {
    it('should use window.resize when ResizeObserver is unavailable', () => {
      // ResizeObserverを一時的に無効化
      const originalResizeObserver = global.ResizeObserver;
      (global as any).ResizeObserver = undefined;

      const mockElement = document.createElement('div');
      Object.defineProperty(mockElement, 'getBoundingClientRect', {
        value: () => ({
          width: 800,
          height: 600,
          top: 0,
          left: 0,
          bottom: 600,
          right: 800,
          x: 0,
          y: 0,
          toJSON: () => ({})
        })
      });

      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      const { result } = renderHook(() => useResizeObserver<HTMLDivElement>());

      act(() => {
        if (result.current[0]) {
          (result.current[0] as any).current = mockElement;
        }
      });

      // window.resize イベントリスナーが登録されることを確認
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      // cleanup
      addEventListenerSpy.mockRestore();
      global.ResizeObserver = originalResizeObserver;
    });
  });

  describe('cleanup', () => {
    it('should disconnect observer on unmount', () => {
      const disconnectSpy = vi.spyOn(MockResizeObserver.prototype, 'disconnect');
      const mockElement = document.createElement('div');

      const { unmount } = renderHook(() => useResizeObserver<HTMLDivElement>());

      unmount();

      expect(disconnectSpy).toHaveBeenCalled();
      disconnectSpy.mockRestore();
    });

    it('should remove resize listener on unmount when using fallback', () => {
      // ResizeObserverを一時的に無効化
      const originalResizeObserver = global.ResizeObserver;
      (global as any).ResizeObserver = undefined;

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useResizeObserver<HTMLDivElement>());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      // cleanup
      removeEventListenerSpy.mockRestore();
      global.ResizeObserver = originalResizeObserver;
    });
  });
});
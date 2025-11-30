/**
 * useTheme Hook単体テスト
 *
 * @description
 * テーマ管理フックのテストスイート。
 * ライト/ダークモードの検出、切り替え、MutationObserver監視を検証。
 *
 * @version 1.0.0
 * @since 2025-11-30 Issue #321
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTheme } from '../useTheme';

// localStorage モック
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useTheme', () => {
  beforeEach(async () => {
    // CI環境でのJSDOM初期化待機
    if (process.env.CI) {
      await waitFor(
        () => {
          if (!document.body) {
            throw new Error('JSDOM not ready');
          }
        },
        { timeout: 5000, interval: 100 }
      );
    }
    // 各テスト前にリセット
    document.body.classList.remove('light-theme');
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.classList.remove('light-theme');
  });

  describe('Initial State', () => {
    it('returns isDark=true when light-theme class is not present (default dark)', () => {
      document.body.classList.remove('light-theme');
      const { result } = renderHook(() => useTheme());
      expect(result.current.isDark).toBe(true);
      expect(result.current.theme).toBe('dark');
    });

    it('returns isDark=false when light-theme class is present', () => {
      document.body.classList.add('light-theme');
      const { result } = renderHook(() => useTheme());
      expect(result.current.isDark).toBe(false);
      expect(result.current.theme).toBe('light');
    });
  });

  describe('toggleTheme', () => {
    it('toggles from dark to light mode', () => {
      document.body.classList.remove('light-theme');
      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(true);

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.isDark).toBe(false);
      expect(result.current.theme).toBe('light');
      expect(document.body.classList.contains('light-theme')).toBe(true);
    });

    it('toggles from light to dark mode', () => {
      document.body.classList.add('light-theme');
      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(false);

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.isDark).toBe(true);
      expect(result.current.theme).toBe('dark');
      expect(document.body.classList.contains('light-theme')).toBe(false);
    });

    it('persists theme preference to localStorage', () => {
      document.body.classList.remove('light-theme');
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('bite-note-theme', 'light');
    });
  });

  describe('setThemeMode', () => {
    it('sets theme to light mode', () => {
      document.body.classList.remove('light-theme');
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setThemeMode('light');
      });

      expect(result.current.isDark).toBe(false);
      expect(result.current.theme).toBe('light');
      expect(document.body.classList.contains('light-theme')).toBe(true);
    });

    it('sets theme to dark mode', () => {
      document.body.classList.add('light-theme');
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setThemeMode('dark');
      });

      expect(result.current.isDark).toBe(true);
      expect(result.current.theme).toBe('dark');
      expect(document.body.classList.contains('light-theme')).toBe(false);
    });
  });

  describe('MutationObserver', () => {
    it('updates state when body class changes externally', async () => {
      document.body.classList.remove('light-theme');
      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(true);

      // 外部からクラスを変更
      act(() => {
        document.body.classList.add('light-theme');
      });

      // MutationObserverがトリガーされるまで待機
      await waitFor(() => {
        expect(result.current.isDark).toBe(false);
      });
    });

    it('cleans up observer on unmount', () => {
      const disconnectSpy = vi.fn();
      const originalMutationObserver = window.MutationObserver;

      // MutationObserverをモック
      window.MutationObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        disconnect: disconnectSpy,
      })) as unknown as typeof MutationObserver;

      const { unmount } = renderHook(() => useTheme());
      unmount();

      expect(disconnectSpy).toHaveBeenCalled();

      // 元に戻す
      window.MutationObserver = originalMutationObserver;
    });
  });

  describe('Return Value Types', () => {
    it('returns correct types', () => {
      const { result } = renderHook(() => useTheme());

      expect(typeof result.current.isDark).toBe('boolean');
      expect(typeof result.current.theme).toBe('string');
      expect(['light', 'dark']).toContain(result.current.theme);
      expect(typeof result.current.toggleTheme).toBe('function');
      expect(typeof result.current.setThemeMode).toBe('function');
    });
  });
});

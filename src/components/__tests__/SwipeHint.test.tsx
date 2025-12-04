/**
 * SwipeHintコンポーネントの単体テスト
 *
 * @description
 * スワイプヒントコンポーネントのテストスイート
 * 初回表示、自動非表示、アクセシビリティを検証
 *
 * @version 1.0.0
 * @since 2025-12-03 Issue #365
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { SwipeHint, resetSwipeHint } from '../ui/SwipeHint';

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

// localStorage mock
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

describe('SwipeHint', () => {
  beforeEach(() => {
    window.matchMedia = mockMatchMedia(false);
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorageMock.clear();
  });

  describe('Initial display', () => {
    it('renders on first display', () => {
      const { container } = render(<SwipeHint screenName="TestScreen" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('does not render if already shown', () => {
      localStorageMock.setItem('swipeHintShown_TestScreen', 'true');
      const { container } = render(<SwipeHint screenName="TestScreen" />);
      expect(container.firstChild).toBeNull();
    });

    it('marks hint as shown in localStorage', () => {
      render(<SwipeHint screenName="TestScreen" />);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'swipeHintShown_TestScreen',
        'true'
      );
    });
  });

  describe('Default text', () => {
    it('displays default hint text', () => {
      const { container } = render(<SwipeHint screenName="TestScreen" />);
      expect(container.textContent).toContain('← スワイプして他の記録を見る →');
    });

    it('displays custom hint text', () => {
      const { container } = render(
        <SwipeHint screenName="TestScreen" text="カスタムヒント" />
      );
      expect(container.textContent).toBe('カスタムヒント');
    });
  });

  describe('Auto hide', () => {
    it('hides after default duration (3000ms)', async () => {
      const { container } = render(<SwipeHint screenName="TestScreen" />);
      expect(container.firstChild).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(3100);
      });

      expect(container.firstChild).toBeNull();
    });

    it('hides after custom duration', async () => {
      const { container } = render(
        <SwipeHint screenName="TestScreen" displayDuration={1000} />
      );
      expect(container.firstChild).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(1100);
      });

      expect(container.firstChild).toBeNull();
    });

    it('calls onHide callback after hiding', async () => {
      const onHide = vi.fn();
      render(
        <SwipeHint
          screenName="TestScreen"
          displayDuration={1000}
          onHide={onHide}
        />
      );

      await act(async () => {
        vi.advanceTimersByTime(1100);
      });

      expect(onHide).toHaveBeenCalledTimes(1);
    });
  });

  describe('Manual dismiss', () => {
    it('hides on click', async () => {
      const { container } = render(<SwipeHint screenName="TestScreen" />);
      const hint = container.firstChild as HTMLElement;

      await act(async () => {
        fireEvent.click(hint);
        vi.advanceTimersByTime(400);
      });

      expect(container.firstChild).toBeNull();
    });

    it('hides on Escape key', async () => {
      const { container } = render(<SwipeHint screenName="TestScreen" />);
      const hint = container.firstChild as HTMLElement;

      await act(async () => {
        fireEvent.keyDown(hint, { key: 'Escape' });
        vi.advanceTimersByTime(400);
      });

      expect(container.firstChild).toBeNull();
    });

    it('hides on Enter key', async () => {
      const { container } = render(<SwipeHint screenName="TestScreen" />);
      const hint = container.firstChild as HTMLElement;

      await act(async () => {
        fireEvent.keyDown(hint, { key: 'Enter' });
        vi.advanceTimersByTime(400);
      });

      expect(container.firstChild).toBeNull();
    });

    it('hides on Space key', async () => {
      const { container } = render(<SwipeHint screenName="TestScreen" />);
      const hint = container.firstChild as HTMLElement;

      await act(async () => {
        fireEvent.keyDown(hint, { key: ' ' });
        vi.advanceTimersByTime(400);
      });

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has tooltip role', () => {
      const { container } = render(<SwipeHint screenName="TestScreen" />);
      const hint = container.firstChild as HTMLElement;
      expect(hint.getAttribute('role')).toBe('tooltip');
    });

    it('has correct aria-label', () => {
      const { container } = render(<SwipeHint screenName="TestScreen" />);
      const hint = container.firstChild as HTMLElement;
      expect(hint.getAttribute('aria-label')).toBe(
        '左右にスワイプして他の記録を見る'
      );
    });

    it('is focusable with tabIndex 0', () => {
      const { container } = render(<SwipeHint screenName="TestScreen" />);
      const hint = container.firstChild as HTMLElement;
      expect(hint.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <SwipeHint screenName="TestScreen" className="custom-hint" />
      );
      expect(container.firstChild).toHaveClass('custom-hint');
    });

    it('applies custom style', () => {
      const { container } = render(
        <SwipeHint screenName="TestScreen" style={{ bottom: '100px' }} />
      );
      expect(container.firstChild).toHaveStyle({ bottom: '100px' });
    });
  });

  describe('Different screens', () => {
    it('shows hint for different screenName', () => {
      localStorageMock.setItem('swipeHintShown_ScreenA', 'true');

      const { container } = render(<SwipeHint screenName="ScreenB" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('stores separate flags for each screen', () => {
      render(<SwipeHint screenName="ScreenA" />);
      render(<SwipeHint screenName="ScreenB" />);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'swipeHintShown_ScreenA',
        'true'
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'swipeHintShown_ScreenB',
        'true'
      );
    });
  });

  describe('resetSwipeHint utility', () => {
    it('removes localStorage entry', () => {
      localStorageMock.setItem('swipeHintShown_TestScreen', 'true');
      resetSwipeHint('TestScreen');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'swipeHintShown_TestScreen'
      );
    });
  });

  describe('prefers-reduced-motion', () => {
    it('hides immediately without animation when reduced motion is preferred', async () => {
      window.matchMedia = mockMatchMedia(true);
      const onHide = vi.fn();
      const { container } = render(
        <SwipeHint screenName="TestScreen" onHide={onHide} />
      );
      const hint = container.firstChild as HTMLElement;

      await act(async () => {
        fireEvent.click(hint);
      });

      // No fade animation, should hide immediately
      expect(container.firstChild).toBeNull();
      expect(onHide).toHaveBeenCalledTimes(1);
    });
  });
});
